"use client";
import { useEffect } from "react";
import { useAssessment, clearDraft, type SubmitResults } from "../state";
import { canSubmit, overallCondition, sectionRollup, type OverallKey } from "../summary";
import { buildSubmitPayload } from "../payload";
import type { Rating } from "../config";

const RATING_UI: Record<Rating, { short: string; solid: string; soft: string }> = {
  GOOD: { short: "GOOD", solid: "bg-good text-white", soft: "bg-good/10 text-good-dark" },
  MONITOR: { short: "MONITOR", solid: "bg-monitor text-white", soft: "bg-monitor/10 text-monitor-dark" },
  ATTENTION: { short: "ATTN", solid: "bg-attention text-white", soft: "bg-attention/10 text-attention" },
  "N/A": { short: "N/A", solid: "bg-stone text-white", soft: "bg-stone/10 text-stone" },
};

const OVERALL_ACCENT: Record<OverallKey, string> = {
  "not-rated": "text-stone",
  good: "text-good",
  monitor: "text-monitor",
  attention: "text-attention",
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
    <div className="space-y-6">
      {/* Condition dashboard */}
      <div className="rounded-3xl bg-navy p-5 text-white shadow-card">
        <p className="text-xs uppercase tracking-widest text-white/50">Overall Condition</p>
        <p className={`mt-1 font-display text-3xl font-bold ${OVERALL_ACCENT[overall.key]}`}>
          {overall.label}
        </p>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {ORDER.map((r) => (
            <div key={r} className="rounded-xl bg-white/5 px-1 py-2 text-center">
              <div className="font-display text-2xl font-bold text-white">{overall.counts[r]}</div>
              <div
                className={`mx-auto mt-1 w-fit rounded-full px-2 py-0.5 text-[10px] font-bold ${RATING_UI[r].solid}`}
              >
                {RATING_UI[r].short}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-section ratings in color */}
      <div>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-navy/50">
          Section ratings
        </h3>
        <ul className="divide-y divide-navy/5 overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-card">
          {rollup.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm text-navy/80">{s.title}</span>
              {s.rating ? (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${RATING_UI[s.rating].soft}`}>
                  {RATING_UI[s.rating].short}
                </span>
              ) : (
                <span className="rounded-full bg-navy/5 px-2.5 py-0.5 text-xs font-semibold text-navy/40">
                  Not rated
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Certification */}
      <div className="space-y-3 rounded-2xl border border-navy/10 bg-sand p-4">
        <h3 className="font-bold text-navy">Inspector Certification</h3>
        <div>
          <label className="mb-1 block text-sm font-semibold text-navy">Inspector Name</label>
          <input
            value={cert.inspectorName}
            onChange={(e) => dispatch({ type: "setCertification", patch: { inspectorName: e.target.value } })}
            className="w-full rounded-xl border-2 border-navy/15 p-3 text-base text-navy focus:border-teal focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-navy">Date</label>
          <input
            type="date"
            value={cert.date}
            onChange={(e) => dispatch({ type: "setCertification", patch: { date: e.target.value } })}
            className="w-full rounded-xl border-2 border-navy/15 p-3 text-base text-navy focus:border-teal focus:outline-none"
          />
        </div>
        <label className="flex items-start gap-3 text-sm text-navy/80">
          <input
            type="checkbox"
            checked={cert.certified}
            onChange={(e) => dispatch({ type: "setCertification", patch: { certified: e.target.checked } })}
            className="mt-0.5 h-5 w-5 shrink-0 accent-teal"
          />
          I certify that this report represents my honest assessment of the pool and equipment at the
          time of inspection.
        </label>
      </div>

      {!gate.ok && (
        <ul className="space-y-1 rounded-2xl bg-attention/10 p-4 text-sm text-attention">
          {gate.reasons.map((r) => (
            <li key={r}>• {r}</li>
          ))}
        </ul>
      )}

      {state.error && (
        <p className="rounded-2xl bg-attention/10 p-4 text-sm font-medium text-attention">{state.error}</p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!gate.ok || state.submitting}
        className="w-full rounded-2xl bg-orange py-4 text-lg font-bold text-white shadow-lift transition-colors hover:bg-orange-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
      >
        {state.submitting ? "Generating…" : "Generate Customer Report →"}
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
    <div className="space-y-6 text-center">
      <div className="text-5xl">✅</div>
      <h2 className="font-display text-2xl font-bold text-navy">Report Generated</h2>
      <p className="text-navy/60">Your PDF should be downloading now. Here&apos;s what landed:</p>
      <ul className="space-y-2 text-left">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-3 rounded-2xl border border-navy/10 bg-white p-3 shadow-card">
            <span className={results[r.key] ? "text-good" : "text-navy/40"}>
              {results[r.key] ? "✓" : "○"}
            </span>
            <span className="flex-1 text-sm text-navy/80">{r.label}</span>
            {r.stubbed && !results[r.key] && (
              <span className="rounded-full bg-navy/5 px-2 py-0.5 text-xs text-navy/50">pending setup</span>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="w-full rounded-2xl border-2 border-navy/20 py-3 font-semibold text-navy active:scale-[0.98]"
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
