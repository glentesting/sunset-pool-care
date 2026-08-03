"use client";
import SectionShell from "../../shared/SectionShell";
import UnitList from "../../shared/UnitList";

/**
 * Automation, Controls & Electrical — checklist plus INTERIOR LIGHTS, which
 * moved here from Pool Surface & Interior Finish (spec 1.5). GFCI Outlets &
 * Switch Covers also lands here as a line item (Pass 2).
 */
const LIGHT_TYPES = ["LED", "Incandescent", "Fiber Optic", "Other"] as const;

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
        />
      </div>
    </SectionShell>
  );
}
