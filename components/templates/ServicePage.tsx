import type { Service } from "@/content/services";

/**
 * Shared template every service page renders. Layout lives here once; each
 * service route just hands it the right content from content/services.ts.
 * Per-page SEO/schema gets generated at the route level (generateMetadata).
 */
export default function ServicePage({ service }: { service: Service }) {
  return (
    <main className="min-h-screen px-6 py-20 max-w-3xl mx-auto">
      <p className="text-teal font-semibold uppercase tracking-widest text-sm">
        Service
      </p>
      <h1 className="mt-3 text-4xl font-bold text-navy">{service.name}</h1>
      <p className="mt-4 text-xl text-navy/70">{service.tagline}</p>
      <p className="mt-8 text-navy/60">{service.description}</p>
      {/* TODO: hero, benefits, pricing, FAQ, CTA, schema — design phase */}
    </main>
  );
}
