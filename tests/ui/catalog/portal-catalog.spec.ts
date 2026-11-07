import { test, expect } from '@playwright/test';
import { EMAIL } from '../../support/personas';
import { requireSeed } from '../../support/guards';
import { sessionFor, type Session } from '../../support/api';
import { BASE, clearWriteLimits, course, cohort, flushCatalogCache, singlePricing } from '../../support/adminApi';
import { adminDb } from '../../support/db';

// Phase 5, slice 5a: the course list and sales pages with PORTAL_CATALOG=database. The server under test must be started with that flag
// (PORT=3100 PORTAL_CATALOG=database E2E_SEED_PERSONAS=1 npx playwright test tests/ui/catalog); without it these cases skip with a reason.
// Fixtures are made through the admin API under qa-cat-* and removed afterwards; the support-phone setting is saved and put back.
const COURSE = 'qa-cat-course';
const MAIN = 'qa-cat-batch';
const HIDDEN = 'qa-cat-hidden';
const DRAFT = 'qa-cat-draft';
const SECRET_LIVE = 'https://meet.google.com/qa-cat-secret-live';
const SECRET_CHAT = 'https://chat.whatsapp.com/qa-cat-secret-chat';
const STATIC_TITLE = 'Git Beginner Live Session';   // a course that exists only in data/courses.ts
const pitch = {
  vsl: { headlinePart1: 'QA catalog headline', headlineHighlight: 'FROM THE PORTAL', subheadline: 'Built from the database', videoCoverUrl: '', flyerUrl: '/git-batch1-flyer.jpeg' },
  painPoints: { oldWay: ['Old way QA line'], newWay: ['New way QA line'] },
  outcomes: ['QA outcome one'], modules: [{ week: 'MODULE 1', title: 'Portal module', topics: ['Portal topic'] }],
};
const hdr = (v: number) => ({ 'If-Match': String(v) });

