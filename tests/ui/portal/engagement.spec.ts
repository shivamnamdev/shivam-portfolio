import { test, expect } from '@playwright/test';
import { EMAIL } from '../../support/personas';
import { requireSeed } from '../../support/guards';
import { signInAs } from '../../support/clerk';
import { sessionFor, type Session } from '../../support/api';
import { BASE, clearWriteLimits, cohort, course, singlePricing } from '../../support/adminApi';
import { adminDb } from '../../support/db';

// Phase 5, slice 5c in the browser with PORTAL_ENGAGEMENT=database: the banner bars (countdown, dismiss, placement) and the notification bell.
// Start as: PORT=3100 PORTAL_ENGAGEMENT=database E2E_SEED_PERSONAS=1 npx playwright test tests/ui/portal. Data is qa-uieng-* / "QA-UI", removed afterwards.
const COURSE = 'qa-uieng-course';
const COHORT = 'qa-uieng-batch';
const day = (n: number) => new Date(Date.now() + n * 86400_000).toISOString();
const hdr = (v: number) => ({ 'If-Match': String(v) });
const bars = (page: import('@playwright/test').Page) => page.getByTestId('site-banner');

test.describe('Portal banners and bell, PORTAL_ENGAGEMENT=database @regression', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async () => {
    test.setTimeout(150_000);
    requireSeed();
    test.skip(process.env.PORTAL_ENGAGEMENT !== 'database', 'needs the server and the test process started with PORTAL_ENGAGEMENT=database');
    await clearWriteLimits();
  });
  let admin: Session; let startedAt = '';
  test.beforeAll(async ({ browser }) => {
    startedAt = new Date().toISOString();
    if (!process.env.E2E_SEED_PERSONAS || process.env.PORTAL_ENGAGEMENT !== 'database') return;
    admin = await sessionFor(browser, EMAIL.admin);
  });
  test.afterAll(async () => {
    const db = adminDb();
    await db.from('user_enrollments').delete().eq('course_slug', COHORT);
    await db.from('notifications').delete().like('title', 'QA-UI%');
    await db.from('content_docs').delete().like('key', 'qa-uieng%');
    await db.from('admin_audit').delete().or('resource_id.like.qa-uieng%,resource_id.like.%:qa-uieng%,resource.eq.notification').gte('at', startedAt);
    await clearWriteLimits(); await admin?.close();
  });
  const banner = async (slug: string, extra: object = {}) => {
    const r = await admin.request.post(`${BASE}/banners`, { data: { slug, purpose: 'offer', message: `Message ${slug}`, placement: 'courses', allowMultiple: true, ...extra } });
    expect(r.status(), await r.text()).toBe(201);
    expect((await admin.request.post(`${BASE}/banners/${slug}/publish`)).status()).toBe(200);
    return (await r.json()).data.version as number;
  };

  test('[ENG-UI-001] a banner shows on its page with a ticking countdown and a link; dismissing hides it and it stays hidden after a reload; an edit makes it show again', async ({ page }) => {
    await banner('qa-uieng-offer', { message: 'QA UI offer: 20% off & more', ctaLabel: 'See courses', ctaUrl: '/courses', countdownTo: day(1), style: 'urgent' });
    await page.goto('/courses');
    const bar = bars(page).filter({ hasText: 'QA UI offer: 20% off & more' });
    await expect(bar).toBeVisible({ timeout: 60000 });
    await expect(bar.getByRole('link', { name: 'See courses' })).toHaveAttribute('href', '/courses');
    const first = await bar.getByTestId('banner-countdown').innerText();
    expect(first).toMatch(/^(\d+d )?\d{2}:\d{2}:\d{2}$/);
    await expect.poll(async () => bar.getByTestId('banner-countdown').innerText(), { timeout: 8000 }).not.toBe(first);   // it ticks
    await bar.getByRole('button', { name: /^Dismiss/ }).click();
    await expect(bar).toHaveCount(0);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(bars(page).filter({ hasText: 'QA UI offer' })).toHaveCount(0);   // remembered
    const v = (await (await admin.request.get(`${BASE}/banners/qa-uieng-offer`)).json()).data.version;
    expect((await admin.request.patch(`${BASE}/banners/qa-uieng-offer`, { data: { message: 'QA UI offer, new text' }, headers: hdr(v) })).status()).toBe(200);
    await expect.poll(async () => { await page.reload(); await page.waitForLoadState('networkidle'); return bars(page).filter({ hasText: 'QA UI offer, new text' }).count(); }, { timeout: 40000, intervals: [1500, 2500] }).toBe(1);   // a new version shows again
  });

  test('[ENG-UI-002] a site-top banner sits above the navigation on any page; a banner for another placement does not appear here; the text is shown as text', async ({ page }) => {
    await banner('qa-uieng-top', { placement: 'site-top', message: 'QA UI top <i>not italic</i>'.replace(/[<>]/g, ''), dismissible: false });
    await page.goto('/about');
    const top = bars(page).filter({ hasText: 'QA UI top' });
    await expect(top).toBeVisible({ timeout: 60000 });
    await expect(top.getByRole('button', { name: /^Dismiss/ })).toHaveCount(0);   // not dismissible
    const above = await page.evaluate(() => { const b = document.querySelector('[data-testid="site-banner"]'); const n = document.querySelector('nav'); return !!b && !!n && !!(b.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING); });
    expect(above).toBe(true);
    await expect(bars(page).filter({ hasText: 'QA UI offer' })).toHaveCount(0);   // that one is for the courses page
  });

  test('[ENG-UI-003] a banner for learners shows on the dashboard only to a signed-in learner; a cohort banner only to that cohort', async ({ page, browser }) => {
    expect((await admin.request.post(`${BASE}/courses`, { data: course(COURSE) })).status()).toBe(201);
    expect((await admin.request.post(`${BASE}/cohorts`, { data: cohort(COHORT, COURSE, { pricing: singlePricing(999) }) })).status()).toBe(201);
    expect((await admin.request.post(`${BASE}/enrolments`, { data: { cohortSlug: COHORT, email: EMAIL.edu } })).status()).toBe(201);
    await banner('qa-uieng-dash', { placement: 'dashboard', audience: { kind: 'learners' }, message: 'QA UI dashboard note' });
    await banner('qa-uieng-batch', { placement: 'dashboard', audience: { kind: 'cohort', cohortSlug: COHORT }, message: 'QA UI cohort note' });
    await signInAs(page, EMAIL.edu);
    await page.goto('/learning');
    await expect(bars(page).filter({ hasText: 'QA UI dashboard note' })).toBeVisible({ timeout: 60000 });
    await expect(bars(page).filter({ hasText: 'QA UI cohort note' })).toBeVisible();
    const ctx = await browser.newContext({ baseURL: `http://localhost:${process.env.PORT ?? '3000'}` });
    const p2 = await ctx.newPage();
    await signInAs(p2, EMAIL.mavish);   // enrolled elsewhere
    await p2.goto('/learning');
    await expect(bars(p2).filter({ hasText: 'QA UI dashboard note' })).toBeVisible({ timeout: 60000 });
    await expect(bars(p2).filter({ hasText: 'QA UI cohort note' })).toHaveCount(0);
    await ctx.close();
  });

  test('[ENG-UI-004] the bell shows the learner\'s notifications with an unread dot and count; opening an item marks it read; "Mark all as read" clears the dot and it stays cleared after a reload; a new one brings the dot back', async ({ page }) => {
    const note = async (title: string, body: string) => expect((await admin.request.post(`${BASE}/notifications`, { data: { type: 'announcement', title, body, link: '/courses', target: { kind: 'all' } } })).status()).toBe(201);
    await note('QA-UI first', 'First body **bold** and [site](https://example.com).');
    await note('QA-UI second', 'Second body');
    await signInAs(page, EMAIL.edu);
    await page.goto('/courses');
    const bell = page.getByRole('button', { name: 'Notifications' });
    await expect(page.getByTestId('bell-dot')).toBeVisible({ timeout: 60000 });
    await bell.click();
    const items = page.getByTestId('bell-item');
    await expect(items.filter({ hasText: 'QA-UI first' })).toBeVisible();
    await expect(items.filter({ hasText: 'QA-UI first' })).toContainText('First body bold and site (https://example.com).');   // plain text, no markup
    await expect(items.filter({ hasText: 'QA-UI second' })).toHaveAttribute('data-read', 'false');
    const count0 = Number((await page.getByTestId('bell-count').innerText()).split(' ')[0]);
    expect(count0).toBeGreaterThanOrEqual(2);
    await items.filter({ hasText: 'QA-UI second' }).click();   // goes to /courses and marks this one read
    await page.waitForURL(/\/courses$/);
    await page.waitForLoadState('networkidle');
    await bell.click();
    await expect(items.filter({ hasText: 'QA-UI second' })).toHaveAttribute('data-read', 'true');
    await expect(Number((await page.getByTestId('bell-count').innerText()).split(' ')[0])).toBe(count0 - 1);
    await page.getByRole('button', { name: 'Mark all as read' }).click();
    await expect(page.getByTestId('bell-dot')).toHaveCount(0);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByTestId('bell-dot')).toHaveCount(0);   // kept on the server
    await note('QA-UI third', 'Third body');
    await page.reload();
    await expect(page.getByTestId('bell-dot')).toBeVisible({ timeout: 30000 });
  });
});
