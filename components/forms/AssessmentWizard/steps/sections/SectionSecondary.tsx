"use client";
import SectionShell from "../../shared/SectionShell";
import UnitList from "../../shared/UnitList";
import UnitItemList from "../../shared/UnitItemList";
import { EXTRA_ITEMS } from "../../config";

/**
 * Secondary Equipment — Heater, Heat Pump and Equipment Pads (section checklist,
 * moved here per spec 1.5) plus a repeatable "+ Add Additional Equipment" list
 * for anything else on site (free-text name, one condition rating each).
 */
export default function SectionSecondary() {
  return (
    <SectionShell sectionId="secondary">
      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-wiz-ink/70">
          Additional Equipment
        </p>
        <UnitList
          list="extras"
          sectionId="secondary"
          singular="Equipment"
          addLabel="+ Add Additional Equipment"
          photoSlots={["Equipment"]}
          makeModelLabel="Equipment Name / Description"
          makeModelPlaceholder="e.g. Pool cover pump, chiller"
          showType={false}
          showMfrDate={false}
        >
          {(u) => <UnitItemList sectionId="secondary" unitId={u.id} defs={EXTRA_ITEMS} />}
        </UnitList>
      </div>
    </SectionShell>
  );
}
