"use client";
import { useState } from "react";
import { useAssessment } from "../state";
import {
  POOL_SURFACES,
  SANITIZATION_OPTIONS,
  FEATURE_OPTIONS,
} from "../config";
import { Chip } from "../shared/Field";
import PhotoSlot from "../shared/PhotoSlot";

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

  // Photo slots: two fixed + one per selected feature (excluding "None").
  const featurePhotoSlots = cfg.features
    .filter((f) => f !== "None")
    .map((f) => `Feature: ${f}`);
  const photoSlots = ["Pool Surface", "Sanitation", ...featurePhotoSlots];

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

      <Group label="Features (attached to pool)">
        {allFeatures.map((o) => (
          <Chip key={o} label={o} active={cfg.features.includes(o)} onClick={() => toggle("features", o)} />
        ))}
      </Group>

      <div className="flex gap-2">
        <input
          value={newFeature}
          onChange={(e) => setNewFeature(e.target.value)}
          placeholder="Add additional feature…"
          className="flex-1 rounded-xl border-2 border-navy/15 p-3 text-base text-navy focus:border-teal focus:outline-none"
        />
        <button
          type="button"
          onClick={addFeature}
          className="rounded-xl border-2 border-teal/50 px-4 font-semibold text-teal-dark"
        >
          + Add
        </button>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-navy">Required Photos</p>
        <div className="grid grid-cols-2 gap-3">
          {photoSlots.map((slot) => (
            <PhotoSlot
              key={slot}
              label={slot}
              required
              value={cfg.photos[slot]}
              onChange={(dataUrl) => dispatch({ type: "setConfigPhoto", slot, dataUrl })}
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
      <p className="mb-2 text-sm font-semibold text-navy">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
