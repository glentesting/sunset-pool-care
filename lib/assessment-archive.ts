/**
 * Assessment ARCHIVE — the raw data behind a report, kept so the report can be
 * reopened, corrected and re-rendered later.
 *
 * Until now Supabase held only the rendered PDF and Make got a flattened
 * plain-text summary, so the structured assessment (ratings, notes, readings,
 * photo labels, chemistry) stopped existing the moment the submit finished. This
 * module writes it down.
 *
 * Per submit, into the same private `assessment-pdfs` bucket:
 *
 *   <stem>.pdf                      the rendered report (uploaded by the caller)
 *   <stem>.json                     THIS archive — the full payload
 *   photos/<reportId>/<nn>-<slug>.jpg   one binary per captured photo
 *   index/<reportId>.json           tiny pointer the /r/<reportId> viewer reads
 *
 * where <stem> is e.g. `Dale-Whitaker-2026-08-24-a7f3k2` — the pair shares a
 * filename stem so it's obvious in the bucket listing.
 *
 * PHOTOS ARE STORED AS SEPARATE FILES, not inlined as base64 in the JSON.
 * Photos reach the server as compressed JPEG data URLs (1280px longest edge,
 * quality 0.6 — see lib/image-compress.ts): roughly 90–160 KB each, ~1.37x that
 * again once base64-encoded. A routine assessment carries 10–18 of them and a
 * heavy job (green pool, multi-unit equipment pad) 25+, so inlining would put a
 * typical archive at 1.5–3 MB and a bad one past 5 MB — the wizard's own draft
 * writer already anticipates blowing the 5 MB localStorage quota on the same
 * data. Splitting them out keeps the JSON at tens of KB, so the planned office
 * edit-and-regenerate screen (and any future index of past assessments) loads
 * the structured data instantly and pulls image bytes only when it actually
 * needs to re-render. The cost, accepted deliberately: a reload path has to
 * rehydrate `dataUrl` from `storageKey` before feeding the payload back through
 * assessmentSchema, and each photo is its own upload that can fail on its own —
 * which is why a failed photo records `storageKey: null` and is reported
 * honestly on the submit screen rather than silently dropped.
 *
 * Nothing in here may break a submit: every failure is caught and reported.
 */
import "server-only";
import type { AssessmentData } from "@/lib/validation/assessment";
import type { ReportPresentation } from "@/lib/report-presentation";
import { isSupabaseConfigured, readJsonObject, uploadObject } from "@/lib/supabase";

/** Bump when the archive shape changes so an older file is still readable. */
export const ARCHIVE_SCHEMA_VERSION = 1;

/** A photo in the archive: its caption plus the bucket key holding the bytes. */
export type ArchivedPhoto = {
  label: string;
  /** Object key in the bucket; null when that one upload failed. */
  storageKey: string | null;
};

/** The complete assessment as stored. Everything a re-render needs. */
export type AssessmentArchive = {
  schemaVersion: number;
  reportId: string;
  /** ISO-8601, server clock, when the archive was written. */
  createdAt: string;
  /** Bucket key of the rendered PDF; null when PDF generation failed. */
  pdfPath: string | null;
  jobId?: string;
  property: AssessmentData["property"];
  details: AssessmentData["details"];
  config: AssessmentData["config"];
  configPhotos: ArchivedPhoto[];
  configOptions: AssessmentData["configOptions"];
  sections: (Omit<AssessmentData["sections"][number], "photos"> & { photos: ArchivedPhoto[] })[];
  chemistry: AssessmentData["chemistry"];
  itemCounts: AssessmentData["itemCounts"];
  lights: string[];
  filters: string[];
  pumps: string[];
  spaType: string;
  overallNotes: string;
  overall: AssessmentData["overall"];
  certification: AssessmentData["certification"];
  /**
   * The presentation-only WORDING used for this render (Claude's polished notes
   * + summary). Stored so a regenerated PDF reads identically instead of being
   * re-worded on every re-render.
   */
  presentation?: ReportPresentation;
};

/**
 * The small object the public viewer reads. Kept separate from the full archive
 * so /r/<reportId> is one tiny GET rather than a multi-hundred-KB download on
 * every page view, and so the viewer never depends on the filename convention.
 */
export type ReportIndex = {
  schemaVersion: number;
  reportId: string;
  createdAt: string;
  pdfPath: string | null;
  jsonPath: string;
  customerName: string;
  serviceAddress: string;
  city: string;
  zip: string;
  /** Inspection date (YYYY-MM-DD as captured). */
  date: string;
};

/** What the submit screen needs to tell the truth about this step. */
export type ArchiveResult = {
  /** The JSON archive AND its index pointer both landed. */
  ok: boolean;
  reason?: "not-configured" | "error";
  photos: { total: number; uploaded: number };
};

const INDEX_PREFIX = "index/";

/** Bucket key of the pointer object for a report. */
export function reportIndexPath(reportId: string): string {
  return `${INDEX_PREFIX}${reportId}.json`;
}

/** Look up a report's pointer object. Returns null for an unknown id. */
export function readReportIndex(reportId: string): Promise<ReportIndex | null> {
  return readJsonObject<ReportIndex>(reportIndexPath(reportId));
}

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

