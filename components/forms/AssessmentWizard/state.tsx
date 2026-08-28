"use client";
/**
 * Assessment Wizard shared state — context + reducer (same pattern as the
 * original scaffold and the QualifierForm, just a much larger shape). Every
 * step reads/writes here so nothing prop-drills.
 *
 * Also owns three pieces of device-side plumbing:
 *  - DRAFT PERSISTENCE: the whole in-progress state is mirrored to localStorage
 *    so a tech standing at a pool doesn't lose work on a refresh/crash.
 *  - QUERY PREFILL: ?customer=&address=&city=&zip=&pool=&job= populate empty
 *    fields on load (a future Skimmer deep-link target). Draft values win.
 *  - AUTO-FILL: inspection date/time/session are stamped on first load.
 */
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import type { BinaryAnswer, Rating } from "./config";

// --- Shape ------------------------------------------------------------------

export type BodyOfWater = {
  id: string;
  poolType: string;
  size: string;
  lastWaterChange: string;
  lastWaterChangeUnknown: boolean;
};

/** Chemistry reading + rating; `auto` marks the rating as an un-overridden suggestion. */
export type ChemistryEntry = { reading: string; rating?: Rating; auto?: boolean };

/**
 * A repeatable equipment unit (filter / pump / interior light). The header
 * carries make/model, type and manufacture date, e.g.
 * "Filter 1 — Hayward 4030 · Cartridge · 2026-01".
 */
export type Unit = {
  id: string;
  makeModel: string;
  unitType: string;
  mfrDate: string;
  /** Interior lights only — Brian's tool captures the light's Location. */
  location?: string;
  /** Filters only — "Last Full Clean / Replacement" + its unknown-date dialog. */
  lastClean?: string;
  lastCleanUnknown?: boolean;
  /** Editable recommendation captured when the date is marked Unknown. */
  lastCleanNote?: string;
};

/**
 * Per-item state. Condition items use `rating`; binary items use `answer`.
 * `reading` is an optional captured value (e.g. Filter Pressure in PSI) for
 * items whose def carries a `readingUnit`.
 */
export type ItemState = {
  rating?: Rating;
  answer?: BinaryAnswer;
  reading?: string;
  note: string;
};

/**
 * A captured photo. The optional homeowner-facing `label` rides on the object
 * itself (not a parallel array), so it travels with the photo through draft
 * persistence and any future storage move for free.
 */
export type Photo = { dataUrl: string; label?: string };

export type SectionState = {
  /** section-level note, separate from item notes */
  notes: string;
  /** slot key -> photo */
  photos: Record<string, Photo>;
  /** itemId -> per-item rating/answer/note. The section rating is DERIVED from
   *  these (worst wins) — sections no longer carry a manual rating. */
  items: Record<string, ItemState>;
};

export type SubmitResults = {
  pdf: boolean;
  supabase: boolean;
  /** The raw assessment archive (JSON + photo files + viewer index) landed. */
  data: boolean;
  make: boolean;
  /** When supabase is false: why, so the submit row can be honest. */
  supabaseReason?: "not-configured" | "error";
  /** When data is false: why. Same honest-status rule as supabaseReason. */
  dataReason?: "not-configured" | "error";
  /** Photo files attempted vs. landed — a partial upload must be visible. */
  dataPhotos?: { total: number; uploaded: number };
  /** Public handle for this report; the /r/<reportId> viewer URL. */
  reportId?: string;
};

