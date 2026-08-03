/**
 * Make.com webhook — the assessment's outbound integration point.
 *
 * On submit we POST the ENTIRE assessment to a Make scenario, which does the
 * downstream work (create the HubSpot ticket, log to Skimmer, etc.). We route
 * through Make rather than calling those APIs directly so the office can build
 * and edit the automation on the Make side without a code change here.
 *
 * The body is the full AssessmentData — customer identity (incl. email),
 * session/date/inspector, configuration, every section with its derived rating +
 * notes, every line item with its rating / answer / reading / note, every
 * equipment unit (make-model / type / date), chemistry readings, the config-
 * option ratings, the item count band, and the overall condition — PLUS a
 * top-level `pdf_url` pointing at the finished PDF in Supabase.
 *
 * Photo base64 is STRIPPED: each photo keeps its `label` (caption) and each
 * section keeps its `photoCount`, but the heavy `dataUrl` blobs stay out of the
 * webhook — the images live in the PDF (at pdf_url), not the payload.
 *
 * Set MAKE_SKIMMER_WEBHOOK_URL to the Make webhook URL. When it's unset the call
 * is SKIPPED cleanly (returns false, never throws) so local/dev submits and the
 * PDF are never blocked.
 */
import "server-only";
import type { AssessmentData } from "@/lib/validation/assessment";

const MAKE_WEBHOOK_URL = process.env.MAKE_SKIMMER_WEBHOOK_URL;
const TIMEOUT_MS = 15000;

/** Drop photo base64 (keep the caption/label) and attach pdf_url when present. */
function buildWebhookBody(data: AssessmentData, pdfUrl: string | null) {
  const stripPhotos = (photos: { label: string; dataUrl: string }[]) =>
    photos.map((p) => ({ label: p.label }));
  return {
    ...data,
    // Omit pdf_url entirely when the upload didn't happen (never send null/empty).
    ...(pdfUrl ? { pdf_url: pdfUrl } : {}),
    configPhotos: stripPhotos(data.configPhotos),
    sections: data.sections.map((s) => ({ ...s, photos: stripPhotos(s.photos) })),
  };
}

/**
 * POST the assessment (photo base64 stripped, + pdf_url) to the Make webhook.
 * @returns true when Make accepted it; false when the webhook isn't configured.
 * @throws on network error or a non-2xx response (caller records skimmer=false).
 */
export async function logAssessmentToSkimmer(
  data: AssessmentData,
  pdfUrl: string | null
): Promise<boolean> {
  if (!MAKE_WEBHOOK_URL) return false; // not configured — skip cleanly, don't block submit

  const res = await fetch(MAKE_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildWebhookBody(data, pdfUrl)),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Make webhook returned ${res.status} ${res.statusText}`);
  }
  return true;
}
