"use client";
import { useEffect, type ReactNode } from "react";
import { useAssessment, type ListKey, type Unit } from "../state";
import PhotoSlot from "./PhotoSlot";

/**
 * Repeatable "+ Add another …" list for sections with N units of the same thing:
 * interior lights, filters, pumps.
 *
 * Each unit header carries MAKE/MODEL, TYPE and MANUFACTURE DATE (spec 1.4) and
 * summarises as "Filter 1 — Hayward 4030 · Cartridge · 2026-01". Beneath the
 * header each unit gets its own photo slots and, via `children`, its own full
 * item list (Pass 2 supplies those).
 *
 * Unit photos live in the owning section's photo map under keys
 * `${list}:${unitId}:${slot}` so the section's flagged-photo rule sees them.
 */
export function unitHeading(singular: string, index: number, u: Unit): string {
  const parts = [u.makeModel, u.unitType, u.mfrDate].map((p) => p?.trim()).filter(Boolean);
  const base = `${singular} ${index + 1}`;
  return parts.length ? `${base} — ${parts.join(" · ")}` : base;
}

export default function UnitList({
  list,
  sectionId,
  singular,
  addLabel,
  photoSlots,
  typeOptions,
  locationOptions,
  makeModelLabel = "Make / Model",
  makeModelPlaceholder = "e.g. Hayward 4030",
  showType = true,
  showMfrDate = true,
  ensureOne = false,
  children,
}: {
  list: ListKey;
  sectionId: string;
  singular: string;
  addLabel: string;
  photoSlots: string[];
  /** Dropdown choices for this unit's Type; free text when omitted. */
  typeOptions?: readonly string[];
  /** When set, a Location dropdown is shown (interior lights). */
  locationOptions?: readonly string[];
  /** Relabel the make/model field (e.g. "Equipment Name" for extras). */
  makeModelLabel?: string;
  makeModelPlaceholder?: string;
  /** Hide the Type / Manufacture Date fields (free-text extras). */
  showType?: boolean;
  showMfrDate?: boolean;
  /** Start with one unit so its labeled photo slots are visible without a tap. */
  ensureOne?: boolean;
  /** Per-unit content (item list, unknown-date field) rendered under the header. */
  children?: (unit: Unit, index: number) => ReactNode;
}) {
  const { state, dispatch } = useAssessment();
  const units = state[list];
  const sec = state.sections[sectionId] ?? { notes: "", photos: {}, items: {} };

  // Client-only seed (avoids SSR/client id mismatch) so Filter 1 / Pump 1 and
  // their labeled slots show by default. Runs once per mount.
  useEffect(() => {
    if (ensureOne && units.length === 0) {
      dispatch({ type: "addUnit", list });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (id: string, p: Partial<Omit<Unit, "id">>) =>
    dispatch({ type: "updateUnit", list, id, patch: p });

  return (
    <div className="space-y-3">
      {units.map((u, i) => (
        <div key={u.id} className="space-y-3 rounded-xl border border-wiz-line p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[14px] font-semibold text-wiz-ink">
              {unitHeading(singular, i, u)}
            </p>
            <button
              type="button"
              onClick={() => dispatch({ type: "removeUnit", list, id: u.id })}
              className="shrink-0 rounded-lg px-2 py-1 text-[13px] font-medium text-wiz-ink/70 transition-colors hover:text-attention"
            >
              Remove
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Labeled label={makeModelLabel}>
              <input
                value={u.makeModel}
                placeholder={makeModelPlaceholder}
                onChange={(e) => patch(u.id, { makeModel: e.target.value })}
                className={INPUT}
              />
            </Labeled>
            {showType && (
              <Labeled label="Type">
                {typeOptions ? (
                  <select
                    value={u.unitType}
                    onChange={(e) => patch(u.id, { unitType: e.target.value })}
                    className={INPUT}
                  >
                    <option value="">Select…</option>
                    {typeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={u.unitType}
                    placeholder="Type"
                    onChange={(e) => patch(u.id, { unitType: e.target.value })}
                    className={INPUT}
                  />
                )}
              </Labeled>
            )}
            {locationOptions && (
              <Labeled label="Location">
                <select
                  value={u.location ?? ""}
                  onChange={(e) => patch(u.id, { location: e.target.value })}
                  className={INPUT}
                >
                  <option value="">Select…</option>
                  {locationOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Labeled>
            )}
            {showMfrDate && (
              <Labeled label="Manufacture Date">
                <input
                  type="month"
                  value={u.mfrDate}
                  onChange={(e) => patch(u.id, { mfrDate: e.target.value })}
                  className={INPUT}
                />
              </Labeled>
            )}
          </div>

          {children?.(u, i)}

          {photoSlots.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {photoSlots.map((slot) => {
                const key = `${list}:${u.id}:${slot}`;
                return (
                  <PhotoSlot
                    key={key}
                    label={slot}
                    photo={sec.photos[key]}
                    onChange={(dataUrl) =>
                      dispatch({ type: "setSectionPhoto", id: sectionId, slot: key, dataUrl })
                    }
                    onLabelChange={(label) =>
                      dispatch({ type: "setSectionPhotoLabel", id: sectionId, slot: key, label })
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => dispatch({ type: "addUnit", list })}
        className="w-full rounded-lg border border-dashed border-wiz-field py-2.5 text-sm font-semibold text-wiz-accent-dark transition-colors hover:bg-wiz-surface"
      >
        {addLabel}
      </button>
    </div>
  );
}

const INPUT =
  "w-full rounded-lg border border-wiz-field p-2.5 text-base text-wiz-ink placeholder:text-wiz-ink/50 focus:border-wiz-accent focus:outline-none focus:ring-2 focus:ring-wiz-accent/30";

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-medium text-wiz-ink/80">{label}</label>
      {children}
    </div>
  );
}
