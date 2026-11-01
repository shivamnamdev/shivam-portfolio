import { test, expect, type Browser, type Page } from '@playwright/test';
import crypto from 'crypto';
import { QA_FIXTURE_SLUG } from '../../../data/courses';
import { EMAIL, COURSE } from '../../support/personas';
import { requireFixture, requireSeed } from '../../support/guards';
import { adminDb, revokeTestEnrolment } from '../../support/db';
import { clerkUserId, signInAs } from '../../support/clerk';
import { applyCode, ui } from '../../support/checkout';
import { cards, lobby } from '../../support/dashboard';
import { mockExternals } from '../../support/learning';
import {
  courseSelect, formMessage, goTab, grantButton, idInput, kpi, localDate, localDateTime, openAdmin, rows,
} from '../../support/admin';

// PRD 08 cases that WRITE: manual enrolment through the form (and the API calls behind it), and real rows that the tables read.
// Target learner U1 = edu ("no enrolments"). Every row, activity-log entry and stats row added here is removed after each test.
// edu is shared with the dashboard/exam/checkout specs: run those files in one worker (tests/README.md).
const U1 = EMAIL.edu;
const FIXTURE = QA_FIXTURE_SLUG;
const haveTestKeys = () => !!process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') && !!process.env.RAZORPAY_KEY_SECRET;
const sign = (orderId: string, paymentId: string) => crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest('hex');

const fixtureRows = async (email: string) => {
  const { data, error } = await adminDb().from('user_enrollments').select('*').eq('user_id', await clerkUserId(email)).eq('course_slug', FIXTURE);
  if (error) throw error;
  return data!;
};
const totalRows = async () => (await adminDb().from('user_enrollments').select('id', { count: 'exact', head: true })).count ?? 0;
const couponRows = async () => (await adminDb().from('user_enrollments').select('id', { count: 'exact', head: true }).not('coupon_used', 'is', null)).count ?? 0;
const logs = async (email: string, like: string) => (await adminDb().from('admin_activity_log').select('id').eq('user_email', email).like('message', `%${like}%`)).data ?? [];
const green = (page: Page) => page.locator('div.p-3.bg-green-50');
const red = (page: Page) => page.locator('div.p-3.bg-red-50');
async function grant(page: Page, id: string, slug = FIXTURE) {
  await idInput(page).fill(id);
  await courseSelect(page).selectOption(slug);
  await grantButton(page).click();
}
async function learnerContext(browser: Browser, email: string) {
  const ctx = await browser.newContext({ baseURL: `http://localhost:${process.env.PORT ?? '3000'}` });
  const page = await ctx.newPage();
  await signInAs(page, email);
  return { ctx, page };
}

