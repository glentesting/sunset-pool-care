import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Logo from "@/components/layout/Logo";
import CopyLinkButton from "@/components/report/CopyLinkButton";
import ReportPdfSection from "@/components/report/ReportPdfSection";
import { buttonClasses } from "@/components/ui/Button";
import { SITE } from "@/content/site";
import { telHref } from "@/components/layout/navLinks";
import { readReportIndex, type AssessmentArchive } from "@/lib/assessment-archive";
import { numberArchivePhotos, reportPhotoPath, type NumberedPhoto } from "@/lib/report-photos";
import { readJsonObject } from "@/lib/supabase";
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
  if (!isReportId(reportId)) notFound();

  const read = await readReportIndex(reportId);
  // A storage failure is NOT a missing report. Telling a customer their report
  // doesn't exist because the database was asleep is the worst thing this page
  // can do, and it is what it did for twelve days. Absence still 404s; anything
  // else says "try again" on the branded page, with the phone number.
  if (read.status === "unavailable") {
    console.error(`Report ${reportId}: storage unavailable:`, read.error);
    return <ReportUnavailable />;
  }
  if (read.status === "absent") notFound(); // renders ./not-found.tsx with a 404
  const report = read.value;

  // Display casing only — the stored assessment, the archived JSON and the Make
  // payload all keep the value exactly as the tech typed it. The zip is left
  // alone (digits), the street and city get the same treatment as the name.
  const customerName = toDisplayCase(report.customerName);
  const cityZip = [toDisplayCase(report.city), report.zip?.trim()]
    .filter(Boolean)
    .join(" ");
  const address = [toDisplayCase(report.serviceAddress), cityZip].filter(Boolean).join(", ");
  const pdfHref = `/r/${reportId}/pdf`;
  const photoGroups = await readPhotoGroups(report.jsonPath);

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

        {photoGroups.length > 0 && <ReportPhotos reportId={reportId} groups={photoGroups} />}
      </main>

      <SiteFooter />
    </div>
  );
}

type PhotoGroup = { where: string; photos: NumberedPhoto[] };

/**
 * The report's photos, grouped the way the report groups them, for the photo
 * grid below. Read from the archive rather than the PDF so it works for every
 * report on file — including ones generated before the PDF's own thumbnails
 * became links, which are never regenerated just to add them.
 *
 * Best effort: the PDF is the report, the grid is a convenience. If the archive
 * can't be read, the page renders exactly as it did before, without the grid.
 */
async function readPhotoGroups(jsonPath: string): Promise<PhotoGroup[]> {
  const read = await readJsonObject<AssessmentArchive>(jsonPath);
  if (read.status !== "ok") {
    if (read.status === "unavailable") console.error(`Photo grid: archive ${jsonPath} unavailable:`, read.error);
    return [];
  }
  const groups: PhotoGroup[] = [];
  for (const entry of numberArchivePhotos(read.value)) {
    if (!entry.photo.storageKey) continue; // upload failed at submit — nothing to show
    const last = groups.at(-1);
    if (last && last.where === entry.where) last.photos.push(entry);
    else groups.push({ where: entry.where, photos: [entry] });
  }
  return groups;
}

/**
 * Every photo from the inspection, each opening full size on a tap — in the
 * phone's own image viewer, so it can be pinched and zoomed. This exists because
 * the thumbnails inside the PDF are too small to see detail in, and a phone
 * can't enlarge part of a PDF page the way it can a photo.
 */
function ReportPhotos({ reportId, groups }: { reportId: string; groups: PhotoGroup[] }) {
  return (
    <section className="mt-12" aria-labelledby="report-photos">
      <h2 id="report-photos" className="text-[22px] leading-tight text-navy">
        Photos from your inspection
      </h2>
      <p className="mt-1.5 text-[14px] text-navy/65">Tap any photo to see it full size.</p>

      {groups.map((g) => (
        <div key={`${g.where}-${g.photos[0].n}`} className="mt-7">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy/55">
            {g.where}
          </h3>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {g.photos.map((p, i) => {
              const caption = p.photo.label.trim();
              const href = reportPhotoPath(reportId, p.n);
              return (
                <li key={p.n}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block focus:outline-none"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={href}
                      alt={caption ? `${g.where}: ${caption}` : `${g.where}, photo ${i + 1}`}
                      loading="lazy"
                      className="aspect-[4/3] w-full rounded-lg border border-line bg-white object-cover transition-opacity group-hover:opacity-90 group-focus-visible:ring-2 group-focus-visible:ring-orange"
                    />
                    {caption && (
                      <span className="mt-1.5 block truncate text-[13px] text-navy/70">{caption}</span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

/**
 * Shown when the report exists but storage can't be reached right now.
 *
 * Deliberately NOT a 404 and deliberately not alarming: the customer's report is
 * fine and their link still works, so this asks them to come back rather than
 * implying anything was lost. Same branded shell and the same phone number as the
 * real page, and no mention of any internal system — "temporarily unavailable" is
 * all a customer needs, or wants, to know.
 */
function ReportUnavailable() {
  return (
    <div className="flex min-h-screen flex-col bg-sand">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:px-6 sm:py-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-dark">
          Pool Condition Assessment
        </p>
        <h1 className="mt-2 text-[28px] leading-tight text-navy sm:text-[34px]">
          This report is temporarily unavailable
        </h1>
        <p className="mt-7 rounded-xl border border-line bg-white p-6 text-[15px] leading-relaxed text-navy/75 shadow-card">
          Your report hasn&rsquo;t gone anywhere and this link will keep working — we just
          can&rsquo;t load it at the moment. Please try again in a few minutes.
          <br />
          <br />
          If it still doesn&rsquo;t open, give us a call at{" "}
          <a href={telHref(SITE.phone)} className="font-semibold text-orange-dark">
            {SITE.phone}
          </a>{" "}
          and we&rsquo;ll get it to you.
        </p>
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
