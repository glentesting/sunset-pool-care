/**
 * The office revise-and-regenerate path.
 *
 * The whole point is that the customer's link never changes: /r/<reportId> mints
 * a fresh signed URL on every page load, so overwriting the PDF at the SAME
 * bucket key means the link already sitting in the HubSpot ticket serves the
 * corrected report. Nothing is re-sent and nothing is re-linked — which is why
 * the regenerated PDF must never be written to a new key.
 *
 * Order matters, and every risky step fails closed:
 *   1. re-read the stored archive — the CLIENT IS NOT TRUSTED for old values,
 *      the write whitelist, or the diff;
 *   2. reject a stale save so two people can't silently clobber each other;
 *   3. apply only whitelisted fields, and record what changed;
 *   4. re-score from the result: an explicit section-rating override wins, an
 *      edited section is re-derived, an untouched section is left as filed;
 *   5. rebuild the payload — aborts if a stored photo can't be read back;
 *   6. render;
 *   7. copy the live PDF to a versioned key — aborts if that copy fails, because
 *      a version may already be in a customer's inbox;
 *   8. only then overwrite the PDF and the archive.
 *
 * It deliberately does NOT re-POST to Make: that would create a duplicate
 * HubSpot ticket. The ticket's summary text therefore keeps the ORIGINAL
 * findings, and the customer record keeps the original details — both gaps the
 * review screen states plainly rather than hiding.
 */
import "server-only";
import type { AssessmentArchive } from "@/lib/assessment-archive";
import { readReportIndex, reportIndexPath, type ReportIndex } from "@/lib/assessment-archive";
import { isSpaAbsent, overallFromSectionRatings, rescoreAssessment } from "@/lib/archive-scoring";
import { splitCustomerName } from "@/lib/customer-name";
import { generateAssessmentPdf } from "@/lib/pdf-generator";
import { rebuildAssessmentData } from "@/lib/report-rebuild";
import { applyAndDiff, stampEntries, type RevisionEntry } from "@/lib/revision-log";
import { isSupabaseConfigured, readJsonObject, readObjectBytes, uploadObject } from "@/lib/supabase";

/** Customer fields whose edits do NOT reach HubSpot — surfaced to the office. */
const CUSTOMER_FIELD_PATHS: Record<string, string> = {
  "property.customerName": "name",
  "property.customerEmail": "email",
  "property.customerPhone": "phone",
  "property.serviceAddress": "service address",
  "property.city": "city",
  "property.zip": "ZIP",
};

export type LoadedReport = { index: ReportIndex; archive: AssessmentArchive };

/** Read a report's pointer and its archive. null when either is missing. */
export async function loadReport(reportId: string): Promise<LoadedReport | null> {
  const index = await readReportIndex(reportId);
  if (!index) return null;
  const archive = await readJsonObject<AssessmentArchive>(index.jsonPath);
  if (!archive) return null;
  return { index, archive };
}

export type ReviseResult = {
  ok: boolean;
  /** Machine-readable outcome so the UI can say exactly what happened. */
  status:
    | "saved"
    | "no-changes"
    | "stale"
    | "not-found"
    | "not-configured"
    | "photo-read-failed"
    | "version-copy-failed"
    | "pdf-failed"
    | "write-failed";
  message: string;
  entries?: RevisionEntry[];
  /** Photos the original lost at submit time and that no longer exist. */
  photosDropped?: string[];
  /** Human names of edited customer fields — HubSpot still has the old ones. */
  customerFieldsChanged?: string[];
  /** Whether the ticket's summary text is now out of date. */
  findingsChanged?: boolean;
};

