import Link from "next/link";
import { SERVICES, getService } from "@/content/services";
import { WEEKLY_SERVICE_PRICE } from "@/content/site";
import ServiceCard from "@/components/ui/ServiceCard";

/**
 * Not an even grid. Weekly Pool Service is featured as a large navy panel (the
 * money service); the rest sit beneath as a quieter, vertically staggered set.
 */
export default function Services() {
  const featured = getService("weekly-pool-service");
  const rest = SERVICES.filter((s) => s.slug !== "weekly-pool-service");

  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-dark">
          What we do
        </p>
        <h2 className="mt-4 max-w-2xl font-display text-4xl font-semibold leading-tight text-navy sm:text-5xl">
          Everything your pool needs, handled.
        </h2>

        {featured && (
          <Link
            href={`/services/${featured.slug}`}
            className="group mt-10 block overflow-hidden rounded-3xl bg-navy p-8 text-white shadow-card transition-colors hover:bg-navy-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 sm:p-12"
          >
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl">
                <span className="inline-block rounded-full bg-teal/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal">
                  Most popular
                </span>
                <h3 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">
                  {featured.name}
                </h3>
                <p className="mt-3 text-lg text-white/80">{featured.tagline}</p>
              </div>
              <div className="shrink-0 sm:text-right">
                <p className="font-display text-4xl font-semibold">
                  from ${WEEKLY_SERVICE_PRICE}
                  <span className="text-xl font-semibold text-white/70">/mo</span>
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-teal">
                  See what&apos;s included
                  <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                </span>
              </div>
            </div>
          </Link>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-6 sm:grid-cols-2 sm:[&>*:nth-child(even)]:mt-8">
          {rest.map((s) => (
            <ServiceCard key={s.slug} service={s} />
          ))}
        </div>
      </div>
    </section>
  );
}
