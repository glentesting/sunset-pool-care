import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The PDF generator reads the logo PNGs from public/ at runtime; make sure
  // they're traced into the submit-assessment serverless function bundle (Vercel).
  outputFileTracingIncludes: {
    "/api/submit-assessment": ["./public/spc-logo-color.png", "./public/spc-logo-navy.png"],
  },
};

export default nextConfig;
