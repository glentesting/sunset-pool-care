/**
 * Supabase Storage — the assessment's file store.
 *
 * Holds the finished PDF (returning a URL Make and the office can fetch) and,
 * alongside it, the raw assessment archive: <stem>.json, the photos as separate
 * image files, and an index/<reportId>.json pointer. See lib/assessment-archive.ts
 * for that layout; this module is just the transport.
 *
 * Uses the Storage REST API directly via fetch (no SDK dependency, serverless-
 * light). The bucket is PRIVATE; we return a
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
 * True when the storage env vars are present.
 *
 * CONFIGURED IS NOT HEALTHY. A free-tier Supabase project auto-pauses after
 * roughly a week of inactivity, and a paused project still has both env vars —
 * it reports configured:true and fails every storage call. Any code that treats
 * this as "healthy", or that treats a storage failure as "the thing isn't set
 * up", gets a paused project exactly backwards. Callers must decide on the
 * RESULT of a call, not on this. See isStorageAsleepError below.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_KEY);
}

/**
 * Does this failure look like a paused / still-waking project rather than a
 * genuine misconfiguration?
 *
 * Confirmed signature from the Aug 24 and Sep 9 outages — a paused project
 * answers every storage operation with:
 *   upload 544: {"statusCode":"544","error":"DatabaseTimeout",
 *                "message":"The connection to the database timed out"}
 * and reports configured:true throughout. A project that is WAKING can return
 * the same 544 (or simply time out) on the first call and succeed moments later,
 * which is why the keep-alive retries once before calling it a failure.
 */
export function isStorageAsleepError(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("544") ||
    m.includes("databasetimeout") ||
    m.includes("timed out") ||
    m.includes("timeout")
  );
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
 * The outcome of reading one object.
 *
 * ABSENT AND UNAVAILABLE ARE NOT THE SAME THING, and collapsing them into `null`
 * is how a storage outage gets reported to a customer as "your report doesn't
 * exist". A paused project fails every read with a 544 DatabaseTimeout, so for
 * the twelve days that went unnoticed every stored report would have rendered as
 * permanently deleted — to the customer on /r/<id> as a 404, and to the office as
 * "check the link, it may have been copied incompletely". Only a genuine
 * not-found means the object isn't there.
 */
export type StorageRead<T> =
  | { status: "ok"; value: T }
  | { status: "absent" }
  | { status: "unavailable"; error: string };

/**
 * Supabase Storage answers a missing object with a 404 — and, in some versions,
 * a 400 whose BODY carries statusCode "404" / error "not_found". Both are real
 * absence. Everything else is the storage layer failing.
 *
 * Where it is ambiguous this errs toward "unavailable" on purpose: telling
 * someone to try again when the object is genuinely gone is a much smaller harm
 * than telling them their report does not exist when it does.
 */
function looksAbsent(status: number, body: string): boolean {
  if (status === 404) return true;
  return status === 400 && /"statusCode"\s*:\s*"?404"?|not_?found/i.test(body);
}

/** Shared request for both readers — same auth, timeout and no-store semantics. */
function getObject(path: string): Promise<Response> {
  return fetch(`${storageBase()}/storage/v1/object/${objectPathFor(path)}`, {
    headers: { Authorization: `Bearer ${SERVICE_KEY}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
}

/**
 * Read one JSON object back out of the bucket with the service key (no signing
 * round-trip needed server-side).
 * @throws never — callers decide what absent and unavailable each mean.
 */
export async function readJsonObject<T>(path: string): Promise<StorageRead<T>> {
  // Unconfigured is not absence: we cannot see the bucket at all, so we have no
  // basis for claiming anything about what is or isn't in it.
  if (!isSupabaseConfigured()) {
    return { status: "unavailable", error: "Storage is not configured" };
  }
  try {
    const res = await getObject(path);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (looksAbsent(res.status, body)) return { status: "absent" };
      return { status: "unavailable", error: `read ${res.status}: ${body}` };
    }
    // A body that won't parse is a broken object, not a missing one — it throws
    // into the catch below and is reported as unavailable.
    return { status: "ok", value: (await res.json()) as T };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`Supabase read failed for ${path}:`, error);
    return { status: "unavailable", error };
  }
}

/**
 * Read one object's raw bytes. Used to pull archived photos back for a
 * regenerated PDF, and to copy a PDF to a versioned key before overwriting it.
 * @throws never — callers decide what absent and unavailable each mean.
 */
export async function readObjectBytes(
  path: string
): Promise<StorageRead<{ bytes: Uint8Array<ArrayBuffer>; contentType: string }>> {
  if (!isSupabaseConfigured()) {
    return { status: "unavailable", error: "Storage is not configured" };
  }
  try {
    const res = await getObject(path);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (looksAbsent(res.status, body)) return { status: "absent" };
      return { status: "unavailable", error: `read ${res.status}: ${body}` };
    }
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf.byteLength);
    bytes.set(new Uint8Array(buf));
    return {
      status: "ok",
      value: {
        bytes,
        contentType: res.headers.get("content-type") || "application/octet-stream",
      },
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`Supabase read failed for ${path}:`, error);
    return { status: "unavailable", error };
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
