"use client";
import { RATINGS, type Rating } from "../config";

/**
 * The GOOD / MONITOR / ATTENTION / N/A control. Used both for section-level
 * ratings (via SectionShell) and per-parameter in water chemistry.
 *
 * Tactile: the selected state fills with the rating's semantic color and lifts
 * slightly; unselected is a quiet outline. Unmistakable at a glance, big touch
 * targets — it's used one-handed on a phone in direct AZ sun.
 */

const STYLES: Record<Rating, { on: string; off: string }> = {
  GOOD: {
    on: "border-good bg-good text-white shadow-lift -translate-y-0.5",
    off: "border-good/40 text-good-dark hover:border-good",
  },
  MONITOR: {
    on: "border-monitor bg-monitor text-white shadow-lift -translate-y-0.5",
    off: "border-monitor/40 text-monitor-dark hover:border-monitor",
  },
  ATTENTION: {
    on: "border-attention bg-attention text-white shadow-lift -translate-y-0.5",
    off: "border-attention/40 text-attention hover:border-attention",
  },
  "N/A": {
    on: "border-stone bg-stone text-white shadow-lift -translate-y-0.5",
    off: "border-stone/40 text-stone hover:border-stone",
  },
};

const SHORT: Record<Rating, string> = {
  GOOD: "GOOD",
  MONITOR: "MONITOR",
  ATTENTION: "ATTN",
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
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {RATINGS.map((r) => {
        const active = value === r;
        const st = STYLES[r];
        return (
          <button
            key={r}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(r)}
            className={`rounded-xl border-2 font-bold tracking-wide transition-all duration-150 active:scale-95 ${
              size === "lg" ? "py-4 text-base" : "py-2.5 text-sm"
            } ${active ? st.on : `bg-white ${st.off}`}`}
          >
            {SHORT[r]}
          </button>
        );
      })}
    </div>
  );
}
