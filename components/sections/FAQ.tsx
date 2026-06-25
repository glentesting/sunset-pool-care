import { WEEKLY_SERVICE_PRICE } from "@/content/site";

/**
 * Homepage FAQ — a restrained, no-JS <details> accordion on a clean surface,
 * plus FAQPage JSON-LD for SEO. This is also the honest home for the
 * chemicals-billed-separately nuance we keep off the hero. Price comes from
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
      <div className="mx-auto max-w-3xl px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-dark">
          Good to know
        </p>
        <h2 className="mt-4 font-display text-4xl font-semibold leading-tight text-navy sm:text-5xl">
          Questions, answered.
        </h2>

        <div className="mt-10 border-t border-line">
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
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </section>
  );
}
