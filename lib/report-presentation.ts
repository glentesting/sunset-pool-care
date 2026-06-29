/**
 * Builds the customer-facing WORDING for the whole report. Presentation layer
 * only — it never touches the deterministic ratings / recommendations.
 *
 * Polishes EVERY place a tech's raw words reach the customer — one place owns it,
 * with rules scoped per surface so the model doesn't over-help:
 *   - every section note (Good included)        → one clean sentence (polishNote)
 *   - every recommendation item (P1/P2)         → cleanup, no timing (polishRecItem)
 *   - the Overall Assessment Notes              → typo/grammar cleanup (polishText)
 *   - every photo label                         → tag-level cleanup only (polishLabel)
 *   - plus the structured summary paragraph
 *
 * Photo labels are mutated in place on `data` (the cleaned tag rides through to
 * the PDF, which is unchanged) — the lightest touch of any surface.
 *
 * Resolution order per field:
 *   1. Client-provided text wins (the ?demo=1 sample report ships pre-written
 *      text so the AI features are demonstrable with no API key).
 *   2. Otherwise call the Claude API.
 *   3. On any failure: fall back to the RAW text; the summary is omitted. This
 *      function never throws — worst case it returns raw text and no summary, so
 *      the report is never blocked.
 */
import "server-only";
import type { AssessmentData } from "@/lib/validation/assessment";
import { polishLabel, polishNote, polishRecItem, polishText, summarize } from "@/lib/anthropic";

export type ReportPresentation = {
  summary?: string;
  /** sectionId -> homeowner-facing sentence (falls back to the raw note) */
  polishedNotes: Record<string, string>;
  /** polished recommendation item text, aligned by index to recommendations.p1 / .p2 */
  recP1: string[];
  recP2: string[];
  /** polished Overall Assessment Notes (falls back to raw; undefined if none) */
  overallNotes?: string;
};

export async function buildReportPresentation(data: AssessmentData): Promise<ReportPresentation> {
  try {
    const provided = data.presentation;

    // Map sectionId -> its recommendation timeframe (a computed fact). The rec's
    // sourceKey ties it back to its section, e.g. "section:pump".
    const timeframeBySection: Record<string, string> = {};
    for (const r of [...data.recommendations.p1, ...data.recommendations.p2]) {
      const key = r.sourceKey;
      const tf = r.timeframe?.trim();
      if (key?.startsWith("section:") && tf) {
        const id = key.slice("section:".length);
        if (!timeframeBySection[id]) timeframeBySection[id] = tf;
      }
    }

    // Every section note that has text (Good included) → one clean sentence.
    const withNotes = data.sections.filter((s) => s.notes.trim());
    const noteEntries = await Promise.all(
      withNotes.map(async (s) => {
        const pre = provided?.polishedNotes?.[s.id]?.trim();
        if (pre) return [s.id, pre] as const;
        const polished = await polishNote({
          sectionTitle: s.title,
          rating: s.rating ?? "",
          rawNote: s.notes.trim(),
          timeframe: timeframeBySection[s.id], // undefined → polish from note alone
        });
        return [s.id, polished ?? s.notes.trim()] as const; // fallback: raw note
      })
    );
    const polishedNotes = Object.fromEntries(noteEntries);

    // Recommendation item text — provided (demo, by sourceKey) wins, else polish.
    const polishRec = async (r: { item: string; sourceKey?: string }): Promise<string> => {
      const pre = r.sourceKey ? provided?.recBySourceKey?.[r.sourceKey]?.trim() : undefined;
      if (pre) return pre;
      if (!r.item.trim()) return r.item;
      return (await polishRecItem(r.item)) ?? r.item;
    };
    const [recP1, recP2] = await Promise.all([
      Promise.all(data.recommendations.p1.map(polishRec)),
      Promise.all(data.recommendations.p2.map(polishRec)),
    ]);

    // Photo labels — tightest cleanup (tags, not sentences). Resolve each distinct
    // non-empty label (demo-provided wins, else polishLabel, else raw) and mutate
    // the photo objects in place so the (unchanged) PDF renders the cleaned tag.
    const rawLabels = new Set<string>();
    const collect = (photos: { label: string }[]) => {
      for (const p of photos) {
        const l = p.label.trim();
        if (l) rawLabels.add(l);
      }
    };
    data.sections.forEach((s) => collect(s.photos));
    collect(data.configPhotos);
    const labelMap: Record<string, string> = {};
    await Promise.all(
      [...rawLabels].map(async (raw) => {
        const pre = provided?.photoLabels?.[raw]?.trim();
        labelMap[raw] = pre || (await polishLabel(raw)) || raw; // fallback: raw label
      })
    );
    const applyLabels = (photos: { label: string }[]) => {
      for (const p of photos) {
        const l = p.label.trim();
        if (l && labelMap[l]) p.label = labelMap[l];
      }
    };
    data.sections.forEach((s) => applyLabels(s.photos));
    applyLabels(data.configPhotos);

    // Overall Assessment Notes.
    let overallNotes = provided?.overallNotes?.trim() || undefined;
    if (!overallNotes && data.recommendations.overallNotes.trim()) {
      const raw = data.recommendations.overallNotes.trim();
      overallNotes = (await polishText(raw)) ?? raw;
    }

    // Summary paragraph from structured findings only.
    let summary = provided?.summary?.trim() || undefined;
    if (!summary) {
      summary =
        (await summarize({
          overall: data.overall.label,
          goodCount: data.overall.counts.GOOD,
          priority1: data.recommendations.p1.map((r) => r.item).filter(Boolean),
          priority2: data.recommendations.p2.map((r) => r.item).filter(Boolean),
        })) ?? undefined;
    }

    return { summary, polishedNotes, recP1, recP2, overallNotes };
  } catch {
    return { polishedNotes: {}, recP1: [], recP2: [] };
  }
}
