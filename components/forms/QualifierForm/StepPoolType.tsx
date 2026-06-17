"use client";
import { useQualifier } from "./state";

/** StepPoolType — placeholder. Real UI (visual cards, pricing, paths) in forms phase. */
export default function StepPoolType() {
  const { dispatch } = useQualifier();
  return (
    <div data-step="StepPoolType" className="p-6">
      <p className="text-navy/60">StepPoolType (TODO)</p>
      <button className="mt-4 text-teal" onClick={() => dispatch({ type: "next" })}>
        Continue
      </button>
    </div>
  );
}
