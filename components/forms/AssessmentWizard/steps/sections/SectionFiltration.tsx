"use client";
import SectionShell from "../../shared/SectionShell";
import UnitList from "../../shared/UnitList";

/** Filtration System — one or more filters, each with filter/serial/gauge photos. */
export default function SectionFiltration() {
  return (
    <SectionShell sectionId="filtration">
      <UnitList
        list="filters"
        sectionId="filtration"
        singular="Filter"
        addLabel="+ Add Another Filter"
        photoSlots={["Filter", "Serial number", "Pressure Gauge"]}
        ensureOne
      />
    </SectionShell>
  );
}
