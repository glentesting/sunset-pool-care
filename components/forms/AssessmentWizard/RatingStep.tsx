"use client";
import { useAssessment } from "./state";

const RATINGS = ["GOOD", "MONITOR", "ATTENTION", "N/A"] as const;

/**
 * THE shared inspection step (Option B). Every one of the ~12 lookalike items
 * renders this — change it once, all of them update. Bespoke steps (chemistry,
 * equipment, recommendations) are their own components.
 */
export default function RatingStep({
  itemKey,
  label,
}: {
  itemKey: string;
  label: string;
}) {
  const { state, dispatch } = useAssessment();
  const current = state.ratings[itemKey]?.rating;
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-navy">{label}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {RATINGS.map((r) => (
          <button
            key={r}
            onClick={() => dispatch({ type: "rate", key: itemKey, patch: { rating: r } })}
            className={`rounded-lg border-2 py-4 font-semibold ${
              current === r ? "border-teal bg-teal/10 text-teal-dark" : "border-navy/15 text-navy/70"
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      {/* TODO: notes (voice-to-text best-effort), photo capture w/ enforcement on flag */}
    </div>
  );
}