test.describe('PRD08 manual enrolment and real table data', () => {
  test.describe.configure({ mode: 'default' });
  test.setTimeout(90000);   // sign-in and the admin tables are slow on a busy network: 30 s was too tight
  test.describe('@regression', () => {
    test.beforeEach(() => { requireSeed(); requireFixture(); });
    test.afterEach(async () => {
      for (const email of [U1, EMAIL.admin]) {
        await revokeTestEnrolment(email, FIXTURE).catch(() => {});
        for (const like of ['Backdoor access granted to', 'New Free Enrollment', 'New Paid Enrollment']) await adminDb().from('admin_activity_log').delete().eq('user_email', email).like('message', `%${like}%`);
      }
      const uid = await clerkUserId(U1);
      await adminDb().from('video_progress').delete().eq('user_id', uid).eq('course_slug', FIXTURE);
      await adminDb().from('assignment_progress').delete().eq('user_id', uid).eq('course_slug', FIXTURE);
      await adminDb().from('user_stats').delete().like('user_id', 'qa_adm_%');
    });

    test('[ADM-ENR-007][ADM-ENR-008][ADM-ENR-009][ADM-ENR-010][ADM-ENR-011][ADM-ENR-016][ADM-ENR-018][ADM-KPI-005][ADM-KPI-006][ADM-E2E-001] offline payment: copy the id from the Directory, grant the fixture, and the table, the KPI, the database, the log and the learner all agree', async ({ page, browser }) => {
      test.setTimeout(150000);
      await openAdmin(page);
      const enrBefore = Number(await kpi(page, 'Enrollments').innerText());
      const couponsBefore = await kpi(page, 'Coupons Used').innerText();
      const id = (await rows(page).filter({ hasText: U1 }).locator('td').nth(1).innerText()).trim();
      expect(id).toBe(await clerkUserId(U1));

      await grant(page, id);
      await expect(green(page)).toHaveText('Access Granted Successfully!', { timeout: 20000 });
      await expect(idInput(page)).toHaveValue('');
      await expect(courseSelect(page)).toHaveValue(FIXTURE);                               // ENR-018
      await expect(kpi(page, 'Enrollments')).toHaveText(String(enrBefore + 1));            // KPI-005
      await expect(kpi(page, 'Coupons Used')).toHaveText(couponsBefore);                   // KPI-006
      await goTab(page, 'enrollments');
      await expect(rows(page).first()).toContainText(U1);                                  // ENR-008: newest first
      await expect(rows(page).first()).toContainText(FIXTURE);
      await expect(rows(page).first().locator('td').nth(2)).toHaveText('-');
      await expect(rows(page).first()).toContainText(await localDate(page, new Date().toISOString()));
      expect(await fixtureRows(U1)).toHaveLength(1);                                       // ENR-009
      expect((await logs(U1, `Backdoor access granted to ${FIXTURE}`)).length).toBe(1);   // ENR-016
      await page.reload();
      await expect(kpi(page, 'Enrollments')).toHaveText(String(enrBefore + 1), { timeout: 30000 });

      const { ctx, page: learner } = await learnerContext(browser, U1);                    // ENR-010 / ENR-011
      await learner.goto('/learning');
      await expect(learner.getByRole('heading', { name: 'QA Checkout Sandbox' })).toBeVisible({ timeout: 25000 });
      await expect(cards(learner)).toHaveCount(1);
      await learner.goto(`/live/${FIXTURE}`);
      await expect(lobby(learner)).toBeVisible({ timeout: 25000 });
      await mockExternals(learner);
      await learner.goto(`/learning/${FIXTURE}`);
      await expect(learner.getByText('Course Content')).toBeVisible({ timeout: 40000 });
      await ctx.close();
    });

    test('[ADM-E2E-006][ADM-ENR-012] a wrong id gives an error first, the right id then succeeds with one row, and a second grant is refused', async ({ page }) => {
      await openAdmin(page);
      await grant(page, 'user_wrong_id_000');
      await expect(red(page)).toHaveText('No Clerk user found with that ID.');
      expect(await fixtureRows(U1)).toHaveLength(0);
      const id = await clerkUserId(U1);
      await grant(page, id);
      await expect(green(page)).toHaveText('Access Granted Successfully!', { timeout: 20000 });
      await grant(page, id);
      await expect(red(page)).toHaveText('Student is already enrolled!', { timeout: 20000 });
      expect(await fixtureRows(U1)).toHaveLength(1);
    });

    test('[ADM-ENR-015][ADM-ENR-017] spaces around the id are trimmed and a double click on Grant Access creates one row', async ({ page }) => {
      await openAdmin(page);
      await idInput(page).fill(`  ${await clerkUserId(U1)}  `);
      await courseSelect(page).selectOption(FIXTURE);
      await grantButton(page).dblclick();
      await expect(page.locator('div.p-3.bg-green-50, div.p-3.bg-red-50')).toBeVisible({ timeout: 20000 });
      await expect.poll(async () => (await fixtureRows(U1)).length).toBe(1);
      await page.waitForTimeout(1500);
      expect(await fixtureRows(U1)).toHaveLength(1);
    });

    test('[ADM-ENR-019] granting a course to the admin account is allowed and does not crash', async ({ page }) => {
      await openAdmin(page);
      await grant(page, await clerkUserId(EMAIL.admin));
      await expect(green(page)).toHaveText('Access Granted Successfully!', { timeout: 20000 });
      expect(await fixtureRows(EMAIL.admin)).toHaveLength(1);
    });

    test('[ADM-KPI-003][ADM-KPI-004][ADM-TBL-006] the cards equal the database counts and the seeded personas show with their courses (the no-enrolment persona is absent)', async ({ page }) => {
      await openAdmin(page);
      await expect(kpi(page, 'Enrollments')).toHaveText(String(await totalRows()));
      await expect(kpi(page, 'Coupons Used')).toHaveText(String(await couponRows()));
      await goTab(page, 'enrollments');
      await expect(rows(page).filter({ hasText: COURSE.A }).filter({ hasText: EMAIL.mavish })).not.toHaveCount(0);
      await expect(rows(page).filter({ hasText: COURSE.B }).filter({ hasText: EMAIL.bazar })).not.toHaveCount(0);
      await expect(rows(page).filter({ hasText: EMAIL.edu })).toHaveCount(0);
    });

    test('[ADM-TBL-007][ADM-ASG-003][ADM-ENG-002] real rows come back newest first (enrollments, submissions) and by time spent (engagement)', async ({ page }) => {
      const uid = await clerkUserId(U1);
      const grantRes = await adminDb().from('user_enrollments').insert([{ user_id: uid, course_slug: FIXTURE, user_email: U1, user_name: 'QA persona', coupon_used: null }]);
      if (grantRes.error) throw grantRes.error;
      const older = '2026-03-01T09:00:00.000Z', newer = '2026-03-03T09:00:00.000Z';
      const a = await adminDb().from('assignment_progress').insert([
        { user_id: uid, course_slug: FIXTURE, video_id: 'a9nrrH5XkG0', submitted_code: '# QA older', user_name: 'QA persona', completed_at: older },
        { user_id: uid, course_slug: FIXTURE, video_id: '5G3VcAR2P_E', submitted_code: '# QA newer', user_name: 'QA persona', completed_at: newer },
      ]);
      if (a.error) throw a.error;
      const s = await adminDb().from('user_stats').insert([
        { user_id: 'qa_adm_light', user_name: 'QA Light User', user_email: 'qa.light@example.test', total_points: 0, current_streak: 1, last_active_date: '2026-03-02', total_time_seconds: 60 },
        { user_id: 'qa_adm_heavy', user_name: 'QA Heavy User', user_email: 'qa.heavy@example.test', total_points: 0, current_streak: 4, last_active_date: '2026-03-02', total_time_seconds: 999999 },
      ]);
      if (s.error) throw s.error;
      await openAdmin(page);
      await goTab(page, 'enrollments');
      await expect(rows(page).first()).toContainText(U1);                                 // newest enrollment first
      await goTab(page, 'assignments');
      const mine = rows(page).filter({ hasText: U1 });
      await expect(mine).toHaveCount(2);
      await expect(mine.nth(0)).toContainText(await localDateTime(page, newer));
      await expect(mine.nth(1)).toContainText(await localDateTime(page, older));
      await goTab(page, 'engagement');
      const texts = await rows(page).allInnerTexts();
      const heavy = texts.findIndex(t => t.includes('QA Heavy User')), light = texts.findIndex(t => t.includes('QA Light User'));
      expect(heavy).toBeGreaterThanOrEqual(0);
      expect(heavy).toBeLessThan(light);
      await expect(rows(page).filter({ hasText: 'QA Heavy User' })).toContainText('277h 46m');
    });

    test('[ADM-E2E-004][FRE-POS-008][FRE-E2E-008] a free enrolment with QA100 appears in the admin tables with its coupon and raises Coupons Used', async ({ page, browser }) => {
      const { ctx, page: learner } = await learnerContext(browser, U1);
      await openAdmin(page);
      const couponsBefore = Number(await kpi(page, 'Coupons Used').innerText());
      const enrBefore = Number(await kpi(page, 'Enrollments').innerText());
      learner.on('dialog', d => d.accept().catch(() => {}));
      await learner.goto(`/courses/${FIXTURE}`);
      await learner.waitForLoadState('networkidle');
      await applyCode(learner, 'QA100');
      await ui.enrollFree(learner).click();
      await expect(ui.successModal(learner)).toBeVisible();
      await ctx.close();
      await page.reload();
      await expect(kpi(page, 'Coupons Used')).toHaveText(String(couponsBefore + 1), { timeout: 30000 });
      await expect(kpi(page, 'Enrollments')).toHaveText(String(enrBefore + 1));
      await goTab(page, 'enrollments');
      await expect(rows(page).first()).toContainText(U1);
      await expect(rows(page).first()).toContainText('QA100');
      expect((await logs(U1, 'New Free Enrollment')).length).toBe(1);   // the activity entry
    });

    test('[ADM-E2E-003] a paid purchase appears in the admin tables with the coupon used and raises both cards', async ({ page, browser }) => {
      test.skip(!haveTestKeys(), 'needs rzp_test_ keys and RAZORPAY_KEY_SECRET in the environment');
      const { ctx, page: learner } = await learnerContext(browser, U1);
      await openAdmin(page);
      const enrBefore = Number(await kpi(page, 'Enrollments').innerText());
      const couponsBefore = Number(await kpi(page, 'Coupons Used').innerText());
      await learner.goto(`/courses/${FIXTURE}`);
      const { order } = await (await learner.request.post('/api/create-order', { data: { courseId: FIXTURE, currency: 'INR', couponCode: 'BIRTHDAY20' } })).json();
      const payment = 'pay_QA' + order.id.slice(-8);
      const res = await learner.request.post('/api/verify-payment', { data: { razorpay_order_id: order.id, razorpay_payment_id: payment, razorpay_signature: sign(order.id, payment) } });
      expect(res.status()).toBe(200);
      await ctx.close();
      await page.reload();
      await expect(kpi(page, 'Enrollments')).toHaveText(String(enrBefore + 1), { timeout: 30000 });
      await expect(kpi(page, 'Coupons Used')).toHaveText(String(couponsBefore + 1));
      await goTab(page, 'enrollments');
      await expect(rows(page).first()).toContainText(U1);
      await expect(rows(page).first()).toContainText('BIRTHDAY20');
    });
  });
});
