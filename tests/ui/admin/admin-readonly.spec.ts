import { test, expect } from '@playwright/test';
import { activeCourses, QA_FIXTURE_SLUG } from '../../../data/courses';
import { courseCurriculumMap } from '../../../data/learning-content';
import { EMAIL, COURSE } from '../../support/personas';
import { requireFixture, requireSeed, requireSignIn } from '../../support/guards';
import { adminDb } from '../../support/db';
import { clerkUserId, signInAs } from '../../support/clerk';
import { expectDeniedForVisitor, expectOnPath, expectServerDeniesVisitor } from '../../support/assertions';
import { cannotScrollSideways } from '../../support/dashboard';
import {
  TAB, courseSelect, crmUser, enrolRow, formMessage, goTab, grantButton, headers, idInput, json, kpi, kpiLabel, localDate, localDateTime, mockTable, mockUsers,
  openAdmin, rows, tab, tableSpinner, type TabKey,
} from '../../support/admin';

// PRD 08 cases that only READ. Table contents, order, empty states and failures are produced by answering the page's own
// requests locally (Supabase REST + /api/get-all-users), so no row is written and nothing depends on the shared database.
// Cases that write (manual enrolment, ordering from real rows) are in admin-enroll-writes.spec.ts.
const ADMIN = EMAIL.admin;
const A_FIRST_VIDEO = 'a9nrrH5XkG0';
const A_FIRST_TITLE = 'Day 01: Introduction and print function';
const totals = (slug: string) => {
  const mods = courseCurriculumMap[slug] as any[];
  const videos = mods.flatMap(m => m.videoIds).length;
  const assignments = mods.flatMap(m => m.videoIds.filter((v: string) => m.githubAssignments?.[v])).length;
  return { videos, assignments, tasks: videos + assignments };
};

