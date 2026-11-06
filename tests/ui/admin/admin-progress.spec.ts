import { test, expect, type Page } from '@playwright/test';
import { EMAIL } from '../../support/personas';
import { requireSeed } from '../../support/guards';
import { signInAs, clerkUserId } from '../../support/clerk';
import { adminDb } from '../../support/db';
import { clearWriteLimits } from '../../support/adminApi';

// Phase 4f screens: Student progress, Code submissions (code opened one at a time) and Engagement against the QA project. Rows are made for the
// edu persona (enrolled in nothing) under qaadmui-pg-* cohorts and removed afterwards; the persona's user_stats row is saved and put back.
const WITH = 'qaadmui-pg-batch';
const BARE = 'qaadmui-pg-bare';
const HOSTILE = `<img src=x onerror="window.__pwned=1"><script>window.__pwned=1</script>print("hi")`;
const FRAGMENT = 'shivamnamdev.edu';
const day = (n: number) => new Date(Date.now() - n * 86400_000).toISOString();
const dialog = (page: Page) => page.getByRole('dialog');
const row = (page: Page, text: string) => page.locator('tbody tr', { hasText: text });

test.describe('ADMUI progress, submissions, engagement @regression', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async () => { test.setTimeout(150_000); requireSeed(); await clearWriteLimits(); });
  let learnerId = ''; let savedStats: Record<string, unknown>[] = [];
  test.beforeAll(async () => {
    const db = adminDb();
    learnerId = await clerkUserId(EMAIL.edu);
    savedStats = (await db.from('user_stats').select('*').eq('user_id', learnerId)).data ?? [];
    const lessons = [{ id: 'qa-pg-v1', kind: 'video' }, { id: 'qa-pg-v2', kind: 'video', assignment: { title: 'Print hello' } }, { id: 'qa-pg-v3', kind: 'video', assignment: { title: 'Say hi safely' } }];
    expect((await db.from('content_docs').insert([{ kind: 'curriculum', key: WITH, doc: { modules: [], published: [{ id: 'm1', title: 'QA basics', advanced: false, lessons }], publishedAt: day(1) }, status: 'published', created_by: 'qa', updated_by: 'qa' }])).error).toBeNull();
    for (const slug of [WITH, BARE]) expect((await db.from('user_enrollments').insert([{ user_id: learnerId, course_slug: slug, user_email: EMAIL.edu, user_name: 'QA Learner PG' }])).error).toBeNull();
    expect((await db.from('video_progress').insert([{ user_id: learnerId, course_slug: WITH, video_id: 'qa-pg-v1', completed_at: day(3) }, { user_id: learnerId, course_slug: WITH, video_id: 'qa-pg-v2', completed_at: day(2) }])).error).toBeNull();
    expect((await db.from('assignment_progress').insert([
      { user_id: learnerId, user_name: 'QA Learner PG', course_slug: WITH, video_id: 'qa-pg-v2', submitted_code: "print('hello from qa')", completed_at: day(1) },
      { user_id: learnerId, user_name: 'QA Learner PG', course_slug: WITH, video_id: 'qa-pg-v3', submitted_code: HOSTILE, completed_at: day(0) },
    ])).error).toBeNull();
    await db.from('user_stats').delete().eq('user_id', learnerId);
    expect((await db.from('user_stats').insert([{ user_id: learnerId, user_name: 'QA Learner PG', total_time_seconds: 99999999, current_streak: 7, last_active_date: day(0).slice(0, 10) }])).error).toBeNull();
  });
  test.afterAll(async () => {
    const db = adminDb();
    for (const t of ['video_progress', 'assignment_progress', 'user_enrollments'] as const) await db.from(t).delete().in('course_slug', [WITH, BARE]);
    await db.from('content_docs').delete().eq('kind', 'curriculum').eq('key', WITH);
    await db.from('user_stats').delete().eq('user_id', learnerId);
    if (savedStats.length) await db.from('user_stats').insert(savedStats);
    await clearWriteLimits();
  });

  test('[ADMUI-PRG-001] progress shows counts and a percent from the published lessons, a dash where the course is unknown, and filters by cohort and search', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/progress');
    await expect(page.getByRole('heading', { name: 'Student progress', level: 1 })).toBeVisible({ timeout: 30000 });
    await page.getByLabel('Cohort').selectOption(WITH);
    await expect(row(page, WITH)).toHaveCount(1, { timeout: 30000 });
    const r = row(page, WITH);
    await expect(r).toContainText('2 / 3');    // videos done of 3
    await expect(r).toContainText('2 / 2');    // assignments done of 2 (two lessons carry one)
    await expect(r).toContainText('80%');      // (2 + 2) of (3 + 2)
    await expect(r.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '80');
    await expect(r).toContainText(/just now|minutes? ago/);   // last activity is the newest submission, made moments ago
    await page.getByLabel('Cohort').selectOption(BARE);
    await expect(row(page, BARE)).toHaveCount(1, { timeout: 30000 });
    await expect(row(page, BARE)).toContainText('0 / —');
    await expect(row(page, BARE).getByRole('progressbar')).not.toHaveAttribute('aria-valuenow', /.+/);
    await expect(row(page, BARE)).toContainText('—');
    await page.getByLabel('Cohort').selectOption('');
    await page.getByLabel(/^Search/).fill('zzz-nobody-zzz');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByText('No enrolments match.')).toBeVisible({ timeout: 30000 });
    await page.getByLabel(/^Search/).fill(FRAGMENT);
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(row(page, WITH)).toHaveCount(1, { timeout: 30000 });
  });

  test('[ADMUI-PRG-002] submissions list holds no code; opening one shows it as text; hostile code stays inert; Escape closes', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/submissions');
    await expect(page.getByRole('heading', { name: 'Code submissions', level: 1 })).toBeVisible({ timeout: 30000 });
    await page.getByLabel('Cohort').selectOption(WITH);
    await expect(row(page, 'Print hello')).toHaveCount(1, { timeout: 30000 });
    await expect(row(page, 'Print hello')).toContainText('22 characters');   // print('hello from qa') is 22 characters
    const body = await page.locator('table').innerText();
    expect(body).not.toContain('hello from qa');
    expect(body).not.toContain('onerror');
    await row(page, 'Print hello').getByRole('button', { name: /View code/ }).click();
    await expect(dialog(page).getByTestId('submitted-code')).toHaveText("print('hello from qa')", { timeout: 15000 });
    await expect(dialog(page)).toContainText('Print hello');
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toHaveCount(0);

    await row(page, 'Say hi safely').getByRole('button', { name: /View code/ }).click();
    const code = dialog(page).getByTestId('submitted-code');
    await expect(code).toContainText('<script>', { timeout: 15000 });   // shown as text
    await expect(dialog(page).locator('img, script')).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
    await dialog(page).getByRole('button', { name: 'Close' }).click();
    await expect(dialog(page)).toHaveCount(0);
  });

  test('[ADMUI-PRG-004] the learners directory finds a person by e-mail and shows the user id, join date and enrolment count; no match says so', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/learners');
    await expect(page.getByRole('heading', { name: 'Learners', level: 1 })).toBeVisible({ timeout: 30000 });
    await page.getByLabel(/^Search/).fill(FRAGMENT);
    await page.getByRole('button', { name: 'Search' }).click();
    const r = page.locator('tbody tr', { hasText: learnerId });
    await expect(r).toHaveCount(1, { timeout: 30000 });
    await expect(r).toContainText(EMAIL.edu);
    await expect(r).toContainText('Enrolled in 2 cohorts');
    await expect(r).toContainText(/\d{4}-\d{2}-\d{2}/);
    await page.getByLabel(/^Search/).fill('zzz-nobody-zzz');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByText('Nobody matches.')).toBeVisible({ timeout: 30000 });
  });

  test('[ADMUI-PRG-003] engagement shows time as hours and minutes, the streak and the last day, most time first, and searches by name', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/engagement');
    await expect(page.getByRole('heading', { name: 'Engagement', level: 1 })).toBeVisible({ timeout: 30000 });
    const first = page.locator('tbody tr').first();
    await expect(first).toContainText('27777h 46m', { timeout: 30000 });   // 99,999,999 seconds
    await expect(first).toContainText('7 days');
    await expect(first).toContainText(day(0).slice(0, 10));
    await page.getByLabel(/^Search/).fill(FRAGMENT);
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.locator('tbody tr')).toHaveCount(1, { timeout: 30000 });
    await page.getByLabel(/^Search/).fill('zzz-nobody-zzz');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByText('No engagement data found.')).toBeVisible({ timeout: 30000 });
  });
});