/** Split a `data:<mime>;base64,<payload>` URL into bytes + mime. */
function decodeDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array<ArrayBuffer> } | null {
  // [\s\S] rather than the /s flag — the build targets es2017.
  const m = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,([\s\S]*)$/i.exec(dataUrl);
  if (!m) return null;
  try {
    const buf = Buffer.from(m[2], "base64");
    if (!buf.byteLength) return null;
    // Copy into a plain ArrayBuffer-backed view — Buffer's own is pooled, and
    // fetch's BodyInit wants ArrayBufferView<ArrayBuffer>.
    const bytes = new Uint8Array(buf.byteLength);
    bytes.set(buf);
    return { mime: m[1].toLowerCase(), bytes };
  } catch {
    return null;
  }
}

/** Filesystem-safe fragment of a caption, for a readable bucket listing. */
function slugify(label: string): string {
  const s = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return s || "photo";
}

/** Every photo on the payload, flattened in a stable order with its owner. */
type PhotoRef = { owner: "config" | string; index: number; label: string; dataUrl: string };

function collectPhotos(data: AssessmentData): PhotoRef[] {
  const out: PhotoRef[] = [];
  data.configPhotos.forEach((p, i) => out.push({ owner: "config", index: i, ...p }));
  for (const s of data.sections) {
    s.photos.forEach((p, i) => out.push({ owner: s.id, index: i, ...p }));
  }
  return out;
}

/**
 * Write the archive for one submit: photos, then the JSON, then the index.
 *
 * Never throws. Every outcome — not configured, a failed photo, a failed JSON —
 * comes back in the result so the submit screen can report it honestly and the
 * PDF + ticket flow continues regardless.
 */
export async function archiveAssessment(opts: {
  data: AssessmentData;
  presentation?: ReportPresentation;
  reportId: string;
  /** Shared filename stem, e.g. `Dale-Whitaker-2026-08-24-a7f3k2`. */
  stem: string;
  /** Bucket key of the uploaded PDF, or null when there isn't one. */
  pdfPath: string | null;
}): Promise<ArchiveResult> {
  const { data, presentation, reportId, stem, pdfPath } = opts;
  const refs = collectPhotos(data);
  const photos = { total: refs.length, uploaded: 0 };

  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "not-configured", photos };
  }

  try {
    // 1. Photos — all in flight at once, and independently failable. A photo
    //    that doesn't land must not cost us the structured data, so we settle
    //    every one and record a null key for the losers.
    const uploaded = await Promise.allSettled(
      refs.map(async (ref, n) => {
        const decoded = decodeDataUrl(ref.dataUrl);
        if (!decoded) throw new Error(`unrecognized photo data URL (${ref.owner}#${ref.index})`);
        const ext = MIME_EXT[decoded.mime] ?? "bin";
        const key = `photos/${reportId}/${String(n + 1).padStart(2, "0")}-${slugify(ref.label)}.${ext}`;
        await uploadObject(key, decoded.bytes, decoded.mime);
        return key;
      })
    );

    const keyAt = (n: number): string | null => {
      const r = uploaded[n];
      if (r.status === "fulfilled") return r.value;
      console.error(`Assessment photo upload failed (${refs[n].owner}#${refs[n].index}):`, r.reason);
      return null;
    };
    photos.uploaded = uploaded.filter((r) => r.status === "fulfilled").length;

    // Walk the flat results back onto the payload's own shape, in the same order
    // collectPhotos produced them.
    let cursor = 0;
    const take = (label: string): ArchivedPhoto => ({ label, storageKey: keyAt(cursor++) });
    const configPhotos = data.configPhotos.map((p) => take(p.label));
    const sections = data.sections.map((s) => ({ ...s, photos: s.photos.map((p) => take(p.label)) }));

    const jsonPath = `${stem}.json`;
    const archive: AssessmentArchive = {
      schemaVersion: ARCHIVE_SCHEMA_VERSION,
      reportId,
      createdAt: new Date().toISOString(),
      pdfPath,
      jobId: data.jobId,
      property: data.property,
      details: data.details,
      config: data.config,
      configPhotos,
      configOptions: data.configOptions,
      sections,
      chemistry: data.chemistry,
      itemCounts: data.itemCounts,
      lights: data.lights,
      filters: data.filters,
      pumps: data.pumps,
      spaType: data.spaType,
      overallNotes: data.overallNotes,
      overall: data.overall,
      certification: data.certification,
      presentation,
    };

    // 2. The archive itself.
    await uploadObject(jsonPath, JSON.stringify(archive), "application/json");

    // 3. The viewer's pointer — last, so it only ever names an archive that
    //    actually landed.
    const index: ReportIndex = {
      schemaVersion: ARCHIVE_SCHEMA_VERSION,
      reportId,
      createdAt: archive.createdAt,
      pdfPath,
      jsonPath,
      customerName: data.property.customerName,
      serviceAddress: data.property.serviceAddress,
      city: data.property.city,
      zip: data.property.zip,
      date: data.details.date,
    };
    await uploadObject(reportIndexPath(reportId), JSON.stringify(index), "application/json");

    return { ok: true, photos };
  } catch (e) {
    console.error("Assessment archive failed:", e);
    return { ok: false, reason: "error", photos };
  }
}
