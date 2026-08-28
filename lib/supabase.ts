/**
 * Supabase Storage — the assessment's file store.
 *
 * Holds the finished PDF (returning a URL Make and the office can fetch) and,
 * alongside it, the raw assessment archive: <stem>.json, the photos as separate
 * image files, and an index/<reportId>.json pointer. See lib/assessment-archive.ts
 * for that layout; this module is just the transport.
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

/** True when the storage env vars are present. Callers skip cleanly when false. */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_KEY);
}

/** Absolute Storage API base, trailing slashes trimmed. */
function storageBase(): string {
  return (SUPABASE_URL ?? "").replace(/\/+$/, "");
}

/**
 * `<bucket>/<path>` with each path SEGMENT encoded — encoding the whole string
 * would turn the "/" of a nested key like `photos/<id>/01.jpg` into %2F and
 * flatten the folder.
 */
function objectPathFor(path: string): string {
  return `${ASSESSMENT_PDF_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * Upload one object to the bucket (upsert, so a re-submit overwrites rather
 * than 409-ing).
 * @throws on a non-2xx response. Caller must have checked isSupabaseConfigured().
 */
export async function uploadObject(
  path: string,
  body: BodyInit,
  contentType: string
): Promise<void> {
  const res = await fetch(`${storageBase()}/storage/v1/object/${objectPathFor(path)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Supabase upload ${res.status}: ${await res.text().catch(() => "")}`);
  }
}

/**
 * Mint a signed URL for one object.
 * @throws on a non-2xx response. Caller must have checked isSupabaseConfigured().
 */
export async function createSignedUrl(
  path: string,
  expiresIn: number = SIGNED_URL_EXPIRY_SECONDS
): Promise<string> {
  const base = storageBase();
  const res = await fetch(`${base}/storage/v1/object/sign/${objectPathFor(path)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Supabase sign ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const { signedURL } = (await res.json()) as { signedURL: string };
  // signedURL is a path like "/object/sign/<bucket>/<file>?token=..." — make absolute.
  return `${base}/storage/v1${signedURL}`;
}

/**
 * Read one JSON object back out of the bucket with the service key (no signing
 * round-trip needed server-side).
 * @returns the parsed object, or null when it doesn't exist / isn't valid JSON.
 * @throws never — a missing report must render a friendly page, not a stack trace.
 */
export async function readJsonObject<T>(path: string): Promise<T | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const res = await fetch(`${storageBase()}/storage/v1/object/${objectPathFor(path)}`, {
      headers: { Authorization: `Bearer ${SERVICE_KEY}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return null; // 404 for an unknown id is the expected path
    return (await res.json()) as T;
  } catch (e) {
    console.error(`Supabase read failed for ${path}:`, e);
    return null;
  }
}

/**
 * Upload the report PDF and return a signed URL.
 * @returns the signed URL on success; null when Supabase isn't configured (skip).
 * @throws on a real upload/sign failure so the caller records supabase=false.
 */
export async function uploadPdfToSupabase(pdf: Buffer, path: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null; // not configured — skip cleanly

  await uploadObject(path, new Uint8Array(pdf), "application/pdf");
  return createSignedUrl(path);
}

export type SupabaseHealth = {
  ok: boolean;
  configured: boolean;
  bucket: string;
  /** Each round-trip step against the real bucket. */
  steps: { upload: boolean; sign: boolean; fetch: boolean; cleanup: boolean };
  /** Sample signed URL with the token redacted (proves the sign path works). */
  signedUrlSample?: string;
  error?: string;
};

/**
 * Smoke-test the Supabase storage path WITHOUT running a full assessment:
 * upload a tiny throwaway object to the bucket, sign it, fetch it back, then
 * delete it. Never touches real assessment data. Returns which steps passed and
 * a sanitized error on failure (never echoes the service key).
 */
export async function checkSupabaseStorage(): Promise<SupabaseHealth> {
  const bucket = ASSESSMENT_PDF_BUCKET;
  const steps = { upload: false, sign: false, fetch: false, cleanup: false };

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return {
      ok: false,
      configured: false,
      bucket,
      steps,
      error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set",
    };
  }

  const base = SUPABASE_URL.replace(/\/+$/, "");
  const path = `_healthcheck/check-${Date.now()}.txt`;
  const objectPath = `${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
  const auth = { Authorization: `Bearer ${SERVICE_KEY}` };

  try {
    const up = await fetch(`${base}/storage/v1/object/${objectPath}`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "text/plain", "x-upsert": "true" },
      body: "spc-healthcheck",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!up.ok) {
      return { ok: false, configured: true, bucket, steps, error: `upload ${up.status}: ${await up.text().catch(() => "")}` };
    }
    steps.upload = true;

    const sign = await fetch(`${base}/storage/v1/object/sign/${objectPath}`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 60 }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!sign.ok) {
      return { ok: false, configured: true, bucket, steps, error: `sign ${sign.status}: ${await sign.text().catch(() => "")}` };
    }
    const { signedURL } = (await sign.json()) as { signedURL: string };
    const fullUrl = `${base}/storage/v1${signedURL}`;
    steps.sign = true;

    const got = await fetch(fullUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    steps.fetch = got.ok;

    const del = await fetch(`${base}/storage/v1/object/${objectPath}`, {
      method: "DELETE",
      headers: auth,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    steps.cleanup = del.ok;

    return {
      ok: steps.upload && steps.sign && steps.fetch && steps.cleanup,
      configured: true,
      bucket,
      steps,
      signedUrlSample: fullUrl.replace(/token=[^&]+/, "token=<redacted>"),
    };
  } catch (e) {
    return {
      ok: false,
      configured: true,
      bucket,
      steps,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
