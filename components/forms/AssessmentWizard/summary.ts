/**
 * Pure selectors over wizard state: spa presence, the active step list, the
 * overall-condition roll-up (Review + PDF), the outstanding-photo gate, and
 * submit-eligibility. Kept dependency-free so the client steps and the server
 * payload builder reason about the same rules.
 */
import {
  ATTACHED_SPA_FEATURE,
  CHEMISTRY_PARAMS,
  FLAGGED_RATINGS,
  SALT_SANITIZER,
  SECTIONS,
  SPA_POOL_TYPES,
  SPA_TYPE_ATTACHED,
  SPA_TYPE_STANDALONE,
  STANDALONE_HOT_TUB,
  type Rating,
} from "./config";
import { WIZARD_STEPS, type WizardStep } from "./steps";
import type { AssessmentState, DesiredAutoRec } from "./state";

// --- Spa derivation (single source — not asked a third time) ----------------

/** A spa/hot tub is present based on pool type + configuration features. */
export function isSpaPresent(state: AssessmentState): boolean {
  return (
    SPA_POOL_TYPES.includes(state.property.poolType) ||
    state.config.features.includes(ATTACHED_SPA_FEATURE)
  );
}

/** Pre-fill value for the spa type, derived from the same setup answers. */
export function derivedSpaType(state: AssessmentState): string {
  if (state.property.poolType === STANDALONE_HOT_TUB) return SPA_TYPE_STANDALONE;
  if (isSpaPresent(state)) return SPA_TYPE_ATTACHED;
  return "";
}

/**
 * Section rating with the auto-skip applied: when there's no spa, the spa
 * section is treated as N/A everywhere (rollup, counts, recs, PDF) regardless
 * of any stale value left in state.
 */
function ratingFor(state: AssessmentState, sectionId: string): Rating | undefined {
  if (sectionId === "spa" && !isSpaPresent(state)) return "N/A";
  return state.sections[sectionId]?.rating;
}

// --- Active steps (dynamic) -------------------------------------------------

/** The steps actually shown — drops the spa section when no spa is present. */
export function getActiveSteps(state: AssessmentState): WizardStep[] {
  return WIZARD_STEPS.filter((s) => s.sectionId !== "spa" || isSpaPresent(state));
}

// --- Roll-up ----------------------------------------------------------------

export type SectionRollup = { id: string; title: string; rating?: Rating };

export function sectionRollup(state: AssessmentState): SectionRollup[] {
  return SECTIONS.map((s) => ({
    id: s.id,
    title: s.title,
    rating: ratingFor(state, s.id),
  }));
}

export type OverallKey = "not-rated" | "good" | "monitor" | "attention";

/**
 * Derive overall condition from ACTUAL section ratings — never default to "Good".
 *   any ATTENTION                  -> Needs Attention
 *   any MONITOR (no ATTENTION)     -> Monitor Recommended
 *   something rated, none flagged  -> Good Condition  (GOOD and/or N/A)
 *   nothing actually rated         -> Not Yet Rated
 *
 * Counts include the auto-N/A spa so they match the roll-up, but the
 * "Not Yet Rated" check keys off real tech engagement so an auto-skipped spa
 * doesn't make an untouched assessment look started.
 */
export function overallCondition(state: AssessmentState): {
  key: OverallKey;
  label: string;
  counts: Record<Rating, number>;
} {
  const counts: Record<Rating, number> = { GOOD: 0, MONITOR: 0, ATTENTION: 0, "N/A": 0 };
  let actuallyRated = 0;
  for (const s of SECTIONS) {
    const r = ratingFor(state, s.id);
    if (r) counts[r] += 1;
    if (state.sections[s.id]?.rating) actuallyRated += 1;
  }

  let key: OverallKey;
  let label: string;
  if (actuallyRated === 0) {
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
    const rating = ratingFor(state, s.id);
    if (!rating || !FLAGGED_RATINGS.includes(rating)) continue;
    const hasPhoto = Object.values(state.sections[s.id]?.photos ?? {}).some((p) => p?.dataUrl);
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
    const note = state.sections[sec.id]?.notes?.trim();
    push(ratingFor(state, sec.id), {
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
  // Inspector name is captured once on Property & Inspection and reused here.
  if (!state.details.inspectorName.trim()) reasons.push("Inspector name is required.");
  if (!state.certification.certified) reasons.push("Inspector certification must be checked.");
  for (const title of outstandingPhotoIssues(state)) {
    reasons.push(`${title}: add a photo for the flagged rating.`);
  }
  return { ok: reasons.length === 0, reasons };
}
