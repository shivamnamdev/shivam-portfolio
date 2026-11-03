// PRD 16 · response headers. The first four are enforced. The Content-Security-Policy is report-only for now: browsers
// log what it would block (console) without blocking anything, so a missed source cannot break Clerk, Razorpay, YouTube
// or the Monaco / Pyodide loaders. Once a clean run shows no violations, rename the header to Content-Security-Policy.
const csp = [
  "default-src 'self'",
  // 'unsafe-inline' / 'unsafe-eval': Next inline bootstrap, Monaco and Pyodide (WebAssembly) need them; nonces are a later step.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://*.clerk.accounts.dev https://clerk.shivamnamdev.com https://challenges.cloudflare.com https://checkout.razorpay.com https://www.youtube.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com",
  "font-src 'self' data: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.clerk.accounts.dev https://clerk.shivamnamdev.com https://api.razorpay.com https://lumberjack.razorpay.com https://www.googleapis.com https://raw.githubusercontent.com https://cdn.jsdelivr.net https://*.supabase.co",
  "frame-src 'self' https://www.youtube.com https://api.razorpay.com https://challenges.cloudflare.com https://pythontutor.com https://docs.google.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ');

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com")' },
  { key: 'Content-Security-Policy-Report-Only', value: csp },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
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