import { SITE, WEEKLY_SERVICE_PRICE, SERVICE_AREAS } from "@/content/site";

/**
 * Homepage — placeholder skeleton. Real hero/sections come in the content phase.
 * This exists so the site builds and deploys clean from day one.
 */
export default function Home() {
  return (
    <main className="min-h-screen bg-navy text-white flex items-center justify-center px-6">
      <div className="max-w-2xl text-center">
        <p className="text-teal font-semibold tracking-widest uppercase text-sm">
          {SITE.shortName} — Build in progress
        </p>
        <h1 className="mt-4 text-4xl sm:text-5xl font-bold">{SITE.name}</h1>
        <p className="mt-4 text-white/70">
          Pool service in {SERVICE_AREAS.join(", ")}.
        </p>
        <p className="mt-8 inline-block rounded-lg bg-orange px-5 py-3 font-semibold">
          Weekly service ${WEEKLY_SERVICE_PRICE}/mo
        </p>
        <p className="mt-8 text-xs text-white/40">
          Skeleton deploy — structure is live, content & forms next.
        </p>
      </div>
    </main>
  );
}
