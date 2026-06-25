import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

/**
 * Marketing chrome — wraps the public site pages (home, services, about, etc.)
 * with the navbar + footer. The Assessment Wizard at /assessment lives OUTSIDE
 * this group, so it renders standalone with no marketing nav/footer.
 *
 * This is a route group: "(marketing)" doesn't appear in any URL.
 */
export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
