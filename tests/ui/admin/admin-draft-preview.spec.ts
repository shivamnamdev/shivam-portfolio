import { test, expect } from '@playwright/test';
import { EMAIL } from '../../support/personas';
import { requireSeed } from '../../support/guards';
import { signInAs } from '../../support/clerk';
import { sessionFor, type Session } from '../../support/api';
import { BASE, clearWriteLimits, cleanupAdminApi, cohort, course } from '../../support/adminApi';
import { mockExternals } from '../../support/learning';

// "Preview as learner" in the curriculum editor opens the real course page with the unpublished draft, read only (docs/architecture/learner-draft-preview.md).
const COURSE = 'qa-admui-prv-course';
const COHORT = 'qa-admui-prv-batch';
const LESSON = 'qaprevui001';

test.describe('ADMUI learner draft preview @regression', () => {
  test.describe.configure({ mode: 'serial' });
  let admin: Session;
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000); requireSeed(); await clearWriteLimits();
    admin = await sessionFor(browser, EMAIL.admin);
    await admin.request.post(`${BASE}/courses`, { data: course(COURSE) });
    await admin.request.post(`${BASE}/cohorts`, { data: cohort(COHORT, COURSE) });
    expect((await admin.request.put(`${BASE}/curriculum/${COHORT}`, { data: { modules: [{ title: 'Draft module', lessons: [{ id: LESSON }] }] } })).status()).toBe(201);
  });
  test.afterAll(async () => { await cleanupAdminApi(); await clearWriteLimits(); await admin?.close(); });
  test.beforeEach(async () => { test.setTimeout(150_000); });

  test('[ADMUI-PRV-001] "Preview as learner" opens the real course page in a new tab with the draft and a banner; "Outline" keeps the plain list', async ({ page, context }) => {
    await signInAs(page, EMAIL.admin);
    await mockExternals(page);
    await page.goto(`/admin/curriculum/${COHORT}`);
    const link = page.getByRole('link', { name: /Preview as learner/ });
    await expect(link).toHaveAttribute('href', `/learning/${COHORT}?preview=draft`, { timeout: 30000 });
    await expect(link).toHaveAttribute('target', '_blank');
    const [tab] = await Promise.all([context.waitForEvent('page'), link.click()]);
    await mockExternals(tab);
    await expect(tab).toHaveURL(new RegExp(`/learning/${COHORT}\\?preview=draft`));
    await expect(tab.getByRole('status')).toContainText('Preview of the unpublished draft', { timeout: 40000 });
    await expect(tab.getByText('Course Content')).toBeVisible({ timeout: 40000 });
    await expect(tab.locator('aside').getByRole('button', { name: `QA Lesson ${LESSON}` })).toBeVisible();   // the draft lesson, never published
    await expect(tab.getByRole('link', { name: 'Back to the editor' })).toHaveAttribute('href', `/admin/curriculum/${COHORT}`);
    await tab.close();
    await page.getByRole('button', { name: 'Outline' }).click();
    await expect(page.getByLabel('Learner outline preview')).toBeVisible();
  });

  test('[ADMUI-PRV-002] the preview writes nothing: marking a lesson complete only says "Preview only" and no request reaches the progress routes; without the flag there is no banner', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await mockExternals(page);
    const writes: string[] = [];
    page.on('request', (r) => { if (r.method() === 'POST' && /\/api\/(learning|xp)\//.test(r.url())) writes.push(new URL(r.url()).pathname); });
    await page.goto(`/learning/${COHORT}?preview=draft`);
    await expect(page.getByText('Course Content')).toBeVisible({ timeout: 40000 });
    await page.locator('aside').getByRole('button', { name: `QA Lesson ${LESSON}` }).click();
    await page.getByRole('button', { name: /Mark as Complete|Mark Complete|Complete/ }).first().click();
    await expect(page.getByText('Preview only. Nothing is saved.')).toBeVisible();
    expect(writes).toEqual([]);                                       // no complete-video, no xp sync
    await page.goto(`/learning/${COHORT}`);                           // the same page without the flag: the normal course (nothing published), no banner
    await expect(page.getByRole('status').filter({ hasText: 'Preview of the unpublished draft' })).toHaveCount(0);
  });
});
