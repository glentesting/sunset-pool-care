import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Logo from "@/components/layout/Logo";
import CopyLinkButton from "@/components/report/CopyLinkButton";
import ReportPdfSection from "@/components/report/ReportPdfSection";
import { buttonClasses } from "@/components/ui/Button";
import { SITE } from "@/content/site";
import { telHref } from "@/components/layout/navLinks";
import { readReportIndex } from "@/lib/assessment-archive";
import { toDisplayCase } from "@/lib/display-case";
import { isReportId } from "@/lib/report-id";

/**
 * /r/<reportId> — the public report viewer.
 *
 * This is the link that goes into the HubSpot ticket and gets forwarded on to
 * the customer, replacing the ~400-character signed Supabase URL that used to
 * sit there: unreadable in a ticket, force-downloading rather than displaying,
 * and expiring. Here the PDF renders in the browser, the link is short enough to
 * paste into an email, and it never goes stale — every load mints a fresh signed
 * URL server-side (see ./pdf/route.ts), so the browser never sees storage.
 *
 * Deliberately PUBLIC and unauthenticated, like a Dropbox share, because the
 * same link is forwarded to customers. The security is the reportId itself —
 * ~51.7 bits of randomness, see lib/report-id.ts — not a login. Kept out of
 * search engines below and by X-Robots-Tag on the PDF response.
 *
 * Customer-facing, so it uses the MARKETING brand tokens (navy / orange / sand),
 * never the wiz-* tokens that belong to the tech's Assessment Wizard.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pool Assessment Report",
  description: "Your Sunset Pool Care pool condition assessment.",
  robots: { index: false, follow: false }, // shared by link, never indexed
};

export default async function ReportViewerPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  // Shape-check before touching storage — a junk id shouldn't cost a round trip.
  const report = isReportId(reportId) ? await readReportIndex(reportId) : null;
  if (!report) notFound(); // renders ./not-found.tsx with a 404

  // Display casing only — the stored assessment, the archived JSON and the Make
  // payload all keep the value exactly as the tech typed it. The zip is left
  // alone (digits), the street and city get the same treatment as the name.
  const customerName = toDisplayCase(report.customerName);
  const cityZip = [toDisplayCase(report.city), report.zip?.trim()]
    .filter(Boolean)
    .join(" ");
  const address = [toDisplayCase(report.serviceAddress), cityZip].filter(Boolean).join(", ");
  const pdfHref = `/r/${reportId}/pdf`;

  return (
    <div className="flex min-h-screen flex-col bg-sand">
      <SiteHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:px-6 sm:py-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-dark">
          Pool Condition Assessment
        </p>
        <h1 className="mt-2 text-[28px] leading-tight text-navy sm:text-[34px]">
          {customerName || "Your pool report"}
        </h1>
        {address && <p className="mt-1.5 text-[15px] text-navy/70">{address}</p>}
        {report.date && (
          <p className="mt-0.5 text-[13px] text-navy/55">Inspected {formatDate(report.date)}</p>
        )}

        {/* Actions always sit above the report, so they're reachable on a phone
            without scrolling past a tall embed. ReportPdfSection decides between
            the inline viewer and a "View report" button — see its docblock. */}
        {report.pdfPath ? (
          <ReportPdfSection
            pdfHref={pdfHref}
            reportTitle={`Pool assessment report for ${customerName || "this property"}`}
          />
        ) : (
          <>
            {/* No PDF behind this report: offer only what actually works. */}
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <CopyLinkButton
                className={buttonClasses({ variant: "primary", className: "w-full sm:w-auto" })}
              />
            </div>
            <p className="mt-7 rounded-xl border border-line bg-white p-6 text-[15px] leading-relaxed text-navy/75 shadow-card">
              The PDF for this assessment isn&apos;t available yet. Give us a call at{" "}
              <a href={telHref(SITE.phone)} className="font-semibold text-orange-dark">
                {SITE.phone}
              </a>{" "}
              and we&apos;ll get it to you.
            </p>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
        <Logo tone="navy" className="h-9 w-auto sm:h-11" />
        <a
          href={telHref(SITE.phone)}
          className="text-[13px] font-semibold whitespace-nowrap text-navy transition-colors hover:text-orange sm:text-sm"
        >
          {SITE.phone}
        </a>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-4xl px-5 py-8 text-center text-[12px] text-navy/50 sm:px-6">
      {SITE.name} · {SITE.address.city}, {SITE.address.state} · {SITE.phone}
    </footer>
  );
}

/** "2026-08-24" → "August 24, 2026". Falls back to the raw string. */
function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return iso;
  // Build in UTC and format in UTC — a local-time Date would render the day
  // before for anyone west of Greenwich.
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
