/**
 * Build the API request body (AssessmentData) from wizard state.
 *
 * Pass 3: the report is PER-ITEM. Each section emits its rated checklist rows
 * (plus per-unit rows for filters/pumps/lights/extras), unrated items are
 * dropped ("blank renders nothing"), and a report-wide item count band is
 * computed. Section photos (compressed JPEG data URLs) are embedded so the PDF
 * can render them.
 */
import type {
  AssessmentData,
  ReportItem,
  ReportUnit,
} from "@/lib/validation/assessment";
import {
  CHEMISTRY_PARAMS,
  SALT_SANITIZER,
  SECTIONS,
  SPA_NA,
  UNIT_SECTIONS,
  getSection,
  type ItemDef,
  type Rating,
} from "./config";
import {
  derivedSpaType,
  isSpaPresent,
  itemRating,
  overallCondition,
  sectionRating,
} from "./summary";
import { unitHeading } from "./shared/UnitList";
import type { AssessmentState, ItemState, Photo } from "./state";

/** Singular unit noun per section (for unit headings on the report). */
const UNIT_SINGULAR: Record<string, string> = {
  filtration: "Filter",
  pump: "Pump",
  automation: "Light",
  secondary: "Equipment",
};

/**
 * Slot-name caption floor for a photo key. Slotted photos (fixed / per-unit)
 * fall back to their slot name; ad-hoc photos ("extra:…") have no floor.
 */
function slotName(key: string): string {
  if (key.startsWith("extra:")) return ""; // ad-hoc → no floor caption
  const parts = key.split(":");
  return parts.length >= 3 ? parts[parts.length - 1] : key;
}

function photosOf(map: Record<string, Photo>): { label: string; dataUrl: string }[] {
  return Object.entries(map)
    .filter(([, p]) => Boolean(p?.dataUrl))
    .map(([key, p]) => ({ label: (p.label ?? "").trim() || slotName(key), dataUrl: p.dataUrl }));
}

/**
 * Split the customer's full name into first + last for the webhook payload
 * (HubSpot wants them separate). `customerName` itself is left untouched.
 *   - trim + collapse internal whitespace to single spaces
 *   - ""        -> { first: "", last: "" }
 *   - one token -> { first: token, last: "" }
 *   - else      -> first token / everything after the first space, as-is
 *     ("Mary Anne Van Der Berg" -> "Mary" / "Anne Van Der Berg")
 */
export function splitCustomerName(fullName: string): {
  customerFirstName: string;
  customerLastName: string;
} {
  const normalized = fullName.trim().replace(/\s+/g, " ");
  if (!normalized) return { customerFirstName: "", customerLastName: "" };
  const gap = normalized.indexOf(" ");
  if (gap === -1) return { customerFirstName: normalized, customerLastName: "" };
  return {
    customerFirstName: normalized.slice(0, gap),
    customerLastName: normalized.slice(gap + 1),
  };
}

/** One rated/annotated item → a report row. Unrated + empty items return null. */
function reportItem(def: ItemDef, st: ItemState | undefined): ReportItem | null {
  const status = itemRating(def, st);
  const note = (st?.note ?? "").trim();
  const reading = (st?.reading ?? "").trim();
  // "Unrated items render nothing" — but keep a bare note/reading if the tech
  // bothered to write one.
  if (!status && !note && !reading) return null;
  return {
    label: def.label,
    status,
    answer: st?.answer,
    reading: reading || undefined,
    readingUnit: def.readingUnit,
    note,
  };
}

function tally(counts: { attention: number; monitor: number; good: number }, r?: Rating) {
  if (r === "ATTENTION") counts.attention += 1;
  else if (r === "MONITOR") counts.monitor += 1;
  else if (r === "GOOD") counts.good += 1;
}

