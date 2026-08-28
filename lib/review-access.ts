/**
 * Access gate for the office review screen.
 *
 * /r/<reportId> is public by design — it gets forwarded to customers. The review
 * screen must not be, so it sits behind one shared code held in
 * REVIEW_ACCESS_CODE. Four people in one office: no accounts, no roles.
 *
 * Enforced SERVER-SIDE. The page won't fetch a report and the save endpoint won't
 * accept anything without a valid cookie, so hiding the UI is not what protects
 * it. The cookie stores a hash of the code rather than the code itself, and is
 * httpOnly so page scripts can't read it back out.
 *
 * FAILS CLOSED: with REVIEW_ACCESS_CODE unset nobody gets in, because an
 * unconfigured deploy silently granting access is the worst outcome here.
 */
import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const CODE = process.env.REVIEW_ACCESS_CODE;
export const REVIEW_COOKIE = "spc_review";

const digestOf = (value: string) => createHash("sha256").update(value).digest("hex");

/** Constant-time compare so the code can't be probed a character at a time. */
function sameDigest(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** False when REVIEW_ACCESS_CODE is unset — the gate then admits nobody. */
export function isReviewConfigured(): boolean {
  return Boolean(CODE && CODE.trim());
}

/** The cookie value a correct code grants. */
export function accessToken(): string {
  return digestOf(CODE ?? "");
}

export function codeIsCorrect(submitted: string): boolean {
  if (!isReviewConfigured()) return false;
  return sameDigest(digestOf(submitted.trim()), accessToken());
}

/** True when this request carries a valid unlock cookie. */
export async function hasReviewAccess(): Promise<boolean> {
  if (!isReviewConfigured()) return false;
  const cookie = (await cookies()).get(REVIEW_COOKIE)?.value;
  return Boolean(cookie && sameDigest(cookie, accessToken()));
}
