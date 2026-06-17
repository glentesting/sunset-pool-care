/**
 * Service page content. Each service page is a thin route that pulls its
 * content from here and renders the shared <ServicePage> template, so per-page
 * copy/SEO lives as data and the layout lives in one place.
 *
 * TODO: real copy comes from Brent / existing site. These are placeholders.
 */

export type Service = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  // expand as the template grows: hero image, bullets, faqs, schema, etc.
};

export const SERVICES: Service[] = [
  {
    slug: "weekly-pool-service",
    name: "Weekly Pool Service",
    tagline: "Crystal clear, every week, no babysitting required.",
    description: "TODO copy.",
  },
  { slug: "repair", name: "Repair", tagline: "TODO", description: "TODO copy." },
  { slug: "remodel", name: "Remodel", tagline: "TODO", description: "TODO copy." },
  { slug: "green-pool", name: "Green Pool Recovery", tagline: "TODO", description: "TODO copy." },
  { slug: "equipment", name: "Equipment", tagline: "TODO", description: "TODO copy." },
];

export function getService(slug: string): Service | undefined {
  return SERVICES.find((s) => s.slug === slug);
}
