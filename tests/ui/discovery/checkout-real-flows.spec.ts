import { test, expect, type Page } from '@playwright/test';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { QA_FIXTURE_SLUG } from '../../../data/courses';
import { adminDb, revokeTestEnrolment } from '../../support/db';
import { clerkUserId, signInAs } from '../../support/clerk';
import { expectLearningDashboard } from '../../support/assertions';
import { requireFixture, requireSeed } from '../../support/guards';
import { EMAIL } from '../../support/personas';
import { applyCode, mockGateway, openFixture, trackDialogs, ui } from '../../support/checkout';

// PRD 04 / PRD 05 cases that write to the QA Supabase project, with the real app APIs and (for paid orders) real Razorpay
// TEST-mode orders. No Razorpay popup is used: the signature is computed from the test secret, which is exactly what the
// gateway would send after a successful test payment. Account: edu ("no enrolments"). Every row added here is removed.
// NOTE: edu is shared with the dashboard/exam/checkout-real-db specs: run those files in one worker (tests/README.md).
// NOTE: each paid enrolment makes the app send one welcome e-mail to the edu inbox (when GMAIL_* is configured).
const USER = EMAIL.edu;
const SLUG = QA_FIXTURE_SLUG;
const haveTestKeys = () => !!process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') && !!process.env.RAZORPAY_KEY_SECRET;

const rows = async () => {
  const { data, error } = await adminDb().from('user_enrollments').select('*').eq('user_id', await clerkUserId(USER)).eq('course_slug', SLUG);
  if (error) throw error;
  return data!;
};
const logRows = async (like: string) => {
  const { data, error } = await adminDb().from('admin_activity_log').select('*').eq('user_email', USER).like('message', `%${like}%`);
  if (error) throw error;
  return data!;
};
const deleteLogs = async (like: string) => { await adminDb().from('admin_activity_log').delete().eq('user_email', USER).like('message', `%${like}%`); };
const sign = (orderId: string, paymentId: string) =>
  crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest('hex');
const createOrder = async (page: Page, data: object) => (await page.request.post('/api/create-order', { data })).json();
const verify = (page: Page, orderId: string) => {
  const payment = 'pay_QA' + orderId.slice(-8);
  return page.request.post('/api/verify-payment', { data: { razorpay_order_id: orderId, razorpay_payment_id: payment, razorpay_signature: sign(orderId, payment) } });
};

