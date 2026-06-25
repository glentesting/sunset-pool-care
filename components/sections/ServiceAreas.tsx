import Image from "next/image";
import { SERVICE_AREAS } from "@/content/site";

/**
 * Service area — the real East Valley coverage map (a true service boundary,
 * far more credible than an illustration), framed to sit in the palette:
 * rounded to match the card radius, soft shadow, a thin aqua edge. The area
 * checklist sits beside it. Displayed contained so the ~500px map stays crisp.
 */
export default function ServiceAreas() {
  return (
    <section className="bg-sand py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16">
        {/* Copy + checklist */}
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-dark">
            Service area
          </p>
          <h2 className="mt-4 font-display text-4xl font-semibold leading-tight text-navy sm:text-5xl">
            Proudly serving the East Valley
          </h2>
          <p className="mt-5 max-w-md text-lg text-navy/80">
            Local, licensed, and minutes from your backyard — with the same crew
            on your pool each week.
          </p>

          <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3">
            {SERVICE_AREAS.map((area) => (
              <li key={area} className="flex items-center gap-2.5 font-semibold text-navy">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className="shrink-0 text-teal-dark">
                  <circle cx="10" cy="10" r="9" className="fill-teal/15" />
                  <path d="M6 10.5l2.5 2.5L14 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {area}
              </li>
            ))}
          </ul>
        </div>

        {/* Real coverage map, framed */}
        <div className="mx-auto w-full max-w-md">
          <Image
            src="/photos/service-area-map.jpg"
            alt="Map of Sunset Pool Care's East Valley service area, covering Chandler, Gilbert, Queen Creek, San Tan Valley, and Ahwatukee."
            width={503}
            height={429}
            sizes="(min-width: 1024px) 28rem, 90vw"
            className="w-full rounded-3xl shadow-lift ring-1 ring-teal/25"
          />
        </div>
      </div>
    </section>
  );
}
