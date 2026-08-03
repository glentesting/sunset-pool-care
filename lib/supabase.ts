/**
 * Supabase Storage — uploads the finished assessment PDF and returns a URL that
 * Make (and the office, via the HubSpot ticket) can fetch.
 *
 * Uses the Storage REST API directly via fetch (no SDK dependency, serverless-
 * light — same approach as lib/anthropic.ts). The bucket is PRIVATE; we return a
 * long-lived SIGNED url so the file isn't publicly guessable but the link keeps
 * working for Make's fetch and for later ticket access.
 *
 * Needs env (server-side only, never NEXT_PUBLIC):
 *   SUPABASE_URL                 e.g. https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY    service role key (bucket write + signing)
 * When either is unset the upload is SKIPPED cleanly (returns null, never throws)
 * so local/dev submits and the PDF are never blocked.
 */
import "server-only";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Storage bucket the PDFs land in (create it as PRIVATE in Supabase). */
export const ASSESSMENT_PDF_BUCKET = "assessment-pdfs";
/** Signed-URL lifetime — 1 year, so Make's fetch and later ticket access both work. */
export const SIGNED_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 365;
const TIMEOUT_MS = 20000;

/**
 * Upload the report PDF and return a signed URL.
 * @returns the signed URL on success; null when Supabase isn't configured (skip).
 * @throws on a real upload/sign failure so the caller records supabase=false.
 */
export async function uploadPdfToSupabase(pdf: Buffer, path: string): Promise<string | null> {
  if (!SUPABASE_URL || !SERVICE_KEY) return null; // not configured — skip cleanly

  const base = SUPABASE_URL.replace(/\/+$/, "");
  const objectPath = `${ASSESSMENT_PDF_BUCKET}/${encodeURIComponent(path)}`;

  // 1) Upload (upsert so a re-submit overwrites rather than 409-ing).
  const up = await fetch(`${base}/storage/v1/object/${objectPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/pdf",
      "x-upsert": "true",
    },
    body: new Uint8Array(pdf),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!up.ok) {
    throw new Error(`Supabase upload ${up.status}: ${await up.text().catch(() => "")}`);
  }

  // 2) Create a signed URL for the object.
  const sign = await fetch(`${base}/storage/v1/object/sign/${objectPath}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: SIGNED_URL_EXPIRY_SECONDS }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!sign.ok) {
    throw new Error(`Supabase sign ${sign.status}: ${await sign.text().catch(() => "")}`);
  }
  const { signedURL } = (await sign.json()) as { signedURL: string };
  // signedURL is a path like "/object/sign/<bucket>/<file>?token=..." — make absolute.
  return `${base}/storage/v1${signedURL}`;
}
