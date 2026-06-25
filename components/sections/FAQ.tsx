import { SITE, WEEKLY_SERVICE_PRICE } from "@/content/site";
import { telHref } from "@/components/layout/navLinks";

/**
 * Homepage FAQ — a restrained, no-JS <details> accordion paired with a small
 * "still have questions?" call card so the section reads as a finished
 * composition, not a half-empty column. Includes FAQPage JSON-LD for SEO, and is
 * the honest home for the chemicals-billed-separately nuance. Price comes from
 * WEEKLY_SERVICE_PRICE — never hardcoded.
 */
const FAQS: { q: string; a: string }[] = [
  {
    q: "How much does weekly service cost?",
    a: `From $${WEEKLY_SERVICE_PRICE}/mo, covering labor; chemicals are billed separately at month-end based on actual usage. Every visit includes chemical checks and adjustments, brushing the steps and walls, debris and basket cleanout, an equipment inspection, backwashing, and salt-cell cleaning when needed — plus a photo and chemical report after each visit.`,
  },
  {
    q: "Are you licensed and insured?",
    a: "Yes — we're fully licensed and insured, with 15+ years serving the East Valley.",
  },
  {
    q: "Do you offer warranties?",
    a: "We follow the manufacturer warranties on the products and equipment we install.",
  },
  {
    q: "Can you handle a green or cloudy pool?",
    a: "Yes, both — from a quick chemistry correction for a cloudy pool to a full drain-and-clean for severe green cases.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function FAQ() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-dark">
          Good to know
        </p>
        <h2 className="mt-4 font-display text-4xl font-semibold leading-tight text-navy sm:text-5xl">
          Questions, answered.
        </h2>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.65fr_1fr] lg:gap-16">
          {/* Accordion */}
          <div className="border-t border-line">
            {FAQS.map((f) => (
              <details key={f.q} className="group border-b border-line py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-semibold text-navy [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                    className="shrink-0 text-teal-dark transition-transform group-open:rotate-180"
                  >
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <p className="mt-3 leading-relaxed text-navy/80">{f.a}</p>
              </details>
            ))}
          </div>

          {/* Still have questions? */}
          <aside className="self-start rounded-3xl bg-sand p-7 shadow-card">
            <h3 className="font-display text-xl font-semibold text-navy">
              Still have questions?
            </h3>
            <p className="mt-2 text-navy/80">
              Talk to a real person on our team — no call center, no pressure.
            </p>
            <a
              href={telHref(SITE.phone)}
              className="mt-5 flex items-center gap-2 font-display text-2xl font-semibold text-orange transition-colors hover:text-orange-dark"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
                <path d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {SITE.phone}
            </a>
            <p className="mt-3 text-sm text-navy/70">
              Same-day callbacks, six days a week.
            </p>
          </aside>
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </section>
  );
}