test.describe('PRD08 admin portal: access and page load @regression', () => {
  test.beforeEach(() => requireSignIn());

  test('[ADM-GATE-001][ADM-KPI-001][ADM-ENR-001] the admin opens the portal: header, identity line, three KPI cards and the form', async ({ page }) => {
    await openAdmin(page);
    await expect(page.getByText(`Authenticated as: ${ADMIN}`)).toBeVisible();
    for (const label of ['Total Leads (CRM)', 'Enrollments', 'Coupons Used'] as const) await expect(kpi(page, label)).toHaveText(/^\d+$/);
    await expect(page.getByRole('heading', { name: 'Manual Enrollment / Backdoor' })).toBeVisible();
    await expect(idInput(page)).toBeVisible();
    await expect(courseSelect(page)).toBeVisible();
    await expect(grantButton(page)).toBeVisible();
  });

  test('[ADM-GATE-005] loading the portal raises no uncaught errors', async ({ page, browserName }) => {
    // WebKit cannot load Clerk's development script chunk from clerk.accounts.dev ("access control checks"), which is an uncaught
    // error on every page in that browser and unrelated to the admin page: the check is made in Chromium and Firefox.
    test.skip(browserName === 'webkit', 'Clerk dev-instance script is blocked in WebKit');
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await openAdmin(page);
    await goTab(page, 'assignments');
    await goTab(page, 'engagement');
    expect(errors, 'uncaught page errors').toEqual([]);
  });

  test('[ADM-GATE-002][ADM-E2E-005] a learner is sent to the dashboard without seeing admin text, and the admin APIs refuse them', async ({ page }) => {
    requireSeed();
    await signInAs(page, EMAIL.mavish);
    await page.goto('/admin');
    await expectOnPath(page, '/learning');
    await expect(page.getByText('Admin Command Center')).toHaveCount(0);
    expect((await page.request.get('/api/get-all-users')).status()).toBe(403);
    expect((await page.request.get('/api/admin/dashboard-data')).status()).toBe(403);
    expect((await page.request.post('/api/admin/enroll', { data: { userId: 'user_x', courseSlug: COURSE.A } })).status()).toBe(403);
  });

  test('[ADM-GATE-003] a visitor is turned away from /admin', async ({ page }) => {
    await expectDeniedForVisitor(page, '/admin');
    await expect(page.getByText('Admin Command Center')).toHaveCount(0);
  });

  test('[ADM-GATE-004] a spinner is shown while the data loads, then the tables', async ({ page }) => {
    await signInAs(page, ADMIN);
    await page.route('**/api/get-all-users', async route => { await new Promise(r => setTimeout(r, 2000)); await route.continue(); });
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin Command Center' })).toBeVisible({ timeout: 30000 });
    await expect(tableSpinner(page)).toBeVisible();
    await expect(tableSpinner(page)).toHaveCount(0, { timeout: 30000 });
    await expect(headers(page).first()).toBeVisible();
  });

  test('[ADM-GATE-006][ADM-GATE-007] get-all-users refuses a learner (403) and a visitor (401)', async ({ page, request }) => {
    requireSeed();
    await expectServerDeniesVisitor(request, '/api/get-all-users');
    const visitor = await request.get('/api/get-all-users', { maxRedirects: 0, headers: { 'User-Agent': 'shivam-academy-api-tests' } });
    expect(visitor.status()).toBe(401);
    await signInAs(page, EMAIL.bazar);
    const res = await page.request.get('/api/get-all-users');
    expect(res.status()).toBe(403);
    expect(JSON.stringify(await res.json().catch(() => ({})))).not.toContain('@');
  });

  test('[ADM-GATE-008][ADM-GATE-009][ADM-GATE-010] admin/enroll refuses a visitor (401) and a learner (403), including a self-grant, and creates no row', async ({ page, request }) => {
    requireSeed();
    requireFixture();
    const visitor = await request.post('/api/admin/enroll', { data: { userId: 'user_x', courseSlug: QA_FIXTURE_SLUG }, headers: { 'User-Agent': 'shivam-academy-api-tests' }, maxRedirects: 0 });
    expect(visitor.status()).toBe(401);
    await signInAs(page, EMAIL.bazar);
    const self = await clerkUserId(EMAIL.bazar);
    const res = await page.request.post('/api/admin/enroll', { data: { userId: self, courseSlug: QA_FIXTURE_SLUG } });
    expect(res.status()).toBe(403);
    const { data } = await adminDb().from('user_enrollments').select('id').eq('user_id', self).eq('course_slug', QA_FIXTURE_SLUG);
    expect(data).toHaveLength(0);
  });

  test.fixme('[ADM-GATE-011] a mixed-case admin email opens the portal (needs an admin account with a mixed-case email; page check is case-sensitive, R-AD-6, SCP-59)', async () => {});

  test('[ADM-GATE-012] there is no Admin link anywhere in the navigation, even for the admin', async ({ page }) => {
    await openAdmin(page);
    await page.goto('/');
    await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /admin/i })).toHaveCount(0);
  });
});

