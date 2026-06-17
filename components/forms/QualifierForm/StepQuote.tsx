"use client";
import { useQualifier } from "./state";

/** StepQuote — placeholder. Real UI (visual cards, pricing, paths) in forms phase. */
export default function StepQuote() {
  const { dispatch } = useQualifier();
  return (
    <div data-step="StepQuote" className="p-6">
      <p className="text-navy/60">StepQuote (TODO)</p>
      <button className="mt-4 text-teal" onClick={() => dispatch({ type: "next" })}>
        Continue
      </button>
    </div>
  );
}
