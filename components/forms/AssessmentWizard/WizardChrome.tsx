"use client";
import type { ReactNode } from "react";
import { SITE } from "@/content/site";
import { useAssessment } from "./state";
import { WIZARD_STEPS, TOTAL_STEPS } from "./steps";

/**
 * The persistent frame around every step: brand bar, "Step X of 16" + phase,
 * progress bar, the step body, and the back/next footer.
 *
 * Welcome owns its own "Get Started" CTA and Review owns its own submit button,
 * so the footer Next is hidden on those two; Back is hidden on Welcome.
 */
export default function WizardChrome({ children }: { children: ReactNode }) {
  const { state, dispatch } = useAssessment();
  const idx = state.step;
  const step = WIZARD_STEPS[idx];
  const isWelcome = step?.id === "welcome";
  const isReview = step?.id === "review";
  const pct = Math.round(((idx + 1) / TOTAL_STEPS) * 100);

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col">
      <header className="sticky top-0 z-10 border-b border-navy/10 bg-white/95 px-5 pb-3 pt-4 backdrop-blur">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-bold tracking-widest text-teal-dark">
            {SITE.shortName} ASSESSMENT
          </span>
          <span className="text-xs font-medium text-navy/50">
            Step {idx + 1} of {TOTAL_STEPS}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-lg font-bold text-navy">{step?.title}</h1>
          <span className="text-xs text-navy/40">{step?.phase}</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-navy/10">
          <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${pct}%` }} />
        </div>
      </header>

      <main className="flex-1 px-5 py-6">{children}</main>

      {!state.submitted && (
        <footer className="sticky bottom-0 flex gap-3 border-t border-navy/10 bg-white px-5 py-3">
          {!isWelcome && (
            <button
              type="button"
              onClick={() => dispatch({ type: "back" })}
              className="rounded-xl border-2 border-navy/20 px-5 py-3 font-semibold text-navy"
            >
              Back
            </button>
          )}
          {!isWelcome && !isReview && (
            <button
              type="button"
              onClick={() => dispatch({ type: "next" })}
              className="flex-1 rounded-xl bg-orange py-3 font-semibold text-white hover:bg-orange-dark"
            >
              Next
            </button>
          )}
        </footer>
      )}
    </div>
  );
}
