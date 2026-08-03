"use client";
import { useEffect } from "react";
import SectionShell from "../../shared/SectionShell";
import UnknownDateField from "../../shared/UnknownDateField";
import { useAssessment } from "../../state";
import { derivedSpaType } from "../../summary";
import { UNKNOWN_DATE_RECOMMENDATION } from "../../config";

/**
 * Spa / Hot Tub. Spa presence + type are derived once from pool type +
 * configuration features (see summary.ts) — NOT asked again here. This section
 * only renders when a spa is present (the step is auto-skipped otherwise), so it
 * just shows the derived type and inspects the spa via the shared shell.
 */
export default function SectionSpa() {
  const { state, dispatch } = useAssessment();
  const spaType = derivedSpaType(state);

  // Keep the stored spa type in sync with the derived value (single source).
  useEffect(() => {
    if (spaType && state.spaType !== spaType) {
      dispatch({ type: "setSpaType", value: spaType });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaType]);

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-wiz-line bg-wiz-surface/70 px-3 py-2 text-[13px] text-wiz-ink/80">
        Spa type: <span className="font-semibold text-wiz-ink">{spaType || "—"}</span>
        <span className="text-wiz-ink/60"> · from setup</span>
      </p>
      <SectionShell sectionId="spa">
        <UnknownDateField
          label="Last Water Change (Spa)"
          date={state.spaLastWaterChange}
          unknown={state.spaLastWaterChangeUnknown}
          note={state.spaLastWaterChangeNote}
          recommendation={UNKNOWN_DATE_RECOMMENDATION.waterChange}
          onChange={(patch) => dispatch({ type: "setSpaWaterChange", patch })}
        />
      </SectionShell>
    </div>
  );
}
