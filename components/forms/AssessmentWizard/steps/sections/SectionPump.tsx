"use client";
import SectionShell from "../../shared/SectionShell";
import UnitList from "../../shared/UnitList";

const PUMP_TYPES = ["Single Speed", "Two Speed", "Variable Speed", "Other"] as const;

/** Pump & Motor — one or more pumps, each with pump/serial/display photos. */
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
      />
    </SectionShell>
  );
}
