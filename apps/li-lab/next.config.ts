import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse resolves pdf.js' worker relative to its installed package.
  // Keeping it external prevents Turbopack from moving the worker into a
  // generated chunk where that relative lookup no longer works.
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
  experimental: {
    typedEnv: false
  }
};

export default nextConfig;
