import { test, expect } from '@playwright/test';
import { EMAIL } from '../../support/personas';
import { requireSeed } from '../../support/guards';
import { signInAs } from '../../support/clerk';
import { hasRazorpayTestKeys, sessionFor, type Session } from '../../support/api';
import { BASE, clearWriteLimits, cohort, course, flushCatalogCache, plansPricing, singlePricing } from '../../support/adminApi';
import { adminDb } from '../../support/db';

// Slice 5e: the admin-only learner preview (/preview/courses): draft, published and archived cohorts as a learner will see them; nobody else can open it.
// Works with every flag (the preview reads the portal directly). Data: qa-prv-* ("QA Preview ..."), removed afterwards.
const COURSE = 'qa-prv-course';
const DRAFT = 'qa-prv-draft';
const PUB = 'qa-prv-pub';
const ARCH = 'qa-prv-arch';
const T = (slug: string) => `QA Preview ${slug}`;
const pitch = { vsl: { headlinePart1: 'QA preview headline', headlineHighlight: 'check it', subheadline: 'QA sub', flyerUrl: '/batch3-flyer.png', ctaLabel: 'Enroll Now', facts: ['QA fact'] } };
const dbMode = process.env.PORTAL_CATALOG === 'database';

test.describe('Admin learner preview @regression', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async () => { test.setTimeout(150_000); requireSeed(); await clearWriteLimits(); });
  let admin: Session; let startedAt = '';
  test.beforeAll(async ({ browser }) => {
    startedAt = new Date().toISOString();
    if (!process.env.E2E_SEED_PERSONAS) return;
    admin = await sessionFor(browser, EMAIL.admin);
  });
  test.afterAll(async () => {
    await adminDb().from('content_docs').delete().like('key', 'qa-prv%');
    await adminDb().from('admin_audit').delete().or('resource_id.like.qa-prv%,resource_id.like.%:qa-prv%').gte('at', startedAt);
    await flushCatalogCache(admin);
    await clearWriteLimits(); await admin?.close();
  });

  test('[PRV-UI-001] set-up: a draft course with a draft plans cohort, a published single-price cohort and an archived one', async () => {
    expect((await admin.request.post(`${BASE}/courses`, { data: course(COURSE, { pitch }) })).status()).toBe(201);
    for (const [slug, extra] of [[DRAFT, { pricing: plansPricing(), title: T(DRAFT) }], [PUB, { pricing: singlePricing(1500, 20), title: T(PUB) }], [ARCH, { pricing: singlePricing(900), title: T(ARCH) }]] as const) {
      expect((await admin.request.post(`${BASE}/cohorts`, { data: cohort(slug, COURSE, extra) })).status()).toBe(201);
    }
    expect((await admin.request.post(`${BASE}/courses/${COURSE}/publish`)).status()).toBe(200);
    expect((await admin.request.post(`${BASE}/cohorts/${PUB}/publish`)).status()).toBe(200);
    expect((await admin.request.post(`${BASE}/cohorts/${ARCH}/archive`)).status()).toBe(200);
  });

  test('[PRV-UI-002] a visitor cannot open the preview list or a preview page and receives no draft text', async ({ request }) => {
    for (const path of ['/preview/courses', `/preview/courses/${DRAFT}`]) {
      const res = await request.get(path, { maxRedirects: 0, headers: { 'User-Agent': 'shivam-academy-api-tests' } });
      expect(res.status(), path).not.toBe(200);
      expect(await res.text(), path).not.toContain(T(DRAFT));
    }
  });

  test('[PRV-UI-003] a signed-in learner is sent to the learning area and never sees a draft', async ({ page }) => {
    await signInAs(page, EMAIL.mavish);
    for (const path of ['/preview/courses', `/preview/courses/${DRAFT}`]) {
      await page.goto(path);
      await page.waitForURL(/\/learning/, { timeout: 30000 });
      expect(await page.content()).not.toContain(T(DRAFT));
      expect(await page.content()).not.toContain('Learner preview: only you');
    }
    const html = await (await page.context().request.get(`/preview/courses/${DRAFT}`)).text();
    expect(html).not.toContain(T(DRAFT));
  });

  test('[PRV-UI-004] the admin list shows draft and published cohorts with their state, hides archived by default, and "Archived only" shows just the archived ones greyed out', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/preview/courses');
    await expect(page.getByTestId('preview-intro')).toBeVisible({ timeout: 60000 });
    const card = (slug: string) => page.locator('a[href="/preview/courses/' + slug + '"]').locator('xpath=ancestor::div[contains(@class,"group")][1]');
    await expect(page.getByText(T(DRAFT))).toBeVisible();
    await expect(page.getByText(T(PUB))).toBeVisible();
    await expect(page.getByText(T(ARCH))).toHaveCount(0);   // archived is hidden by default
    await expect(card(DRAFT).getByTestId('preview-status')).toHaveAttribute('data-status', 'draft');
    await expect(card(PUB).getByTestId('preview-status')).toHaveAttribute('data-status', 'published');
    await expect(card(DRAFT)).toContainText('From ₹1999');   // the lowest plan, as on the public list
    await expect(card(PUB)).toContainText('₹1,500');
    await page.getByRole('combobox', { name: 'Show' }).selectOption('archived');
    await expect(page).toHaveURL(/show=archived/);
    await expect(page.getByText(T(ARCH))).toBeVisible();
    await expect(page.getByText(T(DRAFT))).toHaveCount(0);
    await expect(page.getByText(T(PUB))).toHaveCount(0);
    await expect(card(ARCH)).toHaveClass(/opacity-50/);
    await expect(card(ARCH).getByTestId('preview-status')).toHaveAttribute('data-status', 'archived');
    await page.getByRole('combobox', { name: 'Show' }).selectOption('active');
    await expect(page.getByText(T(DRAFT))).toBeVisible();
  });

  test('[PRV-UI-005] a draft opens as the real sales page with one slim label, plan cards, checkout off, and cannot be bought; the public pages do not know it', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/preview/courses');
    await page.locator(`a[href="/preview/courses/${DRAFT}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/preview/courses/${DRAFT}$`));
    const label = page.getByTestId('preview-label');
    await expect(label).toBeVisible({ timeout: 60000 });
    await expect(label).toHaveAttribute('data-status', 'draft');
    await expect(label).toContainText('Draft preview');
    await expect(page.getByRole('heading', { level: 1 }).first()).toContainText('QA preview headline');   // the real hero, not a placeholder
    const pricing = page.locator('#pricing');
    await expect(pricing).toContainText('Community');
    await expect(pricing).toContainText('Personal');
    await expect(pricing).toContainText('1999');
    const off = page.getByTestId('preview-checkout-off');
    await expect(off).toHaveAttribute('inert', '');
    expect(await off.locator('button').count()).toBeGreaterThan(0);   // the plan buttons are there to look at...
    expect(await off.locator('button').evaluateAll((els) => els.every((el) => !!el.closest('[inert]')))).toBe(true);   // ...and none can be used
    // nothing can be bought: the order route refuses a draft
    if (hasRazorpayTestKeys()) {
      const r = await admin.request.post('/api/create-order', { data: { courseId: DRAFT, planId: 'community', currency: 'INR' } });
      expect([r.status(), (await r.json()).error]).toEqual([400, 'Course not found']);
    }
    // the public pages never list or open a draft
    const list = await (await page.context().request.get('/courses')).text();
    expect(list).not.toContain(T(DRAFT));
    const pub = await page.context().request.get(`/courses/${DRAFT}`);
    expect(pub.status()).toBe(404);
  });

  test('[PRV-UI-006] a published cohort opens read-only with its state shown; a missing course is noted on the card', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto(`/preview/courses/${PUB}`);
    const label = page.getByTestId('preview-label');
    await expect(label).toBeVisible({ timeout: 60000 });
    await expect(label).toHaveAttribute('data-status', 'published');
    await expect(label).toContainText('read-only');
    await expect(page.getByTestId('preview-checkout-off')).toHaveAttribute('inert', '');
    await page.goto('/preview/courses/qa-prv-no-such-cohort');
    await expect(page.getByText('This page could not be found.')).toBeVisible();
    // an unpublished course is noted on its cohorts' cards (the public site hides them until the course is published too)
    expect((await admin.request.post(`${BASE}/courses/${COURSE}/unpublish`)).status()).toBe(200);
    await page.goto('/preview/courses');
    await expect(page.getByText('its course is draft').first()).toBeVisible({ timeout: 60000 });
    expect((await admin.request.post(`${BASE}/courses/${COURSE}/publish`)).status()).toBe(200);
  });

  test('[PRV-UI-007] publishing the draft makes it public (database catalog) and its preview label changes; the admin screens link to the preview', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    expect((await admin.request.post(`${BASE}/cohorts/${DRAFT}/publish`)).status()).toBe(200);
    await page.goto(`/preview/courses/${DRAFT}`);
    await expect(page.getByTestId('preview-label')).toHaveAttribute('data-status', 'published', { timeout: 60000 });
    if (dbMode) {
      await expect.poll(async () => (await page.context().request.get(`/courses/${DRAFT}`)).status(), { timeout: 30000, intervals: [1000, 2000] }).toBe(200);
      expect(await (await page.context().request.get('/courses')).text()).toContain(T(DRAFT));
    }
    await page.goto('/admin/cohorts');
    await expect(page.getByRole('link', { name: 'Preview as learner' })).toHaveAttribute('href', '/preview/courses');
    await page.goto(`/admin/cohorts/${DRAFT}`);
    await expect(page.getByRole('link', { name: 'Preview as learner' })).toHaveAttribute('href', `/preview/courses/${DRAFT}`);
    await expect(page.getByRole('navigation', { name: 'Admin sections' }).getByRole('link', { name: 'Learner preview' })).toHaveAttribute('href', '/preview/courses');
  });
});
