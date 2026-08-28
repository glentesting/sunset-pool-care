/**
 * Re-score an ARCHIVED assessment after an office edit.
 *
 * The wizard scores live state (config ids, item defs, `state.chemistry`).
 * The archive is a different shape: sections carry labels and already-resolved
 * statuses, with no config to look anything up in. This module applies the SAME
 * rules — imported from lib/report-scoring.ts, never re-implemented — to that
 * shape, so an edited report's headline and count band can't drift away from its
 * own contents.
 *
 * Two DIFFERENT tallies come out of here and both matter:
 *   - `itemCounts`  the count band under the headline, one entry per ITEM
 *   - `overall`     the headline itself, from a tally of SECTION ratings
 * Recalculating one and not the other is exactly how a report ends up claiming
 * "Needs Attention" over a page with nothing flagged on it.
 *
 * INVARIANT, proven rather than assumed: run over an UNEDITED archive this
 * reproduces the values the wizard already stored, field for field. See
 * scripts/verify-archive-scoring.mjs.
 */
import {
  emptyItemCounts,
  emptySectionCounts,
  overallFromSectionCounts,
  tallyItem,
  worstRating,
  type ItemCounts,
  type OverallKey,
  type Rating,
  type SectionCounts,
} from "./report-scoring";

/** The spa section's stored spaType when there is no spa on site. */
const SPA_ABSENT = "N/A — No Spa";
const SPA_SECTION_ID = "spa";

/** Only the fields scoring reads — so this works on an archive or a payload. */
export type ScorableItem = { status?: Rating };
export type ScorableSection = {
  id: string;
  rating?: Rating;
  items: ScorableItem[];
  units: { items: ScorableItem[] }[];
};
export type ScorableAssessment = {
  spaType: string;
  sections: ScorableSection[];
  chemistry: { reading: string; rating?: Rating }[];
  configOptions: { status?: Rating }[];
};

export type Rescored = {
  /** sectionId -> recomputed rating (undefined = nothing rated in it). */
  sectionRatings: Record<string, Rating | undefined>;
  itemCounts: ItemCounts;
  overall: { key: OverallKey; label: string; counts: SectionCounts };
};

/**
 * One section's rating: the worst of its own items, its per-unit items, and —
 * for Water Chemistry — its parameter ratings. A reading-less chemistry row
 * contributes nothing, the same gate the wizard applies (a status with no
 * measurement is a claim nobody made).
 */
function rateSection(section: ScorableSection, data: ScorableAssessment): Rating | undefined {
  // No spa on site: the section is N/A whatever else is in there.
  if (section.id === SPA_SECTION_ID && data.spaType === SPA_ABSENT) return "N/A";

  const ratings: (Rating | undefined)[] = [];
  for (const it of section.items) ratings.push(it.status);
  for (const u of section.units) for (const it of u.items) ratings.push(it.status);
  if (section.id === "chemistry") {
    for (const c of data.chemistry) {
      if (!(c.reading ?? "").trim()) continue;
      ratings.push(c.rating);
    }
  }
  return worstRating(ratings);
}

/** Recompute every derived score from the assessment's own contents. */
export function rescoreAssessment(data: ScorableAssessment): Rescored {
  const sectionRatings: Record<string, Rating | undefined> = {};
  const sectionCounts = emptySectionCounts();
  const spaAutoSkipped = data.spaType === SPA_ABSENT;
  let actuallyRated = 0;

  for (const section of data.sections) {
    const rating = rateSection(section, data);
    sectionRatings[section.id] = rating;
    if (rating) sectionCounts[rating] += 1;
    // The auto-N/A spa counts in the band but is not something a human rated.
    if (rating && !(section.id === SPA_SECTION_ID && spaAutoSkipped)) actuallyRated += 1;
  }

  // Per-ITEM band: every section item, every per-unit item, every rated config
  // option, and every chemistry parameter that carries a reading.
  const itemCounts = emptyItemCounts();
  for (const section of data.sections) {
    for (const it of section.items) tallyItem(itemCounts, it.status);
    for (const u of section.units) for (const it of u.items) tallyItem(itemCounts, it.status);
  }
  for (const c of data.chemistry) {
    if (!(c.reading ?? "").trim()) continue;
    tallyItem(itemCounts, c.rating);
  }
  for (const o of data.configOptions) tallyItem(itemCounts, o.status);

  return {
    sectionRatings,
    itemCounts,
    overall: overallFromSectionCounts(sectionCounts, actuallyRated),
  };
}
