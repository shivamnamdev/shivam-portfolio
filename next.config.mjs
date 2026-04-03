/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // 🚨 THIS IS THE MAGIC LINE FOR S3
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;