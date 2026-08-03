/**
 * Assessment Wizard — DATA CONFIG (single source for the wizard's structure).
 *
 * The repeating "shell" of every inspection section (rating + photo slots +
 * notes) is driven from SECTIONS below. Bespoke inner fields (chemistry params,
 * lights, filters, pumps, spa type) are hand-built in each section component.
 *
 * Dropdown / select-all option lists also live here so copy edits happen in one
 * place. Site-wide constants (price, NAP, service areas) do NOT belong here —
 * those stay in content/site.ts.
 */
// type-only (erased at runtime) — no import cycle with state.tsx
import type { AssessmentState } from "./state";

export const RATINGS = ["GOOD", "MONITOR", "ATTENTION", "N/A"] as const;
export type Rating = (typeof RATINGS)[number];

/** A flagged item (MONITOR / ATTENTION) must carry a photo before submit. */
export const FLAGGED_RATINGS: Rating[] = ["MONITOR", "ATTENTION"];

export const RATING_LEGEND: { rating: Rating; meaning: string }[] = [
  { rating: "GOOD", meaning: "Operating normally, no action needed" },
  { rating: "MONITOR", meaning: "Watch — may need attention soon" },
  { rating: "ATTENTION", meaning: "Needs service / repair now" },
  { rating: "N/A", meaning: "Not present / not applicable" },
];

// --- Property step ----------------------------------------------------------

export const POOL_TYPES = [
  "Pool",
  "Pool/Spa",
  "Hot Tub — Stand Alone",
  "Water Feature — Stand Alone",
  "Fountain — Stand Alone",
  "Commercial Pool",
] as const;

// --- Configuration step (select all that apply) -----------------------------

export const POOL_SURFACES = [
  "Plaster",
  "Pebble",
  "Mini-Pebble",
  "Micro-Pebble",
  "Quartz",
  "Tile Only",
] as const;

export const SANITIZATION_OPTIONS = [
  "Chlorine Tabs",
  "Chlorinator",
  "Salt System",
  "UV",
  "Ozone",
  "Bromine",
  "Mineral",
  "Other",
] as const;

export const FEATURE_OPTIONS = [
  "None",
  "Attached Spa",
  "Deck Jets",
  "Water Feature",
  "Other",
] as const;

/** A salt reading only matters when a salt system is selected in configuration. */
export const SALT_SANITIZER = "Salt System";

// --- Water chemistry (section 2) --------------------------------------------
//
// CHEMISTRY BANDS — CONFIRMED CLIENT TARGETS (v3).
//
// These bands drive the AUTO-RATING suggestion (reading -> GOOD/MONITOR/ATTN).
// They are deliberately the ONLY place thresholds live — tune them here, nothing
// is hardcoded in the components. Logic per parameter:
//   reading inside `good`                 -> GOOD
//   inside `monitor` but outside `good`   -> MONITOR
//   outside `monitor`                     -> ATTENTION
// The tech always overrides the suggestion, so a reading can still be set by hand.

export type ChemistryBands = {
  /** reading within [min,max] -> GOOD */
  good: [number, number];
  /** reading within [min,max] (but outside good) -> MONITOR; outside -> ATTENTION */
  monitor: [number, number];
};

export type ChemistryParam = {
  key: string;
  label: string;
  unit: string;
  ideal: string;
  bands: ChemistryBands;
  /** Only shown/required when the pool uses a salt system. */
  saltOnly?: boolean;
};

export const CHEMISTRY_PARAMS: ChemistryParam[] = [
  { key: "free_chlorine", label: "Free Chlorine", unit: "ppm", ideal: "3–5 ppm",
    bands: { good: [3, 5], monitor: [2, 6] } },
  { key: "ph", label: "pH", unit: "", ideal: "7.2–7.6",
    bands: { good: [7.2, 7.6], monitor: [7.0, 7.8] } },
  { key: "total_alkalinity", label: "Total Alkalinity", unit: "ppm", ideal: "80–120 ppm",
    bands: { good: [80, 120], monitor: [60, 160] } },
  { key: "cyanuric_acid", label: "Cyanuric Acid / Stabilizer", unit: "ppm", ideal: "30–100 ppm",
    bands: { good: [30, 100], monitor: [20, 120] } },
  { key: "salt", label: "Salt", unit: "ppm", ideal: "2600–3600 ppm", saltOnly: true,
    bands: { good: [2600, 3600], monitor: [2500, 3700] } },
];

/**
 * Suggest a rating from a reading using the parameter's bands. Returns undefined
 * for blank / non-numeric input (no suggestion — tech enters it manually).
 */
export function suggestRating(param: ChemistryParam, reading: string): Rating | undefined {
  const trimmed = reading.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return undefined;
  const { good, monitor } = param.bands;
  if (n >= good[0] && n <= good[1]) return "GOOD";
  if (n >= monitor[0] && n <= monitor[1]) return "MONITOR";
  return "ATTENTION";
}

// --- Unknown-date dialog (spec 1.3) -----------------------------------------
// Exact copy. Pre-filled into an EDITABLE dialog when a date is marked Unknown.

export const UNKNOWN_DATE_RECOMMENDATION = {
  waterChange: "We always recommend a water change if the last date is unknown.",
  filterClean: "We always recommend a filter clean if the last date is unknown.",
} as const;

