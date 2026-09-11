/**
 * Supabase keep-alive — the cron that stops the project auto-pausing.
 *
 * WHY THIS EXISTS. A free-tier Supabase project pauses after roughly a week of
 * inactivity. Assessment volume is low enough that this has now caused two
 * production outages (Aug 24, Sep 9). On Sep 9 a real customer's assessment was
 * submitted into a paused project: the PDF rendered and downloaded to the
 * technician's phone, but the upload, the JSON archive and the report link all
 * failed, and for a while that phone held the only copy of the assessment.
 *
 * WHAT IT DOES. Runs checkSupabaseStorage(), which is a genuine
 * upload -> sign -> fetch -> delete round trip against the real bucket, not a
 * connection ping. That distinction matters: a keep-alive that only opened a
 * connection might not register as activity for pause purposes, whereas writing
 * and deleting an object unambiguously does.
 *
 * RETRY. A waking project answers the first call with the same 544
 * DatabaseTimeout a paused one does, so a single timeout is not evidence of a
 * problem — it is often the keep-alive doing its job and catching the project
 * mid-wake. One retry after a short delay separates "it woke up" from "it is
 * genuinely unreachable". Only the second failure is reported as a failure.
 *
 * WORST CASE DURATION. checkSupabaseStorage returns at the FIRST failing step,
 * so a failing attempt costs one fetch timeout (20s), not four. Two attempts
 * plus the delay stays inside maxDuration.
 *
 * ACCESS. Vercel sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is
 * set. This route fails closed: with no secret configured it refuses everyone,
 * so it can never become an open endpoint that lets a stranger drive storage
 * operations on demand.
 */
import { NextResponse } from "next/server";
import { checkSupabaseStorage, isStorageAsleepError } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Long enough for a waking project to finish coming up, short enough to fit. */
const RETRY_DELAY_MS = 8000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const first = await checkSupabaseStorage();
  if (first.ok) {
    return NextResponse.json({ ok: true, attempts: 1, steps: first.steps });
  }

  // Missing env vars are a real misconfiguration — retrying changes nothing, and
  // it must NOT be reported as a storage outage.
  if (!first.configured) {
    return NextResponse.json(
      { ok: false, attempts: 1, diagnosis: "not-configured", error: first.error },
      { status: 503 }
    );
  }

  // Configured but failing: paused, waking, or genuinely down. Retry once.
  const looksAsleep = isStorageAsleepError(first.error);
  await sleep(RETRY_DELAY_MS);
  const second = await checkSupabaseStorage();

  if (second.ok) {
    return NextResponse.json({
      ok: true,
      attempts: 2,
      // The interesting outcome: the project was asleep and this call woke it,
      // which is precisely what the cron is for.
      diagnosis: looksAsleep ? "woke-on-retry" : "transient-recovered",
      firstError: first.error,
      steps: second.steps,
    });
  }

  console.error(
    `Supabase keep-alive FAILED after retry. first="${first.error}" second="${second.error}"`
  );
  return NextResponse.json(
    {
      ok: false,
      attempts: 2,
      diagnosis: isStorageAsleepError(second.error) ? "unreachable-or-paused" : "error",
      firstError: first.error,
      error: second.error,
      steps: second.steps,
    },
    { status: 503 }
  );
}
