import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { QA_FIXTURE_SLUG } from '../../data/courses';
import { EMAIL, COURSE } from '../support/personas';
import { requireFixture, requireSeed } from '../support/guards';
import { signInAs } from '../support/clerk';
import { mockExternals } from '../support/learning';
import { API_UA, sessionFor } from '../support/api';

// PRD 15 · production-build cases. They only make sense against `next build` + `next start` (the dev server ships unminified
// bundles and no caching rules), so they skip unless PERF_PRODUCTION=1. How to run them without touching a dev server on port 3000:
//   NEXT_DIST_DIR=.next-prod NEXT_PUBLIC_QA_FIXTURES=1 npx next build
//   NEXT_DIST_DIR=.next-prod npx next start -p 3101
//   PERF_PRODUCTION=1 PERF_SCALE=0.4 PORT=3101 E2E_SEED_PERSONAS=1 NEXT_PUBLIC_QA_FIXTURES=1 npx playwright test tests/perf
const SCALE = Number(process.env.PERF_SCALE ?? '0.4');
const note = (name: string, value: string) => test.info().annotations.push({ type: 'perf', description: `${name}: ${value}` });

async function vitals(page: Page) {
  return page.evaluate(async () => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const lcp = await new Promise<number>(resolve => { let v = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) v = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); setTimeout(() => resolve(v), 1200); });
    const cls = await new Promise<number>(resolve => { let v = 0; new PerformanceObserver(l => { for (const e of l.getEntries() as any[]) if (!e.hadRecentInput) v += e.value; }).observe({ type: 'layout-shift', buffered: true }); setTimeout(() => resolve(v), 600); });
    const res = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const size = (f: (r: PerformanceResourceTiming) => boolean) => res.filter(f).reduce((s, r) => s + (r.transferSize || r.encodedBodySize || 0), 0);
    const img = res.filter(r => r.initiatorType === 'img' || /\.(png|jpe?g|webp|avif|gif|svg)(\?|$)/.test(r.name));
    return { ttfb: nav.responseStart, load: nav.loadEventEnd, lcp, cls, js: size(r => /\.js(\?|$)/.test(r.name)), requests: res.length,
             largestImage: Math.max(0, ...img.map(r => r.transferSize || r.encodedBodySize || 0)), images: img.length };
  });
}
async function warm(page: Page, p: string) { await page.goto(p); await page.waitForLoadState('networkidle'); await page.goto(p); await page.waitForLoadState('networkidle'); }

