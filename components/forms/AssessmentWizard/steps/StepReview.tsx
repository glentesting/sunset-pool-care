"use client";
import { useAssessment, clearDraft, type SubmitResults } from "../state";
import { canSubmit, overallCondition, sectionRollup, type OverallKey } from "../summary";
import { buildSubmitPayload } from "../payload";
import NotesField from "../shared/NotesField";
import { RATING_DISPLAY as RATING_LABEL, type Rating } from "../config";

const RATING_DOT: Record<Rating, string> = {
  GOOD: "bg-good",
  MONITOR: "bg-monitor",
  ATTENTION: "bg-attention",
  "N/A": "bg-stone",
};
const RATING_TEXT: Record<Rating, string> = {
  GOOD: "text-good-dark",
  MONITOR: "text-monitor-dark",
  ATTENTION: "text-attention-dark",
  "N/A": "text-stone-dark",
};
const OVERALL_ACCENT: Record<OverallKey, string> = {
  "not-rated": "text-stone-dark",
  good: "text-good-dark",
  monitor: "text-monitor-dark",
  attention: "text-attention-dark",
};

const ORDER: Rating[] = ["GOOD", "MONITOR", "ATTENTION", "N/A"];

export default function StepReview() {
  const { state, dispatch } = useAssessment();
  const cert = state.certification;
  const { inspectorName, date } = state.details;

  if (state.submitted && state.results) {
    return <SubmittedScreen results={state.results} />;
  }

  const overall = overallCondition(state);
  const rollup = sectionRollup(state);
  const gate = canSubmit(state);

  async function submit() {
    if (state.submitting || state.submitted) return; // double-submit guard
    if (!gate.ok) return;
    dispatch({ type: "submitStart" });
    try {
      const res = await fetch("/api/submit-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSubmitPayload(state)),
      });
      const json = (await res.json()) as {
        results?: SubmitResults;
        pdfBase64?: string;
        filename?: string;
        error?: string;
      };
      if (!json.results) {
        dispatch({ type: "submitError", error: json.error ?? "Submission failed." });
        return;
      }
      if (json.pdfBase64) downloadPdf(json.pdfBase64, json.filename ?? "assessment.pdf");
      dispatch({ type: "submitDone", results: json.results });
      clearDraft();
    } catch {
      dispatch({ type: "submitError", error: "Could not reach the server. Check your connection and retry." });
    }
  }

  return (
    <div className="space-y-7">
      {/* Condition dashboard — calm, type-led */}
      <div className="rounded-xl border border-wiz-line p-5">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-wiz-ink/70">
          Overall Condition
        </p>
        <p className={`mt-1 font-display text-[26px] font-semibold leading-tight ${OVERALL_ACCENT[overall.key]}`}>
          {overall.label}
        </p>

        <div className="mt-5 grid grid-cols-4 divide-x divide-wiz-line border-t border-wiz-line pt-4">
          {ORDER.map((r) => (
            <div key={r} className="px-1 text-center">
              <div className="font-display text-2xl font-semibold tabular-nums text-wiz-ink">
                {overall.counts[r]}
              </div>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${RATING_DOT[r]}`} aria-hidden />
                <span className="text-[11px] font-semibold text-wiz-ink/70">{RATING_LABEL[r]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-section ratings in color (quiet) */}
      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-wiz-ink/70">
          Section ratings
        </p>
        <ul className="divide-y divide-wiz-line border-y border-wiz-line">
          {rollup.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-wiz-ink">{s.title}</span>
              {s.rating ? (
                <span className={`flex items-center gap-1.5 text-[13px] font-semibold ${RATING_TEXT[s.rating]}`}>
                  <span className={`h-2 w-2 rounded-full ${RATING_DOT[s.rating]}`} aria-hidden />
                  {RATING_LABEL[s.rating]}
                </span>
              ) : (
                <span className="text-[13px] font-medium text-wiz-ink/55">Not rated</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Overall assessment notes — moved here when the Recommendations step was
          removed (spec 1.6). Final step is now: notes → certification → submit. */}
      <div className="rounded-xl border border-wiz-line p-4">
        <NotesField
          label="Overall Assessment Notes"
          value={state.overallNotes}
          onChange={(notes) => dispatch({ type: "setOverallNotes", notes })}
          placeholder="Anything the homeowner should know overall…"
        />
      </div>

      {/* Certification — inspector + date captured once on Property & Inspection */}
      <div className="space-y-3 rounded-xl border border-wiz-line p-4">
        <h3 className="text-sm font-semibold text-wiz-ink">Inspector Certification</h3>
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-wiz-ink/60">Inspector</dt>
            <dd className="mt-0.5 text-sm font-medium text-wiz-ink">{inspectorName || "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-wiz-ink/60">Date</dt>
            <dd className="mt-0.5 text-sm font-medium text-wiz-ink">{date || "—"}</dd>
          </div>
        </dl>
        <label className="flex items-start gap-3 text-[13px] leading-relaxed text-wiz-ink/85">
          <input
            type="checkbox"
            checked={cert.certified}
            onChange={(e) => dispatch({ type: "setCertification", patch: { certified: e.target.checked } })}
            className="mt-0.5 h-4 w-4 shrink-0 accent-wiz-accent"
          />
          I certify that this report represents my honest assessment of the pool and equipment at the
          time of inspection.
        </label>
      </div>

      {!gate.ok && (
        <ul className="space-y-1 rounded-lg border border-attention/20 bg-attention/5 p-4 text-[13px] text-attention-dark">
          {gate.reasons.map((r) => (
            <li key={r}>• {r}</li>
          ))}
        </ul>
      )}

      {state.error && (
        <p className="rounded-lg border border-attention/20 bg-attention/5 p-4 text-[13px] font-medium text-attention-dark">
          {state.error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!gate.ok || state.submitting}
        className="w-full rounded-lg bg-wiz-action py-3.5 text-base font-semibold text-white transition-colors hover:bg-wiz-action-dark disabled:cursor-not-allowed disabled:opacity-40"
      >
        {state.submitting ? "Generating…" : "Generate Customer Report"}
      </button>
    </div>
  );
}

/**
 * Visual state of the submit screen. A tech needs two things at a glance: did
 * the report get out, and is there anything to do about it.
 *
 *   good      everything landed
 *   monitor   the office HAS the report, but the internal copy didn't save —
 *             nothing to redo on site
 *   attention the office did not get the report
 */
const TONE = {
  good: {
    mark: "✓",
    ring: "bg-good/10 text-good-dark",
    heading: "Report sent",
    headingClass: "text-wiz-ink",
    box: "",
  },
  monitor: {
    mark: "!",
    ring: "bg-monitor/10 text-monitor-dark",
    heading: "Sent — but not fully saved",
    headingClass: "text-monitor-dark",
    box: "border-monitor/25 bg-monitor/5 text-monitor-dark",
  },
  attention: {
    mark: "!",
    ring: "bg-attention/10 text-attention-dark",
    heading: "Report didn't reach the office",
    headingClass: "text-attention-dark",
    box: "border-attention/25 bg-attention/5 text-attention-dark",
  },
} as const;

function SubmittedScreen({ results }: { results: SubmitResults }) {
  // Each row reflects the REAL outcome — a green check on success, a visible
  // failure otherwise. No "pending setup" that lies when the code actually ran.
  const supabaseFail =
    results.supabaseReason === "not-configured"
      ? "PDF upload skipped — Supabase not configured"
      : results.supabaseReason === "error"
        ? "PDF upload failed — see submit log"
        : "PDF upload skipped — no PDF generated";

  // Raw assessment data (the JSON archive + its photo files). A partial photo
  // upload is a real failure — a re-render would come back missing images — so
  // it shows as one, with the count, rather than a green check.
  const photos = results.dataPhotos ?? { total: 0, uploaded: 0 };
  const photosLost = photos.total - photos.uploaded;
  const dataLabel = !results.data
    ? results.dataReason === "not-configured"
      ? "Assessment data not saved — Supabase not configured"
      : "Assessment data failed to save — see submit log"
    : photosLost > 0
      ? `Assessment data saved — ${photosLost} of ${photos.total} photos failed to upload`
      : photos.total > 0
        ? `Assessment data saved (${photos.total} photo${photos.total === 1 ? "" : "s"})`
        : "Assessment data saved (no photos)";

  const rows: { ok: boolean; label: string }[] = [
    {
      ok: results.pdf,
      label: results.pdf ? "PDF report generated & downloaded" : "PDF failed to generate",
    },
    { ok: results.supabase, label: results.supabase ? "PDF uploaded to Supabase" : supabaseFail },
    { ok: results.data && photosLost === 0, label: dataLabel },
    {
      ok: results.make,
      label: results.make ? "Sent to Make (HubSpot ticket)" : "Not sent to Make — see submit log",
    },
  ];

  // The delivery path is the PDF, its upload, and the ticket. The archive is an
  // internal durability copy — losing it doesn't stop the office getting the
  // report, so it must not be reported as if the report went missing.
  const officeHasIt = results.pdf && results.supabase && results.make;
  const allOk = rows.every((r) => r.ok);
  const tone = TONE[allOk ? "good" : officeHasIt ? "monitor" : "attention"];

  // Plain language for someone standing at a pool who has never heard of any of
  // the systems in the rows below. Says what happened, and what to do about it.
  const problem = allOk
    ? null
    : officeHasIt
      ? "The office has your report. A backup copy didn't save — nothing to redo, just show this screen to Brian or Brent."
      : results.pdf
        ? "Report saved to your phone, but it didn't reach the office. Show this screen to Brian or Brent."
        : "The report didn't generate, and nothing reached the office. Show this screen to Brian or Brent.";

  return (
    <div className="space-y-6 py-4 text-center">
      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-xl ${tone.ring}`}
      >
        {tone.mark}
      </div>
      <div>
        <h2 className={`font-display text-2xl font-semibold ${tone.headingClass}`}>
          {tone.heading}
        </h2>
        {/* Only claim the download when a PDF actually exists. */}
        {results.pdf && (
          <p className="mt-1 text-sm text-wiz-ink/70">Your PDF should be downloading now.</p>
        )}
      </div>

      {problem && (
        <p className={`rounded-lg border p-4 text-left text-[13px] font-medium leading-relaxed ${tone.box}`}>
          {problem}
        </p>
      )}

      {/* The per-step rows are useless to a tech but the first thing anyone
          debugging wants, so they're kept and folded away — and forced open
          whenever something failed, so a problem can never hide behind a tap. */}
      <details open={!allOk} className="group rounded-lg border border-wiz-line text-left">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[13px] font-semibold text-wiz-ink/70 [&::-webkit-details-marker]:hidden">
          Technical details
          <span className="text-wiz-ink/40 transition-transform group-open:rotate-180" aria-hidden>
            ▾
          </span>
        </summary>
        <ul className="divide-y divide-wiz-line border-t border-wiz-line px-4">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center gap-3 py-3">
              <span className={r.ok ? "text-good-dark" : "text-attention-dark"}>
                {r.ok ? "✓" : "✕"}
              </span>
              <span className={`flex-1 text-[13px] ${r.ok ? "text-wiz-ink" : "text-attention-dark"}`}>
                {r.label}
              </span>
            </li>
          ))}
        </ul>
      </details>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="w-full rounded-lg border border-wiz-field py-3 text-sm font-semibold text-wiz-ink transition-colors hover:bg-wiz-surface"
      >
        Start New Assessment
      </button>
    </div>
  );
}

function downloadPdf(base64: string, filename: string) {
  try {
    const bytes = atob(base64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    /* download is best-effort; status screen still shows pdf=true */
  }
}
