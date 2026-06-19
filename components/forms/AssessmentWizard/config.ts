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
// ⚠️⚠️ JUDGMENT CALL — CHEMISTRY BANDS NEED BRENT/BRIAN DOMAIN INPUT ⚠️⚠️
//
// These bands drive the AUTO-RATING suggestion (reading -> GOOD/MONITOR/ATTN).
// They are deliberately the ONLY place thresholds live — tune them here, nothing
// is hardcoded in the components. Logic per parameter:
//   reading inside `good`                 -> GOOD
//   inside `monitor` but outside `good`   -> MONITOR
//   outside `monitor`                     -> ATTENTION
// For "lower is better" params (phosphates) the low end is just 0.
//
// The defaults below are reasonable AZ-pool starting points, BUT:
//   • pH is intentionally TIGHT (7.4–7.6 good, 7.2–7.8 monitor). A percentage
//     band would misbehave here, which is exactly why bands are explicit/absolute.
//   • Every number here is a guess until Brent/Brian confirm. Edit freely.
// The tech always overrides the suggestion, so wrong bands are never fatal —
// but confirm before this goes customer-facing.

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
  { key: "free_chlorine", label: "Free Chlorine", unit: "ppm", ideal: "1–3 ppm",
    bands: { good: [1, 3], monitor: [0.5, 5] } },
  { key: "ph", label: "pH", unit: "", ideal: "7.4–7.6",
    bands: { good: [7.4, 7.6], monitor: [7.2, 7.8] } },
  { key: "total_alkalinity", label: "Total Alkalinity", unit: "ppm", ideal: "80–120 ppm",
    bands: { good: [80, 120], monitor: [60, 160] } },
  { key: "cyanuric_acid", label: "Cyanuric Acid", unit: "ppm", ideal: "30–50 ppm",
    bands: { good: [30, 50], monitor: [20, 80] } },
  { key: "calcium_hardness", label: "Calcium Hardness", unit: "ppm", ideal: "200–400 ppm",
    bands: { good: [200, 400], monitor: [150, 600] } },
  { key: "salt", label: "Salt", unit: "ppm", ideal: "2700–3400 ppm", saltOnly: true,
    bands: { good: [2700, 3400], monitor: [2400, 3800] } },
  { key: "phosphates", label: "Phosphates", unit: "ppb", ideal: "Below 100 ppb",
    bands: { good: [0, 100], monitor: [0, 500] } },
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

// --- Spa section (section 10) -----------------------------------------------

export const SPA_TYPES = [
  "Attached (shared water)",
  "Stand-Alone",
  "N/A — No Spa",
] as const;

export const SPA_NA = "N/A — No Spa";

// --- Recommendations step ---------------------------------------------------

export const P1_TIMEFRAMES = ["Immediate", "Within 30 days"] as const;
export const P2_TIMEFRAMES = ["Within 90 days", "Monitor"] as const;

// --- The 10 inspection sections (shared shell config) -----------------------
//
// `photos` are the fixed required slots for the section. Sections with
// per-unit photos (filters, pumps) or per-light photos generate extra slots
// inside their own component — those aren't listed here.

export type SectionConfig = {
  id: string;
  title: string;
  /** Fixed required photo slot labels (used as slot keys too). */
  photos: string[];
  /** Label for the notes textarea. */
  notesLabel: string;
  /** Short helper line under the title. */
  hint?: string;
};

export const SECTIONS: SectionConfig[] = [
  {
    id: "surface",
    title: "Pool Surface & Interior Finish",
    photos: ["Pool (overall)"],
    notesLabel: "Notes",
    hint: "Rate the interior finish and log each light.",
  },
  {
    id: "chemistry",
    title: "Water Chemistry & Balance",
    photos: ["Test Strip"],
    notesLabel: "Treatment Notes",
    hint: "Enter each reading and rate it against the ideal range.",
  },
  {
    id: "filtration",
    title: "Filtration System",
    photos: [],
    notesLabel: "Notes",
    hint: "Add each filter — capture filter, serial, and pressure gauge.",
  },
  {
    id: "pump",
    title: "Pump & Motor",
    photos: [],
    notesLabel: "Notes",
    hint: "Add each pump — capture pump, serial, and display.",
  },
  {
    id: "plumbing",
    title: "Plumbing, Valves & Seals",
    photos: ["Vacuum Breaker", "Autofill"],
    notesLabel: "Notes",
  },
  {
    id: "automation",
    title: "Automation & Controls",
    photos: [],
    notesLabel: "Notes",
  },
  {
    id: "cleaning",
    title: "Cleaning Equipment & Vacuum",
    photos: [],
    notesLabel: "Notes",
  },
  {
    id: "safety",
    title: "Safety Equipment",
    photos: [],
    notesLabel: "Notes",
  },
  {
    id: "decking",
    title: "Decking, Coping & Surroundings",
    photos: [],
    notesLabel: "Notes",
  },
  {
    id: "spa",
    title: "Spa / Hot Tub",
    photos: ["Spa", "Test Strip"],
    notesLabel: "Notes",
    hint: "If there's no spa, mark the type N/A to skip the rest.",
  },
];

export function getSection(id: string): SectionConfig | undefined {
  return SECTIONS.find((s) => s.id === id);
}
