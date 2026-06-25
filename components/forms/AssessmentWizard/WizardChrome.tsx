"use client";
import type { ReactNode } from "react";
import { SITE } from "@/content/site";
import { useAssessment } from "./state";
import { getActiveSteps } from "./summary";
import { PHASES, type Phase } from "./steps";
import DemoLoadButton from "./DemoLoadButton";

/**
 * The persistent frame around every step: a quiet branded header (SPC wordmark +
 * sun mark), a thin phase/progress indicator, the animated step body, and the
 * back/next footer.
 *
 * Welcome owns its own "Get Started" CTA and Review owns its own submit button,
 * so the footer Next is hidden on those two; Back is hidden on Welcome.
 */
const PHASE_SHORT: Record<Phase, string> = {
  "Property & Inspection": "Property",
  Configuration: "Config",
  "Inspection Sections": "Sections",
  "Recommendations & Submit": "Report",
};

export default function WizardChrome({ children }: { children: ReactNode }) {
  const { state, dispatch } = useAssessment();
  const steps = getActiveSteps(state);
  const total = steps.length;
  const idx = Math.min(state.step, total - 1);
  const step = steps[idx];
  const isWelcome = step?.id === "welcome";
  const isReview = step?.id === "review";
  const currentPhaseIdx = step ? PHASES.indexOf(step.phase) : 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col bg-white">
      <header className="sticky top-0 z-10 border-b border-line bg-white/90 px-5 pb-2.5 pt-3.5 backdrop-blur">
        <div className="flex items-center justify-between">
          {/* Real current SPC logo (colorful badge). Square — kept compact to
              fit the header height cleanly. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/spc-logo-color.png" alt={SITE.name} className="h-10 w-auto" />
          <span className="text-xs font-semibold tabular-nums text-navy/70">
            {idx + 1} / {total}
          </span>
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <h1 className="text-lg font-semibold text-navy">{step?.title}</h1>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-teal-dark">
            {step ? PHASE_SHORT[step.phase] : ""}
          </span>
        </div>

        {/* Thin phase-aware progress: four segments, reached phases in teal */}
        <div className="mt-2 flex gap-1">
          {PHASES.map((phase, i) => (
            <div
              key={phase}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= currentPhaseIdx ? "bg-teal" : "bg-navy/20"
              }`}
            />
          ))}
        </div>
      </header>

      <main key={idx} className="spc-step-anim flex-1 px-5 py-5">
        {children}
      </main>

      {/* Floating sample-data button for mid-flow / resumed drafts (?demo=1 only).
          Welcome has its own inline button, so skip it there. */}
      {!isWelcome && !state.submitted && <DemoLoadButton floating />}

      {!state.submitted && (
        <footer className="sticky bottom-0 flex gap-3 border-t border-line bg-white/95 px-5 py-3 backdrop-blur">
          {!isWelcome && (
            <button
              type="button"
              onClick={() => dispatch({ type: "back" })}
              className="rounded-lg border border-field px-5 py-3 text-sm font-semibold text-navy transition-colors hover:bg-sand"
            >
              Back
            </button>
          )}
          {!isWelcome && !isReview && (
            <button
              type="button"
              onClick={() => dispatch({ type: "next" })}
              className="flex-1 rounded-lg bg-orange py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-dark"
            >
              Next
            </button>
          )}
        </footer>
      )}
    </div>
  );
}