test.describe('PRD08 admin portal: KPIs and tables @regression', () => {
  test.beforeEach(() => requireSignIn());

  test('[ADM-KPI-002][ADM-TBL-003] Total Leads equals the Directory rows, and a real user row shows name, email, Clerk id and joined date', async ({ page }) => {
    requireSeed();
    await openAdmin(page);
    const n = Number(await kpi(page, 'Total Leads (CRM)').innerText());
    expect(n).toBeGreaterThan(0);
    await expect(rows(page)).toHaveCount(n);
    const edu = await clerkUserId(EMAIL.edu);
    const row = rows(page).filter({ hasText: EMAIL.edu });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(edu);
    await expect(row).toContainText(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });

  test('[ADM-KPI-003][ADM-KPI-004][ADM-TBL-008] Enrollments and Coupons Used count the rows and the rows with a coupon; the coupon is shown', async ({ page }) => {
    await mockUsers(page, [crmUser(1), crmUser(2), crmUser(3)]);
    await mockTable(page, 'user_enrollments', [enrolRow(1, { coupon_used: 'QA100' }), enrolRow(2), enrolRow(3, { coupon_used: 'BIRTHDAY20' }), enrolRow(4)]);
    await openAdmin(page);
    await expect(kpi(page, 'Enrollments')).toHaveText('4');
    await expect(kpi(page, 'Coupons Used')).toHaveText('2');
    await goTab(page, 'enrollments');
    await expect(rows(page)).toHaveCount(4);
    await expect(rows(page).nth(0)).toContainText('QA100');
    await expect(rows(page).nth(1).locator('td').nth(2)).toHaveText('-');
    await expect(rows(page).filter({ hasText: /QA100|BIRTHDAY20/ })).toHaveCount(2);
  });

  test('[ADM-TBL-001][ADM-TBL-002][ADM-TBL-005][ADM-PRG-001][ADM-ASG-001][ADM-ENG-001] each tab shows its own headers and hides the others', async ({ page }) => {
    await openAdmin(page);
    const expected: Record<TabKey, string[]> = {
      directory: ['User', 'Clerk ID', 'Joined Date', 'Status'],
      enrollments: ['Student Identity', 'Course', 'Coupon', 'Date Enrolled'],
      progress: ['Student Identity', 'Course', 'Videos', 'Assignments', 'Completion'],
      assignments: ['Student Identity', 'Assignment Task', 'Date Submitted', 'Action'],
      engagement: ['Student Identity', 'Total Time Spent', 'Current Streak', 'Last Login'],
    };
    for (const key of Object.keys(expected) as TabKey[]) {
      await goTab(page, key);
      await expect(headers(page)).toHaveText(expected[key], { ignoreCase: true });
    }
  });

  test('[ADM-TBL-004] a user without a profile picture shows the first letter in a circle', async ({ page }) => {
    await mockUsers(page, [crmUser(1, { image: '', name: 'Zed Person' })]);
    await openAdmin(page);
    await expect(rows(page).first().locator('div.rounded-full').getByText('Z', { exact: true })).toBeVisible();
    await expect(rows(page).first().locator('img')).toHaveCount(0);
  });

  test('[ADM-TBL-009][ADM-TBL-010] names and emails come from the CRM, with fallbacks to the stored data and the user id', async ({ page }) => {
    await mockUsers(page, [crmUser(1, { name: 'CRM Name One', email: 'crm.one@example.test' })]);
    await mockTable(page, 'user_enrollments', [
      enrolRow(1),                                                                      // in the CRM
      enrolRow(2),                                                                      // not in the CRM: stored name and email
      enrolRow(3, { user_name: null, user_email: null }),                               // nothing stored: id and a placeholder name
    ]);
    await openAdmin(page);
    await goTab(page, 'enrollments');
    await expect(rows(page).nth(0)).toContainText('CRM Name One');
    await expect(rows(page).nth(0)).toContainText('crm.one@example.test');
    await expect(rows(page).nth(0)).not.toContainText('Stored Name 1');
    await expect(rows(page).nth(1)).toContainText('Stored Name 2');
    await expect(rows(page).nth(1)).toContainText('stored2@example.test');
    await expect(rows(page).nth(2)).toContainText('Unknown Student');
    await expect(rows(page).nth(2)).toContainText('user_qa_adm_3');
  });

  test('[ADM-TBL-011][ADM-ASG-008][ADM-ENG-004][ADM-RSL-004] with every table empty the three empty messages show, the directory is empty and the KPIs are 0', async ({ page }) => {
    await mockUsers(page, []);
    for (const t of ['user_enrollments', 'assignment_progress', 'video_progress', 'user_stats'] as const) await mockTable(page, t, []);
    await openAdmin(page);
    for (const label of ['Total Leads (CRM)', 'Enrollments', 'Coupons Used'] as const) await expect(kpi(page, label)).toHaveText('0');
    await expect(rows(page)).toHaveCount(0);
    await goTab(page, 'enrollments');
    await expect(page.getByText('No enrollments found.')).toBeVisible();
    await goTab(page, 'assignments');
    await expect(page.getByText('No assignments submitted yet.')).toBeVisible();
    await goTab(page, 'engagement');
    await expect(page.getByText('No engagement data found.')).toBeVisible();
  });

  test('[ADM-TBL-007][ADM-ENR-008] enrollment rows appear in the order the database returns them (newest first) with their course and date', async ({ page }) => {
    await mockUsers(page, [crmUser(1), crmUser(2)]);
    await mockTable(page, 'user_enrollments', [enrolRow(2), enrolRow(1)]);
    await openAdmin(page);
    await goTab(page, 'enrollments');
    await expect(rows(page).nth(0)).toContainText('QA Person 2');
    await expect(rows(page).nth(1)).toContainText('QA Person 1');
    await expect(rows(page).nth(0)).toContainText('python-beginners-batch-2');
    await expect(rows(page).nth(0)).toContainText(await localDate(page, enrolRow(2).enrolled_at));
  });

  test('[ADM-PRG-002][ADM-PRG-003] progress counts match the progress rows, a learner with none shows 0 / 0%', async ({ page }) => {
    const t = totals(COURSE.A);
    await mockUsers(page, [crmUser(1), crmUser(2)]);
    await mockTable(page, 'user_enrollments', [enrolRow(1), enrolRow(2)]);
    await mockTable(page, 'video_progress', [1, 2, 3].map(i => ({ user_id: 'user_qa_adm_1', course_slug: COURSE.A, video_id: `v${i}` })));
    await mockTable(page, 'assignment_progress', [{ user_id: 'user_qa_adm_1', course_slug: COURSE.A, video_id: A_FIRST_VIDEO, submitted_code: 'x', completed_at: '2026-03-01T10:00:00Z' }]);
    await openAdmin(page);
    await goTab(page, 'progress');
    const pct = Math.round((4 / t.tasks) * 100);
    const one = rows(page).filter({ hasText: 'QA Person 1' });
    await expect(one).toContainText(`3 / ${t.videos}`);
    await expect(one).toContainText(`1 / ${t.assignments}`);
    await expect(one).toContainText(`${pct}%`);
    const two = rows(page).filter({ hasText: 'QA Person 2' });
    await expect(two).toContainText(`0 / ${t.videos}`);
    await expect(two).toContainText(`0 / ${t.assignments}`);
    await expect(two).toContainText('0%');
  });

  const subs = [
    { user_id: 'user_qa_adm_1', course_slug: COURSE.A, video_id: A_FIRST_VIDEO, submitted_code: "print('QA-ADM first')", completed_at: '2026-03-02T09:30:00.000Z' },
    { user_id: 'user_qa_adm_2', course_slug: COURSE.A, video_id: 'unknown-video-id', submitted_code: '', completed_at: '2026-03-01T09:30:00.000Z' },
  ];

  test('[ADM-ASG-002][ADM-ASG-003] a submission row shows the student, the lesson title (not an id) and the date and time, newest first', async ({ page }) => {
    await mockUsers(page, [crmUser(1), crmUser(2)]);
    await mockTable(page, 'assignment_progress', subs);
    await openAdmin(page);
    await goTab(page, 'assignments');
    await expect(rows(page)).toHaveCount(2);
    await expect(rows(page).nth(0)).toContainText('QA Person 1');
    await expect(rows(page).nth(0)).toContainText(A_FIRST_TITLE);
    await expect(rows(page).nth(0)).not.toContainText(A_FIRST_VIDEO);
    await expect(rows(page).nth(0)).toContainText(await localDateTime(page, subs[0].completed_at));
    await expect(rows(page).nth(0).getByRole('button', { name: 'View Code' })).toBeVisible();
    await expect(rows(page).nth(1)).toContainText('QA Person 2');
  });

  test('[ADM-ASG-004][ADM-ASG-005][ADM-ASG-006][ADM-E2E-002] View Code opens the Code Review modal with that submission, read-only, and the X closes it', async ({ page }) => {
    await mockUsers(page, [crmUser(1), crmUser(2)]);
    await mockTable(page, 'assignment_progress', subs);
    await openAdmin(page);
    await goTab(page, 'assignments');
    await rows(page).nth(0).getByRole('button', { name: 'View Code' }).click();
    await expect(page.getByRole('heading', { name: 'Code Review' })).toBeVisible();
    await expect(page.getByText(`QA Person 1 • ${A_FIRST_TITLE}`)).toBeVisible();
    await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 60000 });
    await expect.poll(() => page.evaluate(() => (window as any).monaco?.editor.getEditors().at(-1)?.getValue())).toBe("print('QA-ADM first')");
    await page.locator('.monaco-editor').first().click();
    await page.keyboard.type('HACK');
    await expect.poll(() => page.evaluate(() => (window as any).monaco.editor.getEditors().at(-1).getValue())).toBe("print('QA-ADM first')");
    await page.getByRole('heading', { name: 'Code Review' }).locator('xpath=ancestor::div[2]').locator('button').click();
    await expect(page.getByRole('heading', { name: 'Code Review' })).toHaveCount(0);
    await expect(rows(page)).toHaveCount(2);
  });

  test('[ADM-ASG-007] an empty submission shows "# No code provided."', async ({ page }) => {
    await mockUsers(page, [crmUser(1), crmUser(2)]);
    await mockTable(page, 'assignment_progress', subs);
    await openAdmin(page);
    await goTab(page, 'assignments');
    await rows(page).nth(1).getByRole('button', { name: 'View Code' }).click();
    await expect(page.getByText('Unknown Video').first()).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as any).monaco?.editor.getEditors().at(-1)?.getValue()), { timeout: 60000 }).toBe('# No code provided.');
  });

  test('[ADM-ENG-002][ADM-ENG-003] engagement rows show the time formatted in hours and minutes, the streak with a flame and the last login', async ({ page }) => {
    await mockUsers(page, [crmUser(1), crmUser(2)]);
    await mockTable(page, 'user_stats', [
      { user_id: 'user_qa_adm_1', user_name: 'S1', user_email: 'a@example.test', total_time_seconds: 3 * 3600 + 25 * 60, current_streak: 4, last_active_date: '2026-03-05' },
      { user_id: 'user_qa_adm_2', user_name: 'S2', user_email: 'b@example.test', total_time_seconds: 600, current_streak: 1, last_active_date: '2026-03-04' },
    ]);
    await openAdmin(page);
    await goTab(page, 'engagement');
    await expect(rows(page).nth(0)).toContainText('3h 25m');
    await expect(rows(page).nth(0)).toContainText('2026-03-05');
    await expect(rows(page).nth(0).locator('td').nth(2)).toContainText('4');
    await expect(rows(page).nth(0).locator('td').nth(2).locator('svg')).toBeVisible();
    await expect(rows(page).nth(1)).toContainText('10m');
  });
});

