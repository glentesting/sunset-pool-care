"use client";
import { useEffect } from "react";
import { useAssessment, clearDraft, type SubmitResults } from "../state";
import { canSubmit, overallCondition, sectionRollup, type OverallKey } from "../summary";
import { buildSubmitPayload } from "../payload";
import type { Rating } from "../config";

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
  "N/A": "text-stone",
};
const RATING_LABEL: Record<Rating, string> = {
  GOOD: "Good",
  MONITOR: "Monitor",
  ATTENTION: "Attn",
  "N/A": "N/A",
};
const OVERALL_ACCENT: Record<OverallKey, string> = {
  "not-rated": "text-stone",
  good: "text-good-dark",
  monitor: "text-monitor-dark",
  attention: "text-attention-dark",
};

const ORDER: Rating[] = ["GOOD", "MONITOR", "ATTENTION", "N/A"];

export default function StepReview() {
  const { state, dispatch } = useAssessment();
  const cert = state.certification;

  // Prefill certification from the inspection details once.
  useEffect(() => {
    const patch: Partial<typeof cert> = {};
    if (!cert.inspectorName && state.details.inspectorName) patch.inspectorName = state.details.inspectorName;
    if (!cert.date) patch.date = state.details.date;
    if (Object.keys(patch).length) dispatch({ type: "setCertification", patch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <div className="rounded-xl border border-line p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-navy/40">
          Overall Condition
        </p>
        <p className={`mt-1 font-display text-[26px] font-semibold leading-tight ${OVERALL_ACCENT[overall.key]}`}>
          {overall.label}
        </p>

        <div className="mt-5 grid grid-cols-4 divide-x divide-line border-t border-line pt-4">
          {ORDER.map((r) => (
            <div key={r} className="px-1 text-center">
              <div className="font-display text-2xl font-semibold tabular-nums text-navy">
                {overall.counts[r]}
              </div>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${RATING_DOT[r]}`} aria-hidden />
                <span className="text-[11px] font-medium text-navy/45">{RATING_LABEL[r]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-section ratings in color (quiet) */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-navy/40">
          Section ratings
        </p>
        <ul className="divide-y divide-line border-y border-line">
          {rollup.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-navy/75">{s.title}</span>
              {s.rating ? (
                <span className={`flex items-center gap-1.5 text-[13px] font-medium ${RATING_TEXT[s.rating]}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${RATING_DOT[s.rating]}`} aria-hidden />
                  {RATING_LABEL[s.rating]}
                </span>
              ) : (
                <span className="text-[13px] text-navy/30">Not rated</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Certification */}
      <div className="space-y-3 rounded-xl border border-line p-4">
        <h3 className="text-sm font-semibold text-navy">Inspector Certification</h3>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-navy/65">Inspector Name</label>
          <input
            value={cert.inspectorName}
            onChange={(e) => dispatch({ type: "setCertification", patch: { inspectorName: e.target.value } })}
            className="w-full rounded-lg border border-line p-3 text-base text-navy focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-navy/65">Date</label>
          <input
            type="date"
            value={cert.date}
            onChange={(e) => dispatch({ type: "setCertification", patch: { date: e.target.value } })}
            className="w-full rounded-lg border border-line p-3 text-base text-navy focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal/30"
          />
        </div>
        <label className="flex items-start gap-3 text-[13px] leading-relaxed text-navy/70">
          <input
            type="checkbox"
            checked={cert.certified}
            onChange={(e) => dispatch({ type: "setCertification", patch: { certified: e.target.checked } })}
            className="mt-0.5 h-4 w-4 shrink-0 accent-teal"
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
        className="w-full rounded-lg bg-orange py-3.5 text-base font-semibold text-white transition-colors hover:bg-orange-dark disabled:cursor-not-allowed disabled:opacity-40"
      >
        {state.submitting ? "Generating…" : "Generate Customer Report"}
      </button>
    </div>
  );
}

function SubmittedScreen({ results }: { results: SubmitResults }) {
  const rows: { key: keyof SubmitResults; label: string; stubbed?: boolean }[] = [
    { key: "pdf", label: "PDF report generated & downloaded" },
    { key: "drive", label: "Uploaded to Google Drive", stubbed: true },
    { key: "hubspot", label: "HubSpot contact & tasks", stubbed: true },
    { key: "skimmer", label: "Logged to Skimmer", stubbed: true },
  ];
  return (
    <div className="space-y-6 py-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-good/10 text-xl text-good-dark">
        ✓
      </div>
      <div>
        <h2 className="font-display text-2xl font-semibold text-navy">Report Generated</h2>
        <p className="mt-1 text-sm text-navy/55">Your PDF should be downloading now.</p>
      </div>
      <ul className="divide-y divide-line border-y border-line text-left">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-3 py-3">
            <span className={results[r.key] ? "text-good-dark" : "text-navy/30"}>
              {results[r.key] ? "✓" : "○"}
            </span>
            <span className="flex-1 text-[13px] text-navy/75">{r.label}</span>
            {r.stubbed && !results[r.key] && (
              <span className="text-[11px] text-navy/40">pending setup</span>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="w-full rounded-lg border border-line py-3 text-sm font-medium text-navy/70 transition-colors hover:bg-sand"
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
