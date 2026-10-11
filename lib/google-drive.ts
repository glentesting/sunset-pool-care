/**
 * Google Drive — a copy of every finished assessment PDF in SPC's Drive folder.
 *
 * One file per report, kept in step with the report. Filing creates the file;
 * regenerating from the office review screen REPLACES THAT FILE'S CONTENTS
 * (same file ID, same link), never adds a second copy. The file is named exactly
 * like the PDF in Supabase storage, e.g. `Dale-Whitaker-2026-08-24-a7f3k2.pdf`.
 *
 * WHERE IT WRITES: a folder inside a SHARED DRIVE, with the service account
 * added as a Contributor. Two consequences shape this file:
 *   - every call passes supportsAllDrives=true, or Drive answers "file not
 *     found" for anything in a shared drive;
 *   - Contributor can add and edit files but CANNOT DELETE them, so "replace"
 *     is always an in-place update of the existing file, never delete + create.
 *     Nothing here ever issues a DELETE.
 * (A shared drive is also what makes a service account workable at all: files
 * a service account creates in its own My Drive count against a storage quota
 * it doesn't have. In a shared drive the drive owns the files.)
 *
 * CREDENTIALS come only from environment variables, never the repo:
 *   GOOGLE_SERVICE_ACCOUNT_JSON   the whole service-account key file, as JSON
 *   GDRIVE_ASSESSMENT_FOLDER_ID   the target folder's ID
 * Until BOTH are set the Drive step is skipped without a sound — see
 * isDriveConfigured. Set but wrong (bad JSON, no access, API disabled) is a
 * failure, and is reported as one.
 *
 * Auth is google-auth-library's service-account JWT client; the Drive calls
 * themselves are plain REST. That keeps the dependency to the auth library
 * rather than the whole googleapis client.
 *
 * NEVER THROWS. A Drive problem must not block a submit, the tech's download,
 * the Make webhook or a regenerate, so every outcome comes back as a value.
 */
import "server-only";
import { JWT } from "google-auth-library";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3/files";
const TIMEOUT_MS = 30_000;

export type DriveSaveResult =
  /** Not configured — nothing was attempted. */
  | { status: "skipped" }
  /** `created` is false when an existing file was updated in place. */
  | { status: "ok"; fileId: string; created: boolean }
  | { status: "failed"; error: string };

/**
 * True only when BOTH variables are set to something. Until then the Drive step
 * is skipped quietly: SPC's Google setup lands after this code does, and a
 * half-configured deploy must look exactly like an unconfigured one to techs,
 * the office and customers.
 */
export function isDriveConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() &&
      process.env.GDRIVE_ASSESSMENT_FOLDER_ID?.trim()
  );
}

/**
 * Put one report PDF in the Drive folder.
 *
 * With `fileId`, that file's contents (and name) are replaced in place. If the
 * file is gone — removed by someone with manager rights, or moved out of reach
 * — a new one is created rather than losing the copy, and the new ID returned.
 * Without `fileId`, a new file is created in the folder.
 */
export async function saveReportPdfToDrive(opts: {
  pdf: Uint8Array;
  filename: string;
  fileId?: string | null;
}): Promise<DriveSaveResult> {
  if (!isDriveConfigured()) return { status: "skipped" };
  const folderId = process.env.GDRIVE_ASSESSMENT_FOLDER_ID!.trim();

  try {
    const token = await accessToken();

    if (opts.fileId) {
      const updated = await upload(token, {
        method: "PATCH",
        url: `${UPLOAD_BASE}/${encodeURIComponent(opts.fileId)}`,
        // An update can't carry `parents` — the file stays where it is.
        metadata: { name: opts.filename },
        pdf: opts.pdf,
      });
      if (updated.ok) return { status: "ok", fileId: updated.id, created: false };
      if (updated.httpStatus !== 404) return { status: "failed", error: updated.error };
      console.warn(
        `Drive file ${opts.fileId} for ${opts.filename} no longer reachable (404) — creating a new one.`
      );
    }

    const created = await upload(token, {
      method: "POST",
      url: UPLOAD_BASE,
      metadata: { name: opts.filename, parents: [folderId], mimeType: "application/pdf" },
      pdf: opts.pdf,
    });
    if (created.ok) return { status: "ok", fileId: created.id, created: true };
    return { status: "failed", error: created.error };
  } catch (e) {
    return { status: "failed", error: e instanceof Error ? e.message : String(e) };
  }
}

/** A short-lived OAuth token for the service account. Throws on bad credentials. */
async function accessToken(): Promise<string> {
  const key = parseKeyFile(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  if (typeof key.client_email !== "string" || typeof key.private_key !== "string") {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON has no client_email / private_key");
  }
  const client = new JWT({
    email: key.client_email,
    // A key pasted through some dashboards arrives with literal "\n" pairs
    // instead of newlines, which the PEM parser rejects.
    key: key.private_key.replace(/\\n/g, "\n"),
    scopes: [DRIVE_SCOPE],
  });
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("Google returned no access token for the service account");
  return token;
}

/**
 * Parse the key file, tolerating the one way pasting commonly mangles it.
 *
 * The private key is a JSON string full of `\n` escapes. Some routes into an
 * environment variable — an .env file, a shell, some dashboards — turn those
 * escapes into real line breaks, and a raw line break inside a JSON string is
 * invalid, so the file no longer parses. When the first parse fails, line
 * breaks INSIDE strings are re-escaped and it's tried once more; line breaks
 * between fields (the downloaded file is pretty-printed) are left alone.
 */
function parseKeyFile(raw: string): { client_email?: unknown; private_key?: unknown } {
  try {
    return JSON.parse(raw);
  } catch {
    try {
      return JSON.parse(escapeBreaksInStrings(raw));
    } catch {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON (it should be the whole key file)");
    }
  }
}

function escapeBreaksInStrings(json: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (const ch of json) {
    if (inString && !escaped && (ch === "\n" || ch === "\r")) {
      if (ch === "\n") out += "\\n";
      continue;
    }
    out += ch;
    if (escaped) escaped = false;
    else if (ch === "\\") escaped = inString;
    else if (ch === '"') inString = !inString;
  }
  return out;
}

type UploadOutcome =
  | { ok: true; id: string }
  | { ok: false; httpStatus: number; error: string };

/** One multipart upload: JSON metadata + the PDF bytes, in a single request. */
async function upload(
  token: string,
  req: { method: "POST" | "PATCH"; url: string; metadata: Record<string, unknown>; pdf: Uint8Array }
): Promise<UploadOutcome> {
  const boundary = `spc-${crypto.randomUUID()}`;
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(req.metadata)}\r\n` +
        `--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`
    ),
    Buffer.from(req.pdf),
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const url = `${req.url}?uploadType=multipart&supportsAllDrives=true&fields=id`;
  const res = await fetch(url, {
    method: req.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    return { ok: false, httpStatus: res.status, error: `Drive ${req.method} ${res.status}: ${detail}` };
  }
  const json = (await res.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof json?.id !== "string") {
    return { ok: false, httpStatus: res.status, error: "Drive answered without a file id" };
  }
  return { ok: true, id: json.id };
}
