"use client";
import { useState } from "react";
import { useAssessment } from "../state";
import {
  POOL_SURFACES,
  SANITIZATION_OPTIONS,
  FEATURE_OPTIONS,
  RATINGS,
  type Rating,
} from "../config";
import { Chip } from "../shared/Field";
import PhotoSlot from "../shared/PhotoSlot";

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

/**
 * Pool configuration: three "select all that apply" groups plus the required
 * configuration photos (Pool Surface, Sanitation, and one per selected feature).
 */
export default function StepConfiguration() {
  const { state, dispatch } = useAssessment();
  const cfg = state.config;
  const [newFeature, setNewFeature] = useState("");

  const toggle = (field: "surfaces" | "sanitization" | "features", value: string) =>
    dispatch({ type: "setConfigList", field, value });

  // Union of preset + any custom features the tech added.
  const allFeatures = [
    ...FEATURE_OPTIONS,
    ...cfg.features.filter((f) => !FEATURE_OPTIONS.includes(f as (typeof FEATURE_OPTIONS)[number])),
  ];

  // Photo slots: Sanitation + one per selected feature (excluding "None").
  // The pool-surface shot is captured once, in the Pool Surface section — not
  // duplicated here.
  const featurePhotoSlots = cfg.features
    .filter((f) => f !== "None")
    .map((f) => `Feature: ${f}`);
  const photoSlots = ["Sanitation", ...featurePhotoSlots];

  function addFeature() {
    const v = newFeature.trim();
    if (!v) return;
    if (!cfg.features.includes(v)) toggle("features", v);
    setNewFeature("");
  }

  return (
    <div className="space-y-6">
      <Group label="Pool Surface">
        {POOL_SURFACES.map((o) => (
          <Chip key={o} label={o} active={cfg.surfaces.includes(o)} onClick={() => toggle("surfaces", o)} />
        ))}
      </Group>

      <div>
        <Group label="Sanitization">
          {SANITIZATION_OPTIONS.map((o) => (
            <Chip
              key={o}
              label={o}
              active={cfg.sanitization.includes(o)}
              onClick={() => toggle("sanitization", o)}
            />
          ))}
        </Group>
        {cfg.sanitization.map((o) => (
          <OptionRating key={o} keyId={`sanitation:${o}`} label={o} />
        ))}
      </div>

      <div>
        <Group label="Features (attached to pool)">
          {allFeatures.map((o) => (
            <Chip key={o} label={o} active={cfg.features.includes(o)} onClick={() => toggle("features", o)} />
          ))}
        </Group>
        {cfg.features
          .filter((o) => o !== "None")
          .map((o) => (
            <OptionRating key={o} keyId={`feature:${o}`} label={o} />
          ))}
      </div>

      <div className="flex gap-2">
        <input
          value={newFeature}
          onChange={(e) => setNewFeature(e.target.value)}
          placeholder="Add additional feature…"
          className="flex-1 rounded-lg border border-wiz-field p-3 text-base text-wiz-ink placeholder:text-wiz-ink/50 focus:border-wiz-accent focus:outline-none focus:ring-2 focus:ring-wiz-accent/30"
        />
        <button
          type="button"
          onClick={addFeature}
          className="rounded-lg border border-wiz-field px-4 text-sm font-semibold text-wiz-accent-dark transition-colors hover:bg-wiz-surface"
        >
          Add
        </button>
      </div>

      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-wiz-ink/70">Required Photos</p>
        <div className="grid grid-cols-2 gap-3">
          {photoSlots.map((slot) => (
            <PhotoSlot
              key={slot}
              label={slot}
              required
              photo={cfg.photos[slot]}
              onChange={(dataUrl) => dispatch({ type: "setConfigPhoto", slot, dataUrl })}
              onLabelChange={(label) => dispatch({ type: "setConfigPhotoLabel", slot, label })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-wiz-ink/70">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/** Compact rating + note for one selected sanitation/feature option (spec Pass 2). */
function OptionRating({ keyId, label }: { keyId: string; label: string }) {
  const { state, dispatch } = useAssessment();
  const cur = state.config.optionRatings[keyId] ?? {};
  return (
    <div className="mt-2 rounded-lg border border-wiz-line bg-wiz-surface/50 p-2.5">
      <p className="mb-1.5 text-[12px] font-semibold text-wiz-ink">{label}</p>
      <div className="flex divide-x divide-wiz-field overflow-hidden rounded-lg border border-wiz-field bg-white">
        {RATINGS.map((r) => {
          const active = cur.rating === r;
          return (
            <button
              key={r}
              type="button"
              aria-pressed={active}
              onClick={() => dispatch({ type: "setConfigOptionRating", key: keyId, rating: r })}
              className={`flex-1 py-2 text-[12px] font-semibold transition-colors ${
                active ? RATING_FILL[r] : "bg-white text-wiz-ink/75 hover:bg-wiz-surface"
              }`}
            >
              {RATING_SHORT[r]}
            </button>
          );
        })}
      </div>
      <input
        type="text"
        value={cur.note ?? ""}
        onChange={(e) => dispatch({ type: "setConfigOptionNote", key: keyId, note: e.target.value })}
        placeholder="Note (optional)"
        className="mt-2 w-full rounded-md border border-wiz-field bg-white px-2 py-1.5 text-[13px] text-wiz-ink placeholder:text-wiz-ink/55 focus:border-wiz-accent focus:outline-none focus:ring-1 focus:ring-wiz-accent/30"
      />
    </div>
  );
}
