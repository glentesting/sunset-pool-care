import { NextResponse } from "next/server";
import { hasReviewAccess } from "@/lib/review-access";
import { reviseAndRegenerate } from "@/lib/report-revision";
import { isReportId } from "@/lib/report-id";

/**
 * Save office edits and regenerate the report.
 *
 * Gated server-side: without the review cookie this returns 401 and does not
 * look at the body, so the endpoint gives nothing away about whether a report
 * exists. Everything else — the old values, which fields may be written, the
 * diff, the re-scoring — is decided from the STORED archive, never from what the
 * client claims.
 */
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await hasReviewAccess())) {
    return NextResponse.json({ ok: false, error: "Not authorised." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    reportId?: unknown;
    editor?: unknown;
    fields?: unknown;
    loadedAt?: unknown;
  } | null;

  const reportId = typeof body?.reportId === "string" ? body.reportId : "";
  const editor = typeof body?.editor === "string" ? body.editor.trim() : "";
  const loadedAt = typeof body?.loadedAt === "string" ? body.loadedAt : "";
  const fields =
    body?.fields && typeof body.fields === "object" ? (body.fields as Record<string, unknown>) : null;

  if (!isReportId(reportId) || !fields) {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  if (!editor) {
    return NextResponse.json(
      { ok: false, error: "Add your name before saving — every change is recorded against it." },
      { status: 400 }
    );
  }

  const result = await reviseAndRegenerate({ reportId, editor, fields, loadedAt });
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
