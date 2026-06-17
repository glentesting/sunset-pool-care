import Link from "next/link";
import type { Service } from "@/content/services";

export default function ServiceCard({ service }: { service: Service }) {
  return (
    <Link
      href={`/services/${service.slug}`}
      className="block rounded-xl border border-navy/10 p-6 hover:border-teal transition-colors"
    >
      <h3 className="text-lg font-semibold text-navy">{service.name}</h3>
      <p className="mt-2 text-sm text-navy/60">{service.tagline}</p>
    </Link>
  );
}
