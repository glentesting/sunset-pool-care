/**
 * /r — short alias for /review, for SMS where character count matters.
 * Re-exports the whole page (component + metadata) so the two routes can never
 * drift. Bare /r only: /r/<reportId> is still the public report viewer.
 */
export { default, metadata } from "@/app/review/page";
