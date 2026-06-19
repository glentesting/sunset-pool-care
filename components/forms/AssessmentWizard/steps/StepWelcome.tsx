"use client";
import { useAssessment } from "../state";
import { RATING_LEGEND } from "../config";
import { PHASES } from "../steps";

const LEGEND_COLOR: Record<string, string> = {
  GOOD: "text-teal-dark",
  MONITOR: "text-orange-dark",
  ATTENTION: "text-red-600",
  "N/A": "text-navy/60",
};

export default function StepWelcome() {
  const { dispatch } = useAssessment();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-navy">Pool Condition Assessment</h2>
        <p className="mt-2 text-navy/60">
          Walk the property and capture the pool&apos;s condition. You&apos;ll move through
          four phases, then generate a branded customer report.
        </p>
      </div>

      <ol className="space-y-2">
        {PHASES.map((phase, i) => (
          <li key={phase} className="flex items-center gap-3 rounded-xl bg-sand p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal font-bold text-white">
              {i + 1}
            </span>
            <span className="font-semibold text-navy">{phase}</span>
          </li>
        ))}
      </ol>

      <div>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-navy/50">
          Rating legend
        </h3>
        <ul className="space-y-1">
          {RATING_LEGEND.map((l) => (
            <li key={l.rating} className="text-sm">
              <span className={`font-bold ${LEGEND_COLOR[l.rating]}`}>{l.rating}</span>
              <span className="text-navy/60"> — {l.meaning}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => dispatch({ type: "next" })}
        className="w-full rounded-xl bg-orange py-4 text-lg font-bold text-white hover:bg-orange-dark"
      >
        Get Started →
      </button>
    </div>
  );
}
