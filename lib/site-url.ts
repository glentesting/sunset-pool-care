/**
 * Absolute base URL for links we MINT server-side and hand to someone else —
 * today, the `/r/<reportId>` viewer link that goes into the HubSpot ticket and
 * gets forwarded on to customers. Those links outlive the request that made
 * them, so they can't be relative and they can't point at a preview deployment.
 *
 * Resolution order:
 *   1. REPORT_BASE_URL                  — explicit override; set this at domain
 *                                         cutover (see the note in next.config.ts,
 *                                         sunsetpoolcare.com is still the old Wix
 *                                         site today).
 *   2. VERCEL_PROJECT_PRODUCTION_URL    — the project's production alias, so a
 *                                         preview deploy still emits production
 *                                         links rather than links that die with
 *                                         the preview.
 *   3. the current Vercel production alias, hardcoded.
 *
 * Server-side only (none of these are NEXT_PUBLIC). In the browser, build the
 * URL from window.location instead.
 */
const FALLBACK = "https://sunset-pool-care.vercel.app";

/** No trailing slash, always with a protocol. */
export function siteBaseUrl(): string {
  const explicit = process.env.REPORT_BASE_URL?.trim();
  if (explicit) return withProtocol(explicit);

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return withProtocol(vercel);

  return FALLBACK;
}

/** Public viewer URL for one assessment — safe to forward to a customer. */
export function reportViewerUrl(reportId: string): string {
  return `${siteBaseUrl()}/r/${reportId}`;
}

/** INTERNAL office review URL. Never send this to a customer. */
export function reportReviewUrl(reportId: string): string {
  return `${siteBaseUrl()}/assessment/review/${reportId}`;
}

function withProtocol(host: string): string {
  const withScheme = /^https?:\/\//i.test(host) ? host : `https://${host}`;
  return withScheme.replace(/\/+$/, "");
}
