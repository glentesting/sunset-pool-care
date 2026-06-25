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

      {/* aqua → navy curved seam into the process band */}
      <div className="bg-sand">
        <Wave className="text-navy" />
      </div>
      <Process />
      {/* navy → white curved seam out of the process band */}
      <div className="bg-navy">
        <Wave className="text-white" />
      </div>

      <Reviews />
      <Trust />
      <FAQ />
      <CTABanner />
    </main>
  );
}