export async function reviseAndRegenerate(opts: {
  reportId: string;
  editor: string;
  /** path -> new value, straight from the client. Only whitelisted paths apply. */
  fields: Record<string, unknown>;
  /** The archive's createdAt/lastRevisedAt the client loaded, for staleness. */
  loadedAt: string;
}): Promise<ReviseResult> {
  const { reportId, editor, fields, loadedAt } = opts;

  if (!isSupabaseConfigured()) {
    return { ok: false, status: "not-configured", message: "Report storage isn't configured." };
  }

  const loaded = await loadReport(reportId);
  if (!loaded) {
    return { ok: false, status: "not-found", message: "That report couldn't be found." };
  }
  const { index, archive } = loaded;

  // Staleness: the stamp advances on every successful revision.
  if (revisionStamp(archive) !== loadedAt) {
    return {
      ok: false,
      status: "stale",
      message: "Someone else saved changes to this report. Reload the page and redo your edits.",
    };
  }

  // Work on a copy so a failure part-way leaves nothing half-applied.
  const next: AssessmentArchive = JSON.parse(JSON.stringify(archive));
  const { entries, changedPaths } = applyAndDiff(next, fields);
  if (!entries.length) {
    return { ok: true, status: "no-changes", message: "Nothing was changed, so nothing was regenerated." };
  }

  // A corrected name re-derives first/last, which only exist for HubSpot's sake.
  if (changedPaths.has("property.customerName")) {
    Object.assign(next.property, splitCustomerName(next.property.customerName));
  }

  // --- Re-score. Item edits drive section ratings; an explicit section-rating
  //     edit overrides the derived value for that one section. ---
  //
  // Three cases per section, in precedence order:
  //   1. the office set the section rating by hand  -> that value wins outright;
  //   2. something inside the section was edited    -> re-derive from its items;
  //   3. nothing in the section was touched         -> LEAVE IT EXACTLY AS FILED.
  //
  // Case 3 is not an optimisation. Re-deriving a section nobody edited can only
  // move it away from what the tech filed, and it does: a section with no rated
  // items has no derivable rating, so a blind rescore overwrites a stored rating
  // with nothing — silently, and with no log entry, because nobody changed it.
  // A revision must alter what was edited and nothing else.
  const rescored = rescoreAssessment(next);
  type SectionRating = ReturnType<typeof rescoreAssessment>["sectionRatings"][string];
  const finalRatings: Record<string, SectionRating> = {};
  const touched = (i: number) => [...changedPaths].some((p) => p.startsWith(`sections[${i}].`));
  next.sections.forEach((section, i) => {
    finalRatings[section.id] = changedPaths.has(`sections[${i}].rating`)
      ? section.rating
      : touched(i)
        ? rescored.sectionRatings[section.id]
        : archive.sections[i].rating;
  });
  next.sections.forEach((section) => (section.rating = finalRatings[section.id]));
  next.itemCounts = rescored.itemCounts;
  next.overall = overallFromSectionRatings(
    next.sections.map((s) => s.id),
    finalRatings,
    isSpaAbsent(next)
  );

  const stamped = stampEntries(entries, editor);
  next.revisions = [...(archive.revisions ?? []), ...stamped];
  next.schemaVersion = archive.schemaVersion;

  // --- Rebuild + render. Aborts before touching storage if a photo is missing. ---
  const rebuilt = await rebuildAssessmentData(next);
  if (!rebuilt.ok) {
    return { ok: false, status: "photo-read-failed", message: rebuilt.error };
  }

  let pdf: Buffer;
  try {
    pdf = await generateAssessmentPdf(rebuilt.data, { revisedOn: todayIso() });
  } catch (e) {
    console.error(`Revision ${reportId}: PDF render failed:`, e);
    return { ok: false, status: "pdf-failed", message: "The report couldn't be rebuilt." };
  }

  // --- Preserve the version that may already be in a customer's inbox. ---
  const pdfPath = archive.pdfPath ?? index.pdfPath;
  const versions = [...(archive.pdfVersions ?? [])];
  if (pdfPath) {
    const current = await readObjectBytes(pdfPath);
    if (!current) {
      return {
        ok: false,
        status: "version-copy-failed",
        message: "Couldn't read the existing report to keep a copy of it, so nothing was changed.",
      };
    }
    const versionKey = `${pdfPath.replace(/\.pdf$/i, "")}-v${versions.length + 1}.pdf`;
    try {
      await uploadObject(versionKey, current.bytes, "application/pdf");
      versions.push(versionKey);
    } catch (e) {
      console.error(`Revision ${reportId}: version copy failed:`, e);
      return {
        ok: false,
        status: "version-copy-failed",
        message: "Couldn't keep a copy of the previous report, so nothing was changed.",
      };
    }
  }
  next.pdfVersions = versions;
  next.pdfPath = pdfPath;

  // --- Overwrite in place: SAME key, so the customer's link serves the new PDF. ---
  try {
    if (pdfPath) await uploadObject(pdfPath, new Uint8Array(pdf), "application/pdf");
    await uploadObject(index.jsonPath, JSON.stringify(next), "application/json");
    await uploadObject(
      reportIndexPath(reportId),
      JSON.stringify({ ...index, pdfPath, customerName: next.property.customerName,
        serviceAddress: next.property.serviceAddress, city: next.property.city,
        zip: next.property.zip, date: next.details.date } satisfies ReportIndex),
      "application/json"
    );
  } catch (e) {
    console.error(`Revision ${reportId}: write failed:`, e);
    return {
      ok: false,
      status: "write-failed",
      message: "The updated report couldn't be saved. Nothing was sent to the customer link.",
    };
  }

  const customerFieldsChanged = Object.entries(CUSTOMER_FIELD_PATHS)
    .filter(([path]) => changedPaths.has(path))
    .map(([, name]) => name);
  const findingsChanged = [...changedPaths].some(
    (p) => p.endsWith(".status") || p.endsWith(".rating")
  );

  return {
    ok: true,
    status: "saved",
    message: "Report regenerated. The customer's existing link now shows the updated version.",
    entries: stamped,
    photosDropped: rebuilt.photosDropped,
    customerFieldsChanged,
    findingsChanged,
  };
}

/**
 * The value a client must send back to prove it edited the current version.
 * Advances on every successful revision because the log only grows.
 */
export function revisionStamp(archive: AssessmentArchive): string {
  const revisions = archive.revisions ?? [];
  return revisions.length ? `${revisions.length}:${revisions[revisions.length - 1].at}` : "0";
}

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
