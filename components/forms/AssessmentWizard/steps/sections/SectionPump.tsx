"use client";
import SectionShell from "../../shared/SectionShell";
import UnitList from "../../shared/UnitList";
import UnitItemList from "../../shared/UnitItemList";
import { PUMP_ITEMS, PUMP_TYPES } from "../../config";

/**
 * Pump & Motor — one or more pumps, each with its type, make/model and
 * manufacture date, its own full checklist (PUMP_ITEMS), and photos.
 */
export default function SectionPump() {
  return (
    <SectionShell sectionId="pump">
      <UnitList
        list="pumps"
        sectionId="pump"
        singular="Pump"
        addLabel="+ Add Another Pump"
        photoSlots={["Pump", "Serial", "Display"]}
        typeOptions={PUMP_TYPES}
        ensureOne
      >
        {(u) => <UnitItemList sectionId="pump" unitId={u.id} defs={PUMP_ITEMS} />}
      </UnitList>
    </SectionShell>
  );
}
