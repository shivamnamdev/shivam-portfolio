/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLint is not installed as a dev dependency yet; type errors still fail the build below.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;