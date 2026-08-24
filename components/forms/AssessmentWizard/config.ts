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
import type { AssessmentState, ListKey } from "./state";

export const RATINGS = ["GOOD", "MONITOR", "ATTENTION", "N/A"] as const;
export type Rating = (typeof RATINGS)[number];

/**
 * Human-facing labels for the rating enums — the SINGLE source for how a rating
 * renders to a person (wizard, badges, ticket). Title case, "Attn" not "ATTENTION".
 * Internal enum values (GOOD/MONITOR/ATTENTION/N/A) are never changed. (The PDF
 * keeps its own hardcoded copy on purpose — it's font/color-independent.)
 */
export const RATING_DISPLAY: Record<Rating, string> = {
  GOOD: "Good",
  MONITOR: "Monitor",
  ATTENTION: "Attn",
  "N/A": "N/A",
};

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

// Spec 1.8 drops "Attached Spa" (spa now keys off Pool Type). Brian's tool also
// captured "Water Feature", so it's kept alongside the spec's new options.
export const FEATURE_OPTIONS = [
  "None",
  "Waterfall",
  "Sheer Descent",
  "Slide",
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
  /** Helper text under the label — what to look for (carried from Brian's tool). */
  desc?: string;
  /** Always-visible compliance note (e.g. the GFCI 20ft rule). Not editable. */
  staticNote?: string;
  /** When set, the item also captures a numeric reading in this unit (e.g. "PSI"). */
  readingUnit?: string;
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

// --- Repeatable-unit dropdowns (carried from Brian's tool) -------------------

export const FILTER_TYPES = ["Sand", "Cartridge", "D.E.", "D.E. / Cartridge Hybrid"] as const;
export const PUMP_TYPES = ["Single Speed", "Dual Speed", "Variable Speed"] as const;
export const LIGHT_TYPES = ["LED", "Halogen", "Fiber Optic", "Unknown"] as const;
export const LIGHT_LOCATIONS = ["Pool", "Spa", "Water Feature", "Step", "Other"] as const;

// --- Per-unit item lists (each unit is rated against its own full checklist) --
//
// Brian's tool rates every filter and every pump against its own list, so two
// filters get two independent checklists. These defs render under each unit
// (UnitList children); per-unit item state is keyed `${unitId}:${def.id}`.

/** Filtration — per filter. "Last Full Clean" is handled by the unknown-date
 *  dialog on the unit itself, so it's not repeated here. */
export const FILTER_ITEMS: ItemDef[] = [
  { id: "tank", label: "Filter Tank & Housing", kind: "condition", desc: "Cracks, corrosion, visible wear" },
  { id: "union", label: "Union Connections", kind: "condition", desc: "Seals, leaks, tightness" },
  { id: "psi", label: "Filter Pressure", kind: "condition", desc: "Current reading", readingUnit: "PSI" },
  { id: "gauge", label: "Pressure Gauge", kind: "condition", desc: "Accurate, legible, functioning" },
  { id: "multiport", label: "Multiport Valve", kind: "condition", desc: "Operation, sealing, handle" },
  { id: "bwv", label: "Backwash Valve", kind: "condition", desc: "Sand / D.E.: operation and sealing" },
  { id: "air", label: "Air Relief Valve", kind: "condition", desc: "Present and functioning" },
  { id: "drain", label: "Drain / Backwash Port", kind: "condition", desc: "Operational, directed correctly" },
];

/** Pump & Motor — per pump. */
export const PUMP_ITEMS: ItemDef[] = [
  { id: "prime", label: "Pump Priming & Flow", kind: "condition", desc: "Primes and moves water as expected" },
  { id: "sound", label: "Motor Sound", kind: "condition", desc: "No unusual noise or vibration" },
  { id: "lid", label: "Pump Lid & O-Ring", kind: "condition", desc: "Seal condition, lid secure" },
  { id: "basket", label: "Strainer Basket", kind: "condition", desc: "Clean, no cracking" },
  { id: "shaft", label: "Shaft Seal", kind: "condition", desc: "No leaking at motor shaft" },
  { id: "union", label: "Union Connections", kind: "condition", desc: "Seals, leaks, tightness" },
  { id: "vs", label: "VS Pump Display / Control Panel", kind: "condition", desc: "Display, programming, error codes" },
  { id: "elec", label: "Electrical Connections", kind: "condition", desc: "Conduit sealed, no exposed wiring" },
];

/** Interior light — per light. One condition rating each (Brian's model). */
export const LIGHT_ITEMS: ItemDef[] = [
  { id: "cond", label: "Light Condition", kind: "condition", desc: "Operation, lens, gasket, fitting, niche" },
];

/** Secondary "additional equipment" — one condition rating per free-text unit. */
export const EXTRA_ITEMS: ItemDef[] = [
  { id: "cond", label: "Condition", kind: "condition", desc: "Overall condition and operation" },
];

/** Sections that own a repeatable-unit list with its own per-unit checklist. */
export const UNIT_SECTIONS: Record<
  string,
  { list: ListKey; defs: ItemDef[] }
> = {
  filtration: { list: "filters", defs: FILTER_ITEMS },
  pump: { list: "pumps", defs: PUMP_ITEMS },
  automation: { list: "lights", defs: LIGHT_ITEMS },
  secondary: { list: "extras", defs: EXTRA_ITEMS },
};

// Final section order (spec 1.7). Property Information and Pool Configuration are
// steps 1–2; these ten are steps 3–12. Safety Equipment is gone (Barrier moved to
// Decking, GFCI to Automation) and Secondary Equipment takes its slot.
//
// Item depth is authored to match Brian's original tool, not just the spec's
// floor list. Where Brian and the spec disagree on placement, the spec wins
// (Multiport → Filtration, Junction Box → Automation, Cleaning Module → Cleaning)
// to avoid duplicating an item across two sections.
export const SECTIONS: SectionConfig[] = [
  {
    id: "surface",
    title: "Pool Surface & Interior Finish",
    photos: ["Pool (overall)"],
    notesLabel: "Section Notes",
    items: [
      { id: "cond", label: "Surface Condition (Overall)", kind: "condition", desc: "Cracking, etching, rough patches, delamination" },
      { id: "stain", label: "Staining", kind: "binary", goodAnswer: "no", desc: "Mineral scale, iron, copper, organic staining" },
      { id: "algae", label: "Algae Presence", kind: "binary", goodAnswer: "no", desc: "Black, green, mustard algae — note location" },
      { id: "tile", label: "Waterline Tile", kind: "condition", desc: "Calcium buildup, cracked or missing tiles, grout condition" },
      { id: "wftile", label: "Water Feature Tile", kind: "condition", desc: "Tile condition, calcium, grout — if applicable" },
      { id: "coping", label: "Coping Stones / Edge-to-Pool / Decking Transition", kind: "condition", desc: "Cracking, lifting, sealant condition" },
      { id: "steps", label: "Steps & Bench Finish", kind: "condition", desc: "Cracking, etching, rough patches, delamination" },
    ],
  },
  {
    // Chemistry stays bespoke (readings + auto-rating against confirmed bands),
    // rendered by SectionChemistry, so its checklist `items` stay empty. Last
    // Water Change lives on that step via the unknown-date dialog.
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
    hint: "Add each filter — record type, make/model and manufacture date, then rate its checklist.",
  },
  {
    id: "pump",
    title: "Pump & Motor",
    items: [],
    photos: [],
    notesLabel: "Section Notes",
    hint: "Add each pump — record type, make/model and manufacture date, then rate its checklist.",
  },
  {
    id: "plumbing",
    title: "Plumbing, Valves & Seals",
    photos: ["Vacuum Breaker", "Autofill"],
    notesLabel: "Section Notes",
    items: [
      { id: "lines", label: "Visible Plumbing Lines", kind: "condition", desc: "UV degradation, cracking, visible wear" },
      { id: "main", label: "Main Drain", kind: "condition", desc: "Cover compliance, flow, condition" },
      {
        id: "draincover",
        label: "Drain Cover Compliance",
        kind: "binary",
        goodAnswer: "yes",
        staticNote:
          "If Yes, drain covers appear to be anti-entrapment covers featuring curved, non-flush, or domed designs that prevent body-part blockage and hair entanglement. Compliance cannot be 100% determined without reading the writing on the drain covers themselves.",
      },
      { id: "deck", label: "Deckside Main Drain Canister", kind: "condition", desc: "Condition, seal, accessibility" },
      { id: "leaf", label: "In-Line Leaf Canister", kind: "condition", desc: "Condition, basket, seal" },
      { id: "skim", label: "Skimmers", kind: "condition", desc: "Baskets, weir doors, flow, throat condition" },
      { id: "ret", label: "Returns", kind: "condition", desc: "All operational, eyeball adjusters present" },
      { id: "div", label: "Diverter Valves", kind: "condition", desc: "Visual or operated when safely possible" },
      { id: "chk", label: "Check Valves", kind: "condition", desc: "Visual — operate when safely possible" },
      { id: "bw", label: "Backwash Lines", kind: "condition", desc: "Direction, condition, proper termination" },
      { id: "vb", label: "Vacuum Breaker", kind: "condition", desc: "Present, operational, no visible damage" },
      { id: "autofill", label: "Autofill", kind: "condition", desc: "Operational, float valve condition, connections" },
      { id: "level", label: "Water Level", kind: "condition", desc: "Within normal operating range" },
    ],
  },
  {
    id: "automation",
    title: "Automation, Controls & Electrical",
    photos: [],
    notesLabel: "Section Notes",
    hint: "Includes interior lights, GFCI and sanitization equipment.",
    items: [
      { id: "timer", label: "Timer / Timer Control Box", kind: "condition", desc: "Programming, operation, display" },
      { id: "panel", label: "Automation Panel", kind: "condition", desc: "Condition, error codes, programming" },
      { id: "relay", label: "Relays", kind: "condition", desc: "Operation, condition" },
      { id: "act", label: "Actuator Operation", kind: "condition", desc: "Movement, calibration, manual override" },
      { id: "cab", label: "Data Cables", kind: "condition", desc: "Condition, connections, routing" },
      { id: "tempsensor", label: "Temperature Sensors", kind: "condition", desc: "Reading accuracy, condition" },
      { id: "flow", label: "Flow Switch", kind: "condition", desc: "Operation, condition" },
      { id: "saltcell", label: "Salt Chlorine Generator (Salt Cell)", kind: "condition", desc: "Output, cell condition, flow switch" },
      { id: "chlorinator", label: "In-line Chlorinator / Chemical Feeder", kind: "condition", desc: "Operation, tubing, condition" },
      { id: "jbox", label: "Pool Light Junction Box", kind: "condition", desc: "Cover, seal, water intrusion" },
      {
        id: "gfci",
        label: "GFCI Outlets & Switch Covers",
        kind: "binary",
        goodAnswer: "yes",
        desc: "Present, intact, and tripping correctly",
        staticNote: "All outlets within 20 ft of the water need GFCI protection.",
      },
      { id: "rem", label: "Remote / App Connectivity", kind: "condition", desc: "Connection, firmware, function" },
    ],
  },
  {
    id: "cleaning",
    title: "Cleaning Equipment & Vacuum",
    photos: ["Cleaning Head"],
    notesLabel: "Section Notes",
    items: [
      { id: "move", label: "Vacuum Movement & Coverage", kind: "condition", desc: "Full pool coverage, stuck spots" },
      { id: "cond", label: "Vacuum Condition", kind: "condition", desc: "Visual — wheels, body, track condition" },
      { id: "hose", label: "Hose Condition", kind: "condition", desc: "Soft spots, kinks, leaks" },
      { id: "leaf", label: "Vacuum In-Line Leaf Canister", kind: "condition", desc: "Condition, seal, basket" },
      { id: "module", label: "Cleaning System Module", kind: "condition", desc: "Condition, connections" },
      { id: "heads", label: "Cleaning System Heads", kind: "condition", desc: "Pop-up heads, rotation, coverage" },
      { id: "booster", label: "Booster Pump (Pressure-Side)", kind: "condition", desc: "Operation, sound, connections" },
    ],
  },
  {
    id: "secondary",
    title: "Secondary Equipment",
    photos: [],
    notesLabel: "Section Notes",
    hint: "Heater, heat pump, equipment pads — add anything else on site.",
    items: [
      { id: "heater", label: "Heater", kind: "condition", desc: "Ignition, heat exchanger, error codes" },
      { id: "heatpump", label: "Heat Pump", kind: "condition", desc: "Compressor, airflow, refrigerant lines" },
      { id: "pads", label: "Equipment Pads", kind: "condition", desc: "Level, stable, adequate clearance" },
    ],
  },
  {
    id: "decking",
    title: "Decking, Coping & Surroundings",
    photos: [],
    notesLabel: "Section Notes",
    items: [
      { id: "surf", label: "Deck Surface", kind: "condition", desc: "Cracking, settling, trip hazards" },
      { id: "cop", label: "Coping Condition", kind: "condition", desc: "Stones secure, sealant intact, no displacement" },
      { id: "land", label: "Landscaping Proximity", kind: "binary", goodAnswer: "no", desc: "Trees / plants contributing debris load" },
      { id: "over", label: "Overhead Hazards", kind: "binary", goodAnswer: "no", desc: "Trees, power lines, structures near pool" },
      // Deliberate deviation from spec's [B, good=yes]: Brian rates fence/gate
      // CONDITION (4-state), which is richer than a presence yes/no. Kept as a
      // condition item.
      { id: "fence", label: "Pool Barrier / Fence / Gate Condition", kind: "condition", desc: "Structural integrity, hardware, latch / self-close" },
    ],
  },
  {
    id: "spa",
    title: "Spa / Hot Tub",
    photos: ["Spa", "Test Strip"],
    notesLabel: "Section Notes",
    items: [
      { id: "surf", label: "Spa Surface / Shell Condition", kind: "condition", desc: "Cracks, staining, etching" },
      { id: "water", label: "Spa Water Clarity & Chemistry", kind: "condition", desc: "Tested separately if stand-alone" },
      { id: "jets", label: "Jets", kind: "condition", desc: "All operational — no loose, missing, or damaged eyelets" },
      { id: "blow", label: "Spa Blower / Air System", kind: "condition", desc: "Operational, no water back-flow" },
      { id: "heat", label: "Spa Heater / Thermostat", kind: "condition", desc: "Reaches set temp, thermostat accurate" },
      { id: "div", label: "Spa Diverter / Valves", kind: "condition", desc: "Spa-to-pool transition, operational" },
      { id: "cvr", label: "Spa Cover / Lifter", kind: "condition", desc: "Condition, insulation, lock straps" },
      { id: "spill", label: "Spillway / Overflow", kind: "condition", desc: "Clear, no blockage" },
    ],
  },
];

export function getSection(id: string): SectionConfig | undefined {
  return SECTIONS.find((s) => s.id === id);
}
