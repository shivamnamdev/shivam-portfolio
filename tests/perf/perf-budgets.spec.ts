import { test, expect, type Page } from '@playwright/test';
import { QA_FIXTURE_SLUG } from '../../data/courses';
import { EMAIL, COURSE } from '../support/personas';
import { requireFixture, requireSeed } from '../support/guards';
import { signInAs } from '../support/clerk';
import { sessionFor, API_UA, hasRazorpayTestKeys, type Session } from '../support/api';
import { mockExternals } from '../support/learning';
import { clickToPaintMs, openFixture, ui } from '../support/checkout';

// PRD 15 · Performance budgets. Each case measures, writes the numbers to the test annotations (they show in the HTML and Allure
// reports) and checks a budget. The budgets are for the DEV server (next dev compiles on demand): scale them with PERF_SCALE
// (for example PERF_SCALE=0.4 against a production build) . A page is visited once to warm it up, then measured.
const SCALE = Number(process.env.PERF_SCALE ?? '1');
const B = (ms: number) => ms * SCALE;
const pct = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.ceil(p * xs.length) - 1)];
const note = (name: string, value: string) => test.info().annotations.push({ type: 'perf', description: `${name}: ${value}` });

async function timeCalls(n: number, call: () => Promise<{ status(): number }>, parallel = false) {
  const times: number[] = [], statuses: number[] = [];
  const one = async () => { const t0 = performance.now(); const r = await call(); times.push(performance.now() - t0); statuses.push(r.status()); };
  if (parallel) await Promise.all(Array.from({ length: n }, one)); else for (let i = 0; i < n; i++) await one();
  return { times, statuses, p50: pct(times, 0.5), p95: pct(times, 0.95) };
}

