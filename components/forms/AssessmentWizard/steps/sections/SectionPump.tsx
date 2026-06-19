"use client";
import SectionShell from "../../shared/SectionShell";
import UnitList from "../../shared/UnitList";

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
      />
    </SectionShell>
  );
}
