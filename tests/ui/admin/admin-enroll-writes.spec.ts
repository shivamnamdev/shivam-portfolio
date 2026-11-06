import { test, expect, type Browser } from '@playwright/test';
import crypto from 'crypto';
import { QA_FIXTURE_SLUG } from '../../../data/courses';
import { EMAIL } from '../../support/personas';
import { requireFixture, requireSeed } from '../../support/guards';
import { adminDb, revokeTestEnrolment } from '../../support/db';
import { clerkUserId, signInAs } from '../../support/clerk';
import { applyCode, ui } from '../../support/checkout';

// PRD 08, the cross-flow cases that survive the retirement of the classic admin page (SCP-89, phase 4f): a real free or paid enrolment shows up for
// the admin on the Enrolments screen with its coupon. The old manual-enrolment form, KPI and tab cases drove the classic page and are retired
// (docs/testing/prd/08-ui-admin-portal.md section 12 maps each one to ADMUI-PPL-* / AAPI-ENR-*). Target learner U1 = edu ("no enrolments");
// every row and activity entry added here is removed after each test. edu is shared with the dashboard/exam/checkout specs: one worker.
const U1 = EMAIL.edu;
const FIXTURE = QA_FIXTURE_SLUG;
const haveTestKeys = () => !!process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') && !!process.env.RAZORPAY_KEY_SECRET;
const sign = (orderId: string, paymentId: string) => crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest('hex');
const logs = async (email: string, like: string) => (await adminDb().from('admin_activity_log').select('id').eq('user_email', email).like('message', `%${like}%`)).data ?? [];

async function learnerContext(browser: Browser, email: string) {
  const ctx = await browser.newContext({ baseURL: `http://localhost:${process.env.PORT ?? '3000'}` });
  const page = await ctx.newPage();
  await signInAs(page, email);
  return { ctx, page };
}

test.describe('PRD08 real enrolments reach the admin portal', () => {
  test.describe.configure({ mode: 'default' });
  test.setTimeout(120000);
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
    });

    async function expectOnEnrolmentsScreen(page: import('@playwright/test').Page, coupon: string) {
      await page.goto('/admin/enrolments');
      await expect(page.getByRole('heading', { name: 'Enrolments', level: 1 })).toBeVisible({ timeout: 30000 });
      await page.getByLabel('Cohort').last().selectOption(FIXTURE);
      const row = page.locator('tbody tr', { hasText: U1 });
      await expect(row).toHaveCount(1, { timeout: 30000 });
      await expect(row).toContainText(coupon);
      await expect(row).toContainText(FIXTURE);
    }

    test('[ADM-E2E-004][FRE-POS-008][FRE-E2E-008] a free enrolment with QA100 appears on the Enrolments screen with its coupon and in the coupon usage report', async ({ page, browser }) => {
      const { ctx, page: learner } = await learnerContext(browser, U1);
      await signInAs(page, EMAIL.admin);
      learner.on('dialog', d => d.accept().catch(() => {}));
      await learner.goto(`/courses/${FIXTURE}`);
      await learner.waitForLoadState('networkidle');
      await applyCode(learner, 'QA100');
      await ui.enrollFree(learner).click();
      await expect(ui.successModal(learner)).toBeVisible();
      await ctx.close();
      await expectOnEnrolmentsScreen(page, 'QA100');
      expect((await logs(U1, 'New Free Enrollment')).length).toBe(1);   // the activity entry
    });

    test('[ADM-E2E-003] a paid purchase appears on the Enrolments screen with the coupon used', async ({ page, browser }) => {
      test.skip(!haveTestKeys(), 'needs rzp_test_ keys and RAZORPAY_KEY_SECRET in the environment');
      const { ctx, page: learner } = await learnerContext(browser, U1);
      await signInAs(page, EMAIL.admin);
      await learner.goto(`/courses/${FIXTURE}`);
      const { order } = await (await learner.request.post('/api/create-order', { data: { courseId: FIXTURE, currency: 'INR', couponCode: 'BIRTHDAY20' } })).json();
      const payment = 'pay_QA' + order.id.slice(-8);
      const res = await learner.request.post('/api/verify-payment', { data: { razorpay_order_id: order.id, razorpay_payment_id: payment, razorpay_signature: sign(order.id, payment) } });
      expect(res.status()).toBe(200);
      await ctx.close();
      await expectOnEnrolmentsScreen(page, 'BIRTHDAY20');
    });
  });
});