test.describe('PRD15 production build @perf-prod', () => {
  test.describe.configure({ mode: 'default' });
  test.setTimeout(120000);
  test.beforeEach(() => test.skip(process.env.PERF_PRODUCTION !== '1', 'needs a production build: set PERF_PRODUCTION=1 (see the header of this file)'));

  test('[PRF-PRD-001] static JavaScript is cached for a year (immutable)', async ({ page, request }) => {
    await page.goto('/'); await page.waitForLoadState('networkidle');
    const chunk = await page.evaluate(() => (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).map(r => r.name).find(n => /\/_next\/static\/.*\.js/.test(n)));
    const res = await request.get(chunk!);
    note('static chunk cache-control', res.headers()['cache-control'] ?? 'none');
    expect(res.headers()['cache-control']).toMatch(/max-age=31536000/);
    expect(res.headers()['cache-control']).toMatch(/immutable/);
  });

  test('[PRF-PRD-002] HTML and JavaScript are compressed', async ({ request }) => {
    const html = await request.get('/', { headers: { 'Accept-Encoding': 'gzip, br', 'User-Agent': API_UA } });
    note('html content-encoding', html.headers()['content-encoding'] ?? 'none');
    expect(html.headers()['content-encoding']).toMatch(/gzip|br/);
  });

  test('[PRF-PRD-003] (SCP-80) public pages that never change can be cached by the browser or a CDN', async ({ request }) => {
    const seen: string[] = [];
    for (const p of ['/', '/courses', '/privacy', '/terms', '/refund', '/about']) {
      const cc = (await request.get(p, { headers: { 'User-Agent': API_UA } })).headers()['cache-control'] ?? 'none';
      seen.push(`${p}: ${cc}`);
    }
    note('public page cache-control', seen.join(' | '));
    for (const line of seen) expect(line, 'a public page must not be private/no-store').not.toMatch(/private|no-store/);
  });

  test('[PRF-PRD-004] (SCP-81) API answers are never cached', async ({ browser }) => {
    requireSeed();
    const admin = await sessionFor(browser, EMAIL.admin);
    try {
      const cc = (await admin.request.get('/api/get-all-users')).headers()['cache-control'] ?? '';
      note('get-all-users cache-control', cc);
      expect(cc).toMatch(/no-store|no-cache|private/);
    } finally { await admin.close(); }
  });

  test('[PRF-PRD-005] first-load JavaScript stays within budget per page', async ({ page }) => {
    requireFixture();
    const budgets: [string, number][] = [['/', 600_000], ['/courses', 600_000], [`/courses/${QA_FIXTURE_SLUG}`, 800_000]];
    for (const [p, max] of budgets) {
      await warm(page, p);
      const m = await vitals(page);
      note(`${p} JS`, `${m.js} B in ${m.requests} requests`);
      expect(m.js, p).toBeLessThan(max);
    }
  });

  test('[PRF-PRD-006] images are small', async ({ page }) => {
    requireFixture();
    for (const p of ['/', `/courses/${QA_FIXTURE_SLUG}`]) {
      await warm(page, p);
      const m = await vitals(page);
      note(`${p} images`, `${m.images} images, largest ${m.largestImage} B`);
      expect(m.largestImage, p).toBeLessThan(300_000);
    }
  });

  test('[PRF-PRD-007] time to first byte stays under 600 ms for public pages', async ({ page }) => {
    for (const p of ['/', '/courses', '/privacy']) {
      await warm(page, p);
      const m = await vitals(page);
      note(`${p} TTFB`, `${m.ttfb.toFixed(0)} ms`);
      expect(m.ttfb, p).toBeLessThan(600 * Math.max(SCALE / 0.4, 1));
    }
  });

  test('[PRF-PRD-008] layout does not jump while the page loads (CLS under 0.1)', async ({ page }) => {
    requireFixture();
    for (const p of ['/', '/courses', `/courses/${QA_FIXTURE_SLUG}`]) {
      await warm(page, p);
      const m = await vitals(page);
      note(`${p} CLS`, m.cls.toFixed(3));
      expect(m.cls, p).toBeLessThan(0.1);
    }
  });

  test('[PRF-PRD-009] no request fails and nothing is missing while public pages load', async ({ page }) => {
    const bad: string[] = [];
    // A Clerk DEVELOPMENT instance answers the very first document request with a 401 handshake page; a live instance does not.
    const devClerk = (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '').startsWith('pk_test_');
    page.on('response', r => { if (r.status() >= 400 && !/clerk|googleapis|youtube|razorpay/.test(r.url()) && !(devClerk && r.status() === 401 && r.request().isNavigationRequest())) bad.push(`${r.status()} ${r.url()}`); });
    page.on('requestfailed', r => { if (!/clerk|googleapis|youtube|razorpay|_rsc/.test(r.url())) bad.push(`failed ${r.url()}`); });
    for (const p of ['/', '/courses', '/about', '/contact', '/privacy']) { await page.goto(p); await page.waitForLoadState('networkidle'); }
    expect(bad).toEqual([]);
  });

  test.describe('slow phone: CPU 4x slower, slow 4G (1.6 Mbit/s, 150 ms)', () => {
    const throttled = async (browser: any) => {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, baseURL: `http://localhost:${process.env.PORT ?? '3101'}` });
      const page = await ctx.newPage();
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
      return { ctx, page };
    };

    test('[PRF-PRD-010] the home page and the course page reach their largest content within 4 s on a slow phone', async ({ browser }) => {
      requireFixture();
      const { ctx, page } = await throttled(browser);
      try {
        for (const p of ['/', `/courses/${QA_FIXTURE_SLUG}`]) {
          await page.goto(p); await page.waitForLoadState('networkidle');
          await page.goto(p); await page.waitForLoadState('networkidle');
          const m = await vitals(page);
          note(`${p} slow phone`, `LCP ${m.lcp.toFixed(0)} ms, load ${m.load.toFixed(0)} ms, JS ${m.js} B`);
          expect(m.lcp, p).toBeLessThan(4000);
        }
      } finally { await ctx.close(); }
    });

    test('[PRF-PRD-011] the learning page lists its lessons within 20 s on a slow phone (SCP-33, SCP-34)', async ({ browser }) => {
      requireSeed();
      const { ctx, page } = await throttled(browser);
      try {
        await signInAs(page, EMAIL.bazar);
        await mockExternals(page);
        const t0 = Date.now();
        await page.goto(`/learning/${COURSE.B}`);
        await expect(page.getByText('Course Content')).toBeVisible({ timeout: 90000 });
        const ms = Date.now() - t0;
        note('learning page slow phone', `${ms} ms`);
        expect(ms).toBeLessThan(20000);
      } finally { await ctx.close(); }
    });
  });

  test('[PRF-AUT-001] sign-in to the account button takes under 8 s (ticket sign-in, Clerk script included)', async ({ page }) => {
    requireSeed();
    const t0 = Date.now();
    await signInAs(page, EMAIL.mavish);
    const ms = Date.now() - t0;
    note('signInAs total', `${ms} ms`);
    expect(ms).toBeLessThan(8000 * Math.max(SCALE / 0.4, 1));
  });

  test('[PRF-AUT-002] a signed-in dashboard visit shows the course list within 4 s of navigation', async ({ page }) => {
    requireSeed();
    await signInAs(page, EMAIL.mavish);
    const t0 = Date.now();
    await page.goto('/learning');
    await expect(page.getByRole('button', { name: 'Join Live Class' })).toBeVisible({ timeout: 30000 });
    const ms = Date.now() - t0;
    note('dashboard after sign-in', `${ms} ms`);
    expect(ms).toBeLessThan(4000 * Math.max(SCALE / 0.4, 1));
  });

  test('[PRF-PRD-012] (SCP-80) the home page is built once and served static (not rendered for every visitor)', async ({ request }) => {
    const res = await request.get('/', { headers: { 'User-Agent': API_UA } });
    note('x-nextjs-cache / x-nextjs-prerender', `${res.headers()['x-nextjs-cache'] ?? 'none'} / ${res.headers()['x-nextjs-prerender'] ?? 'none'}`);
    expect(res.headers()['x-nextjs-cache'] ?? res.headers()['x-nextjs-prerender'], 'the build marks every page as dynamic (ƒ), so none is prerendered').toBeTruthy();
  });

  test.fixme('[PRF-PRD-013] k6 browse-and-checkout load: 50 virtual users for 5 minutes, error rate under 1 %, p95 under 3 s (needs k6 installed; script in tests/perf/k6/browse-checkout.js)', async () => {});
});
