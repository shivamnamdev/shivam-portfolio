import { test, expect } from '@playwright/test';
import { EMAIL } from '../support/personas';
import { requireSeed } from '../support/guards';
import { hasRazorpayTestKeys, paymentIdFor, razorpaySignature, sessionFor, type Session } from '../support/api';
import { BASE, clearWriteLimits, cohort, course, flushCatalogCache, future, plansPricing, singlePricing } from '../support/adminApi';
import { adminDb } from '../support/db';

// Phase 5, slice 5d with PORTAL_CATALOG=database and PORTAL_COUPONS=database: prices come from the published cohort, coupons from the `coupons` table.
// PORT=3100 PORTAL_CATALOG=database PORTAL_COUPONS=database E2E_SEED_PERSONAS=1 npx playwright test tests/api/portal-coupons-db.spec.ts
// Learners are the edu and mavish personas; everything is made under qa-pcp* and removed afterwards.
const COURSE = 'qa-pcp-course';
const PLANS = 'qa-pcp-plans';
const SINGLE = 'qa-pcp-single';
const CLOSED = 'qa-pcp-closed';
const DRAFT = 'qa-pcp-draft';
const pct = (percent: number) => ({ type: 'percentage', percent });
const on = process.env.PORTAL_COUPONS === 'database' && process.env.PORTAL_CATALOG === 'database';

