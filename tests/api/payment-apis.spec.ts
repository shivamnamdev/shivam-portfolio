import { test, expect, type APIRequestContext } from '@playwright/test';
import Razorpay from 'razorpay';
import { QA_FIXTURE_SLUG, activeCourses } from '../../data/courses';
import { EMAIL } from '../support/personas';
import { clerkUserId } from '../support/clerk';
import { adminDb, revokeTestEnrolment } from '../support/db';
import { requireFixture, requireSeed } from '../support/guards';
import { API_UA, hasRazorpayTestKeys, paymentIdFor, razorpaySignature, sessionFor, type Session } from '../support/api';

// PRD 09 · Payment APIs (POST /api/create-order, POST /api/verify-payment). Real Razorpay TEST-mode orders; no popup is
// used because the signature is computed from the test secret, exactly as the gateway would send it. Orders that are never
// paid are harmless. Enrolment rows written here belong to edu and are removed after every test (edu is shared: see tests/README.md).
const SLUG = QA_FIXTURE_SLUG;
const BUYER = EMAIL.edu;
const OTHER = EMAIL.mavish;
const closedCourse = activeCourses.find(c => c.enrollmentClosed)!;

const create = (req: APIRequestContext, data: object) => req.post('/api/create-order', { data });
const verifyBody = (orderId: string, over: object = {}) => ({ razorpay_order_id: orderId, razorpay_payment_id: paymentIdFor(orderId), razorpay_signature: razorpaySignature(orderId, paymentIdFor(orderId)), ...over });
const rowsFor = async (email: string) => (await adminDb().from('user_enrollments').select('*').eq('user_id', await clerkUserId(email)).eq('course_slug', SLUG)).data ?? [];
const logsFor = async (email: string, like: string) => (await adminDb().from('admin_activity_log').select('id').eq('user_email', email).like('message', `%${like}%`)).data ?? [];

test.describe('PRD09 create-order and verify-payment @regression', () => {
  test.describe.configure({ mode: 'default' });
  test.beforeEach(() => { requireFixture(); requireSeed(); test.skip(!hasRazorpayTestKeys(), 'needs rzp_test_ keys and RAZORPAY_KEY_SECRET'); });

  let s: Session;
  test.beforeAll(async ({ browser }) => { s = await sessionFor(browser, BUYER); });
  test.afterAll(async () => { await s?.close(); });
  test.afterEach(async () => {
    await revokeTestEnrolment(BUYER, SLUG).catch(() => {});
    await adminDb().from('admin_activity_log').delete().eq('user_email', BUYER).like('message', '%New Paid Enrollment%');
  });

  test.describe('create-order: access', () => {
    test('[PAYA-ACC-001] no session and no key is refused with 401 and the server message', async ({ request }) => {
      const res = await request.post('/api/create-order', { data: { courseId: SLUG, currency: 'INR' }, headers: { 'User-Agent': API_UA } });
      expect(res.status()).toBe(401);
      expect(await res.json()).toEqual({ success: false, error: '401 Unauthorized: Invalid Request' });
    });

    test('[PAYA-ACC-002] a wrong x-api-key is refused', async ({ request }) => {
      const res = await request.post('/api/create-order', { data: { courseId: SLUG, currency: 'INR' }, headers: { 'User-Agent': API_UA, 'x-api-key': 'not-the-key' } });
      expect(res.status()).toBe(401);
    });

    test('[PAYA-ACC-003][PAYA-AMT-007] a signed-in learner gets a created order with nothing paid', async () => {
      const res = await create(s.request, { courseId: SLUG, currency: 'INR' });
      expect(res.status()).toBe(200);
      const { success, order } = await res.json();
      expect(success).toBe(true);
      expect(order).toMatchObject({ status: 'created', amount_paid: 0, currency: 'INR' });
      expect(order.id).toMatch(/^order_/);
    });

    test('[PAYA-ACC-004] a userId in the body is ignored: the order belongs to the session user', async () => {
      const { order } = await (await create(s.request, { courseId: SLUG, currency: 'INR', userId: 'user_someone_else' })).json();
      expect(order.notes.userId).toBe(await clerkUserId(BUYER));
    });

    test('[PAYA-ACC-005] GET is not allowed', async () => {
      const res = await s.request.get('/api/create-order');
      expect(res.status()).toBe(405);
    });

    test('[PAYA-ACC-006] an unreadable body is a client error, not a server error', async () => {
      const res = await s.request.post('/api/create-order', { data: '{not json', headers: { 'content-type': 'application/json' } });
      expect(res.status()).toBe(400);
    });
  });

  test.describe('create-order: validation', () => {
    test('[PAYA-VAL-001][PAYA-VAL-002] an unknown or missing course is refused with 400 "Course not found"', async () => {
      for (const body of [{ courseId: 'course-that-does-not-exist', currency: 'INR' }, { currency: 'INR' }]) {
        const res = await create(s.request, body);
        expect(res.status()).toBe(400);
        expect((await res.json()).error).toBe('Course not found');
      }
    });

    test('[PAYA-VAL-003] a closed cohort is refused', async () => {
      const res = await create(s.request, { courseId: closedCourse.id, currency: 'INR' });
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toBe('Enrollment is closed for this course');
    });

    test('[PAYA-VAL-004][PAYA-VAL-005] an unknown or lower-case currency is treated as INR', async () => {
      for (const currency of ['EUR', 'usd', undefined, 123]) {
        const { order } = await (await create(s.request, { courseId: SLUG, currency })).json();
        expect(order.currency).toBe('INR');
        expect(order.amount).toBe(1000);
      }
    });

    test('[PAYA-VAL-006] an invalid coupon is refused with 400', async () => {
      const res = await create(s.request, { courseId: SLUG, currency: 'INR', couponCode: 'FAKE_COUPON_123' });
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toBe('Invalid coupon code');
    });

    test('[PAYA-VAL-007] a restricted coupon is refused with 403 for an account that is not on its list', async ({ browser }) => {
      const other = await sessionFor(browser, EMAIL.bazar);
      const res = await create(other.request, { courseId: SLUG, currency: 'INR', couponCode: 'QA100' });
      await other.close();
      expect(res.status()).toBe(403);
    });

    test('[PAYA-VAL-008] the coupon code is case-insensitive', async () => {
      const { order } = await (await create(s.request, { courseId: SLUG, currency: 'INR', couponCode: 'birthday20' })).json();
      expect(order.amount).toBe(800);
    });

    test('[PAYA-VAL-009] an amount or price sent by the client is ignored', async () => {
      const { order } = await (await create(s.request, { courseId: SLUG, currency: 'INR', amount: 1, price: 1, finalAmount: 1 })).json();
      expect(order.amount).toBe(1000);
    });
  });

  test.describe('create-order: amount and content', () => {
    test('[PAYA-AMT-001][PAYA-AMT-002] the amount is the server price in paise or cents', async () => {
      expect((await (await create(s.request, { courseId: SLUG, currency: 'INR' })).json()).order.amount).toBe(1000);
      const usd = (await (await create(s.request, { courseId: SLUG, currency: 'USD' })).json()).order;
      expect(usd).toMatchObject({ amount: 100, currency: 'USD' });
    });

    test('[PAYA-AMT-003] a 20% coupon lowers the INR amount to 800 paise', async () => {
      const { order } = await (await create(s.request, { courseId: SLUG, currency: 'INR', couponCode: 'BIRTHDAY20' })).json();
      expect(order.amount).toBe(800);
    });

    test('[PAYA-AMT-004] a coupon that would make the price zero or below one unit still creates an order of one unit (SCP-51)', async () => {
      const usd = (await (await create(s.request, { courseId: SLUG, currency: 'USD', couponCode: 'BIRTHDAY20' })).json()).order;
      expect(usd.amount).toBe(100);
      const free = (await (await create(s.request, { courseId: SLUG, currency: 'INR', couponCode: 'QA100' })).json()).order;
      expect(free.amount).toBe(100);
    });

    test('[PAYA-AMT-005] the order notes carry the buyer, course and coupon', async () => {
      const { order } = await (await create(s.request, { courseId: SLUG, currency: 'INR', couponCode: 'BIRTHDAY20' })).json();
      expect(order.notes).toEqual({ userId: await clerkUserId(BUYER), courseId: SLUG, courseSlug: SLUG, couponCode: 'BIRTHDAY20' });
    });

    test('[PAYA-AMT-006][PAYA-AMT-008] the receipt is short and every order is new', async () => {
      const a = (await (await create(s.request, { courseId: SLUG, currency: 'INR' })).json()).order;
      const b = (await (await create(s.request, { courseId: SLUG, currency: 'INR' })).json()).order;
      expect(a.receipt).toMatch(/^rcpt_\d+$/);
      expect(a.receipt.length).toBeLessThanOrEqual(40);
      expect(a.id).not.toBe(b.id);
    });
  });

  test.describe('verify-payment: access and signature', () => {
    test('[PAYA-SIG-001] a visitor is refused with 401', async ({ request }) => {
      const res = await request.post('/api/verify-payment', { data: verifyBody('order_x'), headers: { 'User-Agent': API_UA } });
      expect(res.status()).toBe(401);
    });

    test('[PAYA-SIG-002][PAYA-SIG-007] missing fields or an empty body give 400 "Invalid payment signature"', async () => {
      for (const data of [{}, { razorpay_order_id: 'order_x' }, { razorpay_order_id: 'order_x', razorpay_payment_id: 'pay_x' }]) {
        const res = await s.request.post('/api/verify-payment', { data });
        expect(res.status()).toBe(400);
        expect((await res.json()).error).toBe('Invalid payment signature');
      }
    });

    test('[PAYA-SIG-003][PAYA-SIG-004][PAYA-SIG-005][PAYA-SIG-006] a wrong, foreign-secret, other-payment or upper-case signature is refused and grants nothing', async () => {
      const { order } = await (await create(s.request, { courseId: SLUG, currency: 'INR' })).json();
      const good = verifyBody(order.id);
      const bad = [
        { ...good, razorpay_signature: 'deadbeef' },
        { ...good, razorpay_signature: razorpaySignature(order.id, paymentIdFor(order.id), 'another-secret') },
        { ...good, razorpay_payment_id: 'pay_QAotherpay' },
        { ...good, razorpay_signature: good.razorpay_signature.toUpperCase() },
      ];
      for (const data of bad) {
        const res = await s.request.post('/api/verify-payment', { data });
        expect(res.status()).toBe(400);
      }
      expect(await rowsFor(BUYER)).toHaveLength(0);
    });

    test('[PAYA-SIG-008] (SCP-66) a correctly signed id for an order that does not exist is a client error, not a server error', async () => {
      const res = await s.request.post('/api/verify-payment', { data: verifyBody('order_doesNotExist01') });
      expect(res.status()).toBeLessThan(500);
    });
  });

  test.describe('verify-payment: binding and enrolment', () => {
    test('[PAYA-BND-001][PAYA-BND-002][PAYA-BND-005][PAYA-BND-006] a valid payment enrols once, repeating it changes nothing, and the course comes from the order', async () => {
      const { order } = await (await create(s.request, { courseId: SLUG, currency: 'INR' })).json();
      const body = verifyBody(order.id, { courseSlug: 'git-beginner-batch-1', courseId: 'git-beginner-batch-1' });
      const first = await s.request.post('/api/verify-payment', { data: body });
      expect(first.status()).toBe(200);
      expect((await first.json()).success).toBe(true);
      const again = await s.request.post('/api/verify-payment', { data: body });
      expect(again.status()).toBe(200);
      const rows = await rowsFor(BUYER);
      expect(rows).toHaveLength(1);
      expect((await adminDb().from('user_enrollments').select('course_slug').eq('user_id', await clerkUserId(BUYER))).data!.map(r => r.course_slug)).toEqual([SLUG]);
      expect((await logsFor(BUYER, `New Paid Enrollment: QA Checkout Sandbox`)).length).toBe(1);
    });

    test('[PAYA-BND-003] another account cannot claim the order (403) and nothing is granted to either', async ({ browser }) => {
      const { order } = await (await create(s.request, { courseId: SLUG, currency: 'INR' })).json();
      const thief = await sessionFor(browser, OTHER);
      const res = await thief.request.post('/api/verify-payment', { data: verifyBody(order.id) });
      await thief.close();
      expect(res.status()).toBe(403);
      expect(await rowsFor(BUYER)).toHaveLength(0);
      expect(await rowsFor(OTHER)).toHaveLength(0);
    });

    test('[PAYA-BND-004] an order without buyer and course details is refused (400) and grants nothing', async () => {
      const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! });
      const order = await rzp.orders.create({ amount: 100, currency: 'INR', receipt: 'rcpt_qa_nonotes' });
      const res = await s.request.post('/api/verify-payment', { data: verifyBody(order.id) });
      expect(res.status()).toBe(400);
      expect(await rowsFor(BUYER)).toHaveLength(0);
    });

    test('[PAYA-BND-007] the coupon used is recorded on the enrolment', async () => {
      const { order } = await (await create(s.request, { courseId: SLUG, currency: 'INR', couponCode: 'BIRTHDAY20' })).json();
      expect((await s.request.post('/api/verify-payment', { data: verifyBody(order.id) })).status()).toBe(200);
      expect((await rowsFor(BUYER))[0].coupon_used).toBe('BIRTHDAY20');
    });

    test('[PAYA-RBT-001] three parallel verifications of the same order leave one enrolment row (SCP-44)', async () => {
      const { order } = await (await create(s.request, { courseId: SLUG, currency: 'INR' })).json();
      const results = await Promise.all([1, 2, 3].map(() => s.request.post('/api/verify-payment', { data: verifyBody(order.id) })));
      for (const r of results) expect(r.status()).toBe(200);
      expect(await rowsFor(BUYER)).toHaveLength(1);
    });

  test.fixme('[PAYA-RBT-002] Razorpay keys missing gives 500 "Missing Keys" (needs a server started without keys)', async () => {});
  test.fixme('[PAYA-RBT-003] exactly one welcome e-mail per new enrolment (needs mailbox access: owner checks manually)', async () => {});
  });
});
