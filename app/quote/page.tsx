import type { Metadata } from "next";
import { SITE, SERVICE_AREAS } from "@/content/site";
import { buttonClasses } from "@/components/ui/Button";
import { telHref } from "@/components/layout/navLinks";

export const metadata: Metadata = {
  title: "Get a Quote",
  description:
    "Request a custom pool service quote from Sunset Pool Care in the East Valley.",
};

/**
 * TODO (forms phase): this route is the future home of the Qualifier Form
 * (components/forms/QualifierForm). For now it's a clean placeholder so the
 * homepage CTAs land somewhere real instead of 404ing — phone-first, no form.
 */
export default function QuotePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20 sm:py-28">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-dark">
        Get a quote
      </p>
      <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-navy sm:text-5xl">
        Let&apos;s get you a custom quote.
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-navy/75">
        Our quick online quote form is on its way. In the meantime, the fastest
        way to get a price is a two-minute call — we&apos;ll ask a few questions
        about your pool and get you a fair quote the same day.
      </p>

      <div className="mt-9">
        <a href={telHref(SITE.phone)} className={buttonClasses({ variant: "primary", size: "lg" })}>
          Call {SITE.phone}
        </a>
      </div>

      <p className="mt-10 text-sm text-navy/60">
        Serving {SERVICE_AREAS.join(", ")}.
      </p>
    </main>
  );
}
