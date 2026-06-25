import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/content/site";
import { buttonClasses } from "@/components/ui/Button";
import { telHref } from "@/components/layout/navLinks";
import { publicPhotoExists } from "@/lib/photo";

/**
 * Full-bleed hero. Real golden-hour photo when present; otherwise a navy
 * gradient (never a broken image). A left→right navy scrim keeps the white copy
 * legible over any image. Left-weighted, not centered. The fixed navbar sits
 * transparent over the top, so the content is padded down to clear it.
 */
export default function Hero() {
  const hasPhoto = publicPhotoExists("photos/hero-pool.jpg");

  return (
    <section className="relative isolate flex min-h-[88vh] items-center overflow-hidden bg-navy">
      {hasPhoto ? (
        <Image
          src="/photos/hero-pool.jpg"
          alt=""
          fill
          sizes="100vw"
          preload
          className="object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-br from-navy via-navy to-navy-light"
          aria-hidden
        />
      )}

      {/* Navy scrim — keeps white text readable in any image */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/65 to-navy/25"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-6xl px-6 pb-20 pt-28">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal">
            Chandler · Gilbert · The East Valley
          </p>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.04] text-white sm:text-6xl lg:text-7xl">
            A pool you never have to think about.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85">
            Weekly pool service, repairs, and remodels across the East Valley —
            crystal-clear water, a real photo report after every visit, and no
            surprises on your bill.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/quote" className={buttonClasses({ variant: "primary", size: "lg" })}>
              Get your custom quote
            </Link>
            <a href={telHref(SITE.phone)} className={buttonClasses({ variant: "ghost", size: "lg" })}>
              Call {SITE.phone}
            </a>
          </div>

          <p className="mt-10 text-sm font-medium text-white/80">
            <span className="text-monitor" aria-hidden>★</span> 4.8 from 221 Google reviews
            <span className="px-2 text-white/40" aria-hidden>·</span> Licensed &amp; insured
            <span className="px-2 text-white/40" aria-hidden>·</span> 15+ years in the East Valley
          </p>
        </div>
      </div>
    </section>
  );
}
