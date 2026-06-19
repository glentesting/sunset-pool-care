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
import type { Rating } from "./config";

// --- Shape ------------------------------------------------------------------

export type BodyOfWater = {
  id: string;
  poolType: string;
  size: string;
  lastWaterChange: string;
  lastWaterChangeUnknown: boolean;
};

export type RecItem = {
  id: string;
  item: string;
  investment: string;
  timeframe: string;
};

export type Unit = { id: string; label: string };

export type SectionState = {
  rating?: Rating;
  notes: string;
  /** slot key -> compressed data URL */
  photos: Record<string, string>;
};

export type SubmitResults = {
  pdf: boolean;
  drive: boolean;
  hubspot: boolean;
  skimmer: boolean;
};

export type AssessmentState = {
  step: number;
  jobId: string;
  property: {
    customerName: string;
    serviceAddress: string;
    city: string;
    zip: string;
    poolType: string;
    poolSize: string;
    lastWaterChange: string;
    lastWaterChangeUnknown: boolean;
    additionalBodies: BodyOfWater[];
  };
  details: { session: string; date: string; time: string; inspectorName: string };
  config: {
    surfaces: string[];
    sanitization: string[];
    features: string[];
    photos: Record<string, string>;
  };
  /** keyed by SECTIONS config id */
  sections: Record<string, SectionState>;
  /** keyed by CHEMISTRY_PARAMS key */
  chemistry: Record<string, { reading: string; rating?: Rating }>;
  lights: Unit[];
  filters: Unit[];
  pumps: Unit[];
  spaType: string;
  recommendations: { p1: RecItem[]; p2: RecItem[]; overallNotes: string };
  certification: { inspectorName: string; date: string; certified: boolean };
  submitting: boolean;
  submitted: boolean;
  results: SubmitResults | null;
  error: string | null;
};

type ListKey = "lights" | "filters" | "pumps";
type RecTier = "p1" | "p2";

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
  | { type: "setConfigList"; field: "surfaces" | "sanitization" | "features"; value: string }
  | { type: "setConfigPhoto"; slot: string; dataUrl: string | null }
  | { type: "rateSection"; id: string; rating: Rating }
  | { type: "setSectionNotes"; id: string; notes: string }
  | { type: "setSectionPhoto"; id: string; slot: string; dataUrl: string | null }
  | { type: "setChemistry"; key: string; patch: Partial<{ reading: string; rating?: Rating }> }
  | { type: "addUnit"; list: ListKey; label: string }
  | { type: "updateUnit"; list: ListKey; id: string; label: string }
  | { type: "removeUnit"; list: ListKey; id: string }
  | { type: "setSpaType"; value: string }
  | { type: "addRec"; tier: RecTier }
  | { type: "updateRec"; tier: RecTier; id: string; patch: Partial<RecItem> }
  | { type: "removeRec"; tier: RecTier; id: string }
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
  return { notes: "", photos: {} };
}

export function initialState(): AssessmentState {
  return {
    step: 0,
    jobId: "",
    property: {
      customerName: "",
      serviceAddress: "",
      city: "",
      zip: "",
      poolType: "",
      poolSize: "",
      lastWaterChange: "",
      lastWaterChangeUnknown: false,
      additionalBodies: [],
    },
    details: { session: "", date: "", time: "", inspectorName: "" },
    config: { surfaces: [], sanitization: [], features: [], photos: {} },
    sections: {},
    chemistry: {},
    lights: [],
    filters: [],
    pumps: [],
    spaType: "",
    recommendations: { p1: [], p2: [], overallNotes: "" },
    certification: { inspectorName: "", date: "", certified: false },
    submitting: false,
    submitted: false,
    results: null,
    error: null,
  };
}

function withPhoto(
  photos: Record<string, string>,
  slot: string,
  dataUrl: string | null
): Record<string, string> {
  const next = { ...photos };
  if (dataUrl) next[slot] = dataUrl;
  else delete next[slot];
  return next;
}

function section(s: AssessmentState, id: string): SectionState {
  return s.sections[id] ?? emptySection();
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

    case "rateSection":
      return {
        ...s,
        sections: { ...s.sections, [a.id]: { ...section(s, a.id), rating: a.rating } },
      };
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

    case "setChemistry": {
      const prev = s.chemistry[a.key] ?? { reading: "" };
      return {
        ...s,
        chemistry: { ...s.chemistry, [a.key]: { ...prev, ...a.patch } },
      };
    }

    case "addUnit":
      return { ...s, [a.list]: [...s[a.list], { id: uid(), label: a.label }] };
    case "updateUnit":
      return {
        ...s,
        [a.list]: s[a.list].map((u) => (u.id === a.id ? { ...u, label: a.label } : u)),
      };
    case "removeUnit":
      return { ...s, [a.list]: s[a.list].filter((u) => u.id !== a.id) };

    case "setSpaType":
      return { ...s, spaType: a.value };

    case "addRec":
      return {
        ...s,
        recommendations: {
          ...s.recommendations,
          [a.tier]: [
            ...s.recommendations[a.tier],
            { id: uid(), item: "", investment: "", timeframe: "" },
          ],
        },
      };
    case "updateRec":
      return {
        ...s,
        recommendations: {
          ...s.recommendations,
          [a.tier]: s.recommendations[a.tier].map((r) =>
            r.id === a.id ? { ...r, ...a.patch } : r
          ),
        },
      };
    case "removeRec":
      return {
        ...s,
        recommendations: {
          ...s.recommendations,
          [a.tier]: s.recommendations[a.tier].filter((r) => r.id !== a.id),
        },
      };
    case "setOverallNotes":
      return { ...s, recommendations: { ...s.recommendations, overallNotes: a.notes } };

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

const STORAGE_KEY = "spc-assessment-draft-v1";

function loadDraft(): AssessmentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AssessmentState>;
    // Merge over a fresh base so older drafts missing new keys don't crash.
    const draft = { ...initialState(), ...parsed };
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

    // Auto-fill inspection details once.
    const now = new Date();
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const detailPatch: Partial<AssessmentState["details"]> = {};
    if (!state.details.date) detailPatch.date = date;
    if (!state.details.time) detailPatch.time = time;
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
