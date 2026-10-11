/**
 * Keep a report's Google Drive copy in step with its PDF — without anyone
 * waiting on it.
 *
 * Called at the two moments a report's PDF changes: the tech's submit, and an
 * office regenerate. Either way the Drive work is handed to Next's `after()`,
 * so it runs once the response has gone: the tech's download and the office's
 * "regenerated" message never wait on Google, and a Drive failure can't reach
 * either of them.
 *
 * Until GOOGLE_SERVICE_ACCOUNT_JSON and GDRIVE_ASSESSMENT_FOLDER_ID are both
 * set this does nothing at all — no call, no log line, no change to the stored
 * record — so shipping before SPC's Google setup is invisible.
 *
 * Once configured, the outcome is written onto the report's archive
 * (recordDriveOutcome): the file ID on success, so the next regenerate updates
 * the same file; a failure timestamp otherwise, which the office review screen
 * shows as "Drive copy failed". The cause goes to the server log.
 */
import "server-only";
import { after } from "next/server";
import { isDriveConfigured, saveReportPdfToDrive } from "@/lib/google-drive";
import { recordDriveOutcome } from "@/lib/assessment-archive";

export type DriveCopyJob = {
  reportId: string;
  pdf: Uint8Array;
  /** Same name as the PDF in Supabase storage, e.g. `Name-2026-08-24-a7f3k2.pdf`. */
  filename: string;
  /** Archive to record the outcome on; null when the archive didn't land. */
  jsonPath: string | null;
  /** The report's existing Drive file, to update in place. */
  fileId?: string | null;
};

/** Schedule the Drive copy for after the response. Safe to call unconditionally. */
export function scheduleDriveCopy(job: DriveCopyJob): void {
  if (!isDriveConfigured()) return;
  after(() => copyReportToDrive(job));
}

/** The Drive copy itself. Never throws. Exported for tests. */
export async function copyReportToDrive(job: DriveCopyJob): Promise<void> {
  const result = await saveReportPdfToDrive({
    pdf: job.pdf,
    filename: job.filename,
    fileId: job.fileId,
  });

  if (result.status === "skipped") return;

  if (result.status === "ok") {
    console.log(
      `Drive copy ${result.created ? "created" : "updated"} for ${job.reportId}: ${result.fileId}`
    );
    if (job.jsonPath) await recordDriveOutcome(job.jsonPath, { fileId: result.fileId });
    return;
  }

  console.error(`Drive copy failed for ${job.reportId} (${job.filename}): ${result.error}`);
  if (job.jsonPath) {
    await recordDriveOutcome(job.jsonPath, { failedAt: new Date().toISOString() });
  }
}
