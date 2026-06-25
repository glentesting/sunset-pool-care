import { SERVICE_AREAS } from "@/content/site";

/**
 * Service area — a friendly stylized aqua "map" blob with location pins, beside
 * a checklist of the five East Valley areas. Custom illustrated feel, not a
 * boxed Google Map. Static this pass; interactive hover states come later.
 *
 * Pin positions are decorative (roughly East-Valley relative), not surveyed.
 */
const PINS: { name: string; x: number; y: number }[] = [
  { name: "Ahwatukee", x: 26, y: 34 },
  { name: "Gilbert", x: 58, y: 26 },
  { name: "Chandler", x: 44, y: 54 },
  { name: "Queen Creek", x: 76, y: 60 },
  { name: "San Tan Valley", x: 56, y: 80 },
];

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

        {/* Stylized map blob */}
        <div className="relative mx-auto aspect-[4/3] w-full max-w-md">
          <svg viewBox="0 0 400 300" className="h-full w-full" aria-hidden>
            <path
              d="M58 150 C36 78 120 30 206 42 C300 55 384 84 360 168 C342 236 268 280 184 268 C104 256 80 220 58 150 Z"
              className="fill-teal/15 stroke-teal/30"
              strokeWidth="2"
            />
            {/* a couple of soft water ripples */}
            <path d="M120 120 C160 100 220 110 270 96" className="stroke-teal/25" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M120 196 C170 214 240 206 296 188" className="stroke-teal/25" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>

          {PINS.map((p) => (
            <div
              key={p.name}
              className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              <svg width="26" height="32" viewBox="0 0 26 32" fill="none" aria-hidden>
                <path
                  d="M13 1C6.4 1 1 6.3 1 12.8 1 21 13 31 13 31s12-10 12-18.2C25 6.3 19.6 1 13 1z"
                  className="fill-orange"
                  stroke="white"
                  strokeWidth="1.5"
                />
                <circle cx="13" cy="12.5" r="4" fill="white" />
              </svg>
              <span className="mt-1 whitespace-nowrap rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-navy shadow-card">
                {p.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
