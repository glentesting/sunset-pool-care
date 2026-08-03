/**
 * Builds the customer-facing WORDING for the whole report. Presentation layer
 * only — it never touches the deterministic ratings / recommendations.
 *
 * Polishes EVERY place a tech's raw words reach the customer — one place owns it,
 * with rules scoped per surface so the model doesn't over-help:
 *   - every section note (Good included)        → one clean sentence (polishNote)
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
// polishRecItem stays in lib/anthropic.ts but is UNUSED — the recommendations
// engine was removed (spec 1.6) and the prompt is deliberately kept on the shelf.
import { polishLabel, polishNote, polishText, summarize } from "@/lib/anthropic";

export type ReportPresentation = {
  summary?: string;
  /** sectionId -> homeowner-facing sentence (falls back to the raw note) */
  polishedNotes: Record<string, string>;
  /** polished Overall Assessment Notes (falls back to raw; undefined if none) */
  overallNotes?: string;
};

/** Section titles (with their note, if any) at a given rating — summary facts. */
function flaggedTitles(data: AssessmentData, rating: "ATTENTION" | "MONITOR"): string[] {
  return data.sections
    .filter((s) => s.rating === rating)
    .map((s) => (s.notes.trim() ? `${s.title} — ${s.notes.trim()}` : s.title));
}

export async function buildReportPresentation(data: AssessmentData): Promise<ReportPresentation> {
  try {
    const provided = data.presentation;

    // ITEM notes — Pass 3 spreads notes across many short per-item lines. Polish
    // them all CONCURRENTLY (one awaited batch, not one-at-a-time), mutating the
    // data in place so the PDF renders the cleaned text. Demo (no key) and any
    // failure fall back to the raw note. Provided demo text isn't keyed per item,
    // so item notes stay raw in demo — they're already short and clean.
    const itemNoteJobs: Promise<void>[] = [];
    const polishInto = (holder: { note?: string }, sectionTitle: string, status?: string) => {
      const raw = (holder.note ?? "").trim();
      if (!raw) return;
      itemNoteJobs.push(
        polishNote({ sectionTitle, rating: status ?? "", rawNote: raw }).then((out) => {
          holder.note = out ?? raw; // fallback: raw
        })
      );
    };
    for (const sec of data.sections) {
      for (const it of sec.items) polishInto(it, sec.title, it.status);
      for (const u of sec.units) for (const it of u.items) polishInto(it, sec.title, it.status);
    }
    await Promise.all(itemNoteJobs);

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
        });
        return [s.id, polished ?? s.notes.trim()] as const; // fallback: raw note
      })
    );
    const polishedNotes = Object.fromEntries(noteEntries);

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
    if (!overallNotes && data.overallNotes.trim()) {
      const raw = data.overallNotes.trim();
      overallNotes = (await polishText(raw)) ?? raw;
    }

    // Summary paragraph from structured findings only.
    let summary = provided?.summary?.trim() || undefined;
    if (!summary) {
      summary =
        (await summarize({
          overall: data.overall.label,
          goodCount: data.overall.counts.GOOD,
          // Facts for the summary now come straight from the sections — the
          // recommendations engine that used to supply them is gone.
          priority1: flaggedTitles(data, "ATTENTION"),
          priority2: flaggedTitles(data, "MONITOR"),
        })) ?? undefined;
    }

    return { summary, polishedNotes, overallNotes };
  } catch {
    return { polishedNotes: {} };
  }
}
