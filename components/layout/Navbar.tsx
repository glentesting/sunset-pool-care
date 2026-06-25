"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { SITE } from "@/content/site";
import { buttonClasses } from "@/components/ui/Button";
import { NAV_LINKS, telHref } from "./navLinks";
import MobileMenu from "./MobileMenu";

/**
 * Sticky top nav. Over the homepage hero it's transparent with the white
 * lockup; once scrolled (or on any non-hero route) it turns solid white with a
 * soft shadow and swaps to the navy lockup, so the mark always reads against its
 * background. Fixed positioning lets the hero sit full-bleed behind it; non-home
 * routes get a spacer so content clears the bar.
 */
export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const overHero = isHome && !scrolled;
  const linkColor = overHero
    ? "text-white/90 hover:text-white"
    : "text-navy hover:text-teal-dark";

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
          overHero ? "bg-transparent" : "bg-white shadow-card"
        }`}
      >
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" aria-label={`${SITE.name} — home`} className="flex items-center">
            <Image
              src={overHero ? "/logo-white.svg" : "/logo-navy.svg"}
              alt={SITE.name}
              width={132}
              height={110}
              className="h-9 w-auto"
            />
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm font-semibold transition-colors ${linkColor}`}
              >
                {l.label}
              </Link>
            ))}
            <a
              href={telHref(SITE.phone)}
              className={`text-sm font-semibold transition-colors ${linkColor}`}
            >
              {SITE.phone}
            </a>
            <Link href="/quote" className={buttonClasses({ variant: "primary" })}>
              Get a Quote
            </Link>
          </div>

          <MobileMenu tone={overHero ? "light" : "dark"} />
        </nav>
      </header>

      {!isHome && <div className="h-16" aria-hidden />}
    </>
  );
}
