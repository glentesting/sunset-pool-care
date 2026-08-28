/**
 * `reportId` — the public, shareable handle for one assessment.
 *
 * It names the archived JSON/PDF pair in Supabase and it is the last path
 * segment of the public viewer at /r/<reportId>, a link that gets forwarded to
 * customers. There is no authentication on that page (by design — it works like
 * a Dropbox share), so the id IS the access control and it must be unguessable.
 *
 * Therefore:
 *   - crypto.randomBytes, never Math.random
 *   - not sequential, and NOT derived from the customer's name or email
 *   - NOT the wizard's `details.session` id, which is a timestamp
 *     (SPC-YYYYMMDD-HHMM) and so trivially enumerable
 *
 * 10 chars over a 36-symbol alphabet ≈ 51.7 bits (~3.7e15 ids) — short enough to
 * paste into a ticket, far too large to walk.
 */
import "server-only";
import { randomBytes } from "node:crypto";

/** Lowercase alphanumeric: URL-safe, no case to lose when a link is retyped. */
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
export const REPORT_ID_LENGTH = 10;

/**
 * Accepted shape when reading an id back off a URL. Deliberately a little wider
 * than what we mint (8–12) so an id length change doesn't orphan old reports.
 */
const REPORT_ID_RE = /^[a-z0-9]{8,12}$/;

/**
 * A fresh random id. Uses rejection sampling — bytes at or above the largest
 * multiple of 36 are discarded rather than folded in with `%`, which would make
 * the first four letters measurably more likely than the rest.
 */
export function generateReportId(length: number = REPORT_ID_LENGTH): string {
  const limit = 256 - (256 % ALPHABET.length); // 252
  const out: string[] = [];
  while (out.length < length) {
    // Over-draw so the common case is a single randomBytes call.
    for (const b of randomBytes((length - out.length) * 2)) {
      if (b >= limit) continue; // biased tail — throw it away
      out.push(ALPHABET[b % ALPHABET.length]);
      if (out.length === length) break;
    }
  }
  return out.join("");
}

/** True when `value` could be an id we minted — cheap guard before any lookup. */
export function isReportId(value: string): boolean {
  return REPORT_ID_RE.test(value);
}
