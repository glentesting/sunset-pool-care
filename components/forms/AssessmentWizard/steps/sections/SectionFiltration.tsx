"use client";
import SectionShell from "../../shared/SectionShell";
import UnitList from "../../shared/UnitList";
import UnknownDateField from "../../shared/UnknownDateField";
import { UNKNOWN_DATE_RECOMMENDATION } from "../../config";
import { useAssessment } from "../../state";

/**
 * Filtration System — one or more filters, each with its own make/model · type ·
 * manufacture date header, photos, and Last Full Clean / Replacement date
 * (unknown-date dialog, spec 1.3).
 */
const FILTER_TYPES = ["Cartridge", "DE", "Sand", "Other"] as const;

export default function SectionFiltration() {
  const { dispatch } = useAssessment();
  return (
    <SectionShell sectionId="filtration">
      <UnitList
        list="filters"
        sectionId="filtration"
        singular="Filter"
        addLabel="+ Add Another Filter"
        photoSlots={["Filter", "Serial number", "Pressure Gauge"]}
        typeOptions={FILTER_TYPES}
        ensureOne
      >
        {(u) => (
          <UnknownDateField
            label="Last Full Clean / Replacement"
            date={u.lastClean ?? ""}
            unknown={u.lastCleanUnknown ?? false}
            note={u.lastCleanNote ?? ""}
            recommendation={UNKNOWN_DATE_RECOMMENDATION.filterClean}
            onChange={(patch) =>
              dispatch({
                type: "updateUnit",
                list: "filters",
                id: u.id,
                patch: {
                  ...(patch.date !== undefined && { lastClean: patch.date }),
                  ...(patch.unknown !== undefined && { lastCleanUnknown: patch.unknown }),
                  ...(patch.note !== undefined && { lastCleanNote: patch.note }),
                },
              })
            }
          />
        )}
      </UnitList>
    </SectionShell>
  );
}
