import { NextRequest, NextResponse } from "next/server";
import { assessmentSchema } from "@/lib/validation/assessment";
import { buildReportPresentation } from "@/lib/report-presentation";
import { generateAssessmentPdf } from "@/lib/pdf-generator";
import { uploadAssessmentPdf } from "@/lib/google-drive";
import { upsertContact, createTask } from "@/lib/hubspot";
import { uploadPdfToSupabase } from "@/lib/supabase";
import { logAssessmentToSkimmer } from "@/lib/skimmer";

/**
 * Assessment Wizard submit. Outputs orchestrated from this ONE route:
 *   1. Generate PDF              ← WIRED (returned to the tech as download)
 *   2. Upload PDF to Drive       ← STUBBED (throws, caught)
 *   3. HubSpot contact + tasks   ← STUBBED (throws, caught)
 *   4. Upload PDF to Supabase    ← WIRED; skips cleanly if not configured → pdf_url
 *   5. Make webhook              ← WIRED; posts assessment (photo base64 stripped)
 *                                  + pdf_url. Skips cleanly if the URL isn't set.
 *
 * Each output is wrapped independently — a failure in one never kills the
 * others, and crucially never blocks the PDF. We report exactly what landed in
 * `results` so the tech standing at the pool sees the real state, and stream the
 * PDF back base64-encoded for an immediate download.
 *
 * No env vars / credentials are required for the PDF to succeed.
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
  const results = { pdf: false, drive: false, hubspot: false, supabase: false, skimmer: false };

  // 1. PDF — the one output that must work in v1.
  //    First build the customer-facing WORDING (Claude polish + summary). This
  //    is presentation-only and never throws — on any failure it returns raw
  //    notes and no summary, so the report is never blocked.
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

  // 2. Drive upload — STUB (throws, caught). Does not block the PDF download.
  try {
    if (pdf) {
      await uploadAssessmentPdf(pdf, filename);
      results.drive = true;
    }
  } catch (e) {
    console.error("Drive step failed (stubbed):", e);
  }

  // 3. HubSpot contact + MONITOR follow-up tasks — STUB (throws, caught).
  try {
    const { id } = await upsertContact({ firstname: data.property.customerName });
    for (const sec of data.sections.filter((x) => x.rating === "MONITOR")) {
      const due = new Date(Date.now() + 30 * 864e5).toISOString();
      await createTask(id, `30-day follow-up: ${sec.title}`, due);
    }
    results.hubspot = true;
  } catch (e) {
    console.error("HubSpot step failed (stubbed):", e);
  }

  // 4. Supabase — upload the PDF, get a signed URL to hand to Make. Skips cleanly
  //    when not configured (returns null). NEVER blocks submit: on failure the
  //    Make POST still fires below, just without pdf_url.
  let pdfUrl: string | null = null;
  try {
    if (pdf) {
      // Traceable, sanitized object name: customer-date-jobId (session as fallback).
      const stamp = data.jobId || data.details.session || `${Date.now()}`;
      const storagePath =
        `${safeName}-${data.details.date || "report"}-${stamp}`.replace(/[^a-z0-9-]+/gi, "-") + ".pdf";
      pdfUrl = await uploadPdfToSupabase(pdf, storagePath);
      results.supabase = pdfUrl !== null;
    }
  } catch (e) {
    console.error("Supabase upload failed:", e);
  }

  // 5. Make webhook — POST the assessment (photo base64 stripped) + pdf_url. Make
  //    creates the HubSpot ticket, logs Skimmer, etc. Skips cleanly when the URL
  //    isn't set. Own try/catch so a webhook failure never blocks the PDF.
  try {
    results.skimmer = await logAssessmentToSkimmer(data, pdfUrl);
  } catch (e) {
    console.error("Make webhook step failed:", e);
  }

  const allOk = Object.values(results).every(Boolean);
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
