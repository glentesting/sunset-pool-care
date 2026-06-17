/**
 * Skimmer integration — routed THROUGH Make.com on purpose.
 *
 * Why not direct like HubSpot? Skimmer's API auth is finicky and there are
 * already battle-tested Make scenarios that handle it. We fire a webhook to
 * Make and let it do the Skimmer talking instead of re-fighting that auth here.
 *
 * Verify with Kevin (Skimmer admin) before go-live.
 */
import "server-only";

const MAKE_WEBHOOK_URL = process.env.MAKE_SKIMMER_WEBHOOK_URL;

export type AssessmentLog = {
  jobId?: string;
  contactEmail: string;
  summary: string;
  // expand with whatever Make expects to log onto the Skimmer job record
};

/** Fire-and-report: send assessment data to Make, which logs it in Skimmer. */
export async function logAssessmentToSkimmer(_data: AssessmentLog): Promise<void> {
  if (!MAKE_WEBHOOK_URL) throw new Error("MAKE_SKIMMER_WEBHOOK_URL not set");
  // TODO: POST JSON to MAKE_WEBHOOK_URL
  throw new Error("skimmer.logAssessmentToSkimmer not implemented yet");
}
