import { test, expect } from '@playwright/test';
import { EMAIL } from '../../support/personas';
import { requireSeed } from '../../support/guards';
import { signInAs } from '../../support/clerk';
import { sessionFor, type Session } from '../../support/api';
import { BASE, clearWriteLimits, cohort, course, future, plansPricing } from '../../support/adminApi';
import { adminDb } from '../../support/db';

// Phase 5, slice 5d in the browser with PORTAL_CATALOG=database and PORTAL_COUPONS=database: the plan cards show the portal's prices, and the coupon
// box asks the server (the codes are not in the page). Start as: PORT=3100 PORTAL_CATALOG=database PORTAL_COUPONS=database E2E_SEED_PERSONAS=1 npx playwright test tests/ui/portal/coupons.spec.ts
const COURSE = 'qa-uipcp-course';
const COHORT = 'qa-uipcp-plans';
const on = process.env.PORTAL_COUPONS === 'database' && process.env.PORTAL_CATALOG === 'database';

test.describe('Portal prices and coupons in the browser, PORTAL_COUPONS=database @regression', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async () => {
    test.setTimeout(150_000);
    requireSeed();
    test.skip(!on, 'needs the server and the test process started with PORTAL_CATALOG=database and PORTAL_COUPONS=database');
    await clearWriteLimits();
  });
  let admin: Session; let startedAt = '';
  test.beforeAll(async ({ browser }) => {
    startedAt = new Date().toISOString();
    if (!process.env.E2E_SEED_PERSONAS || !on) return;
    admin = await sessionFor(browser, EMAIL.admin);
  });
  test.afterAll(async () => {
    const db = adminDb();
    await db.from('coupons').delete().like('code', 'QAUIPCP%');
    await db.from('content_docs').delete().like('key', 'qa-uipcp%');
    await db.from('admin_audit').delete().or('resource_id.like.qa-uipcp%,resource_id.like.QAUIPCP%,resource_id.like.%:qa-uipcp%').gte('at', startedAt);
    await clearWriteLimits(); await admin?.close();
  });

  test('[PCP-UI-001] a published plans cohort shows its plans with the portal\'s prices; a code from the portal is applied by the server and takes its percentage off; a wrong code shows the server\'s text', async ({ page }) => {
    expect((await admin.request.post(`${BASE}/courses`, { data: course(COURSE) })).status()).toBe(201);
    expect((await admin.request.post(`${BASE}/courses/${COURSE}/publish`)).status()).toBe(200);
    expect((await admin.request.post(`${BASE}/cohorts`, { data: cohort(COHORT, COURSE, { pricing: plansPricing() }) })).status()).toBe(201);
    expect((await admin.request.post(`${BASE}/cohorts/${COHORT}/publish`)).status()).toBe(200);
    const mk = await admin.request.post(`${BASE}/coupons`, { data: { code: 'QAUIPCP-20', kind: 'everyone', discount: { type: 'percentage', percent: 20 }, expiresAt: future(7) } });
    expect(mk.status(), await mk.text()).toBe(201);

    await signInAs(page, EMAIL.edu);
    await page.goto(`/courses/${COHORT}`);
    if (!page.url().includes(COHORT)) await page.goto(`/courses/${COHORT}`);   // Clerk's own redirect after sign-in can swallow the first navigation
    const pricing = page.locator('#pricing');
    await expect(pricing).toBeVisible({ timeout: 60000 });
    await expect(pricing).toContainText('Community');
    await expect(pricing).toContainText('Personal');
    await expect(pricing).toContainText('1999');
    await expect(pricing).toContainText('2999');

    const html = await (await page.context().request.get(`/courses/${COHORT}`)).text();
    expect(html).not.toContain('QAUIPCP-20');            // the code is in the database only
    expect(html).not.toContain('EXISTINGSTUDENT_BATCH03');   // the old file codes are not in the page either

    await page.locator('#coupon').fill('NOT-A-CODE');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(pricing.getByText('Invalid coupon code')).toBeVisible();
    await page.locator('#coupon').fill('QAUIPCP-20');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(pricing.getByText('Coupon applied successfully!')).toBeVisible();
    await expect(pricing).toContainText('1599');         // 1999 less 20%
    await expect(pricing).toContainText('2399');         // 2999 less 20%
  });

  test('[PCP-UI-002] the cohort is on the course list with its lowest plan price', async ({ page }) => {
    await page.goto('/courses');
    const card = page.locator('a[href="/courses/qa-uipcp-plans"]').first();
    await expect(card).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('From ₹1999').first()).toBeVisible();
  });
});
