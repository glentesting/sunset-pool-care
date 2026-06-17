"use client";
import { useQualifier } from "./state";

/** StepContact — placeholder. Real UI (visual cards, pricing, paths) in forms phase. */
export default function StepContact() {
  const { dispatch } = useQualifier();
  return (
    <div data-step="StepContact" className="p-6">
      <p className="text-navy/60">StepContact (TODO)</p>
      <button className="mt-4 text-teal" onClick={() => dispatch({ type: "next" })}>
        Continue
      </button>
    </div>
  );
}
