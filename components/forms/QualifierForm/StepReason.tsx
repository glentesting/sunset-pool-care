"use client";
import { useQualifier } from "./state";

/** StepReason — placeholder. Real UI (visual cards, pricing, paths) in forms phase. */
export default function StepReason() {
  const { dispatch } = useQualifier();
  return (
    <div data-step="StepReason" className="p-6">
      <p className="text-navy/60">StepReason (TODO)</p>
      <button className="mt-4 text-teal" onClick={() => dispatch({ type: "next" })}>
        Continue
      </button>
    </div>
  );
}
