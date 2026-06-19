/**
 * Build the API request body (AssessmentData) from wizard state.
 *
 * v2: section photos ARE included now (compressed JPEG data URLs already in the
 * draft) so the PDF can embed them. This makes the POST body large — bounded by
 * the per-image compression in lib/image-compress.ts. Flagged as a size/serverless
 * watch-item in the summary; if it ever bites, add a cap here (and log drops).
 */
import type { AssessmentData } from "@/lib/validation/assessment";
import { CHEMISTRY_PARAMS, SALT_SANITIZER, SECTIONS } from "./config";
import { overallCondition } from "./summary";
import type { AssessmentState } from "./state";

/** Human label for a stored photo slot key (handles fixed / per-unit / ad-hoc). */
function photoLabel(key: string): string {
  if (key.startsWith("extra:")) return "Photo";
  const parts = key.split(":");
  // per-unit keys look like `filters:<id>:Serial number`
  return parts.length >= 3 ? parts[parts.length - 1] : key;
}

function photosOf(map: Record<string, string>): { label: string; dataUrl: string }[] {
  return Object.entries(map)
    .filter(([, dataUrl]) => Boolean(dataUrl))
    .map(([key, dataUrl]) => ({ label: photoLabel(key), dataUrl }));
}

export function buildSubmitPayload(state: AssessmentState): AssessmentData {
  const usesSalt = state.config.sanitization.includes(SALT_SANITIZER);

  const sections = SECTIONS.map((s) => {
    const sec = state.sections[s.id];
    const photos = sec ? photosOf(sec.photos) : [];
    return {
      id: s.id,
      title: s.title,
      rating: sec?.rating,
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
    lights: state.lights.map((l) => l.label),
    filters: state.filters.map((f) => f.label),
    pumps: state.pumps.map((p) => p.label),
    spaType: state.spaType,
    recommendations: {
      p1: state.recommendations.p1.map(({ item, investment, timeframe }) => ({
        item,
        investment,
        timeframe,
      })),
      p2: state.recommendations.p2.map(({ item, investment, timeframe }) => ({
        item,
        investment,
        timeframe,
      })),
      overallNotes: state.recommendations.overallNotes,
    },
    overall: overallCondition(state),
    certification: {
      inspectorName: state.certification.inspectorName,
      date: state.certification.date,
      certified: state.certification.certified as true,
    },
  };
}
