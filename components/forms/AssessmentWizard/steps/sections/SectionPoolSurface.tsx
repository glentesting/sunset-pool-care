"use client";
import SectionShell from "../../shared/SectionShell";
import UnitList from "../../shared/UnitList";

/** Pool Surface & Interior Finish — section rating + each interior light. */
export default function SectionPoolSurface() {
  return (
    <SectionShell sectionId="surface">
      <div>
        <p className="mb-2 text-sm font-semibold text-wiz-ink">Interior Lights</p>
        <UnitList
          list="lights"
          sectionId="surface"
          singular="Light"
          addLabel="+ Add Another Light"
          photoSlots={["Light"]}
        />
      </div>
    </SectionShell>
  );
}
