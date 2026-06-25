import Link from "next/link";
import { SITE } from "@/content/site";
import { buttonClasses } from "@/components/ui/Button";
import { telHref } from "@/components/layout/navLinks";

/**
 * Closing CTA — a warm sunset gradient (coral → gold), white copy, a solid white
 * primary button and a ghost call button. The page's warm anchor before the
 * navy footer.
 */
export default function CTABanner() {
  return (
    <section className="bg-gradient-to-br from-orange via-orange to-gold py-20 text-white sm:py-28">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
          Enjoy the pool. Skip the work.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-white/90">
          A custom quote takes about two minutes — no pressure, no door-knocking,
          just a fair price for a pool you never have to think about.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/quote" className={buttonClasses({ variant: "white", size: "lg" })}>
            Get your custom quote
          </Link>
          <a href={telHref(SITE.phone)} className={buttonClasses({ variant: "ghost", size: "lg" })}>
            Call {SITE.phone}
          </a>
        </div>
      </div>
    </section>
  );
}
