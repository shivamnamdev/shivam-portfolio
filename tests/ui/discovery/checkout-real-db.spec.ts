import { test, expect } from '@playwright/test';
import { QA_FIXTURE_SLUG } from '../../../data/courses';
import { adminDb, grantTestEnrolment, revokeTestEnrolment } from '../../support/db';
import { clerkUserId } from '../../support/clerk';
import { expectLearningDashboard } from '../../support/assertions';
import { requireFixture, requireSeed, requireSignIn } from '../../support/guards';
import { EMAIL } from '../../support/personas';
import { applyCode, openFixture, trackDialogs, trackPageErrors, ui } from '../../support/checkout';

// PRD 03 cases that WRITE to the QA Supabase project (free enrolment, enrolled state, order/verify APIs).
// They use the "no enrolments" account (edu) and remove every row they add. Everything sits under one parent
// describe so Playwright keeps it in a single worker: these tests must never overlap with each other.
const USER = EMAIL.edu;
const SLUG = QA_FIXTURE_SLUG;
const rowCount = async () => {
  const { data, error } = await adminDb().from('user_enrollments').select('id').eq('user_id', await clerkUserId(USER)).eq('course_slug', SLUG);
  if (error) throw error;
  return data!.length;
};

test.describe('PRD03 checkout against the QA database', () => {
  test.describe.configure({ mode: 'default' });
test.describe('PRD03 Free enrollment (real API + QA Supabase) @regression', () => {
    test.beforeEach(() => { requireFixture(); requireSeed(); });
  test.afterEach(async () => { await revokeTestEnrolment(USER, SLUG); await adminDb().from('admin_activity_log').delete().eq('user_email', USER).like('message', '%New Free Enrollment%'); });

  test('[FRE-E2E-001][FRE-SUC-007][FRE-SUC-008][FRE-POS-001][CDP-FREE-005][CDP-E2E-003][CDP-FREE-011][CDP-CTA-004][CDP-RACE-007][CDP-CTA-003][CHK-E2E-008][CHK-POST-006] free enrollment creates the Supabase row and the course page then shows Go to Dashboard', async ({ page }) => {
    trackDialogs(page);
    await openFixture(page, USER);
    expect(await rowCount()).toBe(0);
    await applyCode(page, 'QA100');
    await ui.enrollFree(page).click();
    await expect(ui.successModal(page)).toBeVisible();
    expect(await rowCount()).toBe(1);
    const { data } = await adminDb().from('user_enrollments').select('coupon_used').eq('user_id', await clerkUserId(USER)).eq('course_slug', SLUG);
    expect(data![0].coupon_used).toBe('QA100');
    await page.goto('/learning');
    await expectLearningDashboard(page);
    await expect(page.getByText('QA Checkout Sandbox').first()).toBeVisible();   // the dashboard lists the new course
    await page.goto(`/courses/${SLUG}`);
    await page.waitForLoadState('networkidle');
    await expect(ui.enrolled(page)).toBeVisible();
    await expect(ui.buyNow(page, 'INR')).toHaveCount(0);
  });

  test('[FRE-IDEM-001][FRE-E2E-005][CDP-FREE-010][CDP-E2E-009][CDP-RACE-002] double-clicking Enroll for Free results in one enrollment row', async ({ page }) => {
    trackDialogs(page);
    await openFixture(page, USER);
    await applyCode(page, 'QA100');
    await ui.enrollFree(page).dblclick();
    await expect(ui.successModal(page)).toBeVisible();
    expect(await rowCount()).toBe(1);
  });

  test('[FRE-IDEM-004][CDP-RACE-003][CDP-FREE-010][CHK-IDEM-008] (SCP-44) concurrent free-enrollment API calls do not create duplicate rows', async ({ page }) => {
    await openFixture(page, USER);
    const call = () => page.request.post('/api/enroll-free', { data: { courseId: SLUG, currency: 'INR', couponCode: 'QA100' } });
    const results = await Promise.all(Array.from({ length: 6 }, call));
    for (const r of results) expect(r.status()).toBe(200);
    expect(await rowCount(), 'rows after 6 concurrent requests').toBe(1);
  });

  test('[FRE-IDEM-003][CDP-FREE-010] a repeated free enrollment is answered as "already enrolled"', async ({ page }) => {
    await openFixture(page, USER);
    const post = () => page.request.post('/api/enroll-free', { data: { courseId: SLUG, currency: 'INR', couponCode: 'QA100' } });
    expect((await (await post()).json()).message).toBe('Enrolled for free successfully!');
    expect((await (await post()).json()).message).toBe('You are already enrolled in this course.');
    expect(await rowCount()).toBe(1);
  });
});

test.describe('PRD03 Paid checkout (real order API) @regression', () => {
    test.beforeEach(() => {
    requireFixture(); requireSignIn();
    test.skip(!process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_'), 'needs Razorpay test keys (rzp_test_) in the environment');
  });

  test('[CDP-PAY-003][CDP-PAY-004][CDP-PAY-005][CHK-ORDER-005][CHK-AMT-006][CHK-AMT-008][CHK-AMT-007] real orders are created in the selected currency and the discounted amount', async ({ page }) => {
    await openFixture(page, USER);
    const order = async (data: object) => (await (await page.request.post('/api/create-order', { data })).json());
    const inr = await order({ courseId: SLUG, currency: 'INR' });
    expect(inr.order).toMatchObject({ currency: 'INR', amount: 1000 });
    const usd = await order({ courseId: SLUG, currency: 'USD' });
    expect(usd.order).toMatchObject({ currency: 'USD', amount: 100 });
    const discounted = await order({ courseId: SLUG, currency: 'INR', couponCode: 'BIRTHDAY20' });
    expect(discounted.order.amount).toBe(800);
  });

  test('[CDP-ERR-006][CDP-PAY-011][CHK-PAY-008][CHK-PAY-012] a forged payment signature is refused and grants no access', async ({ page }) => {
    await openFixture(page, USER);
    const res = await page.request.post('/api/verify-payment', {
      data: { razorpay_order_id: 'order_x', razorpay_payment_id: 'pay_x', razorpay_signature: 'not-a-real-signature' },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).success).toBe(false);
    expect(await rowCount()).toBe(0);
  });
});

test.describe('PRD03 Already-enrolled learner @regression', () => {
    test.beforeEach(async () => { requireFixture(); requireSeed(); await grantTestEnrolment(USER, SLUG); });
  test.afterEach(async () => { await revokeTestEnrolment(USER, SLUG); });

  test('[FRE-POS-002][CDP-ENR-001][CDP-ENR-002][CDP-ENR-004][CDP-E2E-004][CHK-ENTRY-010][CHK-IDEM-006][CHK-E2E-006] an enrolled learner sees Go to Dashboard instead of Buy Now and the coupon box', async ({ page }) => {
    trackDialogs(page);
    await openFixture(page, USER);
    await expect(ui.enrolled(page)).toBeVisible();
    await expect(page.getByRole('button', { name: /Buy Now|Enroll for Free/ })).toHaveCount(0);
    await expect(ui.couponInput(page)).toHaveCount(0);
  });

  test('[CDP-ENR-003][CDP-E2E-004][CHK-ENTRY-012][CHK-E2E-006] Go to Dashboard opens the learning dashboard', async ({ page }) => {
    await openFixture(page, USER);
    await ui.enrolled(page).click();
    await expect(page).toHaveURL(/\/learning$/);
    await expectLearningDashboard(page);
  });

  test('[CDP-ENR-005][CHK-POST-007] the enrolled state survives a refresh', async ({ page }) => {
    await openFixture(page, USER);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(ui.enrolled(page)).toBeVisible();
  });

  test('[CDP-ENR-006] if the enrolment lookup fails the page still works and does not crash', async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.route('**/rest/v1/user_enrollments**', route => route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"boom"}' }));
    await openFixture(page, USER);
    await expect(ui.finalPrice(page)).toHaveText('₹10');
    expect(errors).toEqual([]);
  });
});

});
