/**
 * Report scoring primitives — ONE implementation of the rules that turn item
 * ratings into section ratings, a count band, and the overall headline.
 *
 * Two callers need these and must never disagree:
 *   - the wizard (components/forms/AssessmentWizard/summary.ts + payload.ts),
 *     scoring live state keyed by config ids while a tech fills the form in;
 *   - the office review screen, re-scoring an ARCHIVED assessment after an edit,
 *     where the shape is different — labels and already-resolved statuses, no
 *     config defs to look anything up in (see lib/archive-scoring.ts).
 *
 * A regenerated report whose headline disagrees with its own contents is worse
 * than one that was never edited, so the arithmetic lives in one place rather
 * than being written twice and drifting.
 *
 * Deliberately dependency-free at runtime (the Rating import is type-only), so
 * it can be exercised in isolation.
 */
import type { Rating } from "@/lib/validation/assessment";

export type { Rating };

/** ATTENTION beats MONITOR beats GOOD beats N/A. */
export const SEVERITY: Record<Rating, number> = {
  "N/A": 0,
  GOOD: 1,
  MONITOR: 2,
  ATTENTION: 3,
};

/** Worst of a list of ratings; undefined entries are ignored. */
export function worstRating(ratings: (Rating | undefined)[]): Rating | undefined {
  let out: Rating | undefined;
  for (const r of ratings) {
    if (!r) continue;
    if (!out || SEVERITY[r] > SEVERITY[out]) out = r;
  }
  return out;
}

export type OverallKey = "not-rated" | "good" | "monitor" | "attention";

/** Tally of SECTION ratings — one entry per section, not per item. */
export type SectionCounts = Record<Rating, number>;

export const emptySectionCounts = (): SectionCounts => ({
  GOOD: 0,
  MONITOR: 0,
  ATTENTION: 0,
  "N/A": 0,
});

/**
 * The overall condition headline, from a tally of SECTION ratings.
 *
 *   any ATTENTION                  -> Needs Attention
 *   any MONITOR (no ATTENTION)     -> Monitor Recommended
 *   something rated, none flagged  -> Good Condition  (GOOD and/or N/A)
 *   nothing actually rated         -> Not Yet Rated
 *
 * `actuallyRated` is the count of sections a human actually rated. It excludes
 * the auto-N/A spa, which IS included in `counts` so the band matches the
 * roll-up — an untouched assessment must never look started.
 */
export function overallFromSectionCounts(
  counts: SectionCounts,
  actuallyRated: number
): { key: OverallKey; label: string; counts: SectionCounts } {
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

/** Report-wide per-ITEM count band — a different tally from SectionCounts. */
export type ItemCounts = { attention: number; monitor: number; good: number };

export const emptyItemCounts = (): ItemCounts => ({ attention: 0, monitor: 0, good: 0 });

/** Add one item's rating to the band. N/A and unrated contribute nothing. */
export function tallyItem(counts: ItemCounts, r?: Rating): void {
  if (r === "ATTENTION") counts.attention += 1;
  else if (r === "MONITOR") counts.monitor += 1;
  else if (r === "GOOD") counts.good += 1;
}
