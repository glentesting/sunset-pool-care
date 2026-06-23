"use client";
import SectionShell from "../../shared/SectionShell";
import { SelectField } from "../../shared/Field";
import { useAssessment } from "../../state";
import { SPA_TYPES, SPA_NA } from "../../config";

/**
 * Spa / Hot Tub — bespoke spa-type selector up top. If there's no spa, we skip
 * the rest of the section entirely (no rating / photos / notes shown).
 */
export default function SectionSpa() {
  const { state, dispatch } = useAssessment();
  const noSpa = state.spaType === SPA_NA;

  return (
    <div className="space-y-5">
      <SelectField
        label="Spa Type"
        value={state.spaType}
        options={SPA_TYPES}
        onChange={(v) => dispatch({ type: "setSpaType", value: v })}
      />
      {!noSpa && state.spaType !== "" && <SectionShell sectionId="spa" />}
      {noSpa && (
        <p className="rounded-lg border border-line bg-sand/60 p-4 text-[13px] text-navy/50">
          No spa on this property — nothing else to inspect here.
        </p>
      )}
    </div>
  );
}
