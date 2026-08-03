/**
 * Supabase storage health check. Hit this AFTER setting SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY and creating the private "assessment-pdfs" bucket,
 * to confirm the upload → sign → fetch → delete path works — without running a
 * full assessment.
 *
 *   GET /api/health/supabase
 *
 * Optional guard: if HEALTHCHECK_TOKEN is set, the request must carry it as
 * ?token=… or an x-healthcheck-token header (so the endpoint can't be probed in
 * production). When the var is unset the check is open (dev convenience).
 *
 * Never echoes the service key; the sample signed URL has its token redacted.
 * Returns 200 when every step passes, 503 otherwise.
 */
import { NextResponse } from "next/server";
import { checkSupabaseStorage } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const token = process.env.HEALTHCHECK_TOKEN;
  if (token) {
    const provided =
      new URL(req.url).searchParams.get("token") ?? req.headers.get("x-healthcheck-token");
    if (provided !== token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const health = await checkSupabaseStorage();
  return NextResponse.json(health, { status: health.ok ? 200 : 503 });
}
