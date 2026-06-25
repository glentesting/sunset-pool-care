import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { SITE } from "@/content/site";
import "./globals.css";

// SPC type pairing: Bricolage Grotesque (display) + Inter (body). Mapped to
// --font-display / --font-sans in globals.css via these CSS variables.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(`https://${SITE.domain}`),
  title: {
    default: `${SITE.name} — Pool Service in Chandler, AZ`,
    template: `%s | ${SITE.name}`,
  },
  description:
    "Weekly pool service, repair, remodel, and green pool recovery in Chandler, Gilbert, Queen Creek, San Tan Valley, and Ahwatukee.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      {/* Root layout is intentionally minimal (html/body/fonts) so /assessment
          renders standalone. Marketing nav/footer live in app/(marketing)/. */}
      <body className={`${bricolage.variable} ${inter.variable}`}>{children}</body>
    </html>
  );
}
