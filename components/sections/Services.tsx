import Link from "next/link";

/**
 * Services as a flowing, connected-node layout — service icons strung along a
 * gentle aqua "water" wave, not a card grid. Weekly Pool Service is the
 * emphasized aqua node; the rest follow along the line. On desktop the nodes
 * stagger along the wave; on mobile it becomes a horizontal scroller.
 *
 * Labels/descriptions live here (short, node-sized); full copy is on each
 * /services/[slug] page.
 */
type Node = {
  slug: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  emphasized?: boolean;
};

const drop = (
  <path d="M12 3.5c3 3.8 5 6.2 5 9a5 5 0 1 1-10 0c0-2.8 2-5.2 5-9z" />
);
const wrench = (
  <path d="M15.6 5.4a4 4 0 0 0-5.2 5.2L4 17l3 3 6.4-6.4a4 4 0 0 0 5.2-5.2l-2.6 2.6-2-2 2.6-2.6z" />
);
const sparkle = (
  <path d="M12 4l1.9 4.3L18 10l-4.1 1.7L12 16l-1.9-4.3L6 10l4.1-1.7z" />
);
const leaf = (
  <>
    <path d="M5 19c0-7 5-12 14-13-1 9-6 14-13 14a6 6 0 0 1-1-1z" />
    <path d="M9.5 14.5c2-2 4.5-3.2 7-4" />
  </>
);
const gear = (
  <>
    <circle cx="12" cy="12" r="2.6" />
    <path d="M12 4v2.2M12 17.8V20M4 12h2.2M17.8 12H20M6.3 6.3l1.6 1.6M16.1 16.1l1.6 1.6M17.7 6.3l-1.6 1.6M7.9 16.1l-1.6 1.6" />
  </>
);

const NODES: Node[] = [
  { slug: "weekly-pool-service", label: "Weekly Service", desc: "Cleaning, chemicals & a photo report every week.", icon: drop, emphasized: true },
  { slug: "repair", label: "Repairs", desc: "Pumps, motors, filters & leaks fixed right.", icon: wrench },
  { slug: "remodel", label: "Resurfacing", desc: "Resurfacing, salt & automation upgrades.", icon: sparkle },
  { slug: "green-pool", label: "Green Pool", desc: "From swamp to swim-ready, fast.", icon: leaf },
  { slug: "equipment", label: "Equipment", desc: "Energy-smart variable-speed upgrades.", icon: gear },
];

export default function Services() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-dark">
          What we do
        </p>
        <h2 className="mt-4 max-w-2xl font-display text-4xl font-semibold leading-tight text-navy sm:text-5xl">
          Everything your pool needs — handled.
        </h2>

        <div className="relative mt-14">
          {/* The water — a gentle aqua wave the nodes are strung along (desktop) */}
          <svg
            className="pointer-events-none absolute inset-x-0 top-8 hidden h-28 w-full md:block"
            viewBox="0 0 1000 120"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d="M0 64 C100 24 180 24 280 64 S460 104 560 64 S740 24 840 64 1000 104 1000 64"
              className="stroke-teal/55"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>

          {/* Nodes */}
          <ul className="flex snap-x gap-6 overflow-x-auto pb-2 md:justify-between md:gap-4 md:overflow-visible md:[&>*:nth-child(even)]:mt-16">
            {NODES.map((n) => (
              <li key={n.slug} className="w-44 shrink-0 snap-center md:w-auto">
                <Link
                  href={`/services/${n.slug}`}
                  className="group flex flex-col items-center text-center focus-visible:outline-none"
                >
                  <span
                    className={`inline-flex items-center justify-center rounded-full transition ${
                      n.emphasized
                        ? "h-28 w-28 bg-gradient-to-br from-orange to-gold text-white shadow-lift ring-4 ring-orange/20"
                        : "h-24 w-24 bg-teal/12 text-teal-dark shadow-card ring-2 ring-teal/40 group-hover:bg-teal/20 group-hover:ring-teal"
                    }`}
                  >
                    <svg
                      width={n.emphasized ? 46 : 38}
                      height={n.emphasized ? 46 : 38}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      {n.icon}
                    </svg>
                  </span>
                  <span className="mt-4 font-display text-lg font-semibold text-navy group-hover:text-teal-dark">
                    {n.label}
                  </span>
                  <span className="mt-1.5 max-w-[12rem] text-sm font-medium leading-snug text-navy/85">
                    {n.desc}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
