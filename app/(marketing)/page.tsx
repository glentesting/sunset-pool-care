import Hero from "@/components/sections/Hero";
import WeeklyReport from "@/components/sections/WeeklyReport";
import Services from "@/components/sections/Services";
import ServiceAreas from "@/components/sections/ServiceAreas";
import Process from "@/components/sections/Process";
import Reviews from "@/components/sections/Reviews";
import Trust from "@/components/sections/Trust";
import FAQ from "@/components/sections/FAQ";
import CTABanner from "@/components/sections/CTABanner";
import Wave from "@/components/sections/Wave";

/**
 * Homepage. Bright, airy, sunset-warm: light surfaces (white ↔ cream) carry the
 * page, aqua + coral/gold do the accent work, navy appears only as the process
 * band and footer. Sections flow on whitespace, surface color, and soft waves —
 * never hard dividers. Navbar/Footer live in the (marketing) layout.
 */
export default function Home() {
  return (
    <main>
      <Hero />
      <WeeklyReport />
      <Services />
      <ServiceAreas />

      {/* aqua → dusk curved seam into the process band (matches its navy top) */}
      <div className="bg-sand">
        <Wave className="text-navy" />
      </div>
      <Process />
      {/* dusk → white curved seam out (matches the band's plum bottom edge) */}
      <div className="bg-[#73415a]">
        <Wave className="text-white" />
      </div>

      <Reviews />
      <Trust />
      <FAQ />
      <CTABanner />
    </main>
  );
}
