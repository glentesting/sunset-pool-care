"use client";
import { SITE } from "@/content/site";
import { useAssessment } from "../state";
import { RATING_LEGEND } from "../config";
import { PHASES } from "../steps";

const LEGEND_COLOR: Record<string, string> = {
  GOOD: "bg-good",
  MONITOR: "bg-monitor",
  ATTENTION: "bg-attention",
  "N/A": "bg-stone",
};

export default function StepWelcome() {
  const { dispatch } = useAssessment();
  return (
    <div className="space-y-7">
      {/* Branded hero */}
      <div className="overflow-hidden rounded-3xl bg-navy p-6 text-white shadow-card">
        <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-teal">
          {SITE.name}
        </p>
        <h2 className="mt-2 font-display text-3xl font-bold leading-tight">
          Pool Condition Assessment
        </h2>
        <p className="mt-3 text-sm text-white/70">
          Walk the property, rate each system, and generate a branded customer
          report — all from your phone.
        </p>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/50">
          How it works
        </h3>
        <ol className="space-y-2">
          {PHASES.map((phase, i) => (
            <li key={phase} className="flex items-center gap-3 rounded-2xl bg-sand p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal font-display font-bold text-white">
                {i + 1}
              </span>
              <span className="font-semibold text-navy">{phase}</span>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/50">
          Rating legend
        </h3>
        <ul className="space-y-2">
          {RATING_LEGEND.map((l) => (
            <li key={l.rating} className="flex items-center gap-3 text-sm">
              <span
                className={`flex h-7 w-16 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${LEGEND_COLOR[l.rating]}`}
              >
                {l.rating === "ATTENTION" ? "ATTN" : l.rating}
              </span>
              <span className="text-navy/70">{l.meaning}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => dispatch({ type: "next" })}
        className="w-full rounded-2xl bg-orange py-4 text-lg font-bold text-white shadow-lift transition-colors hover:bg-orange-dark active:scale-[0.98]"
      >
        Get Started →
      </button>
    </div>
  );
}
