/**
 * Builds the customer-facing WORDING for the report (summary paragraph + one
 * polished sentence per flagged section's note). Presentation layer only — it
 * never touches the deterministic ratings / recommendations.
 *
 * Resolution order per field:
 *   1. Client-provided text wins (the ?demo=1 sample report ships pre-written
 *      text so the AI features are demonstrable with no API key).
 *   2. Otherwise call the Claude API.
 *   3. On any failure: polished notes fall back to the tech's RAW note; the
 *      summary is omitted. This whole function never throws — worst case it
 *      returns raw notes and no summary, so the report is never blocked.
 */
import "server-only";
import type { AssessmentData } from "@/lib/validation/assessment";
import { polishNote, summarize } from "@/lib/anthropic";

export type ReportPresentation = {
  summary?: string;
  /** sectionId -> homeowner-facing sentence (falls back to the raw note) */
  polishedNotes: Record<string, string>;
};

const FLAGGED = new Set(["MONITOR", "ATTENTION"]);

export async function buildReportPresentation(data: AssessmentData): Promise<ReportPresentation> {
  try {
    const provided = data.presentation;
    const flagged = data.sections.filter(
      (s) => s.rating && FLAGGED.has(s.rating) && s.notes.trim()
    );

    // One polished sentence per flagged note (parallel; each independent).
    const entries = await Promise.all(
      flagged.map(async (s) => {
        const pre = provided?.polishedNotes?.[s.id]?.trim();
        if (pre) return [s.id, pre] as const;
        const polished = await polishNote({
          sectionTitle: s.title,
          rating: s.rating as string,
          rawNote: s.notes.trim(),
        });
        return [s.id, polished ?? s.notes.trim()] as const; // fallback: raw note
      })
    );
    const polishedNotes = Object.fromEntries(entries);

    // Summary from structured findings only.
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

    return { summary, polishedNotes };
  } catch {
    return { polishedNotes: {} };
  }
}