test.describe('Prices and coupons from the portal, PORTAL_COUPONS=database @regression', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async () => {
    test.setTimeout(120_000);
    requireSeed();
    test.skip(!on, 'needs the server and the test process started with PORTAL_CATALOG=database and PORTAL_COUPONS=database');
    await clearWriteLimits();
  });
  let admin: Session; let edu: Session; let mav: Session; let startedAt = '';
  test.beforeAll(async ({ browser }) => {
    startedAt = new Date().toISOString();
    if (!process.env.E2E_SEED_PERSONAS || !on) return;
    admin = await sessionFor(browser, EMAIL.admin);
    edu = await sessionFor(browser, EMAIL.edu);
    mav = await sessionFor(browser, EMAIL.mavish);
  });
  test.afterAll(async () => {
    const db = adminDb();
    await db.from('user_enrollments').delete().like('course_slug', 'qa-pcp%');
    await db.from('coupons').delete().like('code', 'QAPCP%');
    await db.from('content_docs').delete().like('key', 'qa-pcp%');
    await db.from('admin_audit').delete().or('resource_id.like.qa-pcp%,resource_id.like.QAPCP%,resource_id.like.%:qa-pcp%').gte('at', startedAt);
    await flushCatalogCache(admin);
    await clearWriteLimits(); await admin?.close(); await edu?.close(); await mav?.close();
  });

  const check = (s: Session, courseId: string, couponCode: string, extra: object = {}) =>
    s.request.post('/api/coupons/check', { data: { courseId, currency: 'INR', couponCode, ...extra } });
  const mk = async (code: string, body: object) => {
    const r = await admin.request.post(`${BASE}/coupons`, { data: { code, kind: 'everyone', discount: pct(20), expiresAt: future(7), ...body } });
    expect(r.status(), await r.text()).toBe(201);
  };
  const state = async (code: string) => (await (await admin.request.get(`${BASE}/coupons/${code}`)).json()).data;
  const publish = async (kind: 'courses' | 'cohorts', slug: string) => expect((await admin.request.post(`${BASE}/${kind}/${slug}/publish`)).status()).toBe(200);

  test('[PCP-DB-001] set-up: a published plans cohort, a single-price cohort, a closed one and a draft one', async () => {
    expect((await admin.request.post(`${BASE}/courses`, { data: course(COURSE) })).status()).toBe(201);
    await publish('courses', COURSE);
    for (const [slug, extra] of [[PLANS, { pricing: plansPricing() }], [SINGLE, { pricing: singlePricing(1000) }], [CLOSED, { pricing: singlePricing(1000), enrollmentClosed: true }], [DRAFT, { pricing: singlePricing(1000) }]] as const) {
      expect((await admin.request.post(`${BASE}/cohorts`, { data: cohort(slug, COURSE, extra) })).status()).toBe(201);
      if (slug !== DRAFT) await publish('cohorts', slug);
    }
  });

  test('[PCP-DB-002] orders are priced from the cohort: a plan costs its own price, a bad plan, USD on an INR-only cohort, a closed or draft cohort are refused', async () => {
    test.skip(!hasRazorpayTestKeys(), 'needs Razorpay test keys');
    const order = (courseId: string, data: object = {}) => edu.request.post('/api/create-order', { data: { courseId, currency: 'INR', ...data } });
    const personal = await order(PLANS, { planId: 'personal' });
    expect(personal.status(), await personal.text()).toBe(200);
    const o = (await personal.json()).order;
    expect(o).toMatchObject({ amount: 299900, currency: 'INR' });
    expect(o.notes).toMatchObject({ courseSlug: PLANS, planId: 'personal', couponCode: '' });
    expect((await order(PLANS, { planId: 'nope' })).status()).toBe(400);
    expect((await order(PLANS)).status()).toBe(400);
    const single = await order(SINGLE);
    expect((await single.json()).order.amount).toBe(100000);
    const usd = await order(SINGLE, { currency: 'USD' });
    expect(usd.status()).toBe(400);
    expect((await usd.json()).error).toMatch(/INR only/);
    expect((await order(CLOSED)).status()).toBe(400);
    const draft = await order(DRAFT);
    expect(draft.status()).toBe(400);
    expect((await draft.json()).error).toBe('Course not found');
  });

  test('[PCP-DB-003] the check route: an open code, an unknown code, an old file code (no longer valid), a switched-off code, a visitor', async ({ request }) => {
    await mk('QAPCP-OPEN', {});
    const ok = await check(edu, SINGLE, 'qapcp-open');   // codes are case-insensitive
    expect(ok.status(), await ok.text()).toBe(200);
    expect((await ok.json()).coupon).toMatchObject({ code: 'QAPCP-OPEN', discountType: 'percentage', discountValue: 20 });
    const unknown = await check(edu, SINGLE, 'NOPE-NOPE');
    expect([unknown.status(), (await unknown.json()).error]).toEqual([400, 'Invalid coupon code']);
    expect((await check(edu, SINGLE, 'BIRTHDAY20')).status()).toBe(400);   // the old file codes are not imported (owner decision)
    expect((await admin.request.patch(`${BASE}/coupons/QAPCP-OPEN`, { data: { active: false } })).status()).toBe(200);
    const off = await check(edu, SINGLE, 'QAPCP-OPEN');
    expect([off.status(), (await off.json()).error]).toEqual([400, 'Invalid coupon code']);
    const visitor = await request.post('/api/coupons/check', { data: { courseId: SINGLE, currency: 'INR', couponCode: 'QAPCP-OPEN' }, maxRedirects: 0 });
    expect(visitor.status()).not.toBe(200);
    expect((await edu.request.post('/api/coupons/check', { data: { courseId: SINGLE, currency: 'INR', couponCode: '' } })).status()).toBe(400);
    expect((await check(edu, 'no-such-cohort', 'QAPCP-OPEN')).status()).toBe(400);
  });

  test('[PCP-DB-004] a selected code is only for the picked account; scope limits to a cohort or a plan', async () => {
    await mk('QAPCP-SEL', { kind: 'selected', users: [EMAIL.edu] });
    expect((await check(edu, SINGLE, 'QAPCP-SEL')).status()).toBe(200);
    const other = await check(mav, SINGLE, 'QAPCP-SEL');
    expect([other.status(), (await other.json()).error]).toEqual([403, 'This coupon is not valid for your account.']);
    await mk('QAPCP-SCOPE', { appliesTo: { cohortSlugs: [PLANS], planIds: ['personal'] } });
    const wrongCourse = await check(edu, SINGLE, 'QAPCP-SCOPE');
    expect([wrongCourse.status(), (await wrongCourse.json()).error]).toEqual([400, 'This coupon does not apply to this course.']);
    const wrongPlan = await check(edu, PLANS, 'QAPCP-SCOPE', { planId: 'community' });
    expect([wrongPlan.status(), (await wrongPlan.json()).error]).toEqual([400, 'This coupon does not apply to this plan.']);
    expect((await check(edu, PLANS, 'QAPCP-SCOPE', { planId: 'personal' })).status()).toBe(200);
  });

  test('[PCP-DB-005] a free enrolment with an open code that has a limit: the use is counted, the next learner is refused', async () => {
    await mk('QAPCP-LIMIT', { discount: pct(100), maxRedemptions: 1 });
    const r = await edu.request.post('/api/enroll-free', { data: { courseId: SINGLE, currency: 'INR', couponCode: 'QAPCP-LIMIT' } });
    expect(r.status(), await r.text()).toBe(200);
    expect(await r.json()).toMatchObject({ success: true, message: 'Enrolled for free successfully!' });
    expect((await state('QAPCP-LIMIT')).redemptions).toBe(1);
    const again = await edu.request.post('/api/enroll-free', { data: { courseId: SINGLE, currency: 'INR', couponCode: 'QAPCP-LIMIT' } });
    expect(await again.json()).toMatchObject({ success: false, error: 'This coupon has been fully used.' });
    const late = await mav.request.post('/api/enroll-free', { data: { courseId: SINGLE, currency: 'INR', couponCode: 'QAPCP-LIMIT' } });
    expect([late.status(), (await late.json()).error]).toEqual([400, 'This coupon has been fully used.']);
    const { data } = await adminDb().from('user_enrollments').select('coupon_used').eq('course_slug', SINGLE);
    expect(data?.map((x) => x.coupon_used)).toEqual(['QAPCP-LIMIT']);
  });

  test('[PCP-DB-006] a one-time code: used by the first learner, then refused to everyone; an already-enrolled learner does not spend it', async () => {
    await mk('QAPCP-ONE', { kind: 'single-use', discount: pct(100) });
    await mk('QAPCP-ONEB', { kind: 'single-use', discount: pct(100) });
    // mavish enrols in PLANS with the first code (free plan purchase)
    const first = await mav.request.post('/api/enroll-free', { data: { courseId: PLANS, planId: 'community', currency: 'INR', couponCode: 'QAPCP-ONE' } });
    expect(first.status(), await first.text()).toBe(200);
    expect(await state('QAPCP-ONE')).toMatchObject({ state: 'redeemed' });
    const second = await edu.request.post('/api/enroll-free', { data: { courseId: PLANS, planId: 'community', currency: 'INR', couponCode: 'QAPCP-ONE' } });
    expect(await second.json()).toMatchObject({ success: false, error: 'This coupon has already been used.' });
    const { data } = await adminDb().from('user_enrollments').select('coupon_used').eq('course_slug', PLANS);
    expect(data?.map((x) => x.coupon_used)).toEqual(['QAPCP-ONE']);   // one enrolment, made with the first code only
    // edu is already enrolled in SINGLE (PCP-DB-005): a one-time code used there is released, not spent
    const dup = await edu.request.post('/api/enroll-free', { data: { courseId: SINGLE, currency: 'INR', couponCode: 'QAPCP-ONEB' } });
    expect(await dup.json()).toMatchObject({ success: true, message: 'You are already enrolled in this course.' });
    expect((await state('QAPCP-ONEB')).state).toBe('unused');
  });

  test('[PCP-DB-007] a paid order holds a one-time code for the buyer; another learner is told it is busy; paying uses it', async () => {
    test.skip(!hasRazorpayTestKeys(), 'needs Razorpay test keys');
    await mk('QAPCP-HOLD', { kind: 'single-use', discount: pct(50) });
    const r = await mav.request.post('/api/create-order', { data: { courseId: SINGLE, currency: 'INR', couponCode: 'QAPCP-HOLD' } });
    expect(r.status(), await r.text()).toBe(200);
    const order = (await r.json()).order;
    expect(order).toMatchObject({ amount: 50000 });   // 1000 less 50%
    expect((await state('QAPCP-HOLD')).state).toBe('reserved');
    const busy = await check(edu, SINGLE, 'QAPCP-HOLD');
    expect([busy.status(), (await busy.json()).error]).toEqual([400, 'This coupon is being used right now. Try again in a few minutes.']);
    const rival = await edu.request.post('/api/create-order', { data: { courseId: SINGLE, currency: 'INR', couponCode: 'QAPCP-HOLD' } });
    expect(rival.status()).toBe(400);
    expect((await check(mav, SINGLE, 'QAPCP-HOLD')).status()).toBe(200);   // the holder may still use it
    const pay = paymentIdFor(order.id);
    const v = await mav.request.post('/api/verify-payment', { data: { razorpay_order_id: order.id, razorpay_payment_id: pay, razorpay_signature: razorpaySignature(order.id, pay) } });
    expect(v.status(), await v.text()).toBe(200);
    expect(await state('QAPCP-HOLD')).toMatchObject({ state: 'redeemed' });
    const again = await mav.request.post('/api/verify-payment', { data: { razorpay_order_id: order.id, razorpay_payment_id: pay, razorpay_signature: razorpaySignature(order.id, pay) } });
    expect(again.status()).toBe(200);   // a retried verification changes nothing
  });

  test('[PCP-DB-008] the QA coupon still works from the environment (QA fixtures only)', async () => {
    test.skip(process.env.NEXT_PUBLIC_QA_FIXTURES !== '1' || !process.env.NEXT_PUBLIC_QA_FREE_COUPON_USERS, 'needs the QA fixture server');
    const ok = await check(edu, SINGLE, 'QA100');
    expect(ok.status(), await ok.text()).toBe(200);
    expect((await ok.json()).coupon).toMatchObject({ code: 'QA100', discountValue: 100 });
  });
});
