/**
 * Turn an archived assessment back into the payload the PDF generator wants.
 *
 * The archive stores each photo as a bucket key rather than inline base64 — that
 * keeps the JSON small, and this is where the cost comes due: every photo has to
 * be fetched back and re-encoded before a report can be re-rendered.
 *
 * FAIL CLOSED on a photo that should exist. If a key is present but the bytes
 * can't be fetched, the whole rebuild fails rather than quietly producing a
 * customer-facing PDF with images missing from it. The one thing that is NOT a
 * failure is a photo whose key is null: that upload failed at submit time, the
 * archive already records it as lost, and no amount of retrying will bring it
 * back — those are dropped and named in the result so the office is told the
 * regenerated report has fewer photos than the original.
 */
import "server-only";
import type { AssessmentData } from "@/lib/validation/assessment";
import type { AssessmentArchive, ArchivedPhoto } from "@/lib/assessment-archive";
import { readObjectBytes } from "@/lib/supabase";

export type RebuildResult =
  | { ok: true; data: AssessmentData; photosDropped: string[] }
  | { ok: false; error: string };

/** Fetch one archived photo back as a data URL. null = never stored. */
async function rehydrate(photo: ArchivedPhoto): Promise<
  { kind: "ok"; dataUrl: string } | { kind: "lost" } | { kind: "error"; key: string }
> {
  if (!photo.storageKey) return { kind: "lost" };
  const object = await readObjectBytes(photo.storageKey);
  if (!object) return { kind: "error", key: photo.storageKey };
  const base64 = Buffer.from(object.bytes).toString("base64");
  return { kind: "ok", dataUrl: `data:${object.contentType};base64,${base64}` };
}

export async function rebuildAssessmentData(
  archive: AssessmentArchive
): Promise<RebuildResult> {
  const photosDropped: string[] = [];

  // Every photo across config + sections, fetched together rather than serially.
  const refs: { photo: ArchivedPhoto; where: string }[] = [
    ...archive.configPhotos.map((photo, i) => ({ photo, where: `Configuration photo ${i + 1}` })),
    ...archive.sections.flatMap((s) =>
      s.photos.map((photo, i) => ({ photo, where: `${s.title} photo ${i + 1}` }))
    ),
  ];
  const results = await Promise.all(refs.map((r) => rehydrate(r.photo)));

  const failed = results.flatMap((r, i) => (r.kind === "error" ? [refs[i].where] : []));
  if (failed.length) {
    return {
      ok: false,
      error: `Could not read ${failed.length} stored photo(s) back: ${failed.join(", ")}`,
    };
  }

  // Walk the same order to pair each result with its photo.
  let cursor = 0;
  const take = (photo: ArchivedPhoto): { label: string; dataUrl: string }[] => {
    const result = results[cursor];
    const where = refs[cursor].where;
    cursor += 1;
    if (result.kind === "ok") return [{ label: photo.label, dataUrl: result.dataUrl }];
    photosDropped.push(where); // never stored at submit time — unrecoverable
    return [];
  };

  const configPhotos = archive.configPhotos.flatMap(take);
  const sections = archive.sections.map((s) => ({
    ...s,
    photos: s.photos.flatMap(take),
  }));
  // photoCount must describe what the report actually shows.
  for (const s of sections) s.photoCount = s.photos.length;

  return {
    ok: true,
    photosDropped,
    data: {
      jobId: archive.jobId,
      property: archive.property,
      details: archive.details,
      config: archive.config,
      configPhotos,
      configOptions: archive.configOptions,
      sections,
      chemistry: archive.chemistry,
      itemCounts: archive.itemCounts,
      lights: archive.lights,
      filters: archive.filters,
      pumps: archive.pumps,
      spaType: archive.spaType,
      overallNotes: archive.overallNotes,
      overall: archive.overall,
      certification: archive.certification,
    },
  };
}