test.describe('PRD08 admin portal: manual enrolment form without writes @regression', () => {
  test.beforeEach(() => requireSignIn());

  test('[ADM-ENR-002] the course list equals the catalog', async ({ page }) => {
    await openAdmin(page);
    await expect(courseSelect(page).locator('option')).toHaveText(activeCourses.map(c => c.title));
  });

  test('[ADM-ENR-003][ADM-ENR-004] an empty or whitespace-only ID is refused in red and sends no request', async ({ page }) => {
    let calls = 0;
    await page.route('**/api/admin/enroll', r => { calls++; return r.continue(); });
    await openAdmin(page);
    await grantButton(page).click();
    await expect(formMessage(page, 'Please enter a valid Clerk User ID.')).toBeVisible();
    await idInput(page).fill('    ');
    await grantButton(page).click();
    await expect(formMessage(page, 'Please enter a valid Clerk User ID.')).toBeVisible();
    await expect(page.locator('div.p-3.bg-red-50')).toBeVisible();
    expect(calls).toBe(0);
  });

  test('[ADM-ENR-005][ADM-KPI-007] an unknown Clerk id shows "No Clerk user found with that ID.", creates nothing and leaves the KPI unchanged', async ({ page }) => {
    await openAdmin(page);
    const before = await kpi(page, 'Enrollments').innerText();
    await idInput(page).fill('user_does_not_exist_000');
    await grantButton(page).click();
    await expect(formMessage(page, 'No Clerk user found with that ID.')).toBeVisible();
    await expect(kpi(page, 'Enrollments')).toHaveText(before);
  });

  test('[ADM-ENR-006] a forced request with an unknown course is refused with "Course not found." and the UI shows it', async ({ page }) => {
    await page.route('**/api/admin/enroll', r => r.continue({ postData: JSON.stringify({ userId: 'user_x', courseSlug: 'nope' }) }));
    await openAdmin(page);
    await idInput(page).fill('user_x');
    await grantButton(page).click();
    await expect(formMessage(page, 'Course not found.')).toBeVisible();
  });

  test('[ADM-ENR-013] while the request is in flight the button shows a spinner and is disabled', async ({ page }) => {
    await page.route('**/api/admin/enroll', async r => { await new Promise(res => setTimeout(res, 1500)); await json(r, 404, { success: false, error: 'No Clerk user found with that ID.' }); });
    await openAdmin(page);
    await idInput(page).fill('user_x');
    await grantButton(page).click().catch(() => {});
    const button = page.locator('form button[type="submit"]');
    await expect(button).toBeDisabled();
    await expect(button.locator('svg.animate-spin')).toBeVisible();
    await expect(formMessage(page, 'No Clerk user found with that ID.')).toBeVisible();
    await expect(button).toBeEnabled();
  });

  test('[ADM-ENR-014] a server failure shows "Database Error." and the form stays usable', async ({ page }) => {
    await page.route('**/api/admin/enroll', r => json(r, 500, {}));
    await openAdmin(page);
    await idInput(page).fill('user_x');
    await grantButton(page).click();
    await expect(formMessage(page, 'Database Error.')).toBeVisible();
    await expect(grantButton(page)).toBeEnabled();
    await expect(idInput(page)).toHaveValue('user_x');
  });

  test('[ADM-RSL-005] when the session has ended, Grant Access shows an error and never a success', async ({ page, context }) => {
    await openAdmin(page);
    await context.clearCookies();
    await idInput(page).fill('user_x');
    await grantButton(page).click();
    await expect(page.locator('div.p-3.bg-red-50')).toBeVisible({ timeout: 20000 });
    await expect(formMessage(page, 'Access Granted Successfully!')).toHaveCount(0);
  });

  test('[ADM-RSL-006] offline: "Database Error." and the form works again after reconnecting', async ({ page, context }) => {
    await openAdmin(page);
    await idInput(page).fill('user_x');
    await context.setOffline(true);
    await grantButton(page).click();
    await expect(formMessage(page, 'Database Error.')).toBeVisible();
    await context.setOffline(false);
    await expect(grantButton(page)).toBeEnabled();
    await grantButton(page).click();
    await expect(formMessage(page, 'No Clerk user found with that ID.')).toBeVisible();
  });
});