test.describe('PRD04/05 real flows against the QA database', () => {
  test.describe.configure({ mode: 'default' });

  // The welcome e-mail goes out through the owner's Gmail account; counting it needs read access to that mailbox, which the
  // suite does not have. Both cases stay open until a test mailbox (or a mail-capture hook in the app) exists.
  test.fixme('[CHK-IDEM-004] repeating verification sends exactly one welcome email (needs mailbox access)', async () => {});
  test.fixme('[CHK-POST-010] one receipt email with the order id and amount (needs mailbox access)', async () => {});

  test.describe('free enrolment @regression', () => {
    test.beforeEach(() => { requireFixture(); requireSeed(); });
    test.afterEach(async () => { await revokeTestEnrolment(USER, SLUG); await deleteLogs('New Free Enrollment'); });

    test('[FRE-REQ-013][FRE-POS-007] the enrolled course comes from the course id on the server and the activity entry is written', async ({ page }) => {
      await deleteLogs('New Free Enrollment');
      await openFixture(page, USER);
      const res = await page.request.post('/api/enroll-free', { data: { courseId: SLUG, courseSlug: 'git-beginner-batch-1', slug: 'git-beginner-batch-1', currency: 'INR', couponCode: 'QA100' } });
      expect(res.status()).toBe(200);
      expect(await rows()).toHaveLength(1);
      const { data } = await adminDb().from('user_enrollments').select('course_slug').eq('user_id', await clerkUserId(USER));
      expect(data!.map(r => r.course_slug)).toEqual([SLUG]);
      expect((await logRows(`New Free Enrollment (Coupon: QA100): ${SLUG}`)).length).toBe(1);
    });

    test('[FRE-SUC-009][FRE-POS-003][FRE-POS-004][FRE-E2E-006] after enrolling, a reload keeps the enrolled state, Go to Dashboard works and the course page opens', async ({ page }) => {
      trackDialogs(page);
      await openFixture(page, USER);
      await applyCode(page, 'QA100');
      await ui.enrollFree(page).click();
      await expect(ui.successModal(page)).toBeVisible();
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(ui.enrolled(page)).toBeVisible();
      await expect(page.getByRole('button', { name: /Buy Now|Enroll for Free/ })).toHaveCount(0);
      await ui.enrolled(page).click();
      await expect.poll(() => new URL(page.url()).pathname).toBe('/learning');
      await expectLearningDashboard(page);
      await page.goto(`/learning/${SLUG}`);
      await expect.poll(() => new URL(page.url()).pathname).toBe(`/learning/${SLUG}`);
      await expect(page.getByText('Course Content')).toBeVisible({ timeout: 40000 });
    });

    test('[FRE-POS-005] a stale second tab enrolling again is answered as already enrolled and leaves one row', async ({ page }) => {
      trackDialogs(page);
      await openFixture(page, USER);
      await applyCode(page, 'QA100');
      const tab2 = await page.context().newPage();
      trackDialogs(tab2);
      await tab2.goto(`/courses/${SLUG}`);
      await tab2.waitForLoadState('networkidle');
      await applyCode(tab2, 'QA100');
      await ui.enrollFree(tab2).click();
      await expect(ui.successModal(tab2)).toBeVisible();
      await ui.enrollFree(page).click();            // tab 1 still shows the old state
      await expect(ui.successModal(page)).toBeVisible();
      expect(await rows()).toHaveLength(1);
    });

    test('[FRE-ERR-004][FRE-E2E-007] a failed request grants nothing and a retry then succeeds with one row', async ({ page }) => {
      const dialogs = trackDialogs(page);
      let first = true;
      await page.route('**/api/enroll-free', route => { if (first) { first = false; return route.abort('failed'); } return route.continue(); });
      await openFixture(page, USER);
      await applyCode(page, 'QA100');
      await ui.enrollFree(page).click();
      await expect.poll(() => dialogs.length).toBeGreaterThan(0);
      await expect(ui.successModal(page)).toHaveCount(0);
      expect(await rows()).toHaveLength(0);
      await ui.enrollFree(page).click();
      await expect(ui.successModal(page)).toBeVisible();
      expect(await rows()).toHaveLength(1);
    });

    test('[FRE-E2E-002][FRE-CTA-004] the public fixed coupon floors the price at 0, enrols for free and stores its code', async ({ page }) => {
      trackDialogs(page);
      await openFixture(page, USER);
      await applyCode(page, 'EXISTINGSTUDENT_BATCH03');
      await expect(ui.finalPrice(page)).toHaveText('₹0');
      await ui.enrollFree(page).click();
      await expect(ui.successModal(page)).toBeVisible();
      const r = await rows();
      expect(r).toHaveLength(1);
      expect(r[0].coupon_used).toBe('EXISTINGSTUDENT_BATCH03');
    });

    test('[FRE-ERR-006][FRE-IDEM-005][FRE-IDEM-006] refreshing, or changing coupon and currency, while the request runs leaves the page usable', async ({ page }) => {
      trackDialogs(page);
      const gw = await mockGateway(page, { free: 'slow', delayMs: 2000 });
      await openFixture(page, USER);
      await applyCode(page, 'QA100');
      await ui.enrollFree(page).click();
      await ui.usd(page).click();
      await applyCode(page, 'BIRTHDAY20');
      await expect(ui.successModal(page)).toBeVisible({ timeout: 10000 });
      expect(gw.freeBodies).toEqual([{ courseId: SLUG, currency: 'INR', couponCode: 'QA100' }]);
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(ui.inr(page)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Processing...' })).toHaveCount(0);
    });
  });

  test.describe('paid orders with Razorpay test mode @regression', () => {
    test.beforeEach(async () => { requireFixture(); requireSeed(); test.skip(!haveTestKeys(), 'needs rzp_test_ keys and RAZORPAY_KEY_SECRET in the environment'); });
    test.afterEach(async () => { await revokeTestEnrolment(USER, SLUG); await deleteLogs('New Paid Enrollment'); });

    test('[CHK-AMT-015][CHK-AMT-016] real orders: order bound to buyer and course, and UI price equals the order amount', async ({ page }) => {
      await openFixture(page, USER);
      const inr = await createOrder(page, { courseId: SLUG, currency: 'INR' });
      const usd = await createOrder(page, { courseId: SLUG, currency: 'USD' });
      expect(inr.order.notes).toMatchObject({ userId: await clerkUserId(USER), courseId: SLUG, courseSlug: SLUG });
      await expect(ui.finalPrice(page)).toHaveText('₹10');
      expect(inr.order.amount).toBe(10 * 100);
      await ui.usd(page).click();
      await expect(ui.finalPrice(page)).toHaveText('$1');
      expect(usd.order.amount).toBe(1 * 100);
    });

    test('[CHK-AMT-018] a coupon that would make the price zero never creates a zero-value paid order', async ({ page }) => {
      await openFixture(page, USER);
      const res = await createOrder(page, { courseId: SLUG, currency: 'INR', couponCode: 'EXISTINGSTUDENT_BATCH03' });
      expect(res.order.amount).toBeGreaterThanOrEqual(100);
      // A 20% coupon on the $1 fixture would be $0.80; the server floors a paid order at 1 unit (100 cents), so the order is $1.
      const usd = await createOrder(page, { courseId: SLUG, currency: 'USD', couponCode: 'BIRTHDAY20' });
      expect(usd.order.amount).toBe(100);
    });

    test('[CHK-PAY-013] an order without course and buyer notes is refused at verification and grants nothing', async ({ page }) => {
      await openFixture(page, USER);
      const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! });
      const order = await rzp.orders.create({ amount: 100, currency: 'INR', receipt: 'rcpt_qa_nonotes' });
      const res = await verify(page, order.id);
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toMatch(/missing course details/i);
      expect(await rows()).toHaveLength(0);
    });

    test('[CHK-PAY-006][CHK-PAY-007][CHK-IDEM-003][CHK-IDEM-005][CHK-PAY-011][CHK-E2E-001][CHK-E2E-010][CHK-POST-005][CHK-POST-008][CHK-FAIL-009] a verified INR payment creates one enrolment and one log entry, repeating verification adds nothing, another account cannot claim the order, and the course shows on the dashboard', async ({ page, browser }) => {
      await openFixture(page, USER);
      const { order } = await createOrder(page, { courseId: SLUG, currency: 'INR' });
      const first = await verify(page, order.id);
      expect(first.status()).toBe(200);
      expect(await rows()).toHaveLength(1);
      expect((await logRows(`New Paid Enrollment`)).length).toBe(1);
      const again = await verify(page, order.id);
      expect(again.status()).toBe(200);
      expect(await rows()).toHaveLength(1);
      expect((await logRows(`New Paid Enrollment`)).length).toBe(1);

      const other = await browser.newContext();
      const p2 = await other.newPage();
      await signInAs(p2, EMAIL.bazar);
      const stolen = await verify(p2, order.id);
      expect(stolen.status()).toBe(403);
      await other.close();

      await page.goto('/learning');
      await expectLearningDashboard(page);
      await expect(page.getByText('QA Checkout Sandbox').first()).toBeVisible();
      await page.goBack();
      await page.goto(`/learning/${SLUG}`);
      await expect(page.getByText('Course Content')).toBeVisible({ timeout: 40000 });
      expect(await rows()).toHaveLength(1);
    });

    test('[CHK-IDEM-007] a stale second tab that still shows Buy Now cannot create a second enrolment', async ({ page, context }) => {
      await openFixture(page, USER);                       // tab 1: buys
      const tab2 = await context.newPage();                // tab 2: loaded before the purchase, still shows Buy Now
      await tab2.route('https://checkout.razorpay.com/**', route => route.fulfill({ status: 200, contentType: 'application/javascript',
        body: 'window.Razorpay = function(o){ window.__opened = 0; this.on = function(){}; this.open = function(){ window.__opened += 1; }; };' }));
      tab2.on('dialog', d => d.accept().catch(() => {}));
      await tab2.goto(`/courses/${SLUG}`);
      await tab2.waitForLoadState('networkidle');
      await expect(ui.buyNow(tab2, 'INR')).toBeVisible();
      const { order } = await createOrder(page, { courseId: SLUG, currency: 'INR' });
      expect((await verify(page, order.id)).status()).toBe(200);
      expect(await rows()).toHaveLength(1);
      await ui.buyNow(tab2, 'INR').click();                // the stale click: the server may create an order but nothing may enrol twice
      await expect(ui.buyNow(tab2, 'INR')).toBeEnabled({ timeout: 15000 });
      const second = await createOrder(page, { courseId: SLUG, currency: 'INR' });
      if (second?.order?.id) expect((await verify(page, second.order.id)).status()).toBe(200);
      expect(await rows(), 'one enrolment row however many orders were created').toHaveLength(1);
    });

    test('[CHK-E2E-003][CHK-PAY-002] an international buyer pays $1 (100 cents) and is enrolled', async ({ page }) => {
      await openFixture(page, USER);
      const { order } = await createOrder(page, { courseId: SLUG, currency: 'USD' });
      expect(order).toMatchObject({ currency: 'USD', amount: 100 });
      expect((await verify(page, order.id)).status()).toBe(200);
      expect(await rows()).toHaveLength(1);
    });
  });
});
