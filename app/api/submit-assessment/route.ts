import { NextRequest, NextResponse } from "next/server";
import { assessmentSchema } from "@/lib/validation/assessment";
import { generateAssessmentPdf } from "@/lib/pdf-generator";
import { uploadAssessmentPdf } from "@/lib/google-drive";
import { upsertContact, createTask } from "@/lib/hubspot";
import { logAssessmentToSkimmer } from "@/lib/skimmer";

/**
 * Assessment Wizard submit. FOUR outputs fire from this ONE route:
 *   1. Generate PDF
 *   2. Upload PDF to Google Drive
 *   3. Update HubSpot contact + create MONITOR follow-up tasks
 *   4. Fire Make webhook -> Skimmer
 *
 * Each is wrapped independently — a failure in one does NOT kill the others.
 * We report back exactly what landed and what didn't, so the tech standing at
 * the pool knows the real state instead of a generic "done".
 *
 * TODO (Phase 3): double-submit / idempotency guard so a retry on bad field
 * signal doesn't create duplicate PDFs + duplicate HubSpot tasks.
 */
export async function POST(req: NextRequest) {
  const parsed = assessmentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }
  const data = parsed.data;
  const results = { pdf: false, drive: false, hubspot: false, skimmer: false };

  let pdf: Buffer | null = null;
  try {
    pdf = await generateAssessmentPdf(data);
    results.pdf = true;
  } catch (e) { console.error("PDF step failed:", e); }

  try {
    if (pdf) { await uploadAssessmentPdf(pdf, `${data.customerName}.pdf`); results.drive = true; }
  } catch (e) { console.error("Drive step failed:", e); }

  try {
    const { id } = await upsertContact({ email: data.customerEmail, firstname: data.customerName });
    for (const item of data.inspectionItems.filter((i) => i.rating === "MONITOR")) {
      const due = new Date(Date.now() + 30 * 864e5).toISOString();
      await createTask(id, `30-day follow-up: ${item.key}`, due);
    }
    results.hubspot = true;
  } catch (e) { console.error("HubSpot step failed:", e); }

  try {
    await logAssessmentToSkimmer({ jobId: data.jobId, contactEmail: data.customerEmail, summary: "TODO" });
    results.skimmer = true;
  } catch (e) { console.error("Skimmer step failed:", e); }

  const allOk = Object.values(results).every(Boolean);
  return NextResponse.json({ ok: allOk, results }, { status: allOk ? 200 : 207 });
}
