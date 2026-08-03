"use client";
import type { ReactNode } from "react";
import { useAssessment } from "../state";
import { FLAGGED_RATINGS, getSection } from "../config";
import { sectionRating } from "../summary";
import ItemRow from "./ItemRow";
import PhotoSlot from "./PhotoSlot";
import NotesField from "./NotesField";
import AdHocPhotos from "./AdHocPhotos";

/**
 * The shared shell every inspection section reuses: the CHECKLIST of line items
 * + fixed required-photo slots + a section-level note. Bespoke inner fields
 * (repeatable units, chemistry params) are passed as `children` and render
 * between the checklist and the photos.
 *
 * The section rating is DERIVED from the items (worst wins) and shown read-only
 * — there is no section-level rating control any more.
 *
 * Photo enforcement: when a section derives to MONITOR/ATTENTION it must carry
 * at least one photo. The slots show a quiet attention outline and a calm note
 * appears until one is added; the Review step blocks submit on the same rule.
 */
const groupLabel = "text-[12px] font-semibold uppercase tracking-wide text-wiz-ink/70";

const BADGE: Record<string, string> = {
  GOOD: "bg-good-dark text-white",
  MONITOR: "bg-monitor-dark text-white",
  ATTENTION: "bg-attention-dark text-white",
  "N/A": "bg-stone-dark text-white",
};

export default function SectionShell({
  sectionId,
  children,
}: {
  sectionId: string;
  children?: ReactNode;
}) {
  const { state, dispatch } = useAssessment();
  const cfg = getSection(sectionId);
  const sec = state.sections[sectionId] ?? { notes: "", photos: {}, items: {} };

  if (!cfg) return null;

  const rating = sectionRating(state, sectionId);
  const flagged = rating ? FLAGGED_RATINGS.includes(rating) : false;
  const photoCount = Object.values(sec.photos).filter((p) => p?.dataUrl).length;
  const needsPhoto = flagged && photoCount === 0;
  const items = cfg.items.filter((i) => !i.conditional || i.conditional(state));

  return (
    <div className="space-y-4">
      {cfg.hint && <p className="text-[13px] leading-relaxed text-wiz-ink/70">{cfg.hint}</p>}

      {items.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className={groupLabel}>Checklist</p>
            {rating && (
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${BADGE[rating]}`}
              >
                {rating}
              </span>
            )}
          </div>
          <div className="rounded-xl border border-wiz-line px-4">
            {items.map((item) => (
              <ItemRow key={item.id} sectionId={sectionId} item={item} />
            ))}
          </div>
        </div>
      )}

      {children}

      <div>
        <p className={`mb-2 ${groupLabel}`}>Photos</p>
        {cfg.photos.length > 0 && (
          <div className="mb-3 grid grid-cols-2 gap-3">
            {cfg.photos.map((slot) => (
              <PhotoSlot
                key={slot}
                label={slot}
                required={flagged}
                photo={sec.photos[slot]}
                onChange={(dataUrl) =>
                  dispatch({ type: "setSectionPhoto", id: sectionId, slot, dataUrl })
                }
                onLabelChange={(label) =>
                  dispatch({ type: "setSectionPhotoLabel", id: sectionId, slot, label })
                }
              />
            ))}
          </div>
        )}
        <AdHocPhotos sectionId={sectionId} required={flagged && cfg.photos.length === 0} />
      </div>

      {needsPhoto && (
        <p className="rounded-lg border border-attention/20 bg-attention/5 px-3 py-2 text-[13px] font-medium text-attention">
          A {rating} rating needs at least one photo before you can submit.
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
