import { NextRequest, NextResponse } from "next/server";
import { assessmentSchema } from "@/lib/validation/assessment";
import { generateAssessmentPdf } from "@/lib/pdf-generator";
import { uploadPdfToSupabase } from "@/lib/supabase";
import { archiveAssessment } from "@/lib/assessment-archive";
import { generateReportId } from "@/lib/report-id";
import { reportReviewUrl, reportViewerUrl } from "@/lib/site-url";
import { logAssessmentToMake } from "@/lib/make";

/**
 * Assessment Wizard submit. Four real outputs, each in its own try/catch so a
 * failure in one never kills the others and never blocks the PDF:
 *   1. Generate PDF           — returned to the tech as a download.
 *   2. Upload PDF to Supabase — private "assessment-pdfs" bucket → 1-yr signed URL.
 *   3. Archive the raw data   — the same bucket gets <stem>.json (the complete
 *                               payload), the photos as separate image files, and
 *                               an index/<reportId>.json pointer, so the report
 *                               can be reopened and re-rendered later.
 *   4. Make webhook           — posts the assessment (photo base64 stripped) +
 *                               reportId + pdf_url + ticket_body; Make creates
 *                               the HubSpot ticket.
 *
 * Everything is keyed by `reportId` — a random, unguessable public handle minted
 * here (lib/report-id.ts). It names the stored pair and it is the URL of the
 * public viewer at /r/<reportId>, which is the link the ticket carries.
 *
 * `results` reports exactly what landed so the submit screen tells the truth.
 * Supabase and the archive each carry a reason on failure ("not-configured" |
 * "error") so the row is diagnosable rather than a vague stub.
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
  const reportId = generateReportId();
  const results: {
    pdf: boolean;
    supabase: boolean;
    data: boolean;
    make: boolean;
    supabaseReason?: "not-configured" | "error";
    dataReason?: "not-configured" | "error";
    dataPhotos?: { total: number; uploaded: number };
    reportId: string;
  } = { pdf: false, supabase: false, data: false, make: false, reportId };

  // 1. PDF. Renders the tech's own words verbatim — there is no rewriting step
  //    between the wizard and the report any more.
  let pdf: Buffer | null = null;
  try {
    pdf = await generateAssessmentPdf(data);
    results.pdf = true;
  } catch (e) {
    console.error("PDF step failed:", e);
  }

  const safeName = (data.property.customerName || "customer").replace(/[^a-z0-9]+/gi, "-");
  const filename = `${safeName}-pool-assessment-${data.details.date || "report"}.pdf`;

  // Shared filename stem for the stored pair, e.g.
  //   Dale-Whitaker-2026-08-24-a7f3k2.pdf
  //   Dale-Whitaker-2026-08-24-a7f3k2.json
  // The stamp is the reportId — the old jobId/session stamp was timestamp-based
  // and so guessable, and this makes the pair obvious in a bucket listing.
  const stem = `${safeName}-${data.details.date || "report"}-${reportId}`.replace(
    /[^a-z0-9-]+/gi,
    "-"
  );
  const pdfPath = `${stem}.pdf`;

  // 2. Supabase — upload the PDF, get a signed URL for Make. Distinguishes
  //    "uploaded" / "not configured" / "error" so the submit row can't lie.
  let pdfUrl: string | null = null;
  if (pdf) {
    try {
      pdfUrl = await uploadPdfToSupabase(pdf, pdfPath);
      if (pdfUrl) results.supabase = true;
      else results.supabaseReason = "not-configured"; // env vars unset — nothing sent
    } catch (e) {
      console.error("Supabase upload failed:", e);
      results.supabaseReason = "error";
    }
  }

  // 3. Archive the raw assessment. Runs even when the PDF or its upload failed —
  //    the structured data is exactly what's unrecoverable otherwise, so it's
  //    worth keeping on its own. archiveAssessment never throws.
  const archive = await archiveAssessment({
    data,
    reportId,
    stem,
    pdfPath: results.supabase ? pdfPath : null,
  });
  results.data = archive.ok;
  results.dataReason = archive.reason;
  results.dataPhotos = archive.photos;

  // 4. Make webhook — never blocks the PDF; still fires (without pdf_url) if the
  //    upload didn't produce a URL. ticket_body links to the viewer, but only
  //    when the archive landed — otherwise /r/<reportId> would 404 and the raw
  //    signed URL is the honest fallback.
  try {
    results.make = await logAssessmentToMake(
      data,
      pdfUrl,
      reportId,
      archive.ok ? reportViewerUrl(reportId) : null,
      archive.ok ? reportReviewUrl(reportId) : null
    );
  } catch (e) {
    console.error("Make webhook step failed:", e);
  }

  const allOk = results.pdf && results.supabase && results.data && results.make;
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
