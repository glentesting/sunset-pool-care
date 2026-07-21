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
   */
  async rewrites() {
    return [
      { source: "/how-to-choose-service", destination: "/guides/how-to-choose-service.html" },
      { source: "/how-to-choose-repair", destination: "/guides/how-to-choose-repair.html" },
    ];
  },
};

export default nextConfig;
