/**
 * Pure selectors over wizard state: spa presence, the active step list, the
 * DERIVED section ratings, the overall-condition roll-up (Review + PDF), the
 * outstanding-photo gate, and submit-eligibility. Kept dependency-free so the
 * client steps and the server payload builder reason about the same rules.
 */
import {
  CHEMISTRY_PARAMS,
  FLAGGED_RATINGS,
  SALT_SANITIZER,
  SECTIONS,
  SPA_POOL_TYPES,
  SPA_TYPE_ATTACHED,
  SPA_TYPE_STANDALONE,
  STANDALONE_HOT_TUB,
  UNIT_SECTIONS,
  getSection,
  type ItemDef,
  type Rating,
} from "./config";
import { WIZARD_STEPS, type WizardStep } from "./steps";
import {
  emptySectionCounts,
  overallFromSectionCounts,
  worstRating,
  type OverallKey,
} from "@/lib/report-scoring";
import { isValidEmail } from "@/lib/validation/email";
import type { AssessmentState, ItemState } from "./state";

/** Plain-language message for a missing/invalid customer email (shared UI + gate). */
export const EMAIL_ERROR = "We need the customer's email to file this assessment.";

// --- Spa derivation (single source — not asked a third time) ----------------

/**
 * A spa/hot tub is present based on POOL TYPE alone (spec 1.8).
 *
 * This used to also key off the "Attached Spa" configuration feature. The new
 * Features list drops that option, so Pool Type (Pool/Spa, or a stand-alone hot
 * tub) is now the single source of truth for whether the Spa section appears.
 */
export function isSpaPresent(state: AssessmentState): boolean {
  return SPA_POOL_TYPES.includes(state.property.poolType);
}

/** Pre-fill value for the spa type, derived from the same setup answers. */
export function derivedSpaType(state: AssessmentState): string {
  if (state.property.poolType === STANDALONE_HOT_TUB) return SPA_TYPE_STANDALONE;
  if (isSpaPresent(state)) return SPA_TYPE_ATTACHED;
  return "";
}

// --- Derived section rating (worst wins) ------------------------------------



/**
 * A single item's effective rating.
 *   condition -> its own rating
 *   binary    -> the good answer reads GOOD, the other reads ATTENTION
 * Unanswered items return undefined and are ignored everywhere (blank means
 * "not applicable" — it renders nothing on the report).
 */
export function itemRating(def: ItemDef, st: ItemState | undefined): Rating | undefined {
  if (!st) return undefined;
  if (def.kind === "binary") {
    if (!st.answer) return undefined;
    return st.answer === (def.goodAnswer ?? "yes") ? "GOOD" : "ATTENTION";
  }
  return st.rating;
}



/**
 * The section rating is DERIVED — sections no longer carry a manual rating.
 * Worst item wins (ATTENTION > MONITOR > GOOD); N/A only surfaces when it's the
 * only thing rated. Water Chemistry also folds in its parameter ratings, which
 * live in state.chemistry rather than in the item map.
 */
export function sectionRating(state: AssessmentState, sectionId: string): Rating | undefined {
  // No spa on site -> the section is N/A everywhere, whatever's left in state.
  if (sectionId === "spa" && !isSpaPresent(state)) return "N/A";

  const cfg = getSection(sectionId);
  const items = state.sections[sectionId]?.items ?? {};
  const ratings: (Rating | undefined)[] = (cfg?.items ?? []).map((def) =>
    itemRating(def, items[def.id])
  );

  if (sectionId === "chemistry") {
    const usesSalt = state.config.sanitization.includes(SALT_SANITIZER);
    for (const p of CHEMISTRY_PARAMS) {
      if (p.saltOnly && !usesSalt) continue;
      const row = state.chemistry[p.key];
      // No reading → no status contribution (a rating without a measurement is
      // meaningless and must not colour the section).
      if (!(row?.reading ?? "").trim()) continue;
      ratings.push(row?.rating);
    }
  }

  // Repeatable-unit sections (filters / pumps / lights / extras): each unit is
  // rated against its own per-unit checklist, keyed `${unitId}:${def.id}`.
  const unit = UNIT_SECTIONS[sectionId];
  if (unit) {
    for (const u of state[unit.list]) {
      for (const def of unit.defs) {
        ratings.push(itemRating(def, items[`${u.id}:${def.id}`]));
      }
    }
  }

  return worstRating(ratings);
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
    rating: sectionRating(state, s.id),
  }));
}

// The overall-condition key lives with the scoring rules; re-exported for the
// wizard components that already import it from here.
export type { OverallKey };

/**
 * Derive overall condition from ACTUAL section ratings — never default to "Good".
 *   any ATTENTION                  -> Needs Attention
 *   any MONITOR (no ATTENTION)     -> Monitor Recommended
 *   something rated, none flagged  -> Good Condition  (GOOD and/or N/A)
 *   nothing actually rated         -> Not Yet Rated
 *
 * Counts include the auto-N/A spa so they match the roll-up, but the
 * "Not Yet Rated" check ignores that auto-skip so an untouched assessment never
 * looks started.
 */
export function overallCondition(state: AssessmentState): {
  key: OverallKey;
  label: string;
  counts: Record<Rating, number>;
} {
  const counts = emptySectionCounts();
  let actuallyRated = 0;
  const spaAutoSkipped = !isSpaPresent(state);
  for (const s of SECTIONS) {
    const r = sectionRating(state, s.id);
    if (r) counts[r] += 1;
    if (r && !(s.id === "spa" && spaAutoSkipped)) actuallyRated += 1;
  }
  return overallFromSectionCounts(counts, actuallyRated);
}

/** Sections whose DERIVED rating is MONITOR/ATTENTION but that have no photo. */
export function outstandingPhotoIssues(state: AssessmentState): string[] {
  const issues: string[] = [];
  for (const s of SECTIONS) {
    const rating = sectionRating(state, s.id);
    if (!rating || !FLAGGED_RATINGS.includes(rating)) continue;
    const hasPhoto = Object.values(state.sections[s.id]?.photos ?? {}).some((p) => p?.dataUrl);
    if (!hasPhoto) issues.push(s.title);
  }
  return issues;
}

export function canSubmit(state: AssessmentState): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!state.property.customerName.trim()) reasons.push("Customer name is required.");
  if (!isValidEmail(state.property.customerEmail)) reasons.push(EMAIL_ERROR);
  // Inspector name is captured once on Property & Inspection and reused here.
  if (!state.details.inspectorName.trim()) reasons.push("Inspector name is required.");
  if (!state.certification.certified) reasons.push("Inspector certification must be checked.");
  for (const title of outstandingPhotoIssues(state)) {
    reasons.push(`${title}: add a photo for the flagged rating.`);
  }
  return { ok: reasons.length === 0, reasons };
}
