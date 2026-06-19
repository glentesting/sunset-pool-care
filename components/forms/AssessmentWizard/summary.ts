/**
 * Pure selectors over wizard state: the overall-condition roll-up shown on the
 * Review step + PDF, the outstanding-photo gate, and the submit-eligibility
 * check. Kept dependency-free so both the client steps and the server payload
 * builder can reason about the same rules.
 */
import { FLAGGED_RATINGS, SECTIONS, type Rating } from "./config";
import type { AssessmentState } from "./state";

export type SectionRollup = { id: string; title: string; rating?: Rating };

export function sectionRollup(state: AssessmentState): SectionRollup[] {
  return SECTIONS.map((s) => ({
    id: s.id,
    title: s.title,
    rating: state.sections[s.id]?.rating,
  }));
}

export function overallCondition(state: AssessmentState): {
  label: string;
  counts: Record<Rating, number>;
} {
  const counts: Record<Rating, number> = { GOOD: 0, MONITOR: 0, ATTENTION: 0, "N/A": 0 };
  for (const s of SECTIONS) {
    const r = state.sections[s.id]?.rating;
    if (r) counts[r] += 1;
  }
  const label =
    counts.ATTENTION > 0
      ? "Needs Attention"
      : counts.MONITOR > 0
        ? "Monitor Recommended"
        : "Good Condition";
  return { label, counts };
}

/** Sections rated MONITOR/ATTENTION that are still missing a photo. */
export function outstandingPhotoIssues(state: AssessmentState): string[] {
  const issues: string[] = [];
  for (const s of SECTIONS) {
    const sec = state.sections[s.id];
    if (!sec?.rating) continue;
    if (!FLAGGED_RATINGS.includes(sec.rating)) continue;
    const hasPhoto = Object.values(sec.photos).some(Boolean);
    if (!hasPhoto) issues.push(s.title);
  }
  return issues;
}

export function canSubmit(state: AssessmentState): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!state.property.customerName.trim()) reasons.push("Customer name is required.");
  if (!state.certification.inspectorName.trim()) reasons.push("Inspector name is required.");
  if (!state.certification.certified) reasons.push("Inspector certification must be checked.");
  for (const title of outstandingPhotoIssues(state)) {
    reasons.push(`${title}: add a photo for the flagged rating.`);
  }
  return { ok: reasons.length === 0, reasons };
}
