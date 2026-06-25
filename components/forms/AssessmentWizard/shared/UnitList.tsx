"use client";
import { useEffect } from "react";
import { useAssessment } from "../state";
import PhotoSlot from "./PhotoSlot";

/**
 * Repeatable "+ Add another …" list used by sections that have N units of the
 * same thing: interior lights, filters, pumps. Each unit gets an editable label
 * plus its own required photo slots. Unit photos live in the owning section's
 * photo map under keys `${list}:${unitId}:${slot}` so the section's flagged-photo
 * rule sees them automatically.
 */
export default function UnitList({
  list,
  sectionId,
  singular,
  addLabel,
  photoSlots,
  ensureOne = false,
}: {
  list: "lights" | "filters" | "pumps";
  sectionId: string;
  singular: string;
  addLabel: string;
  photoSlots: string[];
  /** Start with one unit so its labeled photo slots are visible without a tap. */
  ensureOne?: boolean;
}) {
  const { state, dispatch } = useAssessment();
  const units = state[list];
  const sec = state.sections[sectionId] ?? { notes: "", photos: {} };

  // Client-only seed (avoids SSR/client id mismatch) so Filter 1 / Pump 1 and
  // their labeled slots show by default. Runs once per mount.
  useEffect(() => {
    if (ensureOne && units.length === 0) {
      dispatch({ type: "addUnit", list, label: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      {units.map((u, i) => (
        <div key={u.id} className="space-y-3 rounded-xl border border-wiz-line p-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[13px] font-medium text-wiz-ink">
                {singular} #{i + 1}
              </label>
              <input
                value={u.label}
                placeholder={`${singular} label / location`}
                onChange={(e) =>
                  dispatch({ type: "updateUnit", list, id: u.id, label: e.target.value })
                }
                className="w-full rounded-lg border border-wiz-field p-3 text-base text-wiz-ink placeholder:text-wiz-ink/50 focus:border-wiz-accent focus:outline-none focus:ring-2 focus:ring-wiz-accent/30"
              />
            </div>
            <button
              type="button"
              onClick={() => dispatch({ type: "removeUnit", list, id: u.id })}
              className="rounded-lg px-3 py-3 text-[13px] font-medium text-wiz-ink/70 transition-colors hover:text-attention"
            >
              Remove
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {photoSlots.map((slot) => {
              const key = `${list}:${u.id}:${slot}`;
              return (
                <PhotoSlot
                  key={key}
                  label={slot}
                  value={sec.photos[key]}
                  onChange={(dataUrl) =>
                    dispatch({ type: "setSectionPhoto", id: sectionId, slot: key, dataUrl })
                  }
                />
              );
            })}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => dispatch({ type: "addUnit", list, label: "" })}
        className="w-full rounded-lg border border-dashed border-wiz-field py-2.5 text-sm font-semibold text-wiz-accent-dark transition-colors hover:bg-wiz-surface"
      >
        {addLabel}
      </button>
    </div>
  );
}
