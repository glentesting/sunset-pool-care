import { SERVICE_AREAS } from "@/content/site";

/**
 * Local-SEO band. Confident type listing the five areas. Area pages
 * (/areas/[slug]) don't exist yet, so names render as plain text — not broken
 * links.
 */
export default function ServiceAreas() {
  return (
    <section className="bg-sand py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-dark">
          Service area
        </p>
        <h2 className="mt-4 max-w-2xl font-display text-4xl font-semibold leading-tight text-navy sm:text-5xl">
          Proudly serving the East Valley
        </h2>

        <div className="mt-8 flex flex-wrap items-center">
          {SERVICE_AREAS.map((area, i) => (
            <span key={area} className="flex items-center">
              {i > 0 && (
                <span className="px-4 text-teal" aria-hidden>
                  ·
                </span>
              )}
              <span className="font-display text-2xl font-semibold text-navy sm:text-3xl">
                {area}
              </span>
            </span>
          ))}
        </div>

        <p className="mt-6 max-w-lg text-navy/70">
          Local, licensed, and minutes from your backyard — with the same crew on
          your pool each week.
        </p>
      </div>
    </section>
  );
}
