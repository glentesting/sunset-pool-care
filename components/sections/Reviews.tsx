/**
 * Real testimonials, with names. Staggered rail — not a 3-equal-card grid. Cards
 * are borderless tiles on the white surface (soft shadow only), stepped down to
 * break the even-row template tell. Anchored with the Google rating.
 */
const REVIEWS = [
  {
    quote:
      "Sunset Pool has consistently been a great pool service company. Always on time, thorough, and they communicate well. I get weekly pictures along with the chemicals added and levels.",
    name: "Noel",
  },
  {
    quote:
      "From the first interaction, nothing short of professional and reliable. Their techs go above and beyond — my family gets to just enjoy the backyard.",
    name: "Mandy",
  },
  {
    quote:
      "The only company I trust with my pool. Cody takes his time and explains everything anytime I have a question.",
    name: "Samantha",
  },
];

function Stars() {
  return (
    <div className="flex gap-0.5 text-gold" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i}>★</span>
      ))}
    </div>
  );
}

export default function Reviews() {
  return (
    <section id="reviews" className="scroll-mt-20 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-dark">
          <span className="text-gold" aria-hidden>★</span> 4.8 from 221 reviews on Google
        </p>
        <h2 className="mt-4 max-w-2xl font-display text-4xl font-semibold leading-tight text-navy sm:text-5xl">
          The neighbors have thoughts.
        </h2>

        <div className="mt-12 grid gap-6 sm:grid-cols-3 sm:[&>*:nth-child(2)]:mt-8 sm:[&>*:nth-child(3)]:mt-16">
          {REVIEWS.map((r) => (
            <figure key={r.name} className="rounded-2xl bg-sand p-6 shadow-card">
              <Stars />
              <blockquote className="mt-4 text-navy/85">“{r.quote}”</blockquote>
              <figcaption className="mt-5 font-semibold text-navy">— {r.name}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
