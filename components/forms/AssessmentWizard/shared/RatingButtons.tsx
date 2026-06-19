"use client";
import { RATINGS, type Rating } from "../config";

/**
 * The GOOD / MONITOR / ATTENTION / N/A control. Used both for section-level
 * ratings (via SectionShell) and per-parameter in water chemistry. Big, high
 * contrast, color-coded tap targets — this is used one-handed on a phone.
 */

const STYLES: Record<Rating, { on: string; off: string }> = {
  GOOD: {
    on: "border-teal bg-teal text-white",
    off: "border-teal/40 text-teal-dark",
  },
  MONITOR: {
    on: "border-orange bg-orange text-white",
    off: "border-orange/40 text-orange-dark",
  },
  ATTENTION: {
    on: "border-red-600 bg-red-600 text-white",
    off: "border-red-300 text-red-600",
  },
  "N/A": {
    on: "border-navy bg-navy text-white",
    off: "border-navy/25 text-navy/60",
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
        const s = STYLES[r];
        return (
          <button
            key={r}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(r)}
            className={`rounded-xl border-2 font-bold transition-colors ${
              size === "lg" ? "py-4 text-base" : "py-2 text-sm"
            } ${active ? s.on : `bg-white ${s.off}`}`}
          >
            {SHORT[r]}
          </button>
        );
      })}
    </div>
  );
}
