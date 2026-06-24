"use client";
import { RATINGS, type Rating } from "../config";

/**
 * Rating control — a refined SEGMENTED control (four divided segments in one
 * pill), used for section ratings and per-parameter chemistry.
 *
 * Outdoor-legible: the SELECTED segment fills with the rating's deep/muted color
 * and white bold text (high contrast, unmistakable in glare — not a neon "candy"
 * pill); unselected segments are clearly readable dark navy on white. Large tap
 * targets throughout.
 */

const SELECTED_FILL: Record<Rating, string> = {
  GOOD: "bg-good-dark text-white",
  MONITOR: "bg-monitor-dark text-white",
  ATTENTION: "bg-attention-dark text-white",
  "N/A": "bg-stone-dark text-white",
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
    <div className="flex divide-x divide-field overflow-hidden rounded-xl border border-field bg-white">
      {RATINGS.map((r) => {
        const active = value === r;
        return (
          <button
            key={r}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(r)}
            className={`flex-1 font-semibold transition-colors ${
              size === "lg" ? "py-3.5 text-sm" : "py-2.5 text-[13px]"
            } ${active ? SELECTED_FILL[r] : "bg-white text-navy/75 hover:bg-sand"}`}
          >
            {SHORT[r]}
          </button>
        );
      })}
    </div>
  );
}
