"use client";
import type { ReactNode } from "react";
import { SITE } from "@/content/site";
import { useAssessment } from "./state";
import { getActiveSteps } from "./summary";
import { PHASES, type Phase } from "./steps";

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

/**
 * Temporary SPC sun mark. Restrained — a thin navy/orange sun.
 * TODO: swap for the real Sunset Pool Care logo file when provided (drop it in
 * /public and replace this <BrandMark /> with an <Image>).
 */
function BrandMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <circle cx="12" cy="12" r="4.5" className="fill-orange" />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * Math.PI) / 4;
        const x1 = 12 + Math.cos(a) * 7.5;
        const y1 = 12 + Math.sin(a) * 7.5;
        const x2 = 12 + Math.cos(a) * 10;
        const y2 = 12 + Math.sin(a) * 10;
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-orange" strokeWidth="1.6" strokeLinecap="round" />
        );
      })}
    </svg>
  );
}

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
          <div className="flex items-center gap-2">
            <BrandMark />
            <span className="font-display text-[15px] font-semibold tracking-tight text-navy">
              {SITE.name}
            </span>
          </div>
          <span className="text-xs font-medium tabular-nums text-navy/45">
            {idx + 1} / {total}
          </span>
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <h1 className="text-lg font-semibold text-navy">{step?.title}</h1>
          <span className="text-[11px] font-medium uppercase tracking-wide text-teal-dark">
            {step ? PHASE_SHORT[step.phase] : ""}
          </span>
        </div>

        {/* Thin phase-aware progress: four segments, reached phases in teal */}
        <div className="mt-2 flex gap-1">
          {PHASES.map((phase, i) => (
            <div
              key={phase}
              className={`h-0.5 flex-1 rounded-full transition-colors ${
                i <= currentPhaseIdx ? "bg-teal" : "bg-navy/10"
              }`}
            />
          ))}
        </div>
      </header>

      <main key={idx} className="spc-step-anim flex-1 px-5 py-5">
        {children}
      </main>

      {!state.submitted && (
        <footer className="sticky bottom-0 flex gap-3 border-t border-line bg-white/95 px-5 py-3 backdrop-blur">
          {!isWelcome && (
            <button
              type="button"
              onClick={() => dispatch({ type: "back" })}
              className="rounded-lg border border-line px-5 py-3 text-sm font-medium text-navy/70 transition-colors hover:bg-sand"
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
