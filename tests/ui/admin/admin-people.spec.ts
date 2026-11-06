import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { EMAIL } from '../../support/personas';
import { requireSeed } from '../../support/guards';
import { signInAs, clerkUserId } from '../../support/clerk';
import { adminDb } from '../../support/db';
import { BASE, clearWriteLimits, cohort, course, plansPricing } from '../../support/adminApi';

// Phase 4e: Enrolments (grant, two-step remove, CSV download) and Reports against the QA project. Test data: course and cohort qaadmui-people-*,
// enrolments of the QA learner persona in that cohort only; everything is removed afterwards.
const COURSE = 'qaadmui-people-course';
const COHORT = 'qaadmui-people-batch';
const alertBox = (page: Page) => page.locator('[role=alert]:not(#__next-route-announcer__)');
const dialog = (page: Page) => page.getByRole('dialog');
const row = (page: Page, text: string) => page.locator('tbody tr', { hasText: text });
const enrolRows = async () => (await adminDb().from('user_enrollments').select('*').eq('course_slug', COHORT)).data ?? [];

test.describe('ADMUI enrolments and reports @regression', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async () => { test.setTimeout(150_000); requireSeed(); await clearWriteLimits(); });
  let startedAt = ''; let learnerId = '';
  test.beforeAll(async ({ browser }) => {
    startedAt = new Date().toISOString();
    learnerId = await clerkUserId(EMAIL.mavish);
    const page = await browser.newPage();
    await signInAs(page, EMAIL.admin);
    expect((await page.request.post(`${BASE}/courses`, { data: course(COURSE) })).status()).toBe(201);
    expect((await page.request.post(`${BASE}/cohorts`, { data: cohort(COHORT, COURSE, { pricing: plansPricing() }) })).status()).toBe(201);
    await page.close();
  });
  test.afterAll(async () => {
    const db = adminDb();
    await db.from('user_enrollments').delete().eq('course_slug', COHORT);
    await db.from('content_docs').delete().like('key', 'qaadmui-people%');
    await db.from('admin_audit').delete().or('resource_id.like.qaadmui-people%,resource_id.like.%:qaadmui-people%').gte('at', startedAt);
    await db.from('admin_audit').delete().eq('resource', 'export').gte('at', startedAt);
    await clearWriteLimits();
  });

  test('[ADMUI-PPL-001] granting: bad input is explained first, plans appear for a plans cohort, the grant is stored, a repeat is refused inline', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/enrolments');
    await page.getByRole('button', { name: 'Grant access' }).first().click();
    const form = page.getByRole('form', { name: 'Grant access' });
    await form.getByLabel(/^Learner's e-mail/).fill('not-an-email');
    await expect(form.getByText('Choose the cohort')).toBeVisible();
    await expect(form.getByText('That does not look like an e-mail address')).toBeVisible();
    await expect(form.getByRole('button', { name: 'Grant access' })).toBeDisabled();
    await form.getByLabel(/^Cohort/).selectOption(COHORT);
    await expect(form.getByLabel(/^Plan/)).toBeVisible();
    await form.getByLabel(/^Learner's e-mail/).fill(EMAIL.mavish);
    await form.getByLabel(/^Plan/).selectOption('personal');
    await expect(form.getByRole('button', { name: 'Grant access' })).toBeEnabled();
    await form.getByRole('button', { name: 'Grant access' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'now has access' })).toContainText(COHORT, { timeout: 20000 });
    expect(await enrolRows()).toEqual([expect.objectContaining({ user_id: learnerId, plan_id: 'personal' })]);
    await page.getByLabel(/^Cohort/).last().selectOption(COHORT);
    await page.getByRole('button', { name: 'Search' }).last().click();
    await expect(row(page, COHORT)).toContainText('personal');

    await form.getByLabel(/^Cohort/).selectOption(COHORT);
    await form.getByLabel(/^Learner's e-mail/).fill(EMAIL.mavish);
    await form.getByRole('button', { name: 'Grant access' }).click();
    await expect(alertBox(page)).toContainText('already enrolled', { timeout: 20000 });
    expect(await enrolRows()).toHaveLength(1);
  });

  test('[ADMUI-PPL-002] removing an admin-granted enrolment asks once and goes through; the learner is out of the table', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/enrolments');
    await page.getByLabel('Cohort').last().selectOption(COHORT);
    await page.getByRole('button', { name: 'Search' }).click();
    await row(page, COHORT).getByRole('button', { name: /^Remove/ }).click();
    await expect(dialog(page)).toContainText('progress and submissions are kept');
    await dialog(page).getByRole('button', { name: 'Cancel' }).click();
    expect(await enrolRows()).toHaveLength(1);
    await row(page, COHORT).getByRole('button', { name: /^Remove/ }).click();
    await dialog(page).getByRole('button', { name: 'Remove access' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'was removed from' })).toBeVisible({ timeout: 20000 });
    expect(await enrolRows()).toHaveLength(0);
  });

  test('[ADMUI-PPL-003] an enrolment not granted here needs the second, stronger step: a tick, then "remove anyway"; cancelling keeps it', async ({ page }) => {
    const ins = await adminDb().from('user_enrollments').insert([{ user_id: learnerId, course_slug: COHORT, user_email: EMAIL.mavish, user_name: 'QA learner', coupon_used: 'QAADMUI' }]);
    expect(ins.error).toBeNull();
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/enrolments');
    await page.getByLabel('Cohort').last().selectOption(COHORT);
    await page.getByRole('button', { name: 'Search' }).click();
    await row(page, COHORT).getByRole('button', { name: /^Remove/ }).click();
    await dialog(page).getByRole('button', { name: 'Remove access' }).click();
    const d = dialog(page);
    await expect(d).toContainText('may have paid', { timeout: 20000 });
    await expect(d.getByRole('button', { name: 'Remove anyway' })).toBeDisabled();
    await d.getByRole('button', { name: 'Cancel' }).click();
    expect(await enrolRows()).toHaveLength(1);
    await row(page, COHORT).getByRole('button', { name: /^Remove/ }).click();
    await dialog(page).getByRole('button', { name: 'Remove access' }).click();
    await dialog(page).getByLabel('I understand this learner may have paid').check();
    await dialog(page).getByRole('button', { name: 'Remove anyway' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'was removed from' })).toBeVisible({ timeout: 20000 });
    expect(await enrolRows()).toHaveLength(0);
    const audit = (await adminDb().from('admin_audit').select('action, after').eq('resource', 'enrolment').eq('action', 'revoke').gte('at', startedAt)).data ?? [];
    expect(audit.some((a) => (a.after as { forced?: boolean })?.forced === true)).toBe(true);
  });

  test('[ADMUI-PPL-004] a CSV download arrives with a dated file name, quoted cells and its own audit entry', async ({ page }) => {
    await adminDb().from('user_enrollments').insert([{ user_id: learnerId, course_slug: COHORT, user_email: EMAIL.mavish, user_name: '=HYPERLINK("http://evil","x")', coupon_used: null }]);
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/enrolments');
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.getByRole('button', { name: 'Download enrolments CSV' }).click()]);
    expect(download.suggestedFilename()).toMatch(/^enrolments-\d{4}-\d{2}-\d{2}\.csv$/);
    const text = readFileSync((await download.path()) as string, 'utf8');
    expect(text.split('\r\n')[0]).toBe('"userId","email","name","cohortSlug","planId","couponUsed","enrolledAt"');
    expect(text).toContain(`"'=HYPERLINK(""http://evil"",""x"")"`);   // the formula starter is neutralised
    await expect(page.getByRole('status').filter({ hasText: 'Downloaded enrolments-' })).toBeVisible();
    const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.getByRole('button', { name: 'Download learners CSV' }).click()]);
    expect(readFileSync((await dl2.path()) as string, 'utf8').split('\r\n')[0]).toBe('"userId","email","name","enrolments","firstEnrolledAt"');
    const audits = (await adminDb().from('admin_audit').select('resource_id').eq('resource', 'export').eq('action', 'export').gte('at', startedAt)).data ?? [];
    expect(audits.map((a) => a.resource_id).sort()).toEqual(['enrolments.csv', 'learners.csv']);
    await adminDb().from('user_enrollments').delete().eq('course_slug', COHORT);
  });

  test('[ADMUI-PPL-005] reports show counts only: the cohort count, a sign-up chart that follows the window, coupon usage; no e-mail address in the reports', async ({ page }) => {
    await adminDb().from('user_enrollments').insert([{ user_id: learnerId, course_slug: COHORT, user_email: EMAIL.mavish, user_name: 'QA learner', coupon_used: null }]);
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/reports');
    await expect(row(page, COHORT)).toContainText('1', { timeout: 30000 });
    await expect(page.getByTestId('signup-bars')).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId('signup-bars').locator('div')).toHaveCount(30);
    await page.getByLabel('Window').selectOption('7');
    await expect(page.getByTestId('signup-bars').locator('div')).toHaveCount(7, { timeout: 30000 });
    await expect(page.getByRole('heading', { name: 'Coupon usage' })).toBeVisible();
    const text = (await page.locator('section').allInnerTexts()).join('\n');   // the three report cards (the sidebar shows who is signed in)
    expect(text).toContain('Enrolments per cohort');
    expect(text).not.toContain(EMAIL.mavish);
    expect(text).not.toContain(EMAIL.admin);
  });
});
