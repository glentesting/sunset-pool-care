"use client";
import { useEffect } from "react";
import { useAssessment, clearDraft, type SubmitResults } from "../state";
import { canSubmit, overallCondition, sectionRollup } from "../summary";
import { buildSubmitPayload } from "../payload";
import type { Rating } from "../config";

const RATING_DOT: Record<Rating, string> = {
  GOOD: "bg-teal",
  MONITOR: "bg-orange",
  ATTENTION: "bg-red-600",
  "N/A": "bg-navy/30",
};

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
    // Double-submit guard: ignore taps while in flight or after success.
    if (state.submitting || state.submitted) return;
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
      <div className="rounded-xl bg-navy p-5 text-white">
        <p className="text-xs uppercase tracking-widest text-white/60">Overall Condition</p>
        <p className="mt-1 text-2xl font-bold">{overall.label}</p>
        <p className="mt-2 text-sm text-white/70">
          {overall.counts.GOOD} good · {overall.counts.MONITOR} monitor ·{" "}
          {overall.counts.ATTENTION} attention · {overall.counts["N/A"]} n/a
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-navy/50">
          Section ratings
        </h3>
        <ul className="space-y-1">
          {rollup.map((s) => (
            <li key={s.id} className="flex items-center justify-between text-sm">
              <span className="text-navy/80">{s.title}</span>
              <span className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${s.rating ? RATING_DOT[s.rating] : "bg-navy/15"}`} />
                <span className="font-semibold text-navy/60">{s.rating ?? "—"}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3 rounded-xl border-2 border-navy/10 bg-sand p-4">
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
        <ul className="space-y-1 rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {gate.reasons.map((r) => (
            <li key={r}>• {r}</li>
          ))}
        </ul>
      )}

      {state.error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600">{state.error}</p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!gate.ok || state.submitting}
        className="w-full rounded-xl bg-orange py-4 text-lg font-bold text-white hover:bg-orange-dark disabled:cursor-not-allowed disabled:opacity-50"
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
      <h2 className="text-2xl font-bold text-navy">Report Generated</h2>
      <p className="text-navy/60">
        Your PDF should be downloading now. Here&apos;s what landed:
      </p>
      <ul className="space-y-2 text-left">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-3 rounded-xl border-2 border-navy/10 p-3">
            <span className={results[r.key] ? "text-teal-dark" : "text-navy/40"}>
              {results[r.key] ? "✓" : "○"}
            </span>
            <span className="flex-1 text-sm text-navy/80">{r.label}</span>
            {r.stubbed && !results[r.key] && (
              <span className="rounded-full bg-navy/5 px-2 py-0.5 text-xs text-navy/50">
                pending setup
              </span>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="w-full rounded-xl border-2 border-navy/20 py-3 font-semibold text-navy"
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
