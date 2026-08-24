import { NextRequest, NextResponse } from "next/server";
import { assessmentSchema } from "@/lib/validation/assessment";
import { buildReportPresentation } from "@/lib/report-presentation";
import { generateAssessmentPdf } from "@/lib/pdf-generator";
import { uploadPdfToSupabase } from "@/lib/supabase";
import { logAssessmentToMake } from "@/lib/make";

/**
 * Assessment Wizard submit. Three real outputs, each in its own try/catch so a
 * failure in one never kills the others and never blocks the PDF:
 *   1. Generate PDF           — returned to the tech as a download.
 *   2. Upload PDF to Supabase — private "assessment-pdfs" bucket → 1-yr signed URL.
 *   3. Make webhook           — posts the assessment (photo base64 stripped) +
 *                               pdf_url + ticket_body; Make creates the HubSpot ticket.
 *
 * `results` reports exactly what landed so the submit screen tells the truth.
 * Supabase carries a reason on failure ("not-configured" | "error") so the row is
 * diagnosable rather than a vague stub.
 */
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const parsed = assessmentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid submission", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;
  const results: {
    pdf: boolean;
    supabase: boolean;
    make: boolean;
    supabaseReason?: "not-configured" | "error";
  } = { pdf: false, supabase: false, make: false };

  // 1. PDF. buildReportPresentation is presentation-only, never throws (falls
  //    back to raw notes), and mutates the polished per-item notes onto `data`.
  let pdf: Buffer | null = null;
  try {
    const presentation = await buildReportPresentation(data);
    pdf = await generateAssessmentPdf(data, presentation);
    results.pdf = true;
  } catch (e) {
    console.error("PDF step failed:", e);
  }

  const safeName = (data.property.customerName || "customer").replace(/[^a-z0-9]+/gi, "-");
  const filename = `${safeName}-pool-assessment-${data.details.date || "report"}.pdf`;

  // 2. Supabase — upload the PDF, get a signed URL for Make. Distinguishes
  //    "uploaded" / "not configured" / "error" so the submit row can't lie.
  let pdfUrl: string | null = null;
  if (pdf) {
    try {
      // Traceable, sanitized object name: customer-date-jobId (session as fallback).
      const stamp = data.jobId || data.details.session || `${Date.now()}`;
      const storagePath =
        `${safeName}-${data.details.date || "report"}-${stamp}`.replace(/[^a-z0-9-]+/gi, "-") + ".pdf";
      pdfUrl = await uploadPdfToSupabase(pdf, storagePath);
      if (pdfUrl) results.supabase = true;
      else results.supabaseReason = "not-configured"; // env vars unset — nothing sent
    } catch (e) {
      console.error("Supabase upload failed:", e);
      results.supabaseReason = "error";
    }
  }

  // 3. Make webhook — never blocks the PDF; still fires (without pdf_url) if the
  //    upload didn't produce a URL.
  try {
    results.make = await logAssessmentToMake(data, pdfUrl);
  } catch (e) {
    console.error("Make webhook step failed:", e);
  }

  const allOk = results.pdf && results.supabase && results.make;
  return NextResponse.json(
    {
      ok: allOk,
      results,
      filename,
      pdfBase64: pdf ? pdf.toString("base64") : null,
    },
    { status: results.pdf ? 200 : 207 }
  );
}
