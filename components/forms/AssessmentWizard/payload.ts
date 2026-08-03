/**
 * Build the API request body (AssessmentData) from wizard state.
 *
 * v2: section photos ARE included now (compressed JPEG data URLs already in the
 * draft) so the PDF can embed them. This makes the POST body large — bounded by
 * the per-image compression in lib/image-compress.ts. Flagged as a size/serverless
 * watch-item in the summary; if it ever bites, add a cap here (and log drops).
 */
import type { AssessmentData } from "@/lib/validation/assessment";
import { CHEMISTRY_PARAMS, SALT_SANITIZER, SECTIONS, SPA_NA } from "./config";
import { derivedSpaType, isSpaPresent, overallCondition, sectionRating } from "./summary";
import { unitHeading } from "./shared/UnitList";
import type { AssessmentState, Photo } from "./state";

/**
 * Slot-name caption floor for a photo key. Slotted photos (fixed / per-unit)
 * fall back to their slot name; ad-hoc photos ("extra:…") have no floor.
 */
function slotName(key: string): string {
  if (key.startsWith("extra:")) return ""; // ad-hoc → no floor caption
  const parts = key.split(":");
  // per-unit keys look like `filters:<id>:Serial number`
  return parts.length >= 3 ? parts[parts.length - 1] : key;
}

/**
 * Caption sent to the PDF, three-way:
 *   tech's typed label  → the label
 *   none, but slotted   → the slot name (Filter / Test Strip / Serial …)
 *   none, ad-hoc        → empty (PDF renders no caption)
 */
function photosOf(map: Record<string, Photo>): { label: string; dataUrl: string }[] {
  return Object.entries(map)
    .filter(([, p]) => Boolean(p?.dataUrl))
    .map(([key, p]) => ({ label: (p.label ?? "").trim() || slotName(key), dataUrl: p.dataUrl }));
}

export function buildSubmitPayload(state: AssessmentState): AssessmentData {
  const usesSalt = state.config.sanitization.includes(SALT_SANITIZER);
  const spaPresent = isSpaPresent(state);

  const sections = SECTIONS.map((s) => {
    // Auto-skipped spa is reported as N/A with nothing attached.
    if (s.id === "spa" && !spaPresent) {
      return { id: s.id, title: s.title, rating: "N/A" as const, notes: "", photoCount: 0, photos: [] };
    }
    const sec = state.sections[s.id];
    const photos = sec ? photosOf(sec.photos) : [];
    return {
      id: s.id,
      title: s.title,
      rating: sectionRating(state, s.id),
      notes: sec?.notes ?? "",
      photoCount: photos.length,
      photos,
    };
  });

  const chemistry = CHEMISTRY_PARAMS.filter((p) => !p.saltOnly || usesSalt).map((p) => {
    const row = state.chemistry[p.key];
    return {
      key: p.key,
      label: p.label,
      reading: row?.reading ?? "",
      rating: row?.rating,
      ideal: p.ideal,
    };
  });

  return {
    jobId: state.jobId || undefined,
    property: { ...state.property },
    details: { ...state.details },
    config: {
      surfaces: state.config.surfaces,
      sanitization: state.config.sanitization,
      features: state.config.features,
    },
    configPhotos: photosOf(state.config.photos),
    sections,
    chemistry,
    // Units now carry make/model, type and manufacture date — the report shows
    // the same heading the tech sees in the wizard.
    lights: state.lights.map((u, i) => unitHeading("Light", i, u)),
    filters: state.filters.map((u, i) => unitHeading("Filter", i, u)),
    pumps: state.pumps.map((u, i) => unitHeading("Pump", i, u)),
    spaType: spaPresent ? state.spaType || derivedSpaType(state) : SPA_NA,
    overallNotes: state.overallNotes,
    overall: overallCondition(state),
    certification: {
      inspectorName: state.details.inspectorName,
      date: state.details.date,
      certified: state.certification.certified as true,
    },
    // Demo pre-fills this so the sample report shows the AI features without a
    // key; normal use leaves it undefined and the server generates it.
    presentation: state.presentation,
  };
}
