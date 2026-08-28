/**
 * The editable-field map, the revision log, and the diff between them.
 *
 * ONE list drives three things, so they can never disagree:
 *   1. what the review screen offers for editing;
 *   2. what the server is willing to WRITE — a path that isn't mapped here is
 *      structurally unwritable, whatever the client sends. This is how the
 *      read-only rules (chemistry readings, inspector name, the certification
 *      text, photo storage keys, reportId) are actually enforced, rather than
 *      just being disabled inputs someone could bypass;
 *   3. what a change is logged as, since each field carries its own
 *      human-readable label.
 *
 * The log is APPEND-ONLY and internal. It never reaches the customer PDF or the
 * public /r/<reportId> page. Changing a value back is two entries, not zero —
 * the tech's original finding always stands and every edit is attributable.
 */
import type { AssessmentArchive } from "@/lib/assessment-archive";
import type { Rating } from "@/lib/report-scoring";

/** One field changed by one person at one moment. Never edited or removed. */
export type RevisionEntry = {
  /** ISO-8601, server clock. */
  at: string;
  /** Who made the change, as they typed it. */
  editor: string;
  /** Human-readable field, e.g. "Pump & Motor > Shaft Seal > note". */
  field: string;
  /** Value before, rendered for reading. "" means it was empty. */
  from: string;
  /** Value after. */
  to: string;
};

const RATINGS: Rating[] = ["GOOD", "MONITOR", "ATTENTION", "N/A"];
/** Ratings read as the office sees them on the report, not as stored. */
const RATING_TEXT: Record<Rating, string> = {
  GOOD: "Good",
  MONITOR: "Monitor",
  ATTENTION: "Attn",
  "N/A": "N/A",
};
const NOT_RATED = "— not rated —";
const NOT_ANSWERED = "— not answered —";

/** Render a stored value for the log, the way the report shows it. */
function forLog(value: string, kind: FieldDef["kind"]): string {
  if (kind === "rating") return value ? (RATING_TEXT[value as Rating] ?? value) : NOT_RATED;
  if (kind === "binary") return value ? (value === "yes" ? "Yes" : "No") : NOT_ANSWERED;
  return value;
}

/**
 * Which answer the tech's checklist counted as the good one, recovered from what
 * was stored. `itemRating` derives GOOD when the answer matches goodAnswer and
 * ATTENTION otherwise, so the stored pair determines it: a GOOD item's own answer
 * IS the good one, and an ATTENTION item's is the other one. The archive doesn't
 * carry the item definitions, and this is exact rather than a guess.
 */
function goodAnswerOf(item: { answer?: "yes" | "no"; status?: Rating }): "yes" | "no" {
  if (!item.answer) return "yes";
  if (item.status === "GOOD") return item.answer;
  if (item.status === "ATTENTION") return item.answer === "yes" ? "no" : "yes";
  return "yes";
}

/**
 * One editable field: a stable `path` for diffing, a human `label` for the log,
 * and the accessors that read and write it.
 */
export type FieldDef = {
  path: string;
  /** Full human label, used verbatim in the log. */
  label: string;
  /** UI grouping — the report area this field belongs to. */
  group: string;
  /** The row within that group ("" for group-level fields). */
  row: string;
  /** Which column the field occupies in the review form. */
  slot: "rating" | "note" | "value" | "caption";
  /**
   * Ratings are constrained to the four values and binary answers to yes/no;
   * anything else is rejected.
   */
  kind: "text" | "rating" | "binary";
  get: () => string;
  set: (value: string) => void;
};

/** The same fields, flattened for the client. No accessors cross the wire. */
export type SerializedField = Omit<FieldDef, "get" | "set"> & { value: string };

export function serializeFields(a: AssessmentArchive): SerializedField[] {
  return editableFields(a).map((f) => {
    const { path, label, group, row, slot, kind } = f;
    return { path, label, group, row, slot, kind, value: f.get() };
  });
}

/**
 * Every editable field on one archive, in report order.
 *
 * Built against a specific archive instance, so the defs describe exactly the
 * sections, items, units and photos that assessment actually has — which is what
 * makes the list usable as a write whitelist.
 */
