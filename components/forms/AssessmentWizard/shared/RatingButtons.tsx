"use client";
import { RATINGS, type Rating } from "../config";

/**
 * Rating control — a refined SEGMENTED control (four hairline-divided segments
 * in one pill), used for section ratings and per-parameter chemistry.
 *
 * Restraint by design: the selected segment gets a quiet light fill, a small
 * colored status dot, and colored text; unselected segments stay neutral. No
 * big filled "candy" buttons. Tap targets stay large for field use.
 */

const SELECTED_TEXT: Record<Rating, string> = {
  GOOD: "text-good-dark",
  MONITOR: "text-monitor-dark",
  ATTENTION: "text-attention-dark",
  "N/A": "text-stone",
};

const DOT: Record<Rating, string> = {
  GOOD: "bg-good",
  MONITOR: "bg-monitor",
  ATTENTION: "bg-attention",
  "N/A": "bg-stone",
};

const SHORT: Record<Rating, string> = {
  GOOD: "Good",
  MONITOR: "Monitor",
  ATTENTION: "Attn",
  "N/A": "N/A",
};

export default function RatingButtons({
  value,
  onChange,
  size = "lg",
}: {
  value?: Rating;
  onChange: (r: Rating) => void;
  size?: "lg" | "sm";
}) {
  return (
    <div className="flex divide-x divide-line overflow-hidden rounded-xl border border-line bg-white">
      {RATINGS.map((r) => {
        const active = value === r;
        return (
          <button
            key={r}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(r)}
            className={`flex flex-1 items-center justify-center gap-1.5 font-medium transition-colors ${
              size === "lg" ? "py-3.5 text-sm" : "py-2.5 text-[13px]"
            } ${active ? `bg-sand ${SELECTED_TEXT[r]}` : "text-navy/45 hover:text-navy/70"}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${active ? DOT[r] : "bg-navy/15"}`}
              aria-hidden
            />
            {SHORT[r]}
          </button>
        );
      })}
    </div>
  );
}
