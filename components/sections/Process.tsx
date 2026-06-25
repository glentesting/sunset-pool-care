/**
 * Process — a clean, flat deep-navy band (calmer and more premium than a
 * gradient). Four connected steps with a dotted connector the circular markers
 * sit on top of. Eyebrow + numerals use the one coral accent, identical to every
 * other section; white text stays fully legible.
 */
const STEPS = [
  { n: "1", title: "Request a quote", desc: "Tell us about your pool — online or a 2-minute call." },
  { n: "2", title: "We get to work", desc: "Your dedicated tech starts your weekly service." },
  { n: "3", title: "Weekly updates", desc: "A photo and full chemical report after every visit." },
  { n: "4", title: "Relax & enjoy", desc: "Clear water, no babysitting. Just use your pool." },
];

export default function Process() {
  return (
    <section className="bg-navy py-20 text-white sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange">
          How it works
        </p>
        <h2 className="mt-4 max-w-2xl font-display text-4xl font-semibold leading-tight text-white sm:text-5xl">
          Four steps to a pool you forget about.
        </h2>

        <div className="relative mt-14">
          {/* Dotted connector — the step markers (bg-navy) sit over it */}
          <div
            className="absolute inset-x-0 top-7 hidden border-t-2 border-dashed border-white/20 md:block"
            aria-hidden
          />
          <ol className="grid gap-10 md:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="relative flex flex-col items-center text-center">
                <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-navy font-display text-xl font-semibold text-orange ring-2 ring-orange">
                  {s.n}
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-2 max-w-[14rem] text-sm text-white/85">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
