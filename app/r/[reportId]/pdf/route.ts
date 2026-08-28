import { NextResponse } from "next/server";
import { isReportId } from "@/lib/report-id";
import { readReportIndex } from "@/lib/assessment-archive";
import { createSignedUrl } from "@/lib/supabase";

/**
 * Serves the report PDF for the /r/<reportId> viewer.
 *
 * The signed Supabase URL is minted HERE, server-side, on every request and
 * consumed immediately — the browser only ever sees this same-origin path, so
 * the storage URL and its token never reach the page, a shared link can't leak
 * direct bucket access, and nothing in the ticket can expire.
 *
 * Default disposition is INLINE so the embedded viewer displays the report
 * instead of force-downloading it; `?download=1` is the Download PDF action.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The minted URL is used within this request, so it needs no real lifetime. */
const SIGNED_URL_TTL_SECONDS = 60;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params;
  if (!isReportId(reportId)) {
    return new NextResponse("Report not found", { status: 404 });
  }

  const index = await readReportIndex(reportId);
  if (!index?.pdfPath) {
    return new NextResponse("Report not found", { status: 404 });
  }

  let upstream: Response;
  try {
    const signed = await createSignedUrl(index.pdfPath, SIGNED_URL_TTL_SECONDS);
    upstream = await fetch(signed, { cache: "no-store" });
  } catch (e) {
    console.error(`Report ${reportId}: could not fetch the stored PDF:`, e);
    return new NextResponse("Report temporarily unavailable", { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    console.error(`Report ${reportId}: storage returned ${upstream.status} for ${index.pdfPath}`);
    return new NextResponse("Report temporarily unavailable", { status: 502 });
  }

  const download = new URL(req.url).searchParams.get("download") === "1";
  const headers = new Headers({
    "Content-Type": "application/pdf",
    "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${downloadName(index.customerName, index.date)}"`,
    // Shareable link, private content: let the browser hold it for the session
    // but never a shared cache, and never past the signed URL behind it.
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow",
  });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);

  return new NextResponse(upstream.body, { headers });
}

/**
 * A filename the customer will recognise in their downloads folder. ASCII only
 * and no quotes — a Content-Disposition header can't carry either safely.
 */
function downloadName(customerName: string, date: string): string {
  const name = customerName
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "");
  return [name || "pool", "assessment", date].filter(Boolean).join("-") + ".pdf";
}
