/** @type {import('next').NextConfig} */
const nextConfig = {
  // Playwright runs on a non-default PORT use their own build dir (.next-e2e) so they never clash with a dev server on 3000.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: {
    // Pyodide is loaded at run time by lib/examWorker.mjs (a worker thread), not bundled, so ship its files with the exam route.
    serverComponentsExternalPackages: ['pyodide'],
    outputFileTracingIncludes: {
      '/api/learning/exam-grade': ['./node_modules/pyodide/**/*', './lib/examWorker.mjs'],
    },
  },
  eslint: {
    // ESLint is not installed as a dev dependency yet; type errors still fail the build below.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;