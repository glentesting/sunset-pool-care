"use client";
import SectionShell from "../../shared/SectionShell";
import RatingButtons from "../../shared/RatingButtons";
import { useAssessment } from "../../state";
import { CHEMISTRY_PARAMS, SALT_SANITIZER } from "../../config";

/**
 * Water Chemistry & Balance — bespoke: a reading + rating per parameter with the
 * ideal range shown inline. The salt row only appears when a salt system was
 * selected in Pool Configuration.
 */
export default function SectionChemistry() {
  const { state, dispatch } = useAssessment();
  const usesSalt = state.config.sanitization.includes(SALT_SANITIZER);
  const params = CHEMISTRY_PARAMS.filter((p) => !p.saltOnly || usesSalt);

  return (
    <SectionShell sectionId="chemistry">
      <div className="space-y-4">
        <p className="text-sm font-semibold text-navy">Readings</p>
        {params.map((p) => {
          const row = state.chemistry[p.key] ?? { reading: "" };
          return (
            <div key={p.key} className="rounded-xl border-2 border-navy/10 p-3">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-navy">{p.label}</span>
                <span className="text-xs text-navy/50">Ideal: {p.ideal}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={row.reading}
                  inputMode="decimal"
                  placeholder="Reading"
                  onChange={(e) =>
                    dispatch({ type: "setChemistry", key: p.key, patch: { reading: e.target.value } })
                  }
                  className="w-28 rounded-xl border-2 border-navy/15 p-2 text-base text-navy focus:border-teal focus:outline-none"
                />
                {p.unit && <span className="text-sm text-navy/50">{p.unit}</span>}
              </div>
              <div className="mt-2">
                <RatingButtons
                  size="sm"
                  value={row.rating}
                  onChange={(rating) => dispatch({ type: "setChemistry", key: p.key, patch: { rating } })}
                />
              </div>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}
