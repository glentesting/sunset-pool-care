"use client";
import type { ReactNode } from "react";
import { useAssessment } from "../state";
import { FLAGGED_RATINGS, getSection } from "../config";
import RatingButtons from "./RatingButtons";
import PhotoSlot from "./PhotoSlot";
import NotesField from "./NotesField";
import AdHocPhotos from "./AdHocPhotos";

/**
 * The shared shell every inspection section reuses: section rating + fixed
 * required-photo slots + a notes field. Bespoke inner fields (lights, chemistry
 * params, filters, etc.) are passed as `children` and render between the rating
 * and the photo slots.
 *
 * Photo enforcement: when a section is rated MONITOR/ATTENTION it must carry at
 * least one photo. The slots show a quiet attention outline and a calm note
 * appears until one is added; the Review step blocks submit on the same rule.
 */
const groupLabel = "mb-2 text-[11px] font-semibold uppercase tracking-wide text-navy/40";
export default function SectionShell({
  sectionId,
  children,
}: {
  sectionId: string;
  children?: ReactNode;
}) {
  const { state, dispatch } = useAssessment();
  const cfg = getSection(sectionId);
  const sec = state.sections[sectionId] ?? { notes: "", photos: {} };

  if (!cfg) return null;

  const flagged = sec.rating ? FLAGGED_RATINGS.includes(sec.rating) : false;
  const photoCount = Object.values(sec.photos).filter(Boolean).length;
  const needsPhoto = flagged && photoCount === 0;

  return (
    <div className="space-y-4">
      {cfg.hint && <p className="text-[13px] leading-relaxed text-navy/50">{cfg.hint}</p>}

      <div>
        <p className={groupLabel}>Section rating</p>
        <RatingButtons
          value={sec.rating}
          onChange={(rating) => dispatch({ type: "rateSection", id: sectionId, rating })}
        />
      </div>

      {children}

      <div>
        <p className={groupLabel}>Photos</p>
        {cfg.photos.length > 0 && (
          <div className="mb-3 grid grid-cols-2 gap-3">
            {cfg.photos.map((slot) => (
              <PhotoSlot
                key={slot}
                label={slot}
                required={flagged}
                value={sec.photos[slot]}
                onChange={(dataUrl) =>
                  dispatch({ type: "setSectionPhoto", id: sectionId, slot, dataUrl })
                }
              />
            ))}
          </div>
        )}
        <AdHocPhotos sectionId={sectionId} required={flagged && cfg.photos.length === 0} />
      </div>

      {needsPhoto && (
        <p className="rounded-lg border border-attention/20 bg-attention/5 px-3 py-2 text-[13px] font-medium text-attention">
          A {sec.rating} rating needs at least one photo before you can submit.
        </p>
      )}

      <NotesField
        label={cfg.notesLabel}
        value={sec.notes}
        onChange={(notes) => dispatch({ type: "setSectionNotes", id: sectionId, notes })}
      />
    </div>
  );
}
