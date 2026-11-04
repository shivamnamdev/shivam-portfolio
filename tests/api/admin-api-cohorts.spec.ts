import { test, expect } from '@playwright/test';
import { EMAIL } from '../support/personas';
import { requireSeed } from '../support/guards';
import { sessionFor, type Session } from '../support/api';
import { BASE, PREFIX, clearWriteLimits, cleanupAdminApi, cohort, course, plansPricing, singlePricing } from '../support/adminApi';
import { adminDb } from '../support/db';
import { clerkUserId } from '../support/clerk';

// PRD 17 · cohorts: single-price and plan pricing, the payment minimum rule, private links, enrolment open and close, delete and plan rules.
test.describe('AAPI cohorts @regression', () => {
  test.describe.configure({ mode: 'default' });
  test.beforeEach(async () => { test.setTimeout(90_000); requireSeed(); await clearWriteLimits(); });
  let admin: Session;
  const COURSE = 'qa-aapi-co-course';
  test.beforeAll(async ({ browser }) => { admin = await sessionFor(browser, EMAIL.admin); await admin.request.post(`${BASE}/courses`, { data: course(COURSE) }); });
  test.afterAll(async () => { await adminDb().from('user_enrollments').delete().like('course_slug', `${PREFIX}%`); await cleanupAdminApi(); await clearWriteLimits(); await admin?.close(); });
  const post = (data: object) => admin.request.post(`${BASE}/cohorts`, { data });
  const patch = (slug: string, version: number, data: object) => admin.request.patch(`${BASE}/cohorts/${slug}`, { data, headers: { 'If-Match': String(version) } });

  test('[AAPI-COH-001] create a single-price cohort; flags and prices round-trip', async () => {
    const res = await post(cohort('qa-aapi-co1', COURSE, { statusText: 'Open', duration: '6 weeks', enrollmentClosed: false, listed: true, pricing: singlePricing(1999, 25) }));
    expect(res.status()).toBe(201);
    const c = (await res.json()).data;
    expect(c).toMatchObject({ slug: 'qa-aapi-co1', courseSlug: COURSE, status: 'draft', version: 1, enrollmentClosed: false, listed: true, statusText: 'Open', duration: '6 weeks' });
    expect(c.pricing).toEqual({ kind: 'single', inr: { amount: 1999, original: 2499 }, usd: { amount: 25 } });
    const read = (await (await admin.request.get(`${BASE}/cohorts/qa-aapi-co1`)).json()).data;
    expect(read.pricing.inr.amount).toBe(1999);
    const byCourse = (await (await admin.request.get(`${BASE}/cohorts?courseSlug=${COURSE}&q=qa-aapi-co1`)).json()).data.items;
    expect(byCourse.map((x: { slug: string }) => x.slug)).toEqual(['qa-aapi-co1']);
    expect((await post(cohort('qa-aapi-co1', COURSE))).status()).toBe(409);
    expect((await post(cohort('qa-aapi-co-orphan', 'qa-aapi-no-such-course'))).status()).toBe(400);
  });

  test('[AAPI-COH-002] create a plan-based cohort (Community and Personal); duplicate plan ids are refused', async () => {
    const res = await post(cohort('qa-aapi-co2', COURSE, { pricing: plansPricing() }));
    expect(res.status()).toBe(201);
    const plans = (await res.json()).data.pricing.plans;
    expect(plans.map((p: { id: string }) => p.id)).toEqual(['community', 'personal']);
    expect(plans[1]).toMatchObject({ popular: true, price: { amount: 2999, original: 4999 } });
    const dup = plansPricing(); dup.plans[1].id = 'community';
    const bad = await post(cohort('qa-aapi-co2b', COURSE, { pricing: dup }));
    expect(bad.status()).toBe(400);
    expect((await bad.json()).error.fields.pricing).toMatch(/unique/);
    for (const pricing of [{ kind: 'plans', currency: 'INR', plans: [] }, { kind: 'plans', currency: 'USD', plans: plansPricing().plans }, { kind: 'bundle' }, { kind: 'single' }, 'free']) {
      expect((await post(cohort('qa-aapi-co2c', COURSE, { pricing }))).status(), JSON.stringify(pricing).slice(0, 40)).toBe(400);
    }
  });

  test('[AAPI-COH-003] the private links are returned only by the links action', async () => {
    await post(cohort('qa-aapi-co3', COURSE, { whatsappLink: 'https://chat.whatsapp.com/qa-aapi', liveLink: 'https://meet.google.com/qa-aapi' }));
    const read = JSON.stringify(await (await admin.request.get(`${BASE}/cohorts/qa-aapi-co3`)).json());
    expect(read).not.toMatch(/whatsapp|meet\.google|private/i);
    expect(JSON.stringify(await (await admin.request.get(`${BASE}/cohorts?q=qa-aapi-co3`)).json())).not.toMatch(/whatsapp|meet\.google|private/i);
    const links = (await (await admin.request.get(`${BASE}/cohorts/qa-aapi-co3/links`)).json()).data;
    expect(links).toEqual({ whatsappLink: 'https://chat.whatsapp.com/qa-aapi', liveLink: 'https://meet.google.com/qa-aapi' });
    // changing another field keeps the links; changing a link changes only that link
    await patch('qa-aapi-co3', 1, { duration: '2 weeks' });
    expect((await (await admin.request.get(`${BASE}/cohorts/qa-aapi-co3/links`)).json()).data.whatsappLink).toBe('https://chat.whatsapp.com/qa-aapi');
    await patch('qa-aapi-co3', 2, { liveLink: '' });
    expect((await (await admin.request.get(`${BASE}/cohorts/qa-aapi-co3/links`)).json()).data).toEqual({ whatsappLink: 'https://chat.whatsapp.com/qa-aapi', liveLink: '' });
  });

  test('[AAPI-VAL-002] links must be https', async () => {
    for (const link of ['http://chat.whatsapp.com/x', 'javascript:alert(1)', 'data:text/html,x', '//evil.example', 'https://user:pw@evil.example']) {
      const res = await post(cohort('qa-aapi-co-link', COURSE, { whatsappLink: link }));
      expect(res.status(), link).toBe(400);
    }
    expect((await adminDb().from('content_docs').select('key').eq('key', 'qa-aapi-co-link')).data).toHaveLength(0);
  });

  test('[AAPI-COH-004] a price above zero and below the payment minimum is refused; zero and the minimum are accepted', async () => {
    for (const amount of [0.4, 0.99]) {
      const res = await post(cohort('qa-aapi-co4', COURSE, { pricing: singlePricing(amount) }));
      expect(res.status(), String(amount)).toBe(400);
      expect((await res.json()).error.fields.pricing).toMatch(/at least 1/);
    }
    const plan = plansPricing(); plan.plans[0].price.amount = 0.5;
    expect((await post(cohort('qa-aapi-co4', COURSE, { pricing: plan }))).status()).toBe(400);
    expect((await post(cohort('qa-aapi-co4', COURSE, { pricing: singlePricing(25, 0.5) }))).status()).toBe(400);   // usd 0.5
    expect((await post(cohort('qa-aapi-co4a', COURSE, { pricing: singlePricing(0) }))).status()).toBe(201);        // free
    expect((await post(cohort('qa-aapi-co4b', COURSE, { pricing: singlePricing(5) }))).status()).toBe(201);        // above the minimum (exactly 1 is covered by the AAPI-COH-004 unit case)
    expect((await post(cohort('qa-aapi-co4c', COURSE, { pricing: { kind: 'single', inr: { amount: 100, original: 50 } } }))).status()).toBe(400);   // original below price
    // and the same rule on update
    expect((await patch('qa-aapi-co4b', 1, { pricing: singlePricing(0.3) })).status()).toBe(400);
  });

  test('[AAPI-COH-005] a plan that learners bought cannot be removed', async ({}, info) => {
    const probe = await adminDb().from('user_enrollments').select('plan_id').limit(1);
    test.skip(!!probe.error, 'user_enrollments.plan_id does not exist on this Supabase project: run docs/SUPABASE_PLAN_COLUMN.md');
    await post(cohort('qa-aapi-co5', COURSE, { pricing: plansPricing() }));
    const ins = await adminDb().from('user_enrollments').insert([{ user_id: await clerkUserId(EMAIL.edu), course_slug: 'qa-aapi-co5', user_name: 'QA', user_email: EMAIL.edu, plan_id: 'personal' }]);
    expect(ins.error).toBeNull();
    const onlyCommunity = { kind: 'plans', currency: 'INR', plans: [plansPricing().plans[0]] };
    const refused = await patch('qa-aapi-co5', 1, { pricing: onlyCommunity });
    expect(refused.status()).toBe(422);
    expect((await refused.json()).error.message).toMatch(/personal/);
    const onlyPersonal = { kind: 'plans', currency: 'INR', plans: [plansPricing().plans[1]] };
    expect((await patch('qa-aapi-co5', 1, { pricing: onlyPersonal })).status()).toBe(200);   // removing a plan nobody bought is fine
    void info;
  });

  test('[AAPI-COH-006] open and close enrolment; a cohort with enrolments cannot be deleted; status steps work', async () => {
    await post(cohort('qa-aapi-co6', COURSE, { enrollmentClosed: true }));
    expect((await (await admin.request.post(`${BASE}/cohorts/qa-aapi-co6/open-enrolment`)).json()).data.enrollmentClosed).toBe(false);
    expect((await (await admin.request.post(`${BASE}/cohorts/qa-aapi-co6/close-enrolment`)).json()).data.enrollmentClosed).toBe(true);
    expect((await (await admin.request.post(`${BASE}/cohorts/qa-aapi-co6/publish`)).json()).data.status).toBe('published');
    expect((await admin.request.post(`${BASE}/cohorts/qa-aapi-co6/publish`)).status()).toBe(422);
    const audit = (await (await admin.request.get(`${BASE}/audit?resourceId=qa-aapi-co6`)).json()).data.items.map((i: { action: string }) => i.action);
    expect(audit).toEqual(expect.arrayContaining(['create', 'open-enrolment', 'close-enrolment', 'publish']));
    await adminDb().from('user_enrollments').insert([{ user_id: await clerkUserId(EMAIL.edu), course_slug: 'qa-aapi-co6', user_name: 'QA', user_email: EMAIL.edu }]);
    expect((await admin.request.delete(`${BASE}/cohorts/qa-aapi-co6`)).status()).toBe(422);
    await adminDb().from('user_enrollments').delete().eq('course_slug', 'qa-aapi-co6');
    expect((await admin.request.delete(`${BASE}/cohorts/qa-aapi-co6`)).status()).toBe(200);
  });
});
