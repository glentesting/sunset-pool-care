"use client";
import { useEffect } from "react";
import { useAssessment, type RecItem } from "../state";
import { P1_TIMEFRAMES, P2_TIMEFRAMES } from "../config";
import { buildDesiredAutoRecs } from "../summary";
import { TextField, SelectField } from "../shared/Field";
import NotesField from "../shared/NotesField";

export default function StepRecommendations() {
  const { state, dispatch } = useAssessment();
  const r = state.recommendations;

  // Auto-fill from flagged ratings on entry: ATTN -> P1, MONITOR -> P2. Manual
  // items and the tech's removals are preserved (handled in syncAutoRecs).
  useEffect(() => {
    const desired = buildDesiredAutoRecs(state);
    dispatch({ type: "syncAutoRecs", p1: desired.p1, p2: desired.p2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autoCount = r.p1.filter((i) => i.auto).length + r.p2.filter((i) => i.auto).length;

  return (
    <div className="space-y-8">
      <p className="rounded-2xl bg-sand px-4 py-3 text-sm text-navy/70">
        {autoCount > 0
          ? `${autoCount} item${autoCount === 1 ? "" : "s"} pre-filled from your flagged ratings. Edit, reword, or remove any of them.`
          : "Add anything the customer should act on. Flagged ratings auto-fill here."}
      </p>

      <RecGroup
        tier="p1"
        heading="Priority 1 — Recommend Promptly"
        items={r.p1}
        timeframes={P1_TIMEFRAMES}
        accent="text-attention"
      />
      <RecGroup
        tier="p2"
        heading="Priority 2 — Monitor / Within 90 Days"
        items={r.p2}
        timeframes={P2_TIMEFRAMES}
        accent="text-monitor-dark"
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
      <h3 className={`mb-3 font-display font-bold ${accent}`}>{heading}</h3>
      <div className="space-y-4">
        {items.length === 0 && (
          <p className="rounded-2xl border-2 border-dashed border-navy/15 p-4 text-center text-sm text-navy/40">
            Nothing here yet.
          </p>
        )}
        {items.map((item) => (
          <div key={item.id} className="space-y-3 rounded-2xl border border-navy/10 bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <label className="text-sm font-semibold text-navy">Item</label>
                  {item.auto && (
                    <span className="rounded-full bg-teal/10 px-2 py-0.5 text-xs font-medium text-teal-dark">
                      auto
                    </span>
                  )}
                </div>
                <input
                  value={item.item}
                  onChange={(e) =>
                    dispatch({ type: "updateRec", tier, id: item.id, patch: { item: e.target.value } })
                  }
                  className="w-full rounded-xl border-2 border-navy/15 p-3 text-base text-navy focus:border-teal focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => dispatch({ type: "removeRec", tier, id: item.id })}
                className="mt-7 text-sm font-semibold text-attention"
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