// --- Spa section (section 10) -----------------------------------------------

export const SPA_TYPES = [
  "Attached (shared water)",
  "Stand-Alone",
  "N/A — No Spa",
] as const;

export const SPA_NA = "N/A — No Spa";

/**
 * Spa presence is derived from setup answers (NOT asked a third time in the spa
 * section). A spa is present when:
 *   - the primary pool type implies one (Pool/Spa, or a stand-alone hot tub), or
 *   - "Attached Spa" is selected in configuration features.
 * Detection + the spa-type pre-fill live in summary.ts (isSpaPresent /
 * derivedSpaType) so the wizard, payload, and PDF all agree.
 */
export const SPA_POOL_TYPES: string[] = ["Pool/Spa", "Hot Tub — Stand Alone"];
export const ATTACHED_SPA_FEATURE = "Attached Spa";
export const SPA_TYPE_STANDALONE = "Stand-Alone";
export const SPA_TYPE_ATTACHED = "Attached (shared water)";
export const STANDALONE_HOT_TUB = "Hot Tub — Stand Alone";

// --- Recommendations step ---------------------------------------------------

export const P1_TIMEFRAMES = ["Immediate", "Within 30 days"] as const;
export const P2_TIMEFRAMES = ["Within 90 days", "Monitor"] as const;

// --- The 10 inspection sections (shared shell config) -----------------------
//
// `photos` are the fixed required slots for the section. Sections with
// per-unit photos (filters, pumps) or per-light photos generate extra slots
// inside their own component — those aren't listed here.

// --- Checklist item model ---------------------------------------------------
//
// Every section is a CHECKLIST: each specific line item is visible and rated on
// its own, so nothing gets skipped by accident. Item DEFINITIONS live here (data,
// not hand-built components); per-item state (rating / answer / note) lives in
// state.tsx keyed by item id.
//
// NOTE on rating values: items reuse the existing `Rating` union
// ("GOOD" | "MONITOR" | "ATTENTION" | "N/A") rather than introducing a second
// lowercase casing ('attn' / 'na'). Same four states, one casing across
// chemistry, the derived section rating, and the report.

export type ItemKind = "condition" | "binary";
export type BinaryAnswer = "yes" | "no";

export type ItemDef = {
  id: string;
  label: string;
  kind: ItemKind;
  /** binary only — the answer that is NOT a problem (drives green vs red) */
  goodAnswer?: BinaryAnswer;
  /** optional gate — the item only renders when this returns true */
  conditional?: (state: AssessmentState) => boolean;
};

export type SectionConfig = {
  id: string;
  title: string;
  /** Checklist line items. Authored as data — Pass 2 fills these in. */
  items: ItemDef[];
  /** Fixed required photo slot labels (used as slot keys too). */
  photos: string[];
  /** Label for the section-level notes textarea (separate from item notes). */
  notesLabel: string;
  /** Short helper line under the title. */
  hint?: string;
};

// Final section order (spec 1.7). Property Information and Pool Configuration are
// steps 1–2; these ten are steps 3–12. Safety Equipment is gone (Barrier moved to
// Decking, GFCI to Automation) and Secondary Equipment takes its slot.
// `items` are intentionally empty here — Pass 2 authors the ~90 line items.
export const SECTIONS: SectionConfig[] = [
  {
    id: "surface",
    title: "Pool Surface & Interior Finish",
    items: [],
    photos: ["Pool (overall)"],
    notesLabel: "Section Notes",
  },
  {
    id: "chemistry",
    title: "Water Chemistry & Balance",
    items: [],
    photos: ["Test Strip"],
    notesLabel: "Treatment Notes",
    hint: "Enter each reading and rate it against the ideal range.",
  },
  {
    id: "filtration",
    title: "Filtration System",
    items: [],
    photos: [],
    notesLabel: "Section Notes",
    hint: "Add each filter — record make/model, type and manufacture date.",
  },
  {
    id: "pump",
    title: "Pump & Motor",
    items: [],
    photos: [],
    notesLabel: "Section Notes",
    hint: "Add each pump — record make/model, type and manufacture date.",
  },
  {
    id: "plumbing",
    title: "Plumbing, Valves & Seals",
    items: [],
    photos: ["Vacuum Breaker", "Autofill"],
    notesLabel: "Section Notes",
  },
  {
    id: "automation",
    title: "Automation, Controls & Electrical",
    items: [],
    photos: [],
    notesLabel: "Section Notes",
    hint: "Includes interior lights and GFCI outlets.",
  },
  {
    id: "cleaning",
    title: "Cleaning Equipment & Vacuum",
    items: [],
    photos: ["Cleaning Head"],
    notesLabel: "Section Notes",
  },
  {
    id: "secondary",
    title: "Secondary Equipment",
    items: [],
    photos: [],
    notesLabel: "Section Notes",
    hint: "Heater, heat pump, equipment pads and anything else on site.",
  },
  {
    id: "decking",
    title: "Decking, Coping & Surroundings",
    items: [],
    photos: [],
    notesLabel: "Section Notes",
  },
  {
    id: "spa",
    title: "Spa / Hot Tub",
    items: [],
    photos: ["Spa", "Test Strip"],
    notesLabel: "Section Notes",
  },
];

export function getSection(id: string): SectionConfig | undefined {
  return SECTIONS.find((s) => s.id === id);
}
