import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The PDF generator reads the logo PNG from public/ at runtime; make sure it's
  // traced into the submit-assessment serverless function bundle (Vercel).
  outputFileTracingIncludes: {
    "/api/submit-assessment": ["./public/spc-logo-navy.png"],
  },
};

export default nextConfig;
