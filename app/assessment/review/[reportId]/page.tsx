import type { Metadata } from "next";
import ReviewForm from "@/components/review/ReviewForm";
import ReviewUnlock from "@/components/review/ReviewUnlock";
import { hasReviewAccess, isReviewConfigured } from "@/lib/review-access";
import { loadReport, revisionStamp } from "@/lib/report-revision";
import { serializeFields } from "@/lib/revision-log";
import { isReportId } from "@/lib/report-id";
import { isStorageAsleepError } from "@/lib/supabase";
import { reportViewerUrl } from "@/lib/site-url";

/**
 * /assessment/review/<reportId> — the office review-and-regenerate screen.
 *
 * Internal, and gated server-side: the access check runs BEFORE the report is
 * looked up, so an unauthorised request never learns whether a report exists.
 * Uses the wizard's wiz-* tokens, not the marketing brand — this is a tool, not
 * a customer surface.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Report review",
  robots: { index: false, follow: false },
};

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  if (!(await hasReviewAccess())) {
    return <ReviewUnlock configured={isReviewConfigured()} />;
  }

  const { reportId } = await params;
  const loaded = isReportId(reportId) ? await loadReport(reportId) : ({ status: "absent" } as const);

  // "Couldn't read storage" is not "bad link". Blaming the link during an outage
  // sends the office re-copying a URL that was fine, while the actual problem is
  // that the database is asleep. Office-facing, so it can name the real cause.
  if (loaded.status === "unavailable") {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-display text-xl font-semibold text-wiz-ink">
          Report storage is temporarily unavailable
        </h1>
        <p className="mt-2 text-sm text-wiz-ink/70">
          {isStorageAsleepError(loaded.error)
            ? "This usually means the database is waking up. Wait a minute and reload — the report is fine, and nothing has been changed."
            : "The report couldn't be loaded right now. Try again in a few minutes — the report is fine, and nothing has been changed."}
        </p>
      </div>
    );
  }

  if (loaded.status === "absent") {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-display text-xl font-semibold text-wiz-ink">Report not found</h1>
        <p className="mt-2 text-sm text-wiz-ink/70">
          Check the link from the job ticket — it may have been copied incompletely.
        </p>
      </div>
    );
  }

  const { archive } = loaded;
  const photoCount =
    archive.configPhotos.length + archive.sections.reduce((n, s) => n + s.photos.length, 0);

  return (
    <ReviewForm
      reportId={reportId}
      fields={serializeFields(archive)}
      readOnly={{
        chemistry: archive.chemistry.map((c) => ({
          label: c.label,
          reading: c.reading,
          ideal: c.ideal,
          rating: c.rating,
        })),
        inspectorName: archive.certification.inspectorName,
        certificationDate: archive.certification.date,
        photoCount,
      }}
      revisions={archive.revisions ?? []}
      loadedAt={revisionStamp(archive)}
      viewerUrl={reportViewerUrl(reportId)}
    />
  );
}
