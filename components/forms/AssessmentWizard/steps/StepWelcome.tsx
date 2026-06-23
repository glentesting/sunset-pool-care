"use client";
import { useAssessment } from "../state";
import { RATING_LEGEND } from "../config";
import { PHASES } from "../steps";

const LEGEND_DOT: Record<string, string> = {
  GOOD: "bg-good",
  MONITOR: "bg-monitor",
  ATTENTION: "bg-attention",
  "N/A": "bg-stone",
};

export default function StepWelcome() {
  const { dispatch } = useAssessment();
  return (
    <div className="space-y-8">
      {/* Restrained hero — type carries it */}
      <div>
        <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-teal-dark">
          Pool Condition Assessment
        </p>
        <h2 className="mt-2 font-display text-[28px] font-semibold leading-[1.1] text-navy">
          Inspect, rate, and generate a customer report — from your phone.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-navy/55">
          Walk the property through four short phases. Ratings and photos flow
          straight into a branded PDF for the customer.
        </p>
      </div>

      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-navy/40">
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
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-navy/40">
          Rating legend
        </p>
        <ul className="space-y-2.5">
          {RATING_LEGEND.map((l) => (
            <li key={l.rating} className="flex items-center gap-3 text-sm">
              <span className={`h-2 w-2 shrink-0 rounded-full ${LEGEND_DOT[l.rating]}`} aria-hidden />
              <span className="w-20 shrink-0 font-medium text-navy">
                {l.rating === "ATTENTION" ? "Attention" : l.rating === "N/A" ? "N/A" : l.rating.charAt(0) + l.rating.slice(1).toLowerCase()}
              </span>
              <span className="text-navy/50">{l.meaning}</span>
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
    </div>
  );
}
