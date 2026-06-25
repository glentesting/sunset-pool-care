"use client";
import { useAssessment } from "../state";
import { RATING_LEGEND } from "../config";
import { PHASES } from "../steps";
import DemoLoadButton from "../DemoLoadButton";

const LEGEND_DOT: Record<string, string> = {
  GOOD: "bg-good",
  MONITOR: "bg-monitor",
  ATTENTION: "bg-attention",
  "N/A": "bg-stone",
};

export default function StepWelcome() {
  const { dispatch } = useAssessment();
  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-semibold text-navy">
        Pool Condition Assessment
      </h2>

      <div>
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-navy/70">
          How it works
        </p>
        <ol className="divide-y divide-line border-y border-line">
          {PHASES.map((phase, i) => (
            <li key={phase} className="flex items-center gap-3 py-2.5">
              <span className="font-display text-sm font-semibold tabular-nums text-teal-dark">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-sm font-medium text-navy">{phase}</span>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-navy/70">
          Rating legend
        </p>
        <ul className="space-y-2.5">
          {RATING_LEGEND.map((l) => (
            <li key={l.rating} className="flex items-center gap-3 text-sm">
              <span className={`h-2 w-2 shrink-0 rounded-full ${LEGEND_DOT[l.rating]}`} aria-hidden />
              <span className="w-20 shrink-0 font-medium text-navy">
                {l.rating === "ATTENTION" ? "Attention" : l.rating === "N/A" ? "N/A" : l.rating.charAt(0) + l.rating.slice(1).toLowerCase()}
              </span>
              <span className="text-navy/70">{l.meaning}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => dispatch({ type: "next" })}
        className="w-full rounded-lg bg-orange py-3.5 text-base font-semibold text-white transition-colors hover:bg-orange-dark"
      >
        Get Started
      </button>

      {/* Only renders when ?demo=1 is present */}
      <DemoLoadButton />
    </div>
  );
}
