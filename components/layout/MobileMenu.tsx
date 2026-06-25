"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { SITE } from "@/content/site";
import { buttonClasses } from "@/components/ui/Button";
import { NAV_LINKS, telHref } from "./navLinks";
import Logo from "./Logo";

/**
 * Mobile nav: a hamburger that opens a full-screen navy overlay with the same
 * links + phone + quote CTA. `tone` colors the trigger so it reads against the
 * transparent (light) or solid-white (dark) navbar.
 */
export default function MobileMenu({ tone }: { tone: "light" | "dark" }) {
  const [open, setOpen] = useState(false);

  // Lock background scroll and allow Escape to close while the overlay is open.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal ${
          tone === "light" ? "text-white" : "text-navy"
        }`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="spc-step-anim fixed inset-0 z-50 flex flex-col bg-navy text-white">
          <div className="flex h-16 shrink-0 items-center justify-between px-6">
            <Logo tone="white" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <nav className="flex flex-1 flex-col px-6 pt-4">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="border-b border-white/10 py-4 font-display text-2xl font-semibold"
              >
                {l.label}
              </Link>
            ))}
            <a
              href={telHref(SITE.phone)}
              onClick={() => setOpen(false)}
              className="border-b border-white/10 py-4 font-display text-2xl font-semibold"
            >
              {SITE.phone}
            </a>
            <Link
              href="/quote"
              onClick={() => setOpen(false)}
              className={`${buttonClasses({ variant: "primary", size: "lg" })} mt-8`}
            >
              Get a Quote
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
