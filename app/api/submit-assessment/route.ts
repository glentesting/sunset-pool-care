import { NextRequest, NextResponse } from "next/server";
import { assessmentSchema } from "@/lib/validation/assessment";
import { buildReportPresentation } from "@/lib/report-presentation";
import { generateAssessmentPdf } from "@/lib/pdf-generator";
import { uploadAssessmentPdf } from "@/lib/google-drive";
import { upsertContact, createTask } from "@/lib/hubspot";
import { logAssessmentToSkimmer } from "@/lib/skimmer";

/**
 * Assessment Wizard submit. FOUR outputs are orchestrated from this ONE route:
 *   1. Generate PDF              ← WIRED in v1 (returned to the tech as download)
 *   2. Upload PDF to Drive       ← STUBBED (throws, caught)
 *   3. HubSpot contact + tasks   ← STUBBED (throws, caught)
 *   4. Make webhook -> Skimmer   ← STUBBED (throws, caught)
 *
 * Each output is wrapped independently — a failure in one never kills the
 * others, and crucially never blocks the PDF. We report exactly what landed in
 * `results` so the tech standing at the pool sees the real state, and stream the
 * PDF back base64-encoded for an immediate download.
 *
 * No env vars / credentials are required for v1 to succeed (PDF only).
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
  const results = { pdf: false, drive: false, hubspot: false, skimmer: false };

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

  // 4. Skimmer via Make webhook — STUB (throws, caught).
  try {
    await logAssessmentToSkimmer({
      jobId: data.jobId,
      contactEmail: "",
      summary: `${data.overall.label} — ${data.property.customerName}`,
    });
    results.skimmer = true;
  } catch (e) {
    console.error("Skimmer step failed (stubbed):", e);
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
