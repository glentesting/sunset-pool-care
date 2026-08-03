"use client";
import SectionShell from "../../shared/SectionShell";
import UnitList from "../../shared/UnitList";
import UnitItemList from "../../shared/UnitItemList";
import { LIGHT_ITEMS, LIGHT_LOCATIONS, LIGHT_TYPES } from "../../config";

/**
 * Automation, Controls & Electrical — the section checklist (timer, panel,
 * salt cell, GFCI, etc.) plus INTERIOR LIGHTS, which moved here from Pool
 * Surface & Interior Finish (spec 1.5). Each light carries Type and Location
 * (Brian's tool) and its own condition rating.
 */
export default function SectionAutomation() {
  return (
    <SectionShell sectionId="automation">
      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-wiz-ink/70">
          Interior Lights
        </p>
        <UnitList
          list="lights"
          sectionId="automation"
          singular="Light"
          addLabel="+ Add Another Light"
          photoSlots={["Light"]}
          typeOptions={LIGHT_TYPES}
          locationOptions={LIGHT_LOCATIONS}
          makeModelLabel="Make / Model"
          makeModelPlaceholder="e.g. Pentair IntelliBrite"
        >
          {(u) => <UnitItemList sectionId="automation" unitId={u.id} defs={LIGHT_ITEMS} />}
        </UnitList>
      </div>
    </SectionShell>
  );
}
