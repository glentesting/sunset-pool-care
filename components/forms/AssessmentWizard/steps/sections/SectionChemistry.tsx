"use client";
import SectionShell from "../../shared/SectionShell";
import RatingButtons from "../../shared/RatingButtons";
import { useAssessment } from "../../state";
import { CHEMISTRY_PARAMS, SALT_SANITIZER, suggestRating } from "../../config";

/**
 * Water Chemistry & Balance — bespoke: a reading + rating per parameter with the
 * ideal range shown inline. Entering a reading AUTO-SUGGESTS a rating from the
 * parameter's tunable bands (config.ts); the suggestion pre-selects but the tech
 * can override with one tap (which locks it as manual). Salt row only appears
 * when a salt system was selected in Pool Configuration.
 */
export default function SectionChemistry() {
  const { state, dispatch } = useAssessment();
  const usesSalt = state.config.sanitization.includes(SALT_SANITIZER);
  const params = CHEMISTRY_PARAMS.filter((p) => !p.saltOnly || usesSalt);

  return (
    <SectionShell sectionId="chemistry">
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-navy/40">Readings</p>
        {params.map((p) => {
          const row = state.chemistry[p.key] ?? { reading: "" };
          const autoSuggested = row.auto === true && !!row.rating;
          return (
            <div key={p.key} className="rounded-xl border border-line p-3.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-navy">{p.label}</span>
                <span className="text-xs text-navy/40">Ideal {p.ideal}</span>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <input
                  value={row.reading}
                  inputMode="decimal"
                  placeholder="Reading"
                  onChange={(e) => {
                    const reading = e.target.value;
                    // Keep a manual override; otherwise refresh the suggestion.
                    if (row.auto === false) {
                      dispatch({ type: "setChemistry", key: p.key, patch: { reading } });
                    } else {
                      dispatch({
                        type: "setChemistry",
                        key: p.key,
                        patch: { reading, rating: suggestRating(p, reading), auto: true },
                      });
                    }
                  }}
                  className="w-24 rounded-lg border border-line p-2 text-base text-navy placeholder:text-navy/30 focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal/30"
                />
                {p.unit && <span className="text-[13px] text-navy/40">{p.unit}</span>}
                {autoSuggested && (
                  <span className="text-[11px] font-medium text-teal-dark">
                    auto · tap to override
                  </span>
                )}
              </div>
              <div className="mt-2.5">
                <RatingButtons
                  size="sm"
                  value={row.rating}
                  onChange={(rating) =>
                    dispatch({ type: "setChemistry", key: p.key, patch: { rating, auto: false } })
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}
