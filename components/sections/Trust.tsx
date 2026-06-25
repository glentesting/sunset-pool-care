/**
 * A short, in-their-voice trust band (the honesty pitch from their About copy
 * that WhySPC used to carry). Compact — three tight proof points, each with an
 * aqua accent so they hold the band instead of clustering at the top. No icon
 * grid, no boxes.
 */
const POINTS = [
  {
    title: "We own our mistakes",
    body: "If something isn't right, we make it right — no runaround, no excuses.",
  },
  {
    title: "No surprises on your bill",
    body: "You'll always know exactly what you're paying for, and why.",
  },
  {
    title: "Sharp and on time",
    body: "The same crew shows up when we say we will, every single visit.",
  },
];

export default function Trust() {
  return (
    <section className="bg-sand py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-dark">
            Why homeowners stay
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-navy sm:text-4xl">
            No runaround. No surprises.
          </h2>
          <p className="mt-4 text-lg text-navy/80">
            We&apos;d rather lose a sale than overpromise — and we keep customers
            for years because of it.
          </p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-3 sm:gap-10">
          {POINTS.map((p) => (
            <div key={p.title}>
              <span className="block h-1 w-12 rounded-full bg-teal" aria-hidden />
              <h3 className="mt-5 font-display text-xl font-semibold text-navy">{p.title}</h3>
              <p className="mt-2 leading-relaxed text-navy/80">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
