import { NextResponse } from "next/server";
import { REVIEW_COOKIE, accessToken, codeIsCorrect, isReviewConfigured } from "@/lib/review-access";

/**
 * Exchange the shared office code for a session cookie.
 *
 * The response says only whether the code was right. It never reveals whether a
 * report exists — the caller hasn't been let near one yet.
 */
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code : "";

  if (!isReviewConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Report review isn't set up yet. Ask whoever manages the site." },
      { status: 503 }
    );
  }
  if (!codeIsCorrect(code)) {
    return NextResponse.json({ ok: false, error: "That code isn't right." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(REVIEW_COOKIE, accessToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Session cookie: prompt once, remembered until the browser closes.
  });
  return res;
}
