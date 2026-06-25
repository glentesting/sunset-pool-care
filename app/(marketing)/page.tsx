import Hero from "@/components/sections/Hero";
import WeeklyReport from "@/components/sections/WeeklyReport";
import Services from "@/components/sections/Services";
import WhySPC from "@/components/sections/WhySPC";
import ServiceAreas from "@/components/sections/ServiceAreas";
import Reviews from "@/components/sections/Reviews";
import CTABanner from "@/components/sections/CTABanner";

/**
 * Homepage. Sections transition on whitespace + surface color (white ↔ sand ↔
 * navy), never on borders. Navbar and Footer are mounted in the root layout.
 */
export default function Home() {
  return (
    <main>
      <Hero />
      <WeeklyReport />
      <Services />
      <WhySPC />
      <ServiceAreas />
      <Reviews />
      <CTABanner />
    </main>
  );
}
