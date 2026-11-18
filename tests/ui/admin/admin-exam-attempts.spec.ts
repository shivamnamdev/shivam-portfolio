import { test, expect, type Page } from '@playwright/test';
import { EMAIL } from '../../support/personas';
import { requireSeed } from '../../support/guards';
import { signInAs, clerkUserId } from '../../support/clerk';
import { adminDb } from '../../support/db';
import { clearWriteLimits } from '../../support/adminApi';

// SCP-115 part C · the "Exam attempts" view on the Code submissions screen. Rows are made for the edu persona under a qaadmui-exa-* cohort and
// removed afterwards; the row tests skip until docs/testing/sql/step10-exam-attempts.sql has been run on the QA project.
const SLUG = 'qaadmui-exa-batch';
const HOSTILE = `<img src=x onerror="window.__pwned=1"><script>window.__pwned=1</script>print("hi")`;
const NOTES = [{ q: 1, label: 'Q1 (Lists)', passed: true, note: 'Good.' }, { q: 2, label: 'Q2 (Strings)', passed: false, note: '<b>Fix</b> the masking.' }];
// The fixture cohort is not a real cohort, so it is not in the Cohort list: narrow by the fixture learner's name instead.
const findFixtureRows = async (page: Page) => { await page.getByLabel('Search by name or e-mail').fill('QA Exam Learner'); await page.getByRole('button', { name: 'Search' }).click(); };
const dialog = (page: Page) => page.getByRole('dialog');
const open = async (page: Page) => {
  await signInAs(page, EMAIL.admin);
  await page.goto('/admin/submissions');
  await expect(page.getByRole('heading', { name: 'Code submissions', level: 1 })).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Exam attempts' }).click();
};

test.describe('ADMUI exam attempts @regression', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async () => { test.setTimeout(150_000); requireSeed(); await clearWriteLimits(); });

  test('[ADMUI-EXA-001] the Exam attempts view opens from the Code submissions screen, switches back, and shows its filters', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('button', { name: 'Exam attempts' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('form', { name: 'Filter exam attempts' })).toBeVisible();
    await expect(page.getByLabel('Result')).toBeVisible();
    await page.getByRole('button', { name: 'Assignments' }).click();
    await expect(page.getByRole('form', { name: 'Filter submissions' })).toBeVisible();
  });

  test('[ADMUI-EXA-004] while the table is missing the view says so and names the SQL file (it never looks like "no attempts")', async ({ page }) => {
    const probe = await adminDb().from('exam_attempts').select('id').limit(1);
    test.skip(!probe.error, 'exam_attempts exists on this project');
    await open(page);
    await expect(page.getByText(/step10-exam-attempts\.sql/)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('No exam attempts yet.')).toHaveCount(0);
  });

  test.describe('with saved attempts', () => {
    let uid = '';
    test.beforeAll(async () => {
      const probe = await adminDb().from('exam_attempts').select('id').limit(1);
      test.skip(!!probe.error, 'exam_attempts does not exist on this Supabase project: run docs/testing/sql/step10-exam-attempts.sql');
      uid = await clerkUserId(EMAIL.edu);
      const base = { user_id: uid, user_name: 'QA Exam Learner', user_email: EMAIL.edu, course_slug: SLUG, notes: NOTES, mail_learner: 'sent', mail_owner: 'failed' };
      expect((await adminDb().from('exam_attempts').insert([
        { ...base, attempt_no: 1, score: 40, passed: false, code: HOSTILE },
        { ...base, attempt_no: 2, score: 100, passed: true, code: "print('ok')", notes: [] },
      ])).error).toBeNull();
    });
    test.afterAll(async () => { await adminDb().from('exam_attempts').delete().eq('course_slug', SLUG); await clearWriteLimits(); });

    test('[ADMUI-EXA-002] the list shows score, result and both e-mail statuses but no code; opening one shows the note and the code as text; Escape closes', async ({ page }) => {
      await open(page);
      await findFixtureRows(page);
      const row1 = page.locator('tbody tr', { hasText: '#1' });
      await expect(row1).toHaveCount(1, { timeout: 30000 });
      await expect(row1).toContainText('40% · Not passed');
      await expect(row1).toContainText('Learner: Sent · You: Failed');
      await expect(page.locator('tbody tr', { hasText: '#2' })).toContainText('100% · Passed');
      const body = await page.locator('table').innerText();
      expect(body).not.toContain('onerror');
      await row1.getByRole('button', { name: /View attempt 1/ }).click();
      await expect(dialog(page).getByTestId('attempt-code')).toContainText('<script>', { timeout: 15000 });   // shown as text
      await expect(dialog(page).getByTestId('attempt-note-2')).toContainText('<b>Fix</b> the masking.');
      await expect(dialog(page).getByTestId('attempt-note-1')).toContainText('Good.');
      expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
      await page.keyboard.press('Escape');
      await expect(dialog(page)).toHaveCount(0);
    });

    test('[ADMUI-EXA-003] the Result filter narrows the list to passed or not passed attempts', async ({ page }) => {
      await open(page);
      await findFixtureRows(page);
      await expect(page.locator('tbody tr')).toHaveCount(2, { timeout: 30000 });
      await page.getByLabel('Result').selectOption('passed');
      await expect(page.locator('tbody tr')).toHaveCount(1, { timeout: 30000 });
      await expect(page.locator('tbody tr')).toContainText('#2');
    });
  });
});
