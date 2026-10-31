import { test, expect } from '@playwright/test';
import { QA_FIXTURE_SLUG } from '../../../data/courses';
import { requireFixture, requireSignIn } from '../../support/guards';
import { EMAIL } from '../../support/personas';
import { signInAs } from '../../support/clerk';

// PRD 04 / PRD 05 server-side rules, called with a real signed-in session. Every call here is refused BEFORE an order or an
// enrolment is created, so nothing is written. The signed-in account is bazar (Course B only).
const SLUG = QA_FIXTURE_SLUG;
const post = (page: any, path: string, data: unknown) => page.request.post(path, { data });

test.describe('PRD04/05 payment and free-enrolment API guards @regression', () => {
  test.beforeEach(() => { requireFixture(); requireSignIn(); });

  test('[CHK-ORDER-014][CHK-PAY-014][FRE-REQ-006] calls without a session are refused with 401', async ({ request }) => {
    for (const [path, body] of [
      ['/api/create-order', { courseId: SLUG, currency: 'INR' }],
      ['/api/verify-payment', { razorpay_order_id: 'o', razorpay_payment_id: 'p', razorpay_signature: 's' }],
      ['/api/enroll-free', { courseId: SLUG, currency: 'INR', couponCode: 'QA100' }],
    ] as const) {
      const res = await request.post(path, { data: body });
      expect(res.status(), path).toBe(401);
      expect((await res.json().catch(() => null))?.success).not.toBe(true);
    }
  });

  test('[CHK-ORDER-008][CHK-ORDER-013][FRE-REQ-007][FRE-REQ-008] unknown and closed courses are refused with 400', async ({ page }) => {
    await signInAs(page, EMAIL.bazar);
    for (const path of ['/api/create-order', '/api/enroll-free']) {
      const unknown = await post(page, path, { courseId: 'no-such-course', currency: 'INR' });
      expect(unknown.status(), `${path} unknown`).toBe(400);
      expect((await unknown.json()).error).toBe('Course not found');
      const closed = await post(page, path, { courseId: 'git-beginner-batch-1', currency: 'INR' });
      expect(closed.status(), `${path} closed`).toBe(400);
      expect((await closed.json()).error).toBe('Enrollment is closed for this course');
    }
  });

  test('[CHK-AMT-011][CHK-AMT-012][FRE-REQ-011][FRE-CTA-011][FRE-CTA-010] a restricted coupon is refused with 403 for an account not on its list', async ({ page }) => {
    await signInAs(page, EMAIL.bazar);
    for (const path of ['/api/create-order', '/api/enroll-free']) {
      const res = await post(page, path, { courseId: SLUG, currency: 'INR', couponCode: 'QA100' });
      expect(res.status(), `${path} QA100`).toBe(403);
      const res2 = await post(page, path, { courseId: SLUG, currency: 'INR', couponCode: 'SHIVAMSPECIAL' });
      expect(res2.status(), `${path} SHIVAMSPECIAL`).toBe(403);
    }
  });

  test('[CHK-AMT-013][FRE-REQ-012] an invalid coupon code is refused with 400', async ({ page }) => {
    await signInAs(page, EMAIL.bazar);
    for (const path of ['/api/create-order', '/api/enroll-free']) {
      const res = await post(page, path, { courseId: SLUG, currency: 'INR', couponCode: 'NOT-A-CODE' });
      expect(res.status(), path).toBe(400);
      expect((await res.json()).error).toBe('Invalid coupon code');
    }
  });

  test('[FRE-REQ-009][FRE-REQ-010] enroll-free refuses a request whose price is not zero, whatever the client claims', async ({ page }) => {
    await signInAs(page, EMAIL.bazar);
    const res = await post(page, '/api/enroll-free', { courseId: SLUG, currency: 'INR', price: 0, amount: 0, finalAmount: 0 });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('Payment required.');
    const res2 = await post(page, '/api/enroll-free', { courseId: SLUG, currency: 'USD', couponCode: 'BIRTHDAY20' });
    expect(res2.status()).toBe(400);
  });

  test('[CHK-PAY-012][CHK-PAY-011] verification with a wrong signature is refused and grants nothing', async ({ page }) => {
    await signInAs(page, EMAIL.bazar);
    const res = await post(page, '/api/verify-payment', { razorpay_order_id: 'order_x', razorpay_payment_id: 'pay_x', razorpay_signature: 'bad' });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('Invalid payment signature');
    const res2 = await post(page, '/api/verify-payment', {});
    expect(res2.status()).toBe(400);
  });
});
