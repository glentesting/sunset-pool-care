import Link from "next/link";
import type { Service } from "@/content/services";

/**
 * Borderless service tile — sits on a tinted (bg-sand) surface, no outline box.
 * Used for the quieter staggered services beneath the featured one.
 */
export default function ServiceCard({ service }: { service: Service }) {
  return (
    <Link
      href={`/services/${service.slug}`}
      className="group block rounded-2xl bg-sand p-6 shadow-card transition-colors hover:bg-sand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
    >
      <h3 className="font-display text-lg font-semibold text-navy">{service.name}</h3>
      <p className="mt-2 text-sm text-navy/70">{service.tagline}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-dark">
        Learn more
        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
      </span>
    </Link>
  );
}
