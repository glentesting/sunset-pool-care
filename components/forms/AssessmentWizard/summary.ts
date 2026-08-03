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
import type { AssessmentState, ItemState } from "./state";

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

const SEVERITY: Record<Rating, number> = { "N/A": 0, GOOD: 1, MONITOR: 2, ATTENTION: 3 };

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

/** Worst of a list of ratings; undefined entries are ignored. */
function worst(ratings: (Rating | undefined)[]): Rating | undefined {
  let out: Rating | undefined;
  for (const r of ratings) {
    if (!r) continue;
    if (!out || SEVERITY[r] > SEVERITY[out]) out = r;
  }
  return out;
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
      ratings.push(state.chemistry[p.key]?.rating);
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

  return worst(ratings);
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

export type OverallKey = "not-rated" | "good" | "monitor" | "attention";

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
  const counts: Record<Rating, number> = { GOOD: 0, MONITOR: 0, ATTENTION: 0, "N/A": 0 };
  let actuallyRated = 0;
  const spaAutoSkipped = !isSpaPresent(state);
  for (const s of SECTIONS) {
    const r = sectionRating(state, s.id);
    if (r) counts[r] += 1;
    if (r && !(s.id === "spa" && spaAutoSkipped)) actuallyRated += 1;
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
  // Inspector name is captured once on Property & Inspection and reused here.
  if (!state.details.inspectorName.trim()) reasons.push("Inspector name is required.");
  if (!state.certification.certified) reasons.push("Inspector certification must be checked.");
  for (const title of outstandingPhotoIssues(state)) {
    reasons.push(`${title}: add a photo for the flagged rating.`);
  }
  return { ok: reasons.length === 0, reasons };
}
