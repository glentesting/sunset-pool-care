import Image from "next/image";
import { SITE } from "@/content/site";
import { publicPhotoExists } from "@/lib/photo";

/**
 * The signature section — the thing that actually sets SPC apart. Asymmetric:
 * copy on the left, the after-visit report on the right, the visual tilted and
 * bleeding slightly past the column for a deliberately non-boxy feel. Renders
 * the real screenshot when present; otherwise a clean styled mock of the report.
 */

const READINGS = [
  { label: "Free Chlorine", value: "3.0 ppm", status: "good" as const },
  { label: "pH", value: "7.5", status: "good" as const },
  { label: "Alkalinity", value: "90 ppm", status: "good" as const },
  { label: "Cyanuric Acid", value: "55 ppm", status: "monitor" as const },
];

const DONE = [
  "Brushed walls & tile line",
  "Skimmed the surface",
  "Emptied skimmer & pump baskets",
  "Vacuumed the floor",
  "Tested & balanced the water",
];

const DOT: Record<"good" | "monitor", string> = {
  good: "bg-good",
  monitor: "bg-monitor",
};

function ReportMock() {
  return (
    <div className="mx-auto max-w-sm rounded-3xl bg-white p-5 shadow-lift ring-1 ring-navy/5 lg:rotate-1">
      {/* Today's pool photo */}
      <div className="relative flex aspect-[4/3] items-end overflow-hidden rounded-2xl bg-gradient-to-br from-teal/35 via-teal/15 to-navy/25">
        <svg
          className="absolute inset-x-0 bottom-0 text-white/40"
          viewBox="0 0 400 120"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d="M0 60 C60 40 120 80 200 60 S340 40 400 64 L400 120 L0 120 Z" fill="currentColor" opacity="0.5" />
          <path d="M0 78 C70 58 130 96 210 78 S350 60 400 82 L400 120 L0 120 Z" fill="currentColor" opacity="0.7" />
        </svg>
        <span className="relative m-3 rounded-full bg-navy/70 px-3 py-1 text-xs font-semibold text-white">
          Today&apos;s photo
        </span>
      </div>

      {/* Header */}
      <div className="mt-4 flex items-baseline justify-between">
        <div>
          <p className="font-display text-base font-semibold text-navy">{SITE.name}</p>
          <p className="text-xs font-medium text-navy/60">Service report · Mon, Jun 22</p>
        </div>
        <span className="rounded-full bg-sand-dark px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy/60">
          Sample
        </span>
      </div>

      {/* Readings */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {READINGS.map((r) => (
          <div key={r.label} className="rounded-xl bg-sand px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${DOT[r.status]}`} aria-hidden />
              <span className="text-[11px] font-medium text-navy/60">{r.label}</span>
            </div>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-navy">{r.value}</p>
          </div>
        ))}
      </div>

      {/* What we did */}
      <ul className="mt-4 space-y-1.5">
        {DONE.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm text-navy/80">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0 text-teal-dark">
              <path d="M3 8.5l3 3 7-7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {item}
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t border-line pt-3 text-center text-xs font-medium text-navy/55">
        Sent to your inbox after every visit
      </p>
    </div>
  );
}

export default function WeeklyReport() {
  const hasPhoto = publicPhotoExists("photos/weekly-report.jpg");

  return (
    <section className="bg-sand py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-dark">
            The weekly report
          </p>
          <h2 className="mt-4 font-display text-4xl font-semibold leading-tight text-navy sm:text-5xl">
            After every visit, you get the receipt.
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-navy/75">
            We don&apos;t just clean and leave. After each weekly service you get
            an email with a photo of your pool, your exact chemical readings, and
            everything we did. You&apos;ll know your pool&apos;s taken care of
            without ever having to check.
          </p>
        </div>

        <div className="relative lg:-mr-4">
          {hasPhoto ? (
            <Image
              src="/photos/weekly-report.jpg"
              alt="The after-visit report: a photo of your pool with chemical readings and the work done."
              width={900}
              height={1100}
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="mx-auto w-full max-w-sm rounded-3xl shadow-lift lg:rotate-1"
            />
          ) : (
            <ReportMock />
          )}
        </div>
      </div>
    </section>
  );
}