export function buildSubmitPayload(state: AssessmentState): AssessmentData {
  const usesSalt = state.config.sanitization.includes(SALT_SANITIZER);
  const spaPresent = isSpaPresent(state);
  const counts = { attention: 0, monitor: 0, good: 0 };

  const sections = SECTIONS.map((s) => {
    // Auto-skipped spa is reported as N/A with nothing attached.
    if (s.id === "spa" && !spaPresent) {
      return {
        id: s.id,
        title: s.title,
        rating: "N/A" as const,
        notes: "",
        photoCount: 0,
        photos: [],
        items: [],
        units: [],
      };
    }

    const cfg = getSection(s.id);
    const sec = state.sections[s.id];
    const stateItems = sec?.items ?? {};

    // Section-level checklist rows.
    const items: ReportItem[] = (cfg?.items ?? [])
      .filter((d) => !d.conditional || d.conditional(state))
      .map((d) => reportItem(d, stateItems[d.id]))
      .filter((r): r is ReportItem => r !== null);
    for (const r of items) tally(counts, r.status);

    // Spa's own Last Water Change rides as a row on the spa section.
    if (s.id === "spa") {
      const note = state.spaLastWaterChangeUnknown
        ? state.spaLastWaterChangeNote
        : state.spaLastWaterChange
          ? `Last changed: ${state.spaLastWaterChange}`
          : "";
      if (note.trim()) items.push({ label: "Last Water Change (Spa)", note: note.trim() });
    }

    // Repeatable-unit rows (each unit its own checklist).
    const unitCfg = UNIT_SECTIONS[s.id];
    const units: ReportUnit[] = [];
    if (unitCfg) {
      const singular = UNIT_SINGULAR[s.id] ?? "Unit";
      state[unitCfg.list].forEach((u, i) => {
        const uItems = unitCfg.defs
          .map((d) => reportItem(d, stateItems[`${u.id}:${d.id}`]))
          .filter((r): r is ReportItem => r !== null);
        for (const r of uItems) tally(counts, r.status);

        let heading = unitHeading(singular, i, u);
        if (u.location?.trim()) heading += ` · ${u.location.trim()}`;

        // Filter's Last Full Clean / Replacement.
        let note = "";
        if (u.lastCleanUnknown) note = (u.lastCleanNote ?? "").trim();
        else if (u.lastClean?.trim()) note = `Last full clean: ${u.lastClean.trim()}`;

        if (uItems.length || u.makeModel.trim() || note) {
          units.push({ heading, note, items: uItems });
        }
      });
    }

    const photos = sec ? photosOf(sec.photos) : [];
    return {
      id: s.id,
      title: s.title,
      rating: sectionRating(state, s.id),
      notes: sec?.notes ?? "",
      photoCount: photos.length,
      photos,
      items,
      units,
    };
  });

  // A chemistry parameter is scored + shown ONLY when it has an actual reading.
  // No reading (empty / whitespace) → NO status, dropped from the report and the
  // count band. A "Good" with no measurement would be a false safety claim; a
  // rating can otherwise linger without a reading (manual tap, or a resumed
  // draft), so we gate on the reading here, in the one place both the PDF and the
  // count band read.
  const chemistry = CHEMISTRY_PARAMS.filter((p) => !p.saltOnly || usesSalt)
    .map((p) => ({ p, row: state.chemistry[p.key] }))
    .filter(({ row }) => (row?.reading ?? "").trim() !== "")
    .map(({ p, row }) => {
      tally(counts, row?.rating);
      return {
        key: p.key,
        label: p.label,
        reading: (row?.reading ?? "").trim(),
        rating: row?.rating,
        ideal: p.ideal,
      };
    });

  // Selected sanitation / feature options with a rating or note (spec Pass 2).
  const configOptions: { label: string; status?: Rating; note: string }[] = [];
  const pushOption = (prefix: string, opt: string) => {
    const o = state.config.optionRatings[`${prefix}:${opt}`];
    if (!o) return;
    const note = (o.note ?? "").trim();
    if (!o.rating && !note) return;
    tally(counts, o.rating);
    configOptions.push({ label: opt, status: o.rating, note });
  };
  state.config.sanitization.forEach((o) => pushOption("sanitation", o));
  state.config.features.filter((o) => o !== "None").forEach((o) => pushOption("feature", o));

  return {
    jobId: state.jobId || undefined,
    property: {
      ...state.property,
      // Email trimmed before it goes over the wire; first/last derived from name.
      customerEmail: state.property.customerEmail.trim(),
      ...splitCustomerName(state.property.customerName),
    },
    details: { ...state.details },
    config: {
      surfaces: state.config.surfaces,
      sanitization: state.config.sanitization,
      features: state.config.features,
    },
    configPhotos: photosOf(state.config.photos),
    configOptions,
    sections,
    chemistry,
    itemCounts: counts,
    lights: state.lights.map((u, i) => unitHeading("Light", i, u)),
    filters: state.filters.map((u, i) => unitHeading("Filter", i, u)),
    pumps: state.pumps.map((u, i) => unitHeading("Pump", i, u)),
    spaType: spaPresent ? state.spaType || derivedSpaType(state) : SPA_NA,
    overallNotes: state.overallNotes,
    overall: overallCondition(state),
    certification: {
      inspectorName: state.details.inspectorName,
      date: state.details.date,
      certified: state.certification.certified as true,
    },
  };
}
