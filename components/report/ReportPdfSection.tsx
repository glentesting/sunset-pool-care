"use client";
import { useSyncExternalStore } from "react";
import CopyLinkButton from "./CopyLinkButton";
import { buttonClasses } from "@/components/ui/Button";

/**
 * The report's actions + PDF view on /r/<reportId>.
 *
 * Mobile Safari and Chrome for Android refuse to render a PDF in an iframe or
 * <embed> — the frame paints as a black box and nothing in it scrolls. Showing
 * it there isn't a degraded experience, it's a broken-looking page, so on those
 * browsers the embed isn't rendered at all: a prominent "View report" button
 * opens the PDF route directly (where the browser's own full-screen PDF viewer
 * handles it) and the layout reads as the intended design rather than a
 * fallback.
 *
 * HOW WE DETECT IT — no user-agent sniffing:
 *
 *   1. `navigator.pdfViewerEnabled` is the primary signal. It's the standardized
 *      feature test for exactly this question — "will this browser display a PDF
 *      inline?" — and it answers false on mobile Safari and Chrome for Android,
 *      true on desktop Chrome/Safari/Firefox. It beats a UA string because it
 *      tracks the actual capability, including a desktop browser with its PDF
 *      viewer disabled by policy, and it can't be spoofed into a wrong answer by
 *      an unfamiliar UA.
 *
 *   2. A viewport breakpoint covers the gap before that signal is available.
 *      `pdfViewerEnabled` only exists in the browser, so during SSR and up to
 *      hydration there's nothing to read; the same is true in any browser too old
 *      to implement it. Until then the md breakpoint (768px) decides — phones get
 *      the button, wider screens get the embed — which is right for essentially
 *      every phone and needs no JavaScript at all.
 *
 * So the first paint is already correct for a phone, and hydration then corrects
 * the one case width alone gets wrong: a tablet wide enough to clear the
 * breakpoint whose browser still won't render PDFs inline.
 */
export default function ReportPdfSection({
  pdfHref,
  reportTitle,
}: {
  /** The app's own PDF route for this report, e.g. /r/a7f3k2/pdf */
  pdfHref: string;
  /** Accessible title for the embedded viewer. */
  reportTitle: string;
}) {
  // null = not yet known (server render, pre-hydration, or no API) -> use the
  // viewport breakpoint. true/false = the browser told us.
  const canEmbedPdf = useSyncExternalStore(subscribe, readPdfSupport, readPdfSupportOnServer);

  // One display class per block, so the un-hydrated markup is already right.
  const embedBlock =
    canEmbedPdf === null ? "hidden md:block" : canEmbedPdf ? "block" : "hidden";
  const embedActions =
    canEmbedPdf === null ? "hidden md:flex" : canEmbedPdf ? "flex" : "hidden";
  const openActions =
    canEmbedPdf === null ? "flex md:hidden" : canEmbedPdf ? "hidden" : "flex";

  return (
    <>
      {/* No inline viewer: "View report" is the one primary action, and Download
          steps back to secondary so the layout still has a single orange CTA. */}
      <div className={`mt-6 flex-col gap-2.5 ${openActions}`}>
        <a
          href={pdfHref}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses({ variant: "primary", size: "lg", className: "w-full" })}
        >
          View report
        </a>
        <a
          href={`${pdfHref}?download=1`}
          className={buttonClasses({ variant: "secondary", className: "w-full" })}
        >
          Download PDF
        </a>
        <CopyLinkButton className={buttonClasses({ variant: "secondary", className: "w-full" })} />
      </div>

      {/* Inline viewer available: the embed carries the report, so Download is
          the primary action and sits above it with Copy link. */}
      <div className={`mt-6 flex-col gap-2.5 sm:flex-row ${embedActions}`}>
        <a
          href={`${pdfHref}?download=1`}
          className={buttonClasses({ variant: "primary", className: "w-full sm:w-auto" })}
        >
          Download PDF
        </a>
        <CopyLinkButton
          className={buttonClasses({ variant: "secondary", className: "w-full sm:w-auto" })}
        />
      </div>

      <div className={embedBlock}>
        <div className="mt-7 overflow-hidden rounded-xl border border-line bg-white shadow-card">
          <iframe src={pdfHref} title={reportTitle} className="h-[80vh] min-h-[420px] w-full" />
        </div>
        <p className="mt-3 text-center text-[13px] text-navy/60">
          Report not showing?{" "}
          <a
            href={pdfHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-orange-dark underline underline-offset-2"
          >
            Open it in a new tab
          </a>
          .
        </p>
      </div>
    </>
  );
}

/**
 * `navigator.pdfViewerEnabled` is fixed for the life of the document, so there
 * is nothing to subscribe to — useSyncExternalStore just gives us a browser-only
 * read with a proper server snapshot, instead of a setState in an effect.
 */
function subscribe(): () => void {
  return () => {};
}

function readPdfSupport(): boolean | null {
  const nav = navigator as Navigator & { pdfViewerEnabled?: boolean };
  // Older browsers don't implement it — stay undecided and let the breakpoint rule.
  return typeof nav.pdfViewerEnabled === "boolean" ? nav.pdfViewerEnabled : null;
}

function readPdfSupportOnServer(): boolean | null {
  return null;
}
