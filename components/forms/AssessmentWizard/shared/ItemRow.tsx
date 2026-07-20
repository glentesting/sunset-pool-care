"use client";
import { RATINGS, type BinaryAnswer, type ItemDef, type Rating } from "../config";
import { useAssessment, type ItemState } from "../state";

/**
 * THE checklist item control — built once, reused for every line item.
 *
 * Condition items: Good / Monitor / ATTN / NA.
 *   - No default. Unselected = blank (renders nothing on the report).
 *   - Deselectable — tapping the selected state again clears it.
 *   - NA is a real, tappable state.
 * Binary items: Yes / No, where `goodAnswer` decides which side reads green and
 *   which reads red. Polarity is per item ("Algae Presence — No" is good;
 *   "GFCI Outlets — Yes" is good).
 *
 * Both kinds get a note field beneath, always available (never gated on rating).
 * Sunlight legibility is a hard requirement: visible wiz-field borders, deep
 * fills with white text when selected, near-black labels, no ghost gray.
 */

const RATING_SHORT: Record<Rating, string> = {
  GOOD: "Good",
  MONITOR: "Monitor",
  ATTENTION: "ATTN",
  "N/A": "NA",
};

const RATING_FILL: Record<Rating, string> = {
  GOOD: "bg-good-dark text-white",
  MONITOR: "bg-monitor-dark text-white",
  ATTENTION: "bg-attention-dark text-white",
  "N/A": "bg-stone-dark text-white",
};

export default function ItemRow({
  sectionId,
  item,
}: {
  sectionId: string;
  item: ItemDef;
}) {
  const { state, dispatch } = useAssessment();
  const st: ItemState = state.sections[sectionId]?.items?.[item.id] ?? { note: "" };

  return (
    <div className="border-b border-wiz-line py-3 last:border-b-0">
      <p className="mb-2 text-[13px] font-medium text-wiz-ink">{item.label}</p>

      {item.kind === "binary" ? (
        <BinaryControl
          value={st.answer}
          goodAnswer={item.goodAnswer ?? "yes"}
          onPick={(answer) =>
            dispatch({ type: "setItemAnswer", sectionId, itemId: item.id, answer })
          }
        />
      ) : (
        <ConditionControl
          value={st.rating}
          onPick={(rating) =>
            dispatch({ type: "setItemRating", sectionId, itemId: item.id, rating })
          }
        />
      )}

      <input
        type="text"
        value={st.note}
        onChange={(e) =>
          dispatch({ type: "setItemNote", sectionId, itemId: item.id, note: e.target.value })
        }
        placeholder="Note (optional)"
        aria-label={`Note for ${item.label}`}
        className="mt-2 w-full rounded-md border border-wiz-field bg-white px-2 py-1.5 text-[13px] text-wiz-ink placeholder:text-wiz-ink/55 focus:border-wiz-accent focus:outline-none focus:ring-1 focus:ring-wiz-accent/30"
      />
    </div>
  );
}

function ConditionControl({
  value,
  onPick,
}: {
  value?: Rating;
  onPick: (r: Rating) => void;
}) {
  return (
    <div className="flex divide-x divide-wiz-field overflow-hidden rounded-lg border border-wiz-field bg-white">
      {RATINGS.map((r) => {
        const active = value === r;
        return (
          <button
            key={r}
            type="button"
            aria-pressed={active}
            onClick={() => onPick(r)} // same value again → reducer clears it
            className={`flex-1 py-2.5 text-[13px] font-semibold transition-colors ${
              active ? RATING_FILL[r] : "bg-white text-wiz-ink/75 hover:bg-wiz-surface"
            }`}
          >
            {RATING_SHORT[r]}
          </button>
        );
      })}
    </div>
  );
}

function BinaryControl({
  value,
  goodAnswer,
  onPick,
}: {
  value?: BinaryAnswer;
  goodAnswer: BinaryAnswer;
  onPick: (a: BinaryAnswer) => void;
}) {
  const answers: BinaryAnswer[] = ["yes", "no"];
  return (
    <div className="flex divide-x divide-wiz-field overflow-hidden rounded-lg border border-wiz-field bg-white">
      {answers.map((a) => {
        const active = value === a;
        const isGood = a === goodAnswer;
        return (
          <button
            key={a}
            type="button"
            aria-pressed={active}
            onClick={() => onPick(a)} // same value again → reducer clears it
            className={`flex-1 py-2.5 text-[13px] font-semibold uppercase transition-colors ${
              active
                ? isGood
                  ? "bg-good-dark text-white"
                  : "bg-attention-dark text-white"
                : "bg-white text-wiz-ink/75 hover:bg-wiz-surface"
            }`}
          >
            {a}
          </button>
        );
      })}
    </div>
  );
}