test.describe('Portal catalog, PORTAL_CATALOG=database @regression', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async () => {
    test.setTimeout(150_000);
    requireSeed();
    test.skip(process.env.PORTAL_CATALOG !== 'database', 'needs the server and the test process started with PORTAL_CATALOG=database');
    await clearWriteLimits();
  });
  let admin: Session; let startedAt = ''; let savedSettings: Record<string, unknown>[] = []; let mainVersion = 0;
  test.beforeAll(async ({ browser }) => {
    startedAt = new Date().toISOString();
    savedSettings = (await adminDb().from('content_docs').select('*').eq('kind', 'setting')).data ?? [];
    await adminDb().from('content_docs').delete().eq('kind', 'setting');
    admin = await sessionFor(browser, EMAIL.admin);
  });
  test.afterAll(async () => {
    const db = adminDb();
    await db.from('content_docs').delete().like('key', 'qa-cat%');
    await db.from('content_docs').delete().eq('kind', 'setting');
    if (savedSettings.length) await db.from('content_docs').insert(savedSettings);
    await db.from('admin_audit').delete().or('resource_id.like.qa-cat%,resource.eq.setting').gte('at', startedAt);
    await flushCatalogCache(admin);
    await clearWriteLimits(); await admin?.close();
  });
  const html = async (path: string) => { const r = await admin.context.request.get(path); return { status: r.status(), text: await r.text() }; };
  const visitorHtml = async (request: import('@playwright/test').APIRequestContext, path: string) => { const r = await request.get(path, { headers: { 'User-Agent': 'shivam-academy-api-tests' } }); return { status: r.status(), text: await r.text() }; };

  test('[CAT-UI-001] with nothing published in the portal the course list falls back to the data files', async ({ page }) => {
    const published = (await adminDb().from('content_docs').select('key').in('kind', ['course', 'cohort']).eq('status', 'published')).data ?? [];
    test.skip(published.length > 0, 'the QA database already has published courses or cohorts');
    await page.goto('/courses');
    await expect(page.getByText(STATIC_TITLE)).toBeVisible({ timeout: 60000 });
  });

  test('[CAT-UI-002] a published course and cohort show in the list built from the portal; a draft and an unlisted cohort do not, the unlisted one still opens by its address', async ({ page, request }) => {
    expect((await admin.request.post(`${BASE}/courses`, { data: course(COURSE, { pitch }) })).status()).toBe(201);
    expect((await admin.request.post(`${BASE}/courses/${COURSE}/publish`)).status()).toBe(200);
    const mk = async (slug: string, extra: object) => { const r = await admin.request.post(`${BASE}/cohorts`, { data: cohort(slug, COURSE, { pricing: singlePricing(1499), whatsappLink: SECRET_CHAT, liveLink: SECRET_LIVE, ...extra }) }); expect(r.status(), slug).toBe(201); return (await r.json()).data; };
    mainVersion = (await mk(MAIN, { statusText: 'QA open cohort', demoOffer: 'QA demo' })).version;
    await mk(HIDDEN, { listed: false });
    await mk(DRAFT, {});
    for (const s of [MAIN, HIDDEN]) expect((await admin.request.post(`${BASE}/cohorts/${s}/publish`)).status(), s).toBe(200);
    mainVersion += 1;
    await expect.poll(async () => (await html('/courses')).text.includes(`QA cohort ${MAIN}`), { timeout: 30000 }).toBe(true);   // the publish refreshed the list at once
    await page.goto('/courses');
    await expect(page.getByText(`QA cohort ${MAIN}`)).toBeVisible({ timeout: 60000 });
    await expect(page.getByText(`QA cohort ${HIDDEN}`)).toHaveCount(0);
    await expect(page.getByText(`QA cohort ${DRAFT}`)).toHaveCount(0);
    await expect(page.getByText(STATIC_TITLE)).toHaveCount(0);   // the portal is the source now
    const hidden = await visitorHtml(request, `/courses/${HIDDEN}`);
    expect(hidden.status).toBe(200);
    expect(hidden.text).toContain('QA catalog headline');
    expect((await visitorHtml(request, `/courses/${DRAFT}`)).status).toBe(404);
    expect((await visitorHtml(request, '/courses/qa-cat-nope')).status).toBe(404);
  });

  test('[CAT-UI-003] the sales page shows the pitch from the portal and carries no private link anywhere in what the browser receives', async ({ page, request }) => {
    await page.goto(`/courses/${MAIN}`);
    await expect(page.getByText('QA catalog headline')).toBeVisible({ timeout: 60000 });
    await expect(page.locator('h1').getByText('FROM THE PORTAL')).toBeVisible();   // h1 only: the closing heading repeats the words
    await expect(page.getByText('Old way QA line')).toBeVisible();
    await expect(page.getByText('Portal topic').first()).toBeAttached();
    const { status, text } = await visitorHtml(request, `/courses/${MAIN}`);
    expect(status).toBe(200);
    expect(text).not.toContain('qa-cat-secret');
    expect(text).not.toContain('chat.whatsapp.com/qa-cat');
    expect(text).not.toContain('meet.google.com/qa-cat');
    expect(text).not.toContain('"private"');
    const list = await visitorHtml(request, '/courses');
    expect(list.text).not.toContain('qa-cat-secret');
  });

  test('[CAT-UI-004] until the database prices orders, a cohort that exists only in the portal shows as closed (the server could not charge it)', async ({ page }) => {
    test.skip(process.env.PORTAL_COUPONS === 'database', 'only while orders are priced from the data files (PORTAL_COUPONS not database); with it on, the portal prices are sold (tests/ui/portal/coupons.spec.ts)');
    await page.goto(`/courses/${MAIN}`);
    await expect(page.getByText('QA catalog headline')).toBeVisible({ timeout: 60000 });
    await expect(page.getByRole('button', { name: /enroll|buy|pay/i })).toHaveCount(0);
    await page.goto('/courses');
    await expect(page.locator('div', { hasText: `QA cohort ${MAIN}` }).filter({ hasText: 'Closed' }).first()).toBeVisible();
  });

  test('[CAT-UI-005] a change in the portal shows on the page at once (no 60-second wait); the support number follows the setting and falls back when cleared', async () => {
    const edited = await admin.request.patch(`${BASE}/cohorts/${MAIN}`, { data: { title: 'QA cohort renamed' }, headers: hdr(mainVersion) });
    expect(edited.status()).toBe(200);
    await expect.poll(async () => (await html('/courses')).text.includes('QA cohort renamed'), { timeout: 20000, intervals: [500, 1000] }).toBe(true);
    expect((await html('/courses')).text).not.toContain(`QA cohort ${MAIN}`);

    expect((await html(`/courses/${MAIN}`)).text).toContain('wa.me/917057034840');   // the default number
    expect((await admin.request.put(`${BASE}/settings/support-phone`, { data: { value: '+91 98765 43210' } })).status()).toBe(201);
    await expect.poll(async () => (await html(`/courses/${MAIN}`)).text.includes('wa.me/919876543210'), { timeout: 20000, intervals: [500, 1000] }).toBe(true);
    expect((await admin.request.put(`${BASE}/settings/support-phone`, { data: { value: null }, headers: hdr(1) })).status()).toBe(200);
    await expect.poll(async () => (await html(`/courses/${MAIN}`)).text.includes('wa.me/917057034840'), { timeout: 20000, intervals: [500, 1000] }).toBe(true);
  });

  test('[CAT-UI-006] unpublishing the course takes its cohorts off the site; with nothing left published the list is the data files again', async ({ page, request }) => {
    expect((await admin.request.post(`${BASE}/courses/${COURSE}/unpublish`)).status()).toBe(200);
    await expect.poll(async () => (await visitorHtml(request, `/courses/${MAIN}`)).status, { timeout: 20000, intervals: [500, 1000] }).toBe(404);
    await page.goto('/courses');
    await expect(page.getByText(STATIC_TITLE)).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('QA cohort renamed')).toHaveCount(0);
  });
});
