/**
 * Demo / sample-data loader — a QA + demo convenience, GATED behind ?demo=1.
 *
 * Every load builds a DIFFERENT assessment. The old loader returned one fixed
 * sample (always Maria Hernandez, always the same findings), so repeat testing
 * meant hand-editing fields on every run and every demo PDF looked identical.
 * Now the customer, the property, the equipment, the findings and the chemistry
 * are all rolled fresh, so successive runs produce visibly different reports.
 *
 * It still builds on the REAL logic rather than faking it — suggestRating scores
 * the chemistry, sectionRating derives each section from its items — so the demo
 * exercises the same code path a live assessment does. It lands the wizard on
 * Review & Submit, ready to generate a PDF.
 *
 * DEMO DATA MUST NEVER LOOK REAL:
 *   - emails are demo+<random>@sunsetpoolcare-test.com, a domain SPC does not
 *     own and no customer can have. Never a real-looking personal address.
 *   - street numbers are 9000-9999, well outside the ranges the service areas
 *     actually use, so a demo record can't be mistaken for a real address.
 *   - phone numbers use 555-01xx, the range reserved for fiction.
 * Cities come from the real SERVICE_AREAS with a matching real zip, because the
 * point is to exercise the actual routing, not to invent a town.
 *
 * ?demo=1&email=someone@example.com uses that address verbatim instead of a
 * random one — for testing contact dedupe, where the same email has to be
 * submitted twice.
 *
 * This file injects sample state only — it changes nothing in the normal tech
 * flow. The gate (isDemoMode) and the button live behind ?demo=1.
 */
import { SERVICE_AREAS, type ServiceArea } from "@/content/site";
import {
  CHEMISTRY_PARAMS,
  FEATURE_OPTIONS,
  FILTER_TYPES,
  LIGHT_LOCATIONS,
  LIGHT_TYPES,
  POOL_SURFACES,
  POOL_TYPES,
  PUMP_TYPES,
  SALT_SANITIZER,
  SANITIZATION_OPTIONS,
  SECTIONS,
  UNIT_SECTIONS,
  getSection,
  suggestRating,
  type ChemistryParam,
  type ItemDef,
  type Rating,
} from "./config";
import {
  initialState,
  type AssessmentState,
  type ItemState,
  type Unit,
} from "./state";
import { derivedSpaType, getActiveSteps, isSpaPresent, sectionRating } from "./summary";

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
 * ?demo=1&email=… — the caller wants this exact address (contact-dedupe
 * testing needs the same email submitted twice). Returns null when absent.
 */
export function demoEmailOverride(): string | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("email");
  return raw && raw.trim() ? raw.trim() : null;
}

// --- Dice ------------------------------------------------------------------
// Math.random is right here: this is sample data for a demo, not a secret.

const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];
const int = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const between = (min: number, max: number) => min + Math.random() * (max - min);
const chance = (p: number) => Math.random() < p;

