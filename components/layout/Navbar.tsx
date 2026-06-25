import Link from "next/link";
import { SITE } from "@/content/site";
import { buttonClasses } from "@/components/ui/Button";
import { NAV_LINKS, telHref } from "./navLinks";
import Logo from "./Logo";
import MobileMenu from "./MobileMenu";

/**
 * Sticky top nav, pinned flush to the very top. Solid white with a real shadow
 * so it reads as a layer floating ABOVE the page (content scrolls under it),
 * never merging into the hero or cards behind it. Navy sunset wordmark, aqua
 * link hovers, one coral CTA.
 */
export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-white shadow-[0_4px_16px_rgba(15,36,56,0.10)]">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label={`${SITE.name} — home`} className="flex items-center">
          <Logo tone="navy" className="h-11 w-auto" />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-semibold text-navy transition-colors hover:text-orange-dark"
            >
              {l.label}
            </Link>
          ))}
          <a
            href={telHref(SITE.phone)}
            className="text-sm font-semibold text-navy transition-colors hover:text-orange-dark"
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
