/**
 * Quiet proof band — a row of three short statements in SPC's real voice. No
 * icons-in-circles, no feature-grid tiles; just confident type on white.
 */
const POINTS = [
  {
    title: "Honest, every time",
    body: "If we make a mistake, we own it and make it right. You'll always get the straight story on your pool.",
  },
  {
    title: "Techs who show up sharp",
    body: "On time, in uniform, and respectful of your home and yard — visit after visit.",
  },
  {
    title: "15+ years in the East Valley",
    body: "Thousands of local pools kept swim-ready through every Arizona summer.",
  },
];

export default function WhySPC() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 sm:grid-cols-3 sm:gap-12">
          {POINTS.map((p) => (
            <div key={p.title}>
              <h3 className="font-display text-xl font-semibold text-navy">{p.title}</h3>
              <p className="mt-3 text-navy/70">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