export function editableFields(a: AssessmentArchive): FieldDef[] {
  const out: FieldDef[] = [];

  const add = (
    slot: FieldDef["slot"],
    kind: FieldDef["kind"],
    path: string,
    group: string,
    row: string,
    label: string,
    get: () => string,
    set: (v: string) => void
  ) => out.push({ path, label, group, row, slot, kind, get, set });

  // --- Customer & property ---
  const PROPERTY = "Customer & property";
  const p = a.property;
  const prop = (key: keyof typeof p & string, row: string) =>
    add("value", "text", `property.${key}`, PROPERTY, row, row,
      () => String(p[key] ?? ""), (v) => ((p[key] as unknown) = v));
  prop("customerName", "Customer name");
  prop("customerEmail", "Customer email");
  prop("customerPhone", "Customer phone");
  prop("serviceAddress", "Service address");
  prop("city", "City");
  prop("zip", "ZIP");
  // Inspector NAME is deliberately not editable; the date is.
  add("value", "text", "details.date", PROPERTY, "Inspection date", "Inspection date",
    () => a.details.date, (v) => (a.details.date = v));

  // --- Configuration ---
  const CONFIG = "Configuration";
  a.configOptions.forEach((opt, i) => {
    add("rating", "rating", `configOptions[${i}].status`, CONFIG, opt.label,
      `${CONFIG} > ${opt.label} > rating`,
      () => opt.status ?? "", (v) => (opt.status = (v || undefined) as Rating | undefined));
    add("note", "text", `configOptions[${i}].note`, CONFIG, opt.label,
      `${CONFIG} > ${opt.label} > note`, () => opt.note, (v) => (opt.note = v));
  });
  a.configPhotos.forEach((photo, i) => {
    add("caption", "text", `configPhotos[${i}].label`, CONFIG, `photo ${i + 1}`,
      `${CONFIG} > photo ${i + 1} caption`, () => photo.label, (v) => (photo.label = v));
  });

  // --- Sections, in report order ---
  a.sections.forEach((section, s) => {
    const title = section.title;
    add("rating", "rating", `sections[${s}].rating`, title, "", `${title} > section rating`,
      () => section.rating ?? "", (v) => (section.rating = (v || undefined) as Rating | undefined));
    add("note", "text", `sections[${s}].notes`, title, "", `${title} > section notes`,
      () => section.notes, (v) => (section.notes = v));

    section.items.forEach((item, i) => {
      // A binary item's badge prints its ANSWER, not its rating, so offering a
      // rating select here would let the office turn a row red while it still
      // read "No" — colour and text asserting different things. Edit the answer
      // and derive the rating from it, exactly as the wizard does.
      if (item.answer) {
        const good = goodAnswerOf(item);
        add("rating", "binary", `sections[${s}].items[${i}].answer`, title, item.label,
          `${title} > ${item.label} > answer`,
          () => item.answer ?? "",
          (v) => {
            item.answer = (v || undefined) as "yes" | "no" | undefined;
            item.status = item.answer ? (item.answer === good ? "GOOD" : "ATTENTION") : undefined;
          });
      } else {
        add("rating", "rating", `sections[${s}].items[${i}].status`, title, item.label,
          `${title} > ${item.label} > rating`,
          () => item.status ?? "", (v) => (item.status = (v || undefined) as Rating | undefined));
      }
      add("note", "text", `sections[${s}].items[${i}].note`, title, item.label,
        `${title} > ${item.label} > note`, () => item.note, (v) => (item.note = v));
    });

    section.units.forEach((unit, u) => {
      const where = `${title} — ${unit.heading}`;
      add("note", "text", `sections[${s}].units[${u}].note`, where, "",
        `${title} > ${unit.heading} > notes`, () => unit.note, (v) => (unit.note = v));
      unit.items.forEach((item, i) => {
        add("rating", "rating", `sections[${s}].units[${u}].items[${i}].status`, where, item.label,
          `${title} > ${unit.heading} > ${item.label} > rating`,
          () => item.status ?? "", (v) => (item.status = (v || undefined) as Rating | undefined));
        add("note", "text", `sections[${s}].units[${u}].items[${i}].note`, where, item.label,
          `${title} > ${unit.heading} > ${item.label} > note`, () => item.note, (v) => (item.note = v));
      });
    });

    section.photos.forEach((photo, i) => {
      add("caption", "text", `sections[${s}].photos[${i}].label`, title, `photo ${i + 1}`,
        `${title} > photo ${i + 1} caption`, () => photo.label, (v) => (photo.label = v));
    });
  });

  // --- Overall ---
  add("note", "text", "overallNotes", "Overall", "", "Overall assessment notes",
    () => a.overallNotes, (v) => (a.overallNotes = v));

  return out;
}

/** path -> current value, for diffing two archives without walking them twice. */
export function fieldSnapshot(a: AssessmentArchive): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of editableFields(a)) out[f.path] = f.get();
  return out;
}

export type DiffResult = {
  entries: Omit<RevisionEntry, "at" | "editor">[];
  /** Paths that changed — the save path needs these to honour rating overrides. */
  changedPaths: Set<string>;
};

/**
 * Write the submitted values onto `target` and describe what changed.
 *
 * `target` is a copy of the STORED archive, which is the authority for both the
 * old values and the set of writable paths. Only paths the stored archive
 * defines are ever written, and only from the matching path in `submitted`, so
 * an unexpected or hostile payload cannot reach a field that isn't editable.
 * A rating is only accepted as one of the four known values or empty.
 */
export function applyAndDiff(
  target: AssessmentArchive,
  submitted: Record<string, unknown>
): DiffResult {
  const entries: DiffResult["entries"] = [];
  const changedPaths = new Set<string>();

  for (const field of editableFields(target)) {
    const raw = submitted[field.path];
    if (typeof raw !== "string") continue; // absent or wrong type — keep stored
    const next = field.kind === "text" ? raw : raw.trim();
    if (field.kind === "rating" && next !== "" && !RATINGS.includes(next as Rating)) {
      continue; // not a rating we recognise — ignore rather than corrupt the report
    }
    if (field.kind === "binary" && next !== "" && next !== "yes" && next !== "no") {
      continue; // same: a binary item answers yes or no, or it was never answered
    }
    const prev = field.get();
    if (prev === next) continue;

    field.set(next);
    changedPaths.add(field.path);
    entries.push({
      field: field.label,
      from: forLog(prev, field.kind),
      to: forLog(next, field.kind),
    });
  }

  return { entries, changedPaths };
}

/** Stamp diff entries with who and when. Callers only ever APPEND the result. */
export function stampEntries(
  entries: DiffResult["entries"],
  editor: string,
  at = new Date().toISOString()
): RevisionEntry[] {
  return entries.map((e) => ({ at, editor, ...e }));
}
