/** Shared primary navigation — used by Navbar, MobileMenu, and the Footer. */
export const NAV_LINKS = [
  { label: "Services", href: "/services/weekly-pool-service" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
] as const;

/** A dialable tel: href derived from the canonical SITE.phone string. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
