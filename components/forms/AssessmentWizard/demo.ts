/**
 * Demo / sample-data loader — a QA + demo convenience, GATED behind ?demo=1.
 *
 * buildDemoState() returns a complete, valid, mixed-condition assessment using
 * the REAL smart functions (suggestRating for chemistry, the derived section
 * rating) so the demo exercises the actual logic rather than faking it. It lands
 * the wizard on Review & Submit, ready to generate a PDF.
 *
 * NOTE (rebuild Pass 2): section ratings are DERIVED from line items. This demo
 * sets a realistic mix of item ratings across sections (plus per-unit items on
 * the filter/pump), so the derived section ratings, the review dashboard, and
 * the report all light up the way a real assessment would.
 *
 * This file injects sample state only — it changes nothing in the normal tech
 * flow. The gate (isDemoMode) and the button live behind ?demo=1.
 */
import { CHEMISTRY_PARAMS, suggestRating } from "./config";
import {
  initialState,
  type AssessmentState,
  type ItemState,
  type Photo,
  type SectionState,
} from "./state";
import { derivedSpaType, getActiveSteps } from "./summary";

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
    lastWaterChangeNote: "",
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
    features: ["Deck Jets"],
    photos: {},
    // Per-option ratings (spec Pass 2) — the salt system's a touch low on output.
    optionRatings: {
      "sanitation:Salt System": { rating: "MONITOR", note: "Cell output a little low" },
      "feature:Deck Jets": { rating: "GOOD", note: "" },
    },
  };

  // One filter + one pump, each with its own rated checklist.
  const filterId = uid();
  const pumpId = uid();
  const extraId = uid();
  const lightId = uid();
  s.filters = [
    { id: filterId, makeModel: "Hayward 4030", unitType: "Cartridge", mfrDate: "2021-04" },
  ];
  s.pumps = [
    { id: pumpId, makeModel: "Pentair IntelliFlo", unitType: "Variable Speed", mfrDate: "2019-08" },
  ];
  s.lights = [
    { id: lightId, makeModel: "Pentair IntelliBrite", unitType: "LED", location: "Pool", mfrDate: "2020-05" },
  ];
  s.extras = [{ id: extraId, makeModel: "Pool cover pump", unitType: "", mfrDate: "" }];

  // Spa keeps its own last-water-change; here it's unknown, which pops the
  // editable recommendation.
  s.spaLastWaterChange = "";
  s.spaLastWaterChangeUnknown = true;
  s.spaLastWaterChangeNote = "We always recommend a water change if the last date is unknown.";

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

  // Section builder: notes + per-item state + photos. Item ratings drive the
  // derived section rating (worst wins).
  const sec = (
    items: Record<string, ItemState>,
    notes = "",
    photos: Record<string, Photo> = {}
  ): SectionState => ({ notes, photos, items });

  const cond = (rating: ItemState["rating"], note = ""): ItemState => ({ rating, note });
  const bin = (answer: ItemState["answer"], note = ""): ItemState => ({ answer, note });

  // A couple of Maria's photos carry slightly-misspelled raw tech labels (so
  // ?demo=1 previews the label cleanup); the filter shot is left unlabeled — a
  // slotted photo, so it previews the slot-name caption fallback ("Filter").
  s.sections = {
    surface: sec({
      cond: cond("GOOD"),
      stain: bin("no"),
      algae: bin("no"),
      tile: cond("MONITOR", "Some calcium buildup along the waterline"),
      coping: cond("GOOD"),
      steps: cond("GOOD"),
    }),
    chemistry: sec({}),
    filtration: sec(
      {
        [`${filterId}:tank`]: cond("GOOD"),
        [`${filterId}:psi`]: { rating: "MONITOR", reading: "22", note: "Running a bit high" },
        [`${filterId}:gauge`]: cond("GOOD"),
        [`${filterId}:air`]: cond("GOOD"),
      },
      "Pressure slightly high, due for a clean",
      { [`filters:${filterId}:Filter`]: { dataUrl: makePhoto("Filter"), label: "" } }
    ),
    pump: sec(
      {
        [`${pumpId}:prime`]: cond("GOOD"),
        [`${pumpId}:sound`]: cond("ATTENTION", "Bearing noise — recommend replacement"),
        [`${pumpId}:lid`]: cond("GOOD"),
        [`${pumpId}:shaft`]: cond("GOOD"),
      },
      "Motor bearing noise, recommend replacement",
      { [`pumps:${pumpId}:Pump`]: { dataUrl: makePhoto("Pump"), label: "pump mtr & serial plate" } }
    ),
    plumbing: sec({
      lines: cond("GOOD"),
      main: cond("GOOD"),
      draincover: bin("yes"),
      skim: cond("GOOD"),
      ret: cond("GOOD"),
      autofill: cond("GOOD"),
      level: cond("GOOD"),
    }),
    automation: sec({
      timer: cond("GOOD"),
      panel: cond("GOOD"),
      saltcell: cond("MONITOR", "Output a little low, cell may be near end of life"),
      gfci: bin("yes"),
      rem: cond("GOOD"),
      [`${lightId}:cond`]: cond("GOOD"),
    }),
    cleaning: sec({
      move: cond("GOOD"),
      cond: cond("GOOD"),
      hose: cond("GOOD"),
      booster: cond("GOOD"),
    }),
    secondary: sec({
      heater: cond("GOOD"),
      heatpump: cond("GOOD"),
      pads: cond("GOOD"),
      [`${extraId}:cond`]: cond("MONITOR", "Runs but cycles often"),
    }),
    decking: sec(
      {
        surf: cond("GOOD"),
        cop: cond("MONITOR", "Minor cracking near coping"),
        land: bin("no"),
        over: bin("no"),
        fence: cond("GOOD"),
      },
      "Minor cracking near coping",
      { [`extra:${uid()}`]: { dataUrl: makePhoto("Decking"), label: "crackng nr coping" } }
    ),
    spa: sec({
      surf: cond("GOOD"),
      water: cond("GOOD"),
      jets: cond("GOOD"),
      heat: cond("GOOD"),
    }),
  };

  s.spaType = derivedSpaType(s); // "Attached (shared water)" for Pool/Spa

  s.overallNotes =
    "Pool is in generally good shape; a few items flagged for service — see the notes above.";

  s.certification = { certified: true };

  // Pre-written AI presentation text so the demo report SHOWS both AI features
  // without an API key. Same human-voice rules as the real output (plain,
  // spoken, short). Keyed by section id for the polished notes.
  s.presentation = {
    summary:
      "Maria's pool is in good shape overall. The main thing to take care of soon is the pump motor — it's making a bearing noise and should be replaced in the next month or so. The filter pressure's running a little high and there's some minor cracking near the coping to keep an eye on, but nothing urgent. Chlorine was low the day we checked, so that's worth getting back up.",
    polishedNotes: {
      pump: "The pump motor's making a bearing noise — we'd recommend replacing it in the next month or so.",
      filtration: "Filter pressure's running a little high, so it's due for a cleaning.",
      decking: "There's some minor cracking near the coping worth keeping an eye on.",
    },
    // Polished recommendation item text, keyed by the rec's sourceKey (robust to
    // order). Mirrors what the live polish pass would produce.
    // Recommendation sentences do NOT restate timing — the timeframe prints on
    // its own line. (Mirrors the live polishRecItem behavior.)
    recBySourceKey: {
      "section:pump": "Replace the pump motor — it's making a bearing noise.",
      "chem:free_chlorine": "Free chlorine was low at 1.5 (target 3–5 ppm) — worth getting it back up.",
      "section:filtration": "Filter pressure's running a little high and it's due for a cleaning.",
      "section:decking": "There's some minor cracking near the coping.",
    },
    overallNotes:
      "Pool's in good shape overall — a few items flagged for service, see the recommendations below.",
    // Raw misspelled photo labels → cleaned tags (so ?demo=1 shows the label
    // rule working without a key). Tag cleanup only — not reworded to sentences.
    photoLabels: {
      "pump mtr & serial plate": "pump motor & serial plate",
      "crackng nr coping": "cracking near coping",
    },
  };

  // Land on Review & Submit (last active step).
  s.step = getActiveSteps(s).length - 1;
  return s;
}
