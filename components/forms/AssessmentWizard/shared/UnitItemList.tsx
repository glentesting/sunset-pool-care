"use client";
import type { ItemDef } from "../config";
import ItemRow from "./ItemRow";

/**
 * Renders a repeatable unit's own checklist. Each row's state is keyed
 * `${unitId}:${def.id}` inside the owning section, so two units of the same kind
 * keep independent ratings. The derived section rating folds these in
 * (summary.sectionRating via UNIT_SECTIONS).
 */
export default function UnitItemList({
  sectionId,
  unitId,
  defs,
}: {
  sectionId: string;
  unitId: string;
  defs: ItemDef[];
}) {
  return (
    <div className="rounded-lg border border-wiz-line px-3">
      {defs.map((def) => (
        <ItemRow key={def.id} sectionId={sectionId} item={def} itemKey={`${unitId}:${def.id}`} />
      ))}
    </div>
  );
}
