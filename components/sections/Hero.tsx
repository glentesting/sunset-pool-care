import Image from "next/image";
import { SITE } from "@/content/site";
import { buttonClasses } from "@/components/ui/Button";
import { telHref } from "@/components/layout/navLinks";
import { publicPhotoExists } from "@/lib/photo";
import Wave from "./Wave";

const TRUST = ["Licensed & Insured", "15+ Years", "Weekly Photo Reports"];

/**
 * Hero — a warm golden-hour pool photo with a light-touch legibility gradient
 * (not a heavy dark slab). Copy on the left, a bright white quote-capture card
 * on the right: a zip field + coral button that routes into /quote, plus a call
 * line. Trust pills + the Google rating sit beneath the copy.
 */
export default function Hero() {
  const hasPhoto = publicPhotoExists("photos/hero-pool.jpg");

  return (
    <section className="relative isolate flex min-h-[86vh] items-center overflow-hidden bg-navy">
      {hasPhoto ? (
        <Image
          src="/photos/hero-pool.jpg"
          alt=""
          fill
          sizes="100vw"
          preload
          className="object-cover object-center"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gold via-orange to-navy" aria-hidden />
      )}

      {/* Light-touch scrim — left-weighted, just enough for legible white copy */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-navy/80 via-navy/45 to-navy/15 sm:to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-[1.12fr_0.88fr] lg:py-24">
        {/* Copy */}
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal">
            Chandler · Gilbert · The East Valley
          </p>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.04] text-white sm:text-6xl">
            Your pool, <span className="italic text-orange">handled</span>.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/90">
            Weekly pool service, repairs, and remodels across the East Valley —
            crystal-clear water, a real photo report after every visit, and no
            surprises on your bill.
          </p>

          <ul className="mt-7 flex flex-wrap gap-2.5">
            {TRUST.map((t) => (
              <li
                key={t}
                className="rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur"
              >
                {t}
              </li>
            ))}
          </ul>

          <p className="mt-6 flex items-center gap-2 text-sm font-medium text-white/90">
            <span className="text-gold" aria-hidden>★★★★★</span>
            4.8 from 221 Google reviews
          </p>
        </div>

        {/* Quote capture */}
        <div className="w-full rounded-3xl bg-white p-6 shadow-lift sm:p-7">
          <h2 className="font-display text-xl font-semibold text-navy">Get your free quote</h2>
          <p className="mt-1 text-sm text-navy/70">A 2-minute estimate — no obligation.</p>

          <form action="/quote" className="mt-4 flex flex-col gap-3 sm:flex-row">
            <label htmlFor="hero-zip" className="sr-only">
              Zip code
            </label>
            <input
              id="hero-zip"
              name="zip"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={5}
              placeholder="Your zip code"
              className="w-full rounded-lg border border-field bg-white px-4 py-3 text-navy placeholder:text-navy/40 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/40 sm:flex-1"
            />
            <button type="submit" className={buttonClasses({ variant: "primary" })}>
              Get my quote
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-navy/70">
            or call{" "}
            <a href={telHref(SITE.phone)} className="font-semibold text-teal-dark hover:underline">
              {SITE.phone}
            </a>
          </p>
        </div>
      </div>

      {/* Curved cream seam into the section below */}
      <Wave className="absolute inset-x-0 bottom-0 z-10 text-sand" />
    </section>
  );
}
