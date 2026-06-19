"use client";
import { useAssessment, type RecItem } from "../state";
import { P1_TIMEFRAMES, P2_TIMEFRAMES } from "../config";
import { TextField, SelectField } from "../shared/Field";
import NotesField from "../shared/NotesField";

export default function StepRecommendations() {
  const { state, dispatch } = useAssessment();
  const r = state.recommendations;

  return (
    <div className="space-y-8">
      <RecGroup
        tier="p1"
        heading="Priority 1 — Recommend Promptly"
        items={r.p1}
        timeframes={P1_TIMEFRAMES}
        accent="text-red-600"
      />
      <RecGroup
        tier="p2"
        heading="Priority 2 — Monitor / Within 90 Days"
        items={r.p2}
        timeframes={P2_TIMEFRAMES}
        accent="text-orange-dark"
      />
      <NotesField
        label="Overall Assessment Notes"
        value={r.overallNotes}
        onChange={(v) => dispatch({ type: "setOverallNotes", notes: v })}
      />
    </div>
  );
}

function RecGroup({
  tier,
  heading,
  items,
  timeframes,
  accent,
}: {
  tier: "p1" | "p2";
  heading: string;
  items: RecItem[];
  timeframes: readonly string[];
  accent: string;
}) {
  const { dispatch } = useAssessment();
  return (
    <div>
      <h3 className={`mb-3 font-bold ${accent}`}>{heading}</h3>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="space-y-3 rounded-xl border-2 border-navy/10 bg-sand p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <TextField
                  label="Item"
                  value={item.item}
                  onChange={(v) => dispatch({ type: "updateRec", tier, id: item.id, patch: { item: v } })}
                />
              </div>
              <button
                type="button"
                onClick={() => dispatch({ type: "removeRec", tier, id: item.id })}
                className="mt-7 text-sm font-semibold text-red-600"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Est. Investment"
                value={item.investment}
                inputMode="decimal"
                placeholder="$"
                onChange={(v) =>
                  dispatch({ type: "updateRec", tier, id: item.id, patch: { investment: v } })
                }
              />
              <SelectField
                label="Timeframe"
                value={item.timeframe}
                options={timeframes}
                onChange={(v) =>
                  dispatch({ type: "updateRec", tier, id: item.id, patch: { timeframe: v } })
                }
              />
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => dispatch({ type: "addRec", tier })}
        className="mt-3 w-full rounded-xl border-2 border-dashed border-teal/50 py-3 font-semibold text-teal-dark"
      >
        + Add Item
      </button>
    </div>
  );
}
