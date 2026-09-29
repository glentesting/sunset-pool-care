import { NextResponse } from "next/server";
import { isReportId } from "@/lib/report-id";
import { readReportArchive } from "@/lib/assessment-archive";
import { readObjectBytes } from "@/lib/supabase";
import { numberArchivePhotos } from "@/lib/report-photos";

/**
 * /r/<reportId>/photo/<n> — one report photo, full size.
 *
 * The permanent address every "open this photo" link points at: the photo
 * links inside the PDF, the /r page's photo grid, and the office review screen.
 * See lib/report-photos.ts for what n means.
 *
 * Same model as ../pdf/route.ts: the bucket is private, so the bytes are read
 * server-side on every request and the browser only ever sees this path. No
 * signed URL reaches the page or the PDF, so nothing handed to a customer can
 * expire. Public and unauthenticated for the same reason /r is — the reportId
 * is the secret, and anyone holding it already has every photo in the PDF.
 *
 * Served INLINE as the image itself, so a tap opens it in the phone's own image
 * view — full screen, pinch to zoom — rather than a page of ours to fight with.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ reportId: string; n: string }> }
) {
  const { reportId, n: rawN } = await params;
  const n = /^\d{1,4}$/.test(rawN) ? Number(rawN) : NaN;
  if (!isReportId(reportId) || !Number.isInteger(n) || n < 1) {
    return notFound();
  }

  // As on /r: a storage outage is "try again", never "this doesn't exist".
  const loaded = await readReportArchive(reportId);
  if (loaded.status === "unavailable") {
    console.error(`Report ${reportId} photo ${n}: storage unavailable:`, loaded.error);
    return unavailable();
  }
  if (loaded.status === "absent") return notFound();

  const entry = numberArchivePhotos(loaded.archive).find((p) => p.n === n);
  // No such photo, or one whose upload failed at submit time. The number stays
  // reserved for it (see report-photos.ts); there are just no bytes behind it.
  if (!entry?.photo.storageKey) return notFound();

  const object = await readObjectBytes(entry.photo.storageKey);
  if (object.status === "unavailable") {
    console.error(`Report ${reportId} photo ${n}: could not read ${entry.photo.storageKey}:`, object.error);
    return unavailable();
  }
  if (object.status === "absent") {
    // The archive names it but the bucket doesn't have it — worth knowing about.
    console.error(`Report ${reportId} photo ${n}: ${entry.photo.storageKey} missing from storage`);
    return notFound();
  }

  const { bytes, contentType } = object.value;
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": contentType.startsWith("image/") ? contentType : "image/jpeg",
      "Content-Disposition": "inline",
      "Content-Length": String(bytes.byteLength),
      // A photo's bytes never change after submit (only its caption can), so the
      // browser may keep it a while — but only this browser, never a shared cache.
      "Cache-Control": "private, max-age=3600",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

function notFound() {
  return new NextResponse("Photo not available", {
    status: 404,
    headers: { "X-Robots-Tag": "noindex, nofollow" },
  });
}

function unavailable() {
  return new NextResponse("Photo temporarily unavailable — please try again shortly", {
    status: 502,
    headers: { "X-Robots-Tag": "noindex, nofollow" },
  });
}