test.describe('PRD08 admin portal: resilience @regression', () => {
  test.beforeEach(() => requireSignIn());

  test('[ADM-RSL-001] the enrollments request fails: the page opens, the Enrollments tab is empty, the other tabs work', async ({ page }) => {
    await mockTable(page, 'user_enrollments', 500);
    await openAdmin(page);
    await goTab(page, 'enrollments');
    await expect(rows(page)).toHaveCount(1);
    await expect(page.getByText('No enrollments found.')).toBeVisible();
    await goTab(page, 'directory');
    await expect(rows(page).first()).toBeVisible();
    await goTab(page, 'engagement');
    await expect(headers(page).first()).toBeVisible();
  });

  test('[ADM-RSL-002] the CRM request fails: Total Leads is 0, the Directory is empty, the other tabs work', async ({ page }) => {
    await mockUsers(page, 500);
    await openAdmin(page);
    await expect(kpi(page, 'Total Leads (CRM)')).toHaveText('0');
    await expect(rows(page)).toHaveCount(0);
    await goTab(page, 'enrollments');
    await expect(rows(page).first()).toBeVisible();
  });

  test('[ADM-RSL-003] the assignments request fails: the empty state shows and nothing crashes', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await mockTable(page, 'assignment_progress', 500);
    await openAdmin(page);
    await goTab(page, 'assignments');
    await expect(page.getByText('No assignments submitted yet.')).toBeVisible();
    expect(errors).toEqual([]);
  });

  // The page reads user_enrollments, assignment_progress and user_stats with the public anonymous key, so any caller can read them.
  test.fixme('[ADM-RSL-007] a learner cannot read user_enrollments, assignment_progress and user_stats with the public key (known gap R-AD-1, SCP-39)', async () => {});
});

