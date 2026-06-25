import Link from "next/link";
import { SITE, SERVICE_AREAS } from "@/content/site";
import { SERVICES } from "@/content/services";
import { telHref } from "./navLinks";
import Logo from "./Logo";

/**
 * Navy footer. Sits directly under the navy CTA band — they read as one dark
 * anchor, so this varies content density (NAP + three link columns + social)
 * rather than repeating a flat slab. No email is shown until SITE.email is real.
 */
const COMPANY_LINKS = [
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
  { label: "Reviews", href: "/#reviews" },
];

const SOCIALS = [
  { label: "Facebook", href: "https://facebook.com/sunsetpoolcare", path: "M13.5 9H15V6.5h-1.5c-1.7 0-2.5 1-2.5 2.6V11H9v2.5h2v6h2.5v-6h1.8l.4-2.5H13.5V9.4c0-.3.2-.4.5-.4Z" },
  { label: "Instagram", href: "https://instagram.com/sunsetpoolaz", path: "M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 0 0 12 8.5ZM12 13.5a1.5 1.5 0 1 1 0-3a1.5 1.5 0 0 1 0 3ZM16 7.5a.9.9 0 1 0 0 1.8a.9.9 0 0 0 0-1.8ZM8.5 5h7A3.5 3.5 0 0 1 19 8.5v7a3.5 3.5 0 0 1-3.5 3.5h-7A3.5 3.5 0 0 1 5 15.5v-7A3.5 3.5 0 0 1 8.5 5Zm0 2A1.5 1.5 0 0 0 7 8.5v7A1.5 1.5 0 0 0 8.5 17h7a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 15.5 7Z" },
  { label: "YouTube", href: "https://youtube.com/@SunsetPoolCare", path: "M21 9.2a2.4 2.4 0 0 0-1.7-1.7C17.8 7 12 7 12 7s-5.8 0-7.3.5A2.4 2.4 0 0 0 3 9.2 25 25 0 0 0 2.7 12 25 25 0 0 0 3 14.8a2.4 2.4 0 0 0 1.7 1.7C6.2 17 12 17 12 17s5.8 0 7.3-.5a2.4 2.4 0 0 0 1.7-1.7A25 25 0 0 0 21.3 12 25 25 0 0 0 21 9.2ZM10.3 14.2V9.8l3.8 2.2Z" },
];

export default function Footer() {
  const year = new Date().getFullYear();
  const { street, city, state, zip } = SITE.address;

  return (
    <footer className="bg-navy text-white/70">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* NAP */}
          <div>
            <Logo tone="white" className="h-14 w-auto" />
            <address className="mt-5 not-italic leading-relaxed">
              <a href={telHref(SITE.phone)} className="font-semibold text-white transition-colors hover:text-teal">
                {SITE.phone}
              </a>
              <br />
              <a href={`mailto:${SITE.email}`} className="transition-colors hover:text-teal">
                {SITE.email}
              </a>
              <br />
              {street}
              <br />
              {city}, {state} {zip}
            </address>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-white">
              Services
            </h3>
            <ul className="mt-4 space-y-2">
              {SERVICES.map((s) => (
                <li key={s.slug}>
                  <Link href={`/services/${s.slug}`} className="transition-colors hover:text-teal">
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-white">
              Company
            </h3>
            <ul className="mt-4 space-y-2">
              {COMPANY_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition-colors hover:text-teal">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Service areas (no area pages yet — plain text) */}
          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-white">
              Service Areas
            </h3>
            <ul className="mt-4 space-y-2">
              {SERVICE_AREAS.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Social */}
        <div className="mt-12 flex gap-3">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d={s.path} />
              </svg>
            </a>
          ))}
        </div>

        {/* Legal */}
        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {SITE.name}. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="transition-colors hover:text-teal">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-teal">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
