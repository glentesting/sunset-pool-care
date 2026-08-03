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
 * The body also carries a top-level `ticket_body` — a pre-formatted plain-text
 * summary the office reads to work the HubSpot ticket, so Make doesn't have to
 * walk the nested structure. The structured data stays alongside it.
 *
 * Set MAKE_SKIMMER_WEBHOOK_URL to the Make webhook URL. When it's unset the call
 * is SKIPPED cleanly (returns false, never throws) so local/dev submits and the
 * PDF are never blocked.
 */
import "server-only";
import type { AssessmentData, ReportItem } from "@/lib/validation/assessment";

const MAKE_WEBHOOK_URL = process.env.MAKE_SKIMMER_WEBHOOK_URL;
const TIMEOUT_MS = 15000;

const FLAGGED = new Set(["ATTENTION", "MONITOR"]);

/** "Section — Item: STATUS — note" (unit heading folded in for per-unit items). */
function formatFlagged(sectionTitle: string, unitHeading: string | null, it: ReportItem): string {
  const where = unitHeading
    ? `${sectionTitle} — ${unitHeading} — ${it.label}`
    : `${sectionTitle} — ${it.label}`;
  const note = it.note?.trim() ? ` — ${it.note.trim()}` : "";
  return `${where}: ${it.status}${note}`;
}

/**
 * Pre-formatted plain-text ticket body for the office. Uses the polished item
 * notes already on `data` (same text as the PDF). `overallNotes` should be the
 * polished overall-assessment note.
 */
export function buildTicketBody(
  data: AssessmentData,
  pdfUrl: string | null,
  overallNotes: string
): string {
  const p = data.property;
  const out: string[] = [];

  // Customer.
  out.push("CUSTOMER");
  out.push(p.customerName || "—");
  const cityZip = [p.city, p.zip].filter(Boolean).join(" ");
  const addr = [p.serviceAddress, cityZip].filter(Boolean).join(", ");
  if (addr) out.push(addr);
  if (p.customerEmail?.trim()) out.push(p.customerEmail.trim());
  out.push("");

  // Overall condition + item counts.
  const c = data.itemCounts;
  out.push(`OVERALL: ${data.overall.label}`);
  out.push(`${c.attention} need attention · ${c.monitor} to monitor · ${c.good} good`);
  out.push("");

  // Flagged items (ATTENTION / MONITOR) across section items AND unit items.
  const flagged: string[] = [];
  for (const s of data.sections) {
    for (const it of s.items) {
      if (it.status && FLAGGED.has(it.status)) flagged.push(formatFlagged(s.title, null, it));
    }
    for (const u of s.units) {
      for (const it of u.items) {
        if (it.status && FLAGGED.has(it.status)) flagged.push(formatFlagged(s.title, u.heading, it));
      }
    }
  }
  out.push("FLAGGED ITEMS");
  out.push(flagged.length ? flagged.join("\n") : "None — all inspected items are Good or N/A.");
  out.push("");

  // Chemistry — every reading with value, ideal and status.
  out.push("CHEMISTRY");
  out.push(
    data.chemistry
      .map(
        (ch) =>
          `${ch.label}: ${ch.reading || "—"} (ideal ${ch.ideal})${ch.rating ? ` — ${ch.rating}` : ""}`
      )
      .join("\n")
  );
  out.push("");

  // Overall notes (if any).
  if (overallNotes.trim()) {
    out.push("OVERALL NOTES");
    out.push(overallNotes.trim());
    out.push("");
  }

  // PDF link.
  if (pdfUrl) out.push(`PDF: ${pdfUrl}`);

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
 * `overallNotes` is the polished overall-assessment note (for ticket_body).
 * @returns true when Make accepted it; false when the webhook isn't configured.
 * @throws on network error or a non-2xx response (caller records skimmer=false).
 */
export async function logAssessmentToSkimmer(
  data: AssessmentData,
  pdfUrl: string | null,
  overallNotes: string
): Promise<boolean> {
  if (!MAKE_WEBHOOK_URL) return false; // not configured — skip cleanly, don't block submit

  const ticketBody = buildTicketBody(data, pdfUrl, overallNotes);
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