async function pageMetrics(page: Page) {
  return page.evaluate(async () => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const lcp = await new Promise<number>(resolve => {
      let last = 0;
      new PerformanceObserver(l => { for (const e of l.getEntries()) last = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      setTimeout(() => resolve(last), 800);
    });
    const res = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const bytes = res.reduce((s, r) => s + (r.transferSize || r.encodedBodySize || 0), 0);
    const js = res.filter(r => r.initiatorType === 'script' || /\.js(\?|$)/.test(r.name)).reduce((s, r) => s + (r.transferSize || r.encodedBodySize || 0), 0);
    return { ttfb: nav.responseStart, dcl: nav.domContentLoadedEventEnd, load: nav.loadEventEnd, lcp, requests: res.length, bytes, js };
  });
}
async function measure(page: Page, path: string) {
  await page.goto(path); await page.waitForLoadState('networkidle');          // warm-up
  await page.goto(path); await page.waitForLoadState('networkidle');
  return pageMetrics(page);
}

test.describe('PRD15 performance budgets @perf', () => {
  test.describe.configure({ mode: 'default' });
  test.setTimeout(120000);

  test.describe('pages (warm, desktop)', () => {
    const budgets: [string, string, number, number][] = [ // id, path, load budget ms, LCP budget ms
      ['PRF-PGE-001', '/', 6000, 4000], ['PRF-PGE-002', '/courses', 6000, 4000], ['PRF-PGE-003', '/contact', 6000, 4000],
    ];
    for (const [id, path, loadMs, lcpMs] of budgets) {
      test(`[${id}] ${path} loads within budget for a visitor`, async ({ page }) => {
        const m = await measure(page, path);
        note(path, JSON.stringify(m));
        expect(m.ttfb, 'TTFB').toBeLessThan(B(1500));
        expect(m.load, 'load event').toBeLessThan(B(loadMs));
        expect(m.lcp, 'largest contentful paint').toBeLessThan(B(lcpMs));
        expect(m.requests, 'requests').toBeLessThan(120);
      });
    }

    test('[PRF-PGE-004] a course page loads within budget and ships a reasonable amount of JavaScript', async ({ page }) => {
      requireFixture();
      const m = await measure(page, `/courses/${QA_FIXTURE_SLUG}`);
      note('course page', JSON.stringify(m));
      expect(m.load).toBeLessThan(B(7000));
      expect(m.lcp).toBeLessThan(B(4500));
      expect(m.js, 'JavaScript transferred (bytes)').toBeLessThan(6_000_000);
    });

    test('[PRF-PGE-005] (SCP-77) the dashboard shows the course list within budget', async ({ page }) => {
      requireSeed();
      await signInAs(page, EMAIL.mavish);
      await page.goto('/learning');
      const t0 = Date.now();
      await expect(page.getByRole('button', { name: 'Join Live Class' })).toBeVisible({ timeout: 30000 });
      const ms = Date.now() - t0;
      note('dashboard list visible after navigation', `${ms} ms`);
      expect(ms).toBeLessThan(B(6000));
    });

    test('[PRF-PGE-006] the learning page lists the lessons within budget (externals answered locally)', async ({ page }) => {
      requireSeed();
      await signInAs(page, EMAIL.bazar);
      await mockExternals(page);
      const t0 = Date.now();
      await page.goto(`/learning/${COURSE.B}`);
      await expect(page.getByText('Course Content')).toBeVisible({ timeout: 60000 });
      const ms = Date.now() - t0;
      note('learning page ready', `${ms} ms`);
      expect(ms).toBeLessThan(B(15000));
    });

    test('[PRF-PGE-007] the admin portal shows its tables within budget', async ({ page }) => {
      requireSeed();
      await signInAs(page, EMAIL.admin);
      const t0 = Date.now();
      await page.goto('/admin');
      await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 60000 });
      const ms = Date.now() - t0;
      note('admin table visible', `${ms} ms`);
      expect(ms).toBeLessThan(B(12000));
    });
  });

  test.describe('interaction latency', () => {
    test('[PRF-UIX-001] switching currency on the course page paints within 250 ms', async ({ page }) => {
      requireFixture(); requireSeed();
      await openFixture(page, EMAIL.mavish);
      const ms = await clickToPaintMs(page, 'International');
      note('currency toggle click to paint', `${ms.toFixed(0)} ms`);
      expect(ms).toBeLessThan(250);
      await expect(ui.finalPrice(page)).toHaveText('$1');
    });

    test('[PRF-UIX-002] switching an admin tab paints within 400 ms', async ({ page }) => {
      requireSeed();
      await signInAs(page, EMAIL.admin);
      await page.goto('/admin');
      await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 60000 });
      const ms = await clickToPaintMs(page, 'Enrollments');
      note('admin tab click to paint', `${ms.toFixed(0)} ms`);
      expect(ms).toBeLessThan(400);
    });
  });

  test.describe('API latency', () => {
    let learner: Session, admin: Session;
    test.beforeAll(async ({ browser }) => { if (!process.env.E2E_SEED_PERSONAS) return; learner = await sessionFor(browser, EMAIL.mavish); admin = await sessionFor(browser, EMAIL.admin); });
    test.afterAll(async () => { await learner?.close(); await admin?.close(); });
    test.beforeEach(() => requireSeed());

    test('[PRF-API-001] ai-tutor answers within 3 s (it waits 1.2 s on purpose today)', async ({ request }) => {
      const r = await timeCalls(8, () => request.post('/api/ai-tutor', { data: { labType: 'python', code: 'print(1)', output: '' }, headers: { 'User-Agent': API_UA } }));
      note('ai-tutor', `p50 ${r.p50.toFixed(0)} ms, p95 ${r.p95.toFixed(0)} ms`);
      expect(r.statuses.every(s => s === 200)).toBe(true);
      expect(r.p95).toBeLessThan(3000); // not scaled: the mock waits 1.2 s on purpose
    });

    test('[PRF-API-002] the admin user directory answers within 5 s and its size per user stays small', async () => {
      const r = await timeCalls(5, () => admin.request.get('/api/get-all-users'));
      const res = await admin.request.get('/api/get-all-users');
      const body = await res.body(); const users = JSON.parse(body.toString()).users.length;
      note('get-all-users', `p50 ${r.p50.toFixed(0)} ms, p95 ${r.p95.toFixed(0)} ms, ${users} users, ${body.length} bytes (${Math.round(body.length / users)} per user)`);
      expect(r.statuses.every(s => s === 200)).toBe(true);
      expect(r.p95).toBeLessThan(B(5000));
      expect(body.length / users).toBeLessThan(600);
    });

    test('[PRF-API-003] xp/sync answers within 3 s', async () => {
      const r = await timeCalls(8, () => learner.request.post('/api/xp/sync'));
      note('xp/sync', `p50 ${r.p50.toFixed(0)} ms, p95 ${r.p95.toFixed(0)} ms`);
      expect(r.statuses.every(s => s === 200)).toBe(true);
      expect(r.p95).toBeLessThan(B(3000));
    });

    test('[PRF-API-004] certificate generation answers within 3 s and the file stays under 100 KB', async () => {
      const r = await timeCalls(5, () => learner.request.post('/api/generate-certificate', { data: { studentName: 'QA Student', courseTitle: 'QA Course' } }));
      const bytes = (await (await learner.request.post('/api/generate-certificate', { data: { studentName: 'QA Student', courseTitle: 'QA Course' } })).body()).length;
      note('generate-certificate', `p50 ${r.p50.toFixed(0)} ms, p95 ${r.p95.toFixed(0)} ms, ${bytes} bytes`);
      expect(r.statuses.every(s => s === 200)).toBe(true);
      expect(r.p95).toBeLessThan(B(3000));
      expect(bytes).toBeLessThan(100_000);
    });

    test('[PRF-API-005] create-order (includes the Razorpay call) answers within 5 s', async () => {
      test.skip(!hasRazorpayTestKeys(), 'needs rzp_test_ keys');
      requireFixture();
      const r = await timeCalls(5, () => learner.request.post('/api/create-order', { data: { courseId: QA_FIXTURE_SLUG, currency: 'INR' } }));
      note('create-order', `p50 ${r.p50.toFixed(0)} ms, p95 ${r.p95.toFixed(0)} ms`);
      expect(r.statuses.every(s => s === 200)).toBe(true);
      expect(r.p95).toBeLessThan(B(5000));
    });
  });

  test.describe('load and concurrency', () => {
    test('[PRF-LOD-001] 30 simultaneous visitors on the catalog all get a page, none a 5xx, and p95 stays within 8 s', async ({ request }) => {
      const r = await timeCalls(30, () => request.get('/courses', { headers: { 'User-Agent': API_UA } }), true);
      note('30 parallel GET /courses', `p50 ${r.p50.toFixed(0)} ms, p95 ${r.p95.toFixed(0)} ms`);
      expect(r.statuses.filter(s => s >= 500)).toEqual([]);
      expect(r.p95).toBeLessThan(B(8000));
    });

    test('[PRF-LOD-002] 20 simultaneous xp/sync calls from one learner all succeed and stay consistent', async ({ browser }) => {
      requireSeed();
      const s = await sessionFor(browser, EMAIL.mavish);
      try {
        const r = await timeCalls(20, () => s.request.post('/api/xp/sync'), true);
        const points = await Promise.all((await Promise.all(Array.from({ length: 3 }, () => s.request.post('/api/xp/sync')))).map(x => x.json().then(j => j.points)));
        note('20 parallel xp/sync', `p50 ${r.p50.toFixed(0)} ms, p95 ${r.p95.toFixed(0)} ms`);
        expect(r.statuses.filter(x => x !== 200)).toEqual([]);
        expect(new Set(points).size).toBe(1);
        expect(r.p95).toBeLessThan(B(10000));
      } finally { await s.close(); }
    });

    test('[PRF-LOD-003] a burst of 50 refused requests on a public endpoint is answered quickly (no work is done for refusals)', async ({ request }) => {
      const r = await timeCalls(50, () => request.post('/api/send-email', { data: { email: 'bad' }, headers: { 'User-Agent': API_UA } }), true);
      note('50 parallel refused send-email', `p50 ${r.p50.toFixed(0)} ms, p95 ${r.p95.toFixed(0)} ms`);
      expect(r.statuses.every(s => s === 400)).toBe(true);
      expect(r.p95).toBeLessThan(B(5000));
    });
  });

  test.describe('payload and data size', () => {
    test('[PRF-PAY-001] the home page HTML stays under 300 KB (and, on a production build, no single script is larger than 3 MB)', async ({ page }) => {
      const sizes: number[] = [];
      page.on('response', async r => { if (r.request().resourceType() === 'script') { const b = await r.body().catch(() => null); if (b) sizes.push(b.length); } });
      const html = await (await page.goto('/'))!.body();
      await page.waitForLoadState('networkidle');
      note('home html / largest script', `${html.length} B / ${Math.max(0, ...sizes)} B`);
      expect(html.length).toBeLessThan(300_000);
      // The dev server ships unminified bundles (a 6 MB script is normal there), so the script limit only applies to a production build.
      if (process.env.PERF_PRODUCTION === '1') expect(Math.max(0, ...sizes)).toBeLessThan(3_000_000);
    });
  });

  test.fixme('[PRF-LOD-004] the admin portal stays usable with 1000+ users (needs a QA Clerk instance with that many users)', async () => {});
  test.fixme('[PRF-LOD-005] sustained load of 100 virtual users for 10 minutes (needs a load-test tool and a staging environment)', async () => {});
});
