import Logo from "@/components/layout/Logo";
import { SITE } from "@/content/site";
import { telHref } from "@/components/layout/navLinks";

/**
 * Shown when /r/<reportId> names a report we don't have — a mistyped or
 * truncated link, or an id that was never issued. Customers see this, so it says
 * what to do next in plain words: no ids, no status codes, no stack trace.
 */
export default function ReportNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sand px-5 py-16 text-center">
      <Logo tone="navy" className="h-12 w-auto" />
      <h1 className="mt-8 text-[26px] leading-tight text-navy sm:text-[30px]">
        We couldn&apos;t find that report
      </h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-navy/70">
        The link may have been copied incompletely, or this report may have been moved. Check that
        you have the whole link, or give us a call and we&apos;ll send it again.
      </p>
      <a
        href={telHref(SITE.phone)}
        className="mt-7 text-lg font-semibold text-orange-dark transition-colors hover:text-orange"
      >
        {SITE.phone}
      </a>
      <p className="mt-10 text-[12px] text-navy/50">
        {SITE.name} · {SITE.address.city}, {SITE.address.state}
      </p>
    </div>
  );
}