/** n distinct members of xs (or fewer when xs is short). */
function pickSome<T>(xs: readonly T[], min: number, max: number): T[] {
  const pool = [...xs];
  const take = Math.min(int(min, max), pool.length);
  const out: T[] = [];
  for (let i = 0; i < take; i++) out.push(...pool.splice(int(0, pool.length - 1), 1));
  return out;
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const token = (len = 8) =>
  Array.from({ length: len }, () => pick([...ALPHABET])).join("");

// --- Sample pools ----------------------------------------------------------

const FIRST_NAMES = [
  "Dale", "Maria", "Trevor", "Priya", "Marcus", "Joanne", "Curtis", "Elena",
  "Rafael", "Bethany", "Omar", "Kendra", "Victor", "Alicia", "Grant", "Noelle",
];
const LAST_NAMES = [
  "Whitaker", "Hernandez", "Boone", "Raghavan", "Delaney", "Okafor", "Prescott",
  "Vasquez", "Lindqvist", "Barrera", "Ashford", "Nakamura", "Doyle", "Mercado",
];
/** Street names only — the number is generated in the fake 9000-9999 band. */
const STREETS = [
  "E Ocotillo Rd", "S Ranch House Pkwy", "W Mesquite Trail", "E Saguaro Bloom Way",
  "N Copper Basin Dr", "S Palo Verde Ln", "E Desert Willow Ct", "W Ironwood Pass",
  "S Cottonwood Bend", "E Sunburst Hollow",
];
const INSPECTORS = ["Brian Ortiz", "Glen Swindell", "Dana Whitfield", "Luis Camarena"];

/** Real zips per service area. Keyed by SERVICE_AREAS so the two can't drift. */
const ZIPS: Record<ServiceArea, readonly string[]> = {
  Chandler: ["85224", "85225", "85226", "85248", "85249", "85286"],
  Gilbert: ["85233", "85234", "85295", "85296", "85297", "85298"],
  "Queen Creek": ["85140", "85142", "85143"],
  "San Tan Valley": ["85140", "85142", "85143", "85144"],
  Ahwatukee: ["85044", "85045", "85048"],
};

const FILTER_MAKES = ["Hayward 4030", "Pentair Clean & Clear 420", "Jandy CV460", "Sta-Rite System 3"];
const PUMP_MAKES = ["Pentair IntelliFlo", "Hayward TriStar VS", "Jandy VS FloPro", "Waterway Power Defender"];
const LIGHT_MAKES = ["Pentair IntelliBrite", "Hayward ColorLogic", "Jandy WaterColors"];
const EXTRA_MAKES = ["Pool cover pump", "Raypak heater", "In-floor booster", "Chlorine feeder"];

const MONITOR_NOTES = [
  "Starting to show some wear.",
  "Worth keeping an eye on next visit.",
  "Running a little outside where I'd want it.",
  "Minor buildup — not urgent.",
  "Working, but it's getting on in years.",
  "Slight seepage, nothing dripping yet.",
];
const ATTENTION_NOTES = [
  "Needs service before next season.",
  "Recommend replacement.",
  "Failed on test — needs a closer look.",
  "Cracked and letting water past.",
  "Not holding pressure.",
  "Out of spec, should be addressed now.",
];
const GOOD_NOTES = [
  "Clean and operating normally.",
  "No issues found.",
  "Recently serviced, looks good.",
];
const SECTION_NOTES = [
  "Overall this section looked solid on the day.",
  "A couple of items flagged here — details above.",
  "Nothing urgent, but worth a look next visit.",
  "Equipment is aging but still doing its job.",
];
const OVERALL_NOTES = [
  "Pool is in generally good shape; a few items flagged for service.",
  "Water balance is the main thing to sort out this week.",
  "Equipment pad is the priority — the water itself is fine.",
  "Everything checked out today, nothing outstanding.",
];
const PHOTO_LABELS = [
  "equipment pad", "waterline", "pump motor", "filter housing", "salt cell",
  "coping edge", "skimmer throat", "deck crack",
];

// --- Rolls -----------------------------------------------------------------

/**
 * How rough one section is allowed to look. Rolling every item independently
 * doesn't work: a section has 5-13 items, so even a low per-item flag rate makes
 * SOMETHING red in almost every section, every run — and since the worst item
 * wins, every demo report came out "Needs Attention". Sections get a mood and
 * items are rolled inside it, so clean sections stay genuinely clean.
 */
type Mood = "clean" | "minor" | "problem";

/**
 * Report-level shape, drawn once per load, so the headline condition varies
 * across runs instead of always landing on Attention:
 *   clean  -> nothing flagged anywhere        -> "Good Condition"
 *   light  -> a couple of Monitors            -> "Monitor Recommended"
 *   mixed  -> one problem section plus some Monitors
 *   rough  -> several problem sections
 */
const PROFILES = [
  { key: "clean", problems: 0, minors: 0 },
  { key: "light", problems: 0, minors: 2 },
  { key: "mixed", problems: 1, minors: 3 },
  { key: "rough", problems: 3, minors: 4 },
] as const;
type Profile = (typeof PROFILES)[number];

/** Assign each section a mood, honouring the profile's budget of flags. */
function assignMoods(ids: string[], profile: Profile): Record<string, Mood> {
  const moods: Record<string, Mood> = {};
  for (const id of ids) moods[id] = "clean";
  const shuffled = [...ids];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = int(0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  let at = 0;
  for (let i = 0; i < profile.problems && at < shuffled.length; i++) moods[shuffled[at++]] = "problem";
  for (let i = 0; i < profile.minors && at < shuffled.length; i++) moods[shuffled[at++]] = "minor";
  return moods;
}

function noteFor(rating: Rating): string {
  if (rating === "MONITOR") return chance(0.8) ? pick(MONITOR_NOTES) : "";
  if (rating === "ATTENTION") return chance(0.9) ? pick(ATTENTION_NOTES) : "";
  return chance(0.12) ? pick(GOOD_NOTES) : "";
}

/** Weighted rating for one checklist item, capped by its section's mood. */
function rollRating(mood: Mood): Rating | undefined {
  const r = Math.random();
  if (r < 0.12) return undefined; // left blank: renders nothing, like real life
  if (mood === "clean") return "GOOD";
  if (mood === "minor") return r < 0.8 ? "GOOD" : "MONITOR";
  if (r < 0.62) return "GOOD";
  return r < 0.85 ? "MONITOR" : "ATTENTION";
}

/** One checklist item's state, or undefined to leave it blank. */
function rollItem(def: ItemDef, mood: Mood): ItemState | undefined {
  if (def.kind === "binary") {
    if (chance(0.12)) return undefined;
    const good = def.goodAnswer ?? "yes";
    const bad = good === "yes" ? "no" : "yes";
    // A "no" on a binary resolves to ATTENTION, so only a problem section may
    // answer against the grain — otherwise a "minor" section would go red.
    const answer = mood === "problem" && chance(0.2) ? bad : good;
    return { answer, note: answer === bad ? noteFor("ATTENTION") : "" };
  }
  const rating = rollRating(mood);
  if (!rating) return undefined;
  const st: ItemState = { rating, note: noteFor(rating) };
  // Items that capture a gauge reading (filter PSI) get a plausible one.
  if (def.readingUnit) st.reading = String(int(8, 30));
  return st;
}

/**
 * A reading for one chemistry parameter. The RATING is always derived from the
 * reading by the real suggestRating, so the two can never disagree. A clean
 * report keeps every reading inside the good band — chemistry feeds the same
 * overall condition as the sections do.
 */
function rollChemReading(p: ChemistryParam, mood: Mood): string {
  const { good, monitor } = p.bands;
  const r = Math.random();
  let n: number;
  if (mood === "clean" || r < 0.6) n = between(good[0], good[1]);
  else if (mood === "minor" || r < 0.9)
    n = chance(0.5) ? between(monitor[0], good[0]) : between(good[1], monitor[1]);
  else {
    const span = Math.max(1, (monitor[1] - monitor[0]) * 0.5);
    n = chance(0.5)
      ? between(Math.max(0, monitor[0] - span), monitor[0])
      : between(monitor[1], monitor[1] + span);
  }
  return p.key === "ph" ? n.toFixed(1) : String(Math.round(n));
}

/** A YYYY-MM date somewhere in the last `years` years. */
function pastMonth(years: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - int(1, years * 12));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** A YYYY-MM-DD date somewhere in the last `years` years. */
function pastDate(years: number): string {
  const d = new Date();
  d.setDate(d.getDate() - int(30, years * 365));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// --- Builder ---------------------------------------------------------------

/**
 * Build a full, randomized sample assessment. `makePhoto(label)` produces a
 * small embedded image data URL (supplied by the client button so this module
 * doesn't need the DOM).
 */
export function buildDemoState(makePhoto: (label: string) => string): AssessmentState {
  const s = initialState();

  // How rough this whole report reads. Drawn once so the overall condition
  // varies between runs instead of always landing on Attention.
  const profile = pick(PROFILES);
  const moods = assignMoods(SECTIONS.map((x) => x.id), profile);
  const configMood: Mood = profile.key === "clean" ? "clean" : "minor";

  const now = new Date();
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  // --- Customer & property ---
  const city = pick(SERVICE_AREAS);
  const waterChangeUnknown = chance(0.3);
  s.property = {
    customerName: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    customerEmail: demoEmailOverride() ?? `demo+${token()}@sunsetpoolcare-test.com`,
    customerPhone: `(480) 555-01${pad(int(0, 99))}`,
    serviceAddress: `${int(9000, 9999)} ${pick(STREETS)}`,
    city,
    zip: pick(ZIPS[city]),
    poolType: pick(POOL_TYPES),
    poolSize: `${int(10, 32)},${pick(["000", "500"])} gal`,
    lastWaterChange: waterChangeUnknown ? "" : pastDate(4),
    lastWaterChangeUnknown: waterChangeUnknown,
    lastWaterChangeNote: waterChangeUnknown
      ? "We always recommend a water change if the last date is unknown."
      : "",
    additionalBodies: [],
  };

  s.details = {
    session: `SPC-${date.replace(/-/g, "")}-${time.replace(":", "")}`,
    date,
    time,
    inspectorName: pick(INSPECTORS),
  };

  // --- Configuration ---
  const sanitization = pickSome(SANITIZATION_OPTIONS, 1, 2);
  const features = chance(0.75) ? pickSome(FEATURE_OPTIONS.filter((f) => f !== "None"), 1, 3) : ["None"];
  s.config = {
    surfaces: pickSome(POOL_SURFACES, 1, 2),
    sanitization,
    features,
    photos: {},
    optionRatings: {},
  };
  const usesSalt = sanitization.includes(SALT_SANITIZER);
  // Config options are rated at the report's own mood — they feed the same
  // overall condition, so a clean run can't have a red salt cell.
  for (const opt of sanitization) {
    if (chance(0.6)) {
      const rating = rollRating(configMood);
      if (rating) s.config.optionRatings[`sanitation:${opt}`] = { rating, note: noteFor(rating) };
    }
  }
  for (const opt of features.filter((f) => f !== "None")) {
    if (chance(0.5)) {
      const rating = rollRating(configMood);
      if (rating) s.config.optionRatings[`feature:${opt}`] = { rating, note: noteFor(rating) };
    }
  }
  // Configuration photo slots are "Sanitation" plus one per selected feature.
  s.config.photos["Sanitation"] = { dataUrl: makePhoto("Sanitation"), label: "" };
  for (const f of features.filter((x) => x !== "None")) {
    if (chance(0.5)) s.config.photos[f] = { dataUrl: makePhoto(f), label: "" };
  }

  // --- Equipment (repeatable units) ---
  const filterUnit = (): Unit => {
    const unknown = chance(0.25);
    return {
      id: uid(),
      makeModel: pick(FILTER_MAKES),
      unitType: pick(FILTER_TYPES),
      mfrDate: pastMonth(9),
      lastClean: unknown ? "" : pastDate(1),
      lastCleanUnknown: unknown,
      lastCleanNote: unknown
        ? "We always recommend a filter clean if the last date is unknown."
        : "",
    };
  };
  s.filters = Array.from({ length: int(1, 2) }, filterUnit);
  s.pumps = Array.from({ length: int(1, 2) }, () => ({
    id: uid(),
    makeModel: pick(PUMP_MAKES),
    unitType: pick(PUMP_TYPES),
    mfrDate: pastMonth(9),
  }));
  s.lights = Array.from({ length: int(0, 3) }, () => ({
    id: uid(),
    makeModel: pick(LIGHT_MAKES),
    unitType: pick(LIGHT_TYPES),
    location: pick(LIGHT_LOCATIONS),
    mfrDate: pastMonth(9),
  }));
  s.extras = Array.from({ length: int(0, 2) }, () => ({
    id: uid(),
    makeModel: pick(EXTRA_MAKES),
    unitType: "",
    mfrDate: "",
  }));

  // --- Spa (only when the pool type actually has one) ---
  const spaPresent = isSpaPresent(s);
  if (spaPresent) {
    const unknown = chance(0.4);
    s.spaLastWaterChange = unknown ? "" : pastDate(2);
    s.spaLastWaterChangeUnknown = unknown;
    s.spaLastWaterChangeNote = unknown
      ? "We always recommend a water change if the last date is unknown."
      : "";
  }

  // --- Water chemistry: some parameters tested, some left blank ---
  for (const p of CHEMISTRY_PARAMS) {
    if (p.saltOnly && !usesSalt) continue;
    if (!chance(0.75)) continue; // untested — drops out of the report and the counts
    const reading = rollChemReading(p, moods.chemistry ?? "clean");
    s.chemistry[p.key] = { reading, rating: suggestRating(p, reading), auto: true };
  }

  // --- Section checklists ---
  for (const section of SECTIONS) {
    const items: Record<string, ItemState> = {};
    // The spa section stays empty when there's no spa — it auto-skips to N/A.
    const skip = section.id === "spa" && !spaPresent;
    // Occasionally leave a whole section untouched so "Not rated" shows up too.
    const rateThis = !skip && chance(0.88);

    if (rateThis) {
      const cfg = getSection(section.id);
      const mood = moods[section.id] ?? "clean";
      for (const def of cfg?.items ?? []) {
        if (def.conditional && !def.conditional(s)) continue;
        const st = rollItem(def, mood);
        if (st) items[def.id] = st;
      }
      // Per-unit checklists (filters / pumps / lights / extras).
      const unit = UNIT_SECTIONS[section.id];
      if (unit) {
        for (const u of s[unit.list]) {
          for (const def of unit.defs) {
            const st = rollItem(def, mood);
            if (st) items[`${u.id}:${def.id}`] = st;
          }
        }
      }
    }

    s.sections[section.id] = {
      notes: rateThis && chance(0.35) ? pick(SECTION_NOTES) : "",
      photos: {},
      items,
    };
  }

  // --- Photos ---
  // A flagged section MUST carry a photo or canSubmit blocks the demo run, so
  // this fills those first; unflagged sections get one sometimes, for realism.
  for (const section of SECTIONS) {
    const sec = s.sections[section.id];
    if (!sec) continue;
    const rating = sectionRating(s, section.id);
    const flagged = rating === "MONITOR" || rating === "ATTENTION";
    if (!flagged && !chance(0.35)) continue;
    const cfg = getSection(section.id);
    const slot = cfg?.photos[0];
    const key = slot ?? `extra:${uid()}`;
    sec.photos[key] = {
      dataUrl: makePhoto(slot ?? section.title),
      // Slotted photos fall back to the slot name for their caption, so leaving
      // the label blank still reads fine; ad-hoc ones get a tech-style tag.
      label: slot ? (chance(0.4) ? pick(PHOTO_LABELS) : "") : pick(PHOTO_LABELS),
    };
  }

  s.spaType = spaPresent ? derivedSpaType(s) : "";
  s.overallNotes = chance(0.85) ? pick(OVERALL_NOTES) : "";
  s.certification = { certified: true };

  // Land on Review & Submit (last active step).
  s.step = getActiveSteps(s).length - 1;
  return s;
}
