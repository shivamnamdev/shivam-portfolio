/** @type {import('next').NextConfig} */
const nextConfig = {
  // Playwright runs on a non-default PORT use their own build dir (.next-e2e) so they never clash with a dev server on 3000.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  eslint: {
    // ESLint is not installed as a dev dependency yet; type errors still fail the build below.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;