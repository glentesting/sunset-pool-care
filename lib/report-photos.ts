/**
 * Report photo NUMBERING — one rule for which photo is "photo n".
 *
 * Every surface that opens a photo full size addresses it the same way:
 *
 *   /r/<reportId>/photo/<n>
 *
 * served by app/r/[reportId]/photo/[n]/route.ts. The PDF links to it, the /r
 * page's photo grid links to it, and the office review screen links to it, so
 * the numbering has to be written down once rather than re-derived in each.
 *
 * n is the photo's 1-based position in the ARCHIVE's own order: configuration
 * photos first, then each section's photos, sections in report order. That is
 * the order archiveAssessment() uploads in (it's also the `NN-` prefix on each
 * stored key), and it is fixed at submit time — the office can edit a caption
 * but can't add, remove or reorder a photo. A photo whose upload failed keeps
 * its number; the route answers "not available" for it rather than letting the
 * numbers after it slide down by one.
 *
 * WHY NOT LINK THE STORAGE OBJECT: the bucket is private, so the only direct
 * link is a signed URL, and a signed URL expires. A PDF sits in someone's
 * inbox for years. The address above never expires — each request fetches the
 * bytes server-side, the same way the report PDF itself is served.
 *
 * Deliberately dependency-free (types only) so the client review form can use
 * reportPhotoPath too.
 */
import type { AssessmentArchive, ArchivedPhoto } from "@/lib/assessment-archive";
import type { AssessmentData } from "@/lib/validation/assessment";

/** Site-relative address of one report photo. */
export function reportPhotoPath(reportId: string, n: number): string {
  return `/r/${reportId}/photo/${n}`;
}

/** One archived photo with its number and where it sits in the report. */
export type NumberedPhoto = {
  n: number;
  photo: ArchivedPhoto;
  /** "config" or the index into archive.sections. */
  owner: "config" | number;
  /** Position within its owner's photo list. */
  index: number;
  /** Human heading for grouping: "Configuration" or the section title. */
  where: string;
};

/** Every photo in an archive, numbered in the canonical order. */
export function numberArchivePhotos(archive: AssessmentArchive): NumberedPhoto[] {
  const out: NumberedPhoto[] = [];
  archive.configPhotos.forEach((photo, index) =>
    out.push({ n: out.length + 1, photo, owner: "config", index, where: "Configuration" })
  );
  archive.sections.forEach((s, si) =>
    s.photos.forEach((photo, index) =>
      out.push({ n: out.length + 1, photo, owner: si, index, where: s.title })
    )
  );
  return out;
}

/**
 * Photo numbers laid out in the same shape as a payload's photos, so the PDF can
 * look up "section 3, photo 2" and get its n. Entries are null where a photo has
 * no number to link to.
 */
export type PhotoNumbers = {
  config: (number | null)[];
  sections: (number | null)[][];
};

/**
 * Numbers for a FRESH submit: the payload is exactly what gets archived, in
 * the same order, so the numbers are simply sequential.
 */
export function numberPayloadPhotos(data: AssessmentData): PhotoNumbers {
  let n = 0;
  return {
    config: data.configPhotos.map(() => ++n),
    sections: data.sections.map((s) => s.photos.map(() => ++n)),
  };
}

/** Absolute photo links in payload shape, for the PDF. */
export type PhotoLinks = {
  config: (string | undefined)[];
  sections: (string | undefined)[][];
};

export function photoLinksFor(
  baseUrl: string,
  reportId: string,
  numbers: PhotoNumbers
): PhotoLinks {
  const href = (n: number | null) =>
    n === null ? undefined : `${baseUrl}${reportPhotoPath(reportId, n)}`;
  return {
    config: numbers.config.map(href),
    sections: numbers.sections.map((list) => list.map(href)),
  };
}
