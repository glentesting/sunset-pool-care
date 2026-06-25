import Link from "next/link";
import { SITE } from "@/content/site";
import { buttonClasses } from "@/components/ui/Button";
import { NAV_LINKS, telHref } from "./navLinks";
import Logo from "./Logo";
import MobileMenu from "./MobileMenu";

/**
 * Sticky top nav. Bright and airy: solid white (slightly translucent + blur),
 * navy sunset wordmark, aqua link hovers, one coral CTA. Stays clean and
 * legible over the warm hero photo below it.
 */
export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/50 bg-white/90 shadow-card backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label={`${SITE.name} — home`} className="flex items-center">
          <Logo tone="navy" />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-semibold text-navy transition-colors hover:text-teal-dark"
            >
              {l.label}
            </Link>
          ))}
          <a
            href={telHref(SITE.phone)}
            className="text-sm font-semibold text-navy transition-colors hover:text-teal-dark"
          >
            {SITE.phone}
          </a>
          <Link href="/quote" className={buttonClasses({ variant: "primary" })}>
            Get a Quote
          </Link>
        </div>

        <MobileMenu tone="dark" />
      </nav>
    </header>
  );
}
