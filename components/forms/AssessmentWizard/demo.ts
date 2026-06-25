/**
 * Demo / sample-data loader — a QA + demo convenience, GATED behind ?demo=1.
 *
 * buildDemoState() returns a complete, valid, mixed-condition assessment using
 * the REAL smart functions (suggestRating for chemistry, buildDesiredAutoRecs
 * for recommendations) so the demo exercises the actual logic rather than
 * faking it. It lands the wizard on Review & Submit, ready to generate a PDF.
 *
 * This file injects sample state only — it changes nothing in the normal tech
 * flow. The gate (isDemoMode) and the button live behind ?demo=1.
 */
import { CHEMISTRY_PARAMS, suggestRating } from "./config";
import {
  initialState,
  type AssessmentState,
  type RecItem,
  type SectionState,
} from "./state";
import { buildDesiredAutoRecs, derivedSpaType, getActiveSteps } from "./summary";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}`;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** True only when the URL carries ?demo=1 (client-side). */
export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("demo") === "1";
}

/**
 * Build a full sample assessment. `makePhoto(label)` produces a small embedded
 * image data URL (supplied by the client button so this module stays DOM-free).
 */
export function buildDemoState(makePhoto: (label: string) => string): AssessmentState {
  const s = initialState();

  const now = new Date();
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  s.property = {
    customerName: "Maria Hernandez",
    serviceAddress: "1840 E Ranch Rd",
    city: "Gilbert",
    zip: "85296",
    poolType: "Pool/Spa",
    poolSize: "18,000 gal",
    lastWaterChange: "Spring 2025",
    lastWaterChangeUnknown: false,
    additionalBodies: [],
  };

  s.details = {
    session: `SPC-${date.replace(/-/g, "")}-${time.replace(":", "")}`,
    date,
    time,
    inspectorName: "Glen Swindell",
  };

  s.config = {
    surfaces: ["Pebble"],
    sanitization: ["Salt System"],
    features: ["Attached Spa", "Deck Jets"],
    photos: {},
  };

  // One filter + one pump so their labeled photo slots exist.
  const filterId = uid();
  const pumpId = uid();
  s.filters = [{ id: filterId, label: "Cartridge Filter" }];
  s.pumps = [{ id: pumpId, label: "Variable-Speed Pump" }];

  // Chemistry readings → let the real auto-rating decide each rating.
  // (FC 1.5 lands ATTENTION vs the 3–5 band; the rest land GOOD.)
  const readings: Record<string, string> = {
    free_chlorine: "1.5",
    ph: "7.5",
    total_alkalinity: "90",
    cyanuric_acid: "70",
    salt: "3000",
  };
  for (const p of CHEMISTRY_PARAMS) {
    const reading = readings[p.key];
    if (reading == null) continue;
    s.chemistry[p.key] = { reading, rating: suggestRating(p, reading), auto: true };
  }

  // Section ratings — a realistic mix. Flagged sections carry a photo so the
  // photo-enforcement gate passes and the PDF shows a shot next to the rating.
  const sec = (
    rating: SectionState["rating"],
    notes = "",
    photos: Record<string, string> = {}
  ): SectionState => ({ rating, notes, photos });

  s.sections = {
    surface: sec("GOOD"),
    chemistry: sec("GOOD"),
    filtration: sec("MONITOR", "Pressure slightly high, due for a clean", {
      [`filters:${filterId}:Filter`]: makePhoto("Filter"),
    }),
    pump: sec("ATTENTION", "Motor bearing noise, recommend replacement", {
      [`pumps:${pumpId}:Pump`]: makePhoto("Pump"),
    }),
    plumbing: sec("GOOD"),
    automation: sec("GOOD"),
    cleaning: sec("GOOD"),
    safety: sec("GOOD"),
    decking: sec("MONITOR", "Minor cracking near coping", {
      [`extra:${uid()}`]: makePhoto("Decking"),
    }),
    spa: sec("GOOD"),
  };

  s.spaType = derivedSpaType(s); // "Attached (shared water)" for Pool/Spa

  // Recommendations — populate from the flagged items exactly as syncAutoRecs
  // would on entering the step (ATTENTION → P1, MONITOR → P2).
  const desired = buildDesiredAutoRecs(s);
  const toItems = (
    arr: { sourceKey: string; text: string }[],
    timeframe: string
  ): RecItem[] =>
    arr.map((d) => ({
      id: uid(),
      item: d.text,
      investment: "",
      timeframe,
      auto: true,
      sourceKey: d.sourceKey,
    }));
  s.recommendations = {
    p1: toItems(desired.p1, "Within 30 days"),
    p2: toItems(desired.p2, "Monitor"),
    overallNotes:
      "Pool is in generally good shape; a few items flagged for service — see recommendations.",
    dismissed: [],
  };

  s.certification = { certified: true };

  // Land on Review & Submit (last active step).
  s.step = getActiveSteps(s).length - 1;
  return s;
}
