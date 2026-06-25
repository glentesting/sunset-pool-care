import type { Metadata } from "next";
import { SITE } from "@/content/site";
import { telHref } from "@/components/layout/navLinks";

export const metadata: Metadata = { title: "Terms of Service" };

/** Stub — real terms copy comes later. Exists so footer links don't 404. */
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20 sm:py-28">
      <h1 className="font-display text-4xl font-semibold text-navy">Terms of Service</h1>
      <p className="mt-6 text-navy/70">
        Our full terms of service are coming soon. In the meantime, if you have
        any questions, please call {SITE.name} at{" "}
        <a href={telHref(SITE.phone)} className="font-semibold text-teal-dark hover:underline">
          {SITE.phone}
        </a>
        .
      </p>
    </main>
  );
}
