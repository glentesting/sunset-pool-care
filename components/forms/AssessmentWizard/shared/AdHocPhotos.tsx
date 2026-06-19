"use client";
import { useState } from "react";
import { useAssessment } from "../state";
import PhotoSlot from "./PhotoSlot";

/**
 * Free-form "add as many photos as you need" grid for a section. Sections with
 * no fixed photo slots (Automation, Cleaning, Safety, Decking) rely on this so a
 * MONITOR/ATTENTION rating can still attach the required photo. Ad-hoc photos
 * are stored under `extra:<id>` keys so they don't collide with fixed slots or
 * per-unit (lights/filters/pumps) photos.
 */
const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}`;

export default function AdHocPhotos({
  sectionId,
  required = false,
}: {
  sectionId: string;
  required?: boolean;
}) {
  const { state, dispatch } = useAssessment();
  const sec = state.sections[sectionId] ?? { notes: "", photos: {} };
  const [pending, setPending] = useState(`extra:${uid()}`);

  const existing = Object.keys(sec.photos).filter((k) => k.startsWith("extra:"));
  const empty = existing.length === 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      {existing.map((key, i) => (
        <PhotoSlot
          key={key}
          label={`Photo ${i + 1}`}
          value={sec.photos[key]}
          onChange={(dataUrl) =>
            dispatch({ type: "setSectionPhoto", id: sectionId, slot: key, dataUrl })
          }
        />
      ))}
      <PhotoSlot
        key={pending}
        label="Add photo"
        required={required && empty}
        value={undefined}
        onChange={(dataUrl) => {
          if (!dataUrl) return;
          dispatch({ type: "setSectionPhoto", id: sectionId, slot: pending, dataUrl });
          setPending(`extra:${uid()}`);
        }}
      />
    </div>
  );
}
