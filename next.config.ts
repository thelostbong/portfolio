import type { NextConfig } from "next";

// Static export: the whole site is plain HTML/CSS/JS, deployable to Vercel
// or any static host (Cloudflare Pages is the backup). No server features.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