export type AssessmentState = {
  step: number;
  jobId: string;
  property: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    serviceAddress: string;
    city: string;
    zip: string;
    poolType: string;
    poolSize: string;
    lastWaterChange: string;
    lastWaterChangeUnknown: boolean;
    /** Editable recommendation captured when the date is marked Unknown. */
    lastWaterChangeNote: string;
    additionalBodies: BodyOfWater[];
  };
  details: { session: string; date: string; time: string; inspectorName: string };
  /** True once the tech edits the inspection date by hand — then it stops being
   *  auto-restamped to today on load (persisted with the draft). */
  dateDirty: boolean;
  config: {
    surfaces: string[];
    sanitization: string[];
    features: string[];
    photos: Record<string, Photo>;
    /** Per selected sanitation/feature option: a rating + note (spec Pass 2).
     *  Keyed `sanitation:<opt>` / `feature:<opt>`. */
    optionRatings: Record<string, { rating?: Rating; note?: string }>;
  };
  /** keyed by SECTIONS config id */
  sections: Record<string, SectionState>;
  /** keyed by CHEMISTRY_PARAMS key */
  chemistry: Record<string, ChemistryEntry>;
  lights: Unit[];
  filters: Unit[];
  pumps: Unit[];
  /** Secondary "additional equipment" — repeatable free-text units (spec 1.6/Pass 2). */
  extras: Unit[];
  spaType: string;
  /** Spa's own last water change (stand-alone spas are on a separate schedule). */
  spaLastWaterChange: string;
  spaLastWaterChangeUnknown: boolean;
  spaLastWaterChangeNote: string;
  /** Overall assessment notes — now lives on the final step (recs engine removed). */
  overallNotes: string;
  // Inspector name + date are captured once on Property & Inspection (in
  // `details`) and reused on the certification — only the checkbox lives here.
  certification: { certified: boolean };
  submitting: boolean;
  submitted: boolean;
  results: SubmitResults | null;
  error: string | null;
};

export type ListKey = "lights" | "filters" | "pumps" | "extras";

type Action =
  | { type: "goto"; step: number }
  | { type: "next" }
  | { type: "back" }
  | { type: "hydrate"; state: AssessmentState }
  | { type: "setJobId"; jobId: string }
  | { type: "setProperty"; patch: Partial<AssessmentState["property"]> }
  | { type: "addBody" }
  | { type: "updateBody"; id: string; patch: Partial<BodyOfWater> }
  | { type: "removeBody"; id: string }
  | { type: "setDetails"; patch: Partial<AssessmentState["details"]> }
  | { type: "setInspectionDate"; date: string }
  | { type: "setConfigList"; field: "surfaces" | "sanitization" | "features"; value: string }
  | { type: "setConfigPhoto"; slot: string; dataUrl: string | null }
  | { type: "setConfigPhotoLabel"; slot: string; label: string }
  | { type: "setConfigOptionRating"; key: string; rating: Rating }
  | { type: "setConfigOptionNote"; key: string; note: string }
  | { type: "setItemRating"; sectionId: string; itemId: string; rating: Rating }
  | { type: "setItemAnswer"; sectionId: string; itemId: string; answer: BinaryAnswer }
  | { type: "setItemNote"; sectionId: string; itemId: string; note: string }
  | { type: "setItemReading"; sectionId: string; itemId: string; reading: string }
  | { type: "setSectionNotes"; id: string; notes: string }
  | { type: "setSectionPhoto"; id: string; slot: string; dataUrl: string | null }
  | { type: "setSectionPhotoLabel"; id: string; slot: string; label: string }
  | { type: "setChemistry"; key: string; patch: Partial<ChemistryEntry> }
  | { type: "addUnit"; list: ListKey }
  | { type: "updateUnit"; list: ListKey; id: string; patch: Partial<Omit<Unit, "id">> }
  | { type: "removeUnit"; list: ListKey; id: string }
  | { type: "setSpaType"; value: string }
  | {
      type: "setSpaWaterChange";
      patch: { date?: string; unknown?: boolean; note?: string };
    }
  | { type: "setOverallNotes"; notes: string }
  | { type: "setCertification"; patch: Partial<AssessmentState["certification"]> }
  | { type: "submitStart" }
  | { type: "submitDone"; results: SubmitResults }
  | { type: "submitError"; error: string };

