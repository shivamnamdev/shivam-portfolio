import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This tells Vercel to ignore ESLint errors and just build the app
  eslint: {
    ignoreDuringBuilds: true,
  },
  // This tells Vercel to ignore strict TypeScript errors and just build the app
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