test.describe('PRD08 admin portal: phone and keyboard @regression', () => {
  test.beforeEach(() => requireSignIn());

  test('[ADM-MOB-001][ADM-MOB-002] on a 390 px phone the cards stack, the table scrolls inside its box, the page does not scroll sideways and the form works', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, baseURL: `http://localhost:${process.env.PORT ?? '3000'}` });
    const page = await ctx.newPage();
    await openAdmin(page);
    const boxes = await Promise.all(['Total Leads (CRM)', 'Enrollments', 'Coupons Used'].map(l => kpiLabel(page, l).boundingBox()));
    expect(new Set(boxes.map(b => Math.round(b!.y))).size).toBe(3);
    const scroller = await page.locator('div.overflow-x-auto.h-\\[400px\\]').evaluate(el => el.scrollWidth > el.clientWidth);
    expect(scroller, 'the table scrolls inside its own box').toBe(true);
    await cannotScrollSideways(page);
    await idInput(page).scrollIntoViewIfNeeded();
    await grantButton(page).click();
    await expect(formMessage(page, 'Please enter a valid Clerk User ID.')).toBeVisible();
    await ctx.close();
  });

  test('[ADM-MOB-003] the tabs can be reached and opened from the keyboard', async ({ page }) => {
    await openAdmin(page);
    for (const key of ['enrollments', 'progress', 'assignments', 'engagement', 'directory'] as TabKey[]) {
      await tab(page, key).focus();
      await expect(tab(page, key)).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(tab(page, key)).toHaveClass(/border-amber-500/);
    }
  });

  test('[ADM-MOB-004] the form and the code modal work from the keyboard', async ({ page }) => {
    await mockUsers(page, [crmUser(1)]);
    await mockTable(page, 'assignment_progress', [{ user_id: 'user_qa_adm_1', course_slug: COURSE.A, video_id: A_FIRST_VIDEO, submitted_code: 'print(1)', completed_at: '2026-03-02T09:30:00Z' }]);
    await openAdmin(page);
    await idInput(page).focus();
    await page.keyboard.press('Enter');
    await expect(formMessage(page, 'Please enter a valid Clerk User ID.')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(courseSelect(page)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(grantButton(page)).toBeFocused();
    await goTab(page, 'assignments');
    const view = page.getByRole('button', { name: 'View Code' });
    await view.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Code Review' })).toBeVisible();
    const close = page.getByRole('heading', { name: 'Code Review' }).locator('xpath=ancestor::div[2]').locator('button');
    await close.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Code Review' })).toHaveCount(0);
  });

  test('[ADM-MOB-005][ADM-MOB-006] smoke for Firefox and WebKit: the portal opens, the tabs switch and the form validates (run with --project=firefox / webkit)', async ({ page }) => {
    await openAdmin(page);
    await expect(headers(page)).toHaveCount(4);
    await goTab(page, 'enrollments');
    await expect(headers(page).first()).toHaveText(/Student Identity/i);
    await grantButton(page).click();
    await expect(formMessage(page, 'Please enter a valid Clerk User ID.')).toBeVisible();
  });
});