// --- Helpers ----------------------------------------------------------------

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}`;

function emptySection(): SectionState {
  return { notes: "", photos: {}, items: {} };
}

function emptyItem(): ItemState {
  return { note: "" };
}

export function initialState(): AssessmentState {
  return {
    step: 0,
    jobId: "",
    property: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      serviceAddress: "",
      city: "",
      zip: "",
      poolType: "",
      poolSize: "",
      lastWaterChange: "",
      lastWaterChangeUnknown: false,
      lastWaterChangeNote: "",
      additionalBodies: [],
    },
    details: { session: "", date: "", time: "", inspectorName: "" },
    dateDirty: false,
    config: { surfaces: [], sanitization: [], features: [], photos: {}, optionRatings: {} },
    sections: {},
    chemistry: {},
    lights: [],
    filters: [],
    pumps: [],
    extras: [],
    spaType: "",
    spaLastWaterChange: "",
    spaLastWaterChangeUnknown: false,
    spaLastWaterChangeNote: "",
    overallNotes: "",
    certification: { certified: false },
    submitting: false,
    submitted: false,
    results: null,
    error: null,
  };
}

function withPhoto(
  photos: Record<string, Photo>,
  slot: string,
  dataUrl: string | null
): Record<string, Photo> {
  const next = { ...photos };
  if (dataUrl) next[slot] = { dataUrl, label: photos[slot]?.label ?? "" };
  else delete next[slot]; // removing the photo removes its label with it
  return next;
}

function withPhotoLabel(
  photos: Record<string, Photo>,
  slot: string,
  label: string
): Record<string, Photo> {
  const cur = photos[slot];
  if (!cur) return photos; // no photo in this slot — nothing to label
  return { ...photos, [slot]: { ...cur, label } };
}

function section(s: AssessmentState, id: string): SectionState {
  return s.sections[id] ?? emptySection();
}

/** Coerce a persisted photo map (older drafts stored bare strings) to objects. */
function normalizePhotos(photos: unknown): Record<string, Photo> {
  const out: Record<string, Photo> = {};
  if (photos && typeof photos === "object") {
    for (const [k, v] of Object.entries(photos as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = { dataUrl: v, label: "" };
      else if (v && typeof v === "object" && typeof (v as Photo).dataUrl === "string") {
        out[k] = v as Photo;
      }
    }
  }
  return out;
}

// --- Reducer ----------------------------------------------------------------

function reducer(s: AssessmentState, a: Action): AssessmentState {
  switch (a.type) {
    case "goto":
      return { ...s, step: a.step };
    case "next":
      return { ...s, step: s.step + 1 };
    case "back":
      return { ...s, step: Math.max(0, s.step - 1) };
    case "hydrate":
      return a.state;
    case "setJobId":
      return { ...s, jobId: a.jobId };

    case "setProperty":
      return { ...s, property: { ...s.property, ...a.patch } };
    case "addBody":
      return {
        ...s,
        property: {
          ...s.property,
          additionalBodies: [
            ...s.property.additionalBodies,
            {
              id: uid(),
              poolType: "",
              size: "",
              lastWaterChange: "",
              lastWaterChangeUnknown: false,
            },
          ],
        },
      };
    case "updateBody":
      return {
        ...s,
        property: {
          ...s.property,
          additionalBodies: s.property.additionalBodies.map((b) =>
            b.id === a.id ? { ...b, ...a.patch } : b
          ),
        },
      };
    case "removeBody":
      return {
        ...s,
        property: {
          ...s.property,
          additionalBodies: s.property.additionalBodies.filter((b) => b.id !== a.id),
        },
      };

    case "setDetails":
      return { ...s, details: { ...s.details, ...a.patch } };
    case "setInspectionDate":
      // A human edited the date → it wins and survives reloads (dateDirty).
      return { ...s, details: { ...s.details, date: a.date }, dateDirty: true };

    case "setConfigList": {
      const list = s.config[a.field];
      const next = list.includes(a.value)
        ? list.filter((v) => v !== a.value)
        : [...list, a.value];
      return { ...s, config: { ...s.config, [a.field]: next } };
    }
    case "setConfigPhoto":
      return {
        ...s,
        config: { ...s.config, photos: withPhoto(s.config.photos, a.slot, a.dataUrl) },
      };
    case "setConfigPhotoLabel":
      return {
        ...s,
        config: { ...s.config, photos: withPhotoLabel(s.config.photos, a.slot, a.label) },
      };
    case "setConfigOptionRating": {
      const cur = s.config.optionRatings[a.key] ?? {};
      // Tap the selected rating again to clear it (same deselect rule as items).
      const rating = cur.rating === a.rating ? undefined : a.rating;
      return {
        ...s,
        config: {
          ...s.config,
          optionRatings: { ...s.config.optionRatings, [a.key]: { ...cur, rating } },
        },
      };
    }
    case "setConfigOptionNote": {
      const cur = s.config.optionRatings[a.key] ?? {};
      return {
        ...s,
        config: {
          ...s.config,
          optionRatings: { ...s.config.optionRatings, [a.key]: { ...cur, note: a.note } },
        },
      };
    }

    // Items: tapping the selected state again clears it back to blank (spec 1.2 —
    // no default, unselected renders nothing on the report).
    case "setItemRating": {
      const cur = section(s, a.sectionId);
      const item = cur.items[a.itemId] ?? emptyItem();
      const rating = item.rating === a.rating ? undefined : a.rating;
      return {
        ...s,
        sections: {
          ...s.sections,
          [a.sectionId]: { ...cur, items: { ...cur.items, [a.itemId]: { ...item, rating } } },
        },
      };
    }
    case "setItemAnswer": {
      const cur = section(s, a.sectionId);
      const item = cur.items[a.itemId] ?? emptyItem();
      const answer = item.answer === a.answer ? undefined : a.answer;
      return {
        ...s,
        sections: {
          ...s.sections,
          [a.sectionId]: { ...cur, items: { ...cur.items, [a.itemId]: { ...item, answer } } },
        },
      };
    }
    case "setItemNote": {
      const cur = section(s, a.sectionId);
      const item = cur.items[a.itemId] ?? emptyItem();
      return {
        ...s,
        sections: {
          ...s.sections,
          [a.sectionId]: { ...cur, items: { ...cur.items, [a.itemId]: { ...item, note: a.note } } },
        },
      };
    }
    case "setItemReading": {
      const cur = section(s, a.sectionId);
      const item = cur.items[a.itemId] ?? emptyItem();
      return {
        ...s,
        sections: {
          ...s.sections,
          [a.sectionId]: { ...cur, items: { ...cur.items, [a.itemId]: { ...item, reading: a.reading } } },
        },
      };
    }
    case "setSectionNotes":
      return {
        ...s,
        sections: { ...s.sections, [a.id]: { ...section(s, a.id), notes: a.notes } },
      };
    case "setSectionPhoto": {
      const cur = section(s, a.id);
      return {
        ...s,
        sections: {
          ...s.sections,
          [a.id]: { ...cur, photos: withPhoto(cur.photos, a.slot, a.dataUrl) },
        },
      };
    }
    case "setSectionPhotoLabel": {
      const cur = section(s, a.id);
      return {
        ...s,
        sections: {
          ...s.sections,
          [a.id]: { ...cur, photos: withPhotoLabel(cur.photos, a.slot, a.label) },
        },
      };
    }

    case "setChemistry": {
      const prev = s.chemistry[a.key] ?? { reading: "" };
      return {
        ...s,
        chemistry: { ...s.chemistry, [a.key]: { ...prev, ...a.patch } },
      };
    }

    case "addUnit":
      return {
        ...s,
        [a.list]: [...s[a.list], { id: uid(), makeModel: "", unitType: "", mfrDate: "" }],
      };
    case "updateUnit":
      return {
        ...s,
        [a.list]: s[a.list].map((u) => (u.id === a.id ? { ...u, ...a.patch } : u)),
      };
    case "removeUnit":
      return { ...s, [a.list]: s[a.list].filter((u) => u.id !== a.id) };

    case "setSpaType":
      return { ...s, spaType: a.value };
    case "setSpaWaterChange":
      return {
        ...s,
        ...(a.patch.date !== undefined && { spaLastWaterChange: a.patch.date }),
        ...(a.patch.unknown !== undefined && { spaLastWaterChangeUnknown: a.patch.unknown }),
        ...(a.patch.note !== undefined && { spaLastWaterChangeNote: a.patch.note }),
      };

    case "setOverallNotes":
      return { ...s, overallNotes: a.notes };

    case "setCertification":
      return { ...s, certification: { ...s.certification, ...a.patch } };

    case "submitStart":
      return { ...s, submitting: true, error: null };
    case "submitDone":
      return { ...s, submitting: false, submitted: true, results: a.results };
    case "submitError":
      return { ...s, submitting: false, error: a.error };
  }
}

// --- Persistence + prefill --------------------------------------------------

// Bumped for the checklist rebuild. The old shape (one manual rating + one note
// per section) has no meaningful mapping onto ~90 independently-rated items, so
// pre-rebuild drafts are DISCARDED rather than migrated — the key bump does that
// cleanly and can't crash the load. (Spec 1.1 allows a one-way drop; flagged.)
const STORAGE_KEY = "spc-assessment-draft-v2-items";

function loadDraft(): AssessmentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AssessmentState>;
    // Merge over a fresh base so drafts missing newer keys don't crash.
    const base = initialState();
    const draft = { ...base, ...parsed };
    draft.certification = { certified: Boolean(parsed.certification?.certified) };
    // Merge property over the base so a draft saved before a new field (e.g.
    // customerEmail) still loads with that key present.
    draft.property = { ...base.property, ...parsed.property };
    // Photos are { dataUrl, label } objects; be defensive about older/partial shapes.
    draft.config = {
      ...base.config,
      ...draft.config,
      photos: normalizePhotos(draft.config?.photos),
      optionRatings: draft.config?.optionRatings ?? {},
    };
    const safeSections: Record<string, SectionState> = {};
    for (const [id, sec] of Object.entries(draft.sections ?? {})) {
      safeSections[id] = {
        notes: sec?.notes ?? "",
        photos: normalizePhotos(sec?.photos),
        items: sec?.items ?? {},
      };
    }
    draft.sections = safeSections;
    // A finished submission is not a resumable draft.
    if (draft.submitted) return null;
    return draft;
  } catch {
    return null;
  }
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Read the future-Skimmer deep-link params from the URL (client only). */
function readQueryPrefill(): Partial<AssessmentState["property"]> & { jobId?: string } {
  if (typeof window === "undefined") return {};
  const q = new URLSearchParams(window.location.search);
  const out: Partial<AssessmentState["property"]> & { jobId?: string } = {};
  const customer = q.get("customer");
  const address = q.get("address");
  const city = q.get("city");
  const zip = q.get("zip");
  const pool = q.get("pool");
  const job = q.get("job");
  if (customer) out.customerName = customer;
  if (address) out.serviceAddress = address;
  if (city) out.city = city;
  if (zip) out.zip = zip;
  if (pool) out.poolType = pool;
  if (job) out.jobId = job;
  return out;
}

// --- Context ----------------------------------------------------------------

const Ctx = createContext<{
  state: AssessmentState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function AssessmentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    // Lazy init: resume a saved draft if one exists, else a fresh wizard.
    return loadDraft() ?? initialState();
  });

  // One-time: apply query prefill to still-empty fields + stamp inspection
  // date/time/session. Draft values always win over prefill.
  const bootstrapped = useRef(false);
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const { jobId, ...propPrefill } = readQueryPrefill();
    const patch: Partial<AssessmentState["property"]> = {};
    for (const [k, v] of Object.entries(propPrefill)) {
      if (!v) continue;
      if (!state.property[k as keyof AssessmentState["property"]]) {
        (patch as Record<string, unknown>)[k] = v;
      }
    }
    if (Object.keys(patch).length) dispatch({ type: "setProperty", patch });
    if (jobId && !state.jobId) dispatch({ type: "setJobId", jobId });

    // Auto-fill inspection details once, on load.
    const now = new Date();
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const detailPatch: Partial<AssessmentState["details"]> = {};
    // DATE: fill with today automatically, but only until the tech edits it — once
    // they do (dateDirty), their value wins and survives reloads. This keeps a
    // stale draft from carrying an old date forward WITHOUT silently overwriting a
    // deliberately-set inspection date on a signed certification.
    if (!state.dateDirty) detailPatch.date = date;
    // TIME: auto-stamped meta (never hand-typed), so re-stamp to now on every load
    // — same staleness fix as the date, without the manual-edit concern.
    detailPatch.time = time;
    if (!state.details.session) {
      detailPatch.session = `SPC-${date.replace(/-/g, "")}-${time.replace(":", "")}`;
    }
    if (Object.keys(detailPatch).length) dispatch({ type: "setDetails", patch: detailPatch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror state to localStorage on every change (best effort — quota/private
  // mode failures are swallowed so they never break the wizard).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Most likely the 5MB quota — many compressed photos. Drop silently;
      // the in-memory state is still intact for this session.
    }
  }, [state]);

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useAssessment() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAssessment must be used inside AssessmentProvider");
  return c;
}

/** Wipe the saved draft (used after a successful submit / "start new"). */
export function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
