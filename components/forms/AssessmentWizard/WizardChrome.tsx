"use client";
import type { ReactNode } from "react";
import { SITE } from "@/content/site";
import { useAssessment } from "./state";
import { WIZARD_STEPS, TOTAL_STEPS, PHASES, type Phase } from "./steps";

/**
 * The persistent frame around every step: brand bar, "Step X of 16", a
 * phase-aware stepper (which of the 4 phases the tech is in), a progress bar,
 * the animated step body, and the back/next footer.
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
  const idx = state.step;
  const step = WIZARD_STEPS[idx];
  const isWelcome = step?.id === "welcome";
  const isReview = step?.id === "review";
  const pct = Math.round(((idx + 1) / TOTAL_STEPS) * 100);
  const currentPhaseIdx = step ? PHASES.indexOf(step.phase) : 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col bg-white">
      <header className="sticky top-0 z-10 border-b border-navy/10 bg-white/95 px-5 pb-3 pt-4 backdrop-blur">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-sm font-bold tracking-[0.18em] text-teal-dark">
            {SITE.shortName} ASSESSMENT
          </span>
          <span className="text-xs font-medium text-navy/50">
            Step {idx + 1} of {TOTAL_STEPS}
          </span>
        </div>

        <h1 className="mt-1 text-xl font-bold text-navy">{step?.title}</h1>

        {/* Phase-aware stepper */}
        <div className="mt-3 flex gap-1.5">
          {PHASES.map((phase, i) => {
            const done = i < currentPhaseIdx;
            const active = i === currentPhaseIdx;
            return (
              <div key={phase} className="flex-1">
                <div
                  className={`h-1.5 rounded-full ${
                    active ? "bg-teal" : done ? "bg-teal/50" : "bg-navy/10"
                  }`}
                />
                <span
                  className={`mt-1 block text-[10px] font-semibold ${
                    active ? "text-teal-dark" : "text-navy/35"
                  }`}
                >
                  {PHASE_SHORT[phase]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Fine-grained progress within the whole wizard */}
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-navy/10">
          <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${pct}%` }} />
        </div>
      </header>

      <main key={idx} className="spc-step-anim flex-1 px-5 py-6">
        {children}
      </main>

      {!state.submitted && (
        <footer className="sticky bottom-0 flex gap-3 border-t border-navy/10 bg-white px-5 py-3">
          {!isWelcome && (
            <button
              type="button"
              onClick={() => dispatch({ type: "back" })}
              className="rounded-xl border-2 border-navy/20 px-5 py-3 font-semibold text-navy active:scale-95"
            >
              Back
            </button>
          )}
          {!isWelcome && !isReview && (
            <button
              type="button"
              onClick={() => dispatch({ type: "next" })}
              className="flex-1 rounded-xl bg-orange py-3 font-semibold text-white shadow-lift transition-colors hover:bg-orange-dark active:scale-[0.98]"
            >
              Next
            </button>
          )}
        </footer>
      )}
    </div>
  );
}
