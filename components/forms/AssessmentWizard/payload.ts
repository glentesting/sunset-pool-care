/**
 * Build the API request body (AssessmentData) from wizard state. Photo image
 * data is reduced to per-section counts here — see lib/validation/assessment.ts
 * for why v1 doesn't ship the raw images.
 */
import type { AssessmentData } from "@/lib/validation/assessment";
import { CHEMISTRY_PARAMS, SALT_SANITIZER, SECTIONS } from "./config";
import { overallCondition } from "./summary";
import type { AssessmentState } from "./state";

export function buildSubmitPayload(state: AssessmentState): AssessmentData {
  const usesSalt = state.config.sanitization.includes(SALT_SANITIZER);

  const sections = SECTIONS.map((s) => {
    const sec = state.sections[s.id];
    return {
      id: s.id,
      title: s.title,
      rating: sec?.rating,
      notes: sec?.notes ?? "",
      photoCount: sec ? Object.values(sec.photos).filter(Boolean).length : 0,
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
