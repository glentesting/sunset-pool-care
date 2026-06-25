import type { Metadata } from "next";
import { SITE } from "@/content/site";
import { telHref } from "@/components/layout/navLinks";

export const metadata: Metadata = { title: "Privacy Policy" };

/** Stub — real policy copy comes later. Exists so footer links don't 404. */
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20 sm:py-28">
      <h1 className="font-display text-4xl font-semibold text-navy">Privacy Policy</h1>
      <p className="mt-6 text-navy/70">
        Our full privacy policy is coming soon. In the meantime, if you have any
        questions about how {SITE.name} handles your information, please call us
        at{" "}
        <a href={telHref(SITE.phone)} className="font-semibold text-orange-dark hover:underline">
          {SITE.phone}
        </a>
        .
      </p>
    </main>
  );
}
