/**
 * Pure selectors over wizard state: the overall-condition roll-up shown on the
 * Review step + PDF, the outstanding-photo gate, and the submit-eligibility
 * check. Kept dependency-free so both the client steps and the server payload
 * builder can reason about the same rules.
 */
import {
  CHEMISTRY_PARAMS,
  FLAGGED_RATINGS,
  SALT_SANITIZER,
  SECTIONS,
  type Rating,
} from "./config";
import type { AssessmentState, DesiredAutoRec } from "./state";

export type SectionRollup = { id: string; title: string; rating?: Rating };

export function sectionRollup(state: AssessmentState): SectionRollup[] {
  return SECTIONS.map((s) => ({
    id: s.id,
    title: s.title,
    rating: state.sections[s.id]?.rating,
  }));
}

export type OverallKey =
  | "not-rated"
  | "good"
  | "monitor"
  | "attention";

/**
 * Derive overall condition from ACTUAL section ratings — never default to "Good".
 *   any ATTENTION                  -> Needs Attention
 *   any MONITOR (no ATTENTION)     -> Monitor Recommended
 *   something rated, none flagged  -> Good Condition  (GOOD and/or N/A)
 *   nothing rated at all           -> Not Yet Rated
 */
export function overallCondition(state: AssessmentState): {
  key: OverallKey;
  label: string;
  counts: Record<Rating, number>;
} {
  const counts: Record<Rating, number> = { GOOD: 0, MONITOR: 0, ATTENTION: 0, "N/A": 0 };
  for (const s of SECTIONS) {
    const r = state.sections[s.id]?.rating;
    if (r) counts[r] += 1;
  }
  const total = counts.GOOD + counts.MONITOR + counts.ATTENTION + counts["N/A"];

  let key: OverallKey;
  let label: string;
  if (total === 0) {
    key = "not-rated";
    label = "Not Yet Rated";
  } else if (counts.ATTENTION > 0) {
    key = "attention";
    label = "Needs Attention";
  } else if (counts.MONITOR > 0) {
    key = "monitor";
    label = "Monitor Recommended";
  } else {
    key = "good";
    label = "Good Condition";
  }
  return { key, label, counts };
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

/**
 * Turn flagged ratings into the recommendations they should seed:
 *   ATTENTION (section or chemistry param) -> Priority 1
 *   MONITOR   (section or chemistry param) -> Priority 2
 * Item text is prefilled from the source name + its note/reading. The reducer's
 * syncAutoRecs handles dedupe vs manual items and the tech's dismissals.
 */
export function buildDesiredAutoRecs(state: AssessmentState): {
  p1: DesiredAutoRec[];
  p2: DesiredAutoRec[];
} {
  const p1: DesiredAutoRec[] = [];
  const p2: DesiredAutoRec[] = [];
  const push = (rating: Rating | undefined, rec: DesiredAutoRec) => {
    if (rating === "ATTENTION") p1.push(rec);
    else if (rating === "MONITOR") p2.push(rec);
  };

  for (const sec of SECTIONS) {
    const s = state.sections[sec.id];
    const note = s?.notes?.trim();
    push(s?.rating, {
      sourceKey: `section:${sec.id}`,
      text: note ? `${sec.title} — ${note}` : sec.title,
    });
  }

  const usesSalt = state.config.sanitization.includes(SALT_SANITIZER);
  for (const p of CHEMISTRY_PARAMS) {
    if (p.saltOnly && !usesSalt) continue;
    const entry = state.chemistry[p.key];
    push(entry?.rating, {
      sourceKey: `chem:${p.key}`,
      text: `${p.label}: ${entry?.reading || "—"} (ideal ${p.ideal})`,
    });
  }

  return { p1, p2 };
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
