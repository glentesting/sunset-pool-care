/**
 * Make.com webhook — the assessment's outbound integration point.
 *
 * On submit we POST the ENTIRE assessment to a Make scenario, which creates the
 * HubSpot ticket (and any other downstream work). We route through Make rather
 * than calling those APIs directly so the office can build and edit the
 * automation on the Make side without a code change here.
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
 * The body also carries a top-level `ticket_body` — a pre-formatted plain-text
 * summary the office reads to work the HubSpot ticket, so Make doesn't have to
 * walk the nested structure. The structured data stays alongside it.
 *
 * Set MAKE_ASSESSMENT_WEBHOOK_URL to the Make webhook URL. When it's unset the
 * call is SKIPPED cleanly (returns false, never throws) so local/dev submits and
 * the PDF are never blocked.
 */
import "server-only";
import type { AssessmentData } from "@/lib/validation/assessment";

const MAKE_WEBHOOK_URL = process.env.MAKE_ASSESSMENT_WEBHOOK_URL;
const TIMEOUT_MS = 15000;

/**
 * Compact triage summary for the HubSpot ticket description. HubSpot's plain-text
 * description truncates behind "See more" at ~4 lines, so this is deliberately
 * short — the PDF is the report; this just lets someone triage from the board.
 * Shape:
 *
 *   Name · Address, City ZIP
 *   email · phone
 *
 *   NEEDS ATTENTION — 1 item
 *   Section — Item
 *
 *   View full report: https://…
 *
 * Attn items are listed (max 6, then "+N more"); Monitor is a count only.
 * Chemistry and overall notes are NOT here — they live in the PDF.
 */
export function buildTicketBody(data: AssessmentData, pdfUrl: string | null): string {
  const p = data.property;
  const out: string[] = [];

  // Line 1: name · address, city zip
  const cityZip = [p.city, p.zip].map((x) => x?.trim()).filter(Boolean).join(" ");
  const addr = [p.serviceAddress?.trim(), cityZip].filter(Boolean).join(", ");
  out.push([p.customerName?.trim() || "—", addr].filter(Boolean).join(" · "));

  // Line 2: email · phone — omit either if blank, omit the line if both are blank.
  const contact = [p.customerEmail?.trim(), p.customerPhone?.trim()].filter(Boolean).join(" · ");
  if (contact) out.push(contact);

  out.push("");

  // Flagged items across section items, unit items, and config options. Chemistry
  // is excluded (it's in the PDF). Attn is listed; Monitor is counted only.
  const attn: string[] = [];
  let monitor = 0;
  const tally = (label: string, status?: string) => {
    if (status === "ATTENTION") attn.push(label);
    else if (status === "MONITOR") monitor += 1;
  };
  for (const s of data.sections) {
    for (const it of s.items) tally(`${s.title} — ${it.label}`, it.status);
    for (const u of s.units)
      for (const it of u.items) tally(`${s.title} — ${u.heading} — ${it.label}`, it.status);
  }
  for (const o of data.configOptions) tally(`Configuration — ${o.label}`, o.status);

  // Overall condition + Attn count.
  const overall = data.overall.label.toUpperCase();
  out.push(attn.length ? `${overall} — ${attn.length} item${attn.length === 1 ? "" : "s"}` : overall);

  // One line per Attn item, capped at 6.
  const CAP = 6;
  for (const line of attn.slice(0, CAP)) out.push(line);
  if (attn.length > CAP) out.push(`+${attn.length - CAP} more — see full report`);

  // Monitor: count only.
  if (monitor > 0) out.push(`${monitor} to monitor`);

  out.push("");

  // PDF link — always the last line; a missing upload is made obvious, not silent.
  out.push(`View full report: ${pdfUrl ?? "(PDF upload failed — see submit log)"}`);

  return out.join("\n").trim();
}

/** Drop photo base64 (keep the caption/label) and attach pdf_url + ticket_body. */
function buildWebhookBody(data: AssessmentData, pdfUrl: string | null, ticketBody: string) {
  const stripPhotos = (photos: { label: string; dataUrl: string }[]) =>
    photos.map((p) => ({ label: p.label }));
  return {
    ...data,
    // Omit pdf_url entirely when the upload didn't happen (never send null/empty).
    ...(pdfUrl ? { pdf_url: pdfUrl } : {}),
    ticket_body: ticketBody,
    configPhotos: stripPhotos(data.configPhotos),
    sections: data.sections.map((s) => ({ ...s, photos: stripPhotos(s.photos) })),
  };
}

/**
 * POST the assessment (photo base64 stripped, + pdf_url + ticket_body) to Make.
 * @returns true when Make accepted it; false when the webhook isn't configured.
 * @throws on network error or a non-2xx response (caller records make=false).
 */
export async function logAssessmentToMake(
  data: AssessmentData,
  pdfUrl: string | null
): Promise<boolean> {
  if (!MAKE_WEBHOOK_URL) return false; // not configured — skip cleanly, don't block submit

  const ticketBody = buildTicketBody(data, pdfUrl);
  const res = await fetch(MAKE_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildWebhookBody(data, pdfUrl, ticketBody)),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Make webhook returned ${res.status} ${res.statusText}`);
  }
  return true;
}
