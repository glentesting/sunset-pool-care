"use client";
import { useEffect } from "react";
import SectionShell from "../../shared/SectionShell";
import { useAssessment } from "../../state";
import { derivedSpaType } from "../../summary";

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
      <p className="rounded-lg bg-sand/70 px-3 py-2 text-[13px] text-navy/60">
        Spa type: <span className="font-medium text-navy">{spaType || "—"}</span>
        <span className="text-navy/40"> · from setup</span>
      </p>
      <SectionShell sectionId="spa" />
    </div>
  );
}
