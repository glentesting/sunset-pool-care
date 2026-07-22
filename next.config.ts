import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The PDF generator reads the logo PNGs from public/ at runtime; make sure
  // they're traced into the submit-assessment serverless function bundle (Vercel).
  outputFileTracingIncludes: {
    "/api/submit-assessment": ["./public/spc-logo-color.png", "./public/spc-logo-navy.png"],
  },

  /**
   * Brian's two client-authored "How to Choose" guides are complete, standalone
   * HTML documents (their own <html>/<head>/<body>, inline CSS + JS). They're
   * served as static files straight from public/ so their markup ships
   * byte-for-byte — no App Router layout, fonts, or metadata involved. These
   * rewrites just give them clean, shareable URLs for emails and texts.
   *
   * ┌──────────────────────────────────────────────────────────────────────────┐
   * │ TODO AT DOMAIN CUTOVER — swap the guides' absolute URLs                  │
   * │                                                                          │
   * │ The guides are shared by link (text/email), so their canonical + Open    │
   * │ Graph tags must point at a LIVE host or previews break. sunsetpoolcare   │
   * │ .com is still the old Wix site today, so they currently point at the     │
   * │ Vercel domain. When sunsetpoolcare.com starts serving this site, change  │
   * │ these 3 tags in BOTH files:                                              │
   * │                                                                          │
   * │   public/guides/how-to-choose-service.html                               │
   * │   public/guides/how-to-choose-repair.html                                │
   * │                                                                          │
   * │   <link rel="canonical">   <meta property="og:url">   og:image           │
   * │                                                                          │
   * │   https://sunset-pool-care.vercel.app  ->  https://sunsetpoolcare.com    │
   * │                                                                          │
   * │ Leave everything else in those files alone — they are client-authored    │
   * │ deliverables preserved byte-for-byte apart from that <head> meta block.  │
   * │ (Note: the sunsetpoolcare.com strings in each guide's BODY are Brian's   │
   * │ own branding copy — do not touch those.)                                 │
   * └──────────────────────────────────────────────────────────────────────────┘
   */
  async rewrites() {
    return [
      { source: "/how-to-choose-service", destination: "/guides/how-to-choose-service.html" },
      { source: "/how-to-choose-repair", destination: "/guides/how-to-choose-repair.html" },
    ];
  },
};

export default nextConfig;
