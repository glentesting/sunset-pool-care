import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SITE } from "@/content/site";
import "./globals.css";

// Placeholder font — real type pairing gets chosen in the design phase.
const geist = Geist({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
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
      <body className={geist.variable}>{children}</body>
    </html>
  );
}
