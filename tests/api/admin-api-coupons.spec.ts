import { test, expect } from '@playwright/test';
import { EMAIL } from '../support/personas';
import { requireSeed } from '../support/guards';
import { sessionFor, type Session } from '../support/api';
import { BASE, clearWriteLimits, cleanupAdminApi, cohort, course, future, plansPricing, singlePricing } from '../support/adminApi';
import { adminDb } from '../support/db';
import { clerkUserId } from '../support/clerk';

// PRD 17 · coupons: three kinds (open for all, selected students, one-time), mandatory expiry, percentage or fixed discount,
// selected students picked by e-mail, generated one-time codes, scope, states, the payment-minimum rule, duplicates and delete.
const pct = (percent: number) => ({ type: 'percentage', percent });
const fixed = (inr?: number, usd?: number) => ({ type: 'fixed', ...(inr !== undefined ? { inr } : {}), ...(usd !== undefined ? { usd } : {}) });

test.describe('AAPI coupons @regression', () => {
  test.describe.configure({ mode: 'default' });
  test.beforeEach(async () => { test.setTimeout(90_000); requireSeed(); await clearWriteLimits(); });
  let admin: Session;
  test.beforeAll(async ({ browser }) => { admin = await sessionFor(browser, EMAIL.admin); });
  test.afterAll(async () => { await cleanupAdminApi(); await clearWriteLimits(); await admin?.close(); });
  const post = (p: string, data: object, headers: Record<string, string> = {}) => admin.request.post(BASE + p, { data, headers });
  const patch = (code: string, data: object) => admin.request.patch(`${BASE}/coupons/${code}`, { data });
  const getCoupon = async (code: string) => (await (await admin.request.get(`${BASE}/coupons/${code}`)).json()).data;

  test('[AAPI-CPN-001] a coupon without an expiry, or with a past or invalid expiry, is refused', async () => {
    for (const expiresAt of [undefined, null, '', 'tomorrow', '2020-01-01T00:00:00Z', '2026-13-45']) {
      const res = await post('/coupons', { code: 'QAAPI-EXP', kind: 'everyone', discount: pct(10), ...(expiresAt === undefined ? {} : { expiresAt }) });
      expect(res.status(), String(expiresAt)).toBe(400);
      expect((await res.json()).error.fields.expiresAt).toBeTruthy();
    }
    expect((await adminDb().from('coupons').select('code').eq('code', 'QAAPI-EXP')).data).toHaveLength(0);
  });

  test('[AAPI-CPN-002][AAPI-CPN-012] open-for-all coupon with a percentage; codes are case-insensitive and unique', async () => {
    const res = await post('/coupons', { code: 'qaapi-open20', kind: 'everyone', discount: pct(20), expiresAt: future(10) });
    expect(res.status()).toBe(201);
    const c = (await res.json()).data;
    expect(c).toMatchObject({ code: 'QAAPI-OPEN20', kind: 'everyone', state: 'active', discount: { type: 'percentage', percent: 20 }, redemptions: 0 });
    expect((await post('/coupons', { code: 'QAAPI-OPEN20', kind: 'everyone', discount: pct(5), expiresAt: future(10) })).status()).toBe(409);
    expect((await post('/coupons', { code: 'Qaapi-Open20', kind: 'everyone', discount: pct(5), expiresAt: future(10) })).status()).toBe(409);
    expect((await admin.request.get(`${BASE}/coupons/qaapi-open20`)).status()).toBe(200);   // lookups are case-insensitive too
    for (const percent of [0, -5, 100.5, 101]) expect((await post('/coupons', { code: 'QAAPI-BADPCT', kind: 'everyone', discount: pct(percent), expiresAt: future(10) })).status(), String(percent)).toBe(400);
    for (const code of ['abc', 'has space', 'x'.repeat(41), 'bad$char']) expect((await post('/coupons', { code, kind: 'everyone', discount: pct(5), expiresAt: future(10) })).status(), code).toBe(400);
  });

  test('[AAPI-CPN-003] fixed discount in INR and/or USD; it must be positive and name a currency', async () => {
    expect((await post('/coupons', { code: 'QAAPI-FIX1', kind: 'everyone', discount: fixed(200, 3), expiresAt: future(5) })).status()).toBe(201);
    expect((await post('/coupons', { code: 'QAAPI-FIX2', kind: 'everyone', discount: fixed(150), expiresAt: future(5) })).status()).toBe(201);
    expect((await getCoupon('QAAPI-FIX1')).discount).toEqual({ type: 'fixed', inr: 200, usd: 3 });
    for (const discount of [fixed(), fixed(0), fixed(-1), { type: 'fixed', inr: 'abc' }, { type: 'free' }, 'ten']) {
      expect((await post('/coupons', { code: 'QAAPI-FIX3', kind: 'everyone', discount, expiresAt: future(5) })).status(), JSON.stringify(discount)).toBe(400);
    }
  });

  test('[AAPI-CPN-004][AAPI-CPN-005] a selected-students coupon needs signed-up students picked by e-mail; the list can change while it is live', async () => {
    const base = { code: 'QAAPI-SEL', kind: 'selected', discount: pct(50), expiresAt: future(7) };
    const none = await post('/coupons', base);
    expect(none.status()).toBe(400);
    expect((await none.json()).error.fields.users).toBeTruthy();
    expect((await post('/coupons', { ...base, users: [] })).status()).toBe(400);
    const unknown = await post('/coupons', { ...base, users: [EMAIL.edu, 'nobody.at.all.qa@example.test'] });
    expect(unknown.status()).toBe(400);
    expect((await unknown.json()).error.fields.users).toMatch(/nobody\.at\.all/);
    expect((await post('/coupons', { code: 'QAAPI-OPENUSERS', kind: 'everyone', discount: pct(5), expiresAt: future(5), users: [EMAIL.edu] })).status()).toBe(400);   // users only for selected
    const ok = await post('/coupons', { ...base, users: [EMAIL.edu, EMAIL.mavish] });
    expect(ok.status()).toBe(201);
    const made = (await ok.json()).data;
    expect(made.users.map((u: { email: string }) => u.email).sort()).toEqual([EMAIL.edu, EMAIL.mavish].sort());
    expect(made.users.every((u: { id: string }) => u.id.startsWith('user_'))).toBe(true);
    // the ids are stored, the e-mails are not
    const row = (await adminDb().from('coupons').select('user_ids').eq('code', 'QAAPI-SEL').single()).data!;
    expect(row.user_ids).toEqual(expect.arrayContaining([await clerkUserId(EMAIL.edu), await clerkUserId(EMAIL.mavish)]));
    // list shows a count, not the people
    const listed = (await (await admin.request.get(`${BASE}/coupons?q=QAAPI-SEL`)).json()).data.items[0];
    expect(listed.userCount).toBe(2);
    expect(JSON.stringify(listed)).not.toContain(EMAIL.edu);
    // replace the list, then add someone back
    const one = (await (await patch('QAAPI-SEL', { users: [EMAIL.mavish] })).json()).data;
    expect(one.users.map((u: { email: string }) => u.email)).toEqual([EMAIL.mavish]);
    expect((await patch('QAAPI-SEL', { users: [] })).status()).toBe(400);
    expect((await getCoupon('QAAPI-SEL')).users).toHaveLength(1);
    // the people picker
    const picker = (await (await admin.request.get(`${BASE}/learners?q=${encodeURIComponent(EMAIL.edu)}`)).json()).data.items;
    expect(picker.map((p: { email: string }) => p.email)).toContain(EMAIL.edu);
  });

  test('[AAPI-CPN-006] generate many one-time codes at once; they are unique, random, unused and expire; a retry with the same key returns the same batch', async () => {
    const body = { count: 25, discount: pct(100), expiresAt: future(14) };
    const res = await post('/coupons/generate', body, { 'Idempotency-Key': 'qaaapi-gen-0001' });
    expect(res.status()).toBe(201);
    const data = (await res.json()).data;
    expect(data.count).toBe(25);
    const codes = data.codes.map((c: { code: string }) => c.code);
    expect(new Set(codes).size).toBe(25);
    for (const code of codes) expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/);
    expect(data.codes.every((c: { kind: string; state: string; maxRedemptions: number }) => c.kind === 'single-use' && c.state === 'unused' && c.maxRedemptions === 1)).toBe(true);
    const again = await post('/coupons/generate', body, { 'Idempotency-Key': 'qaaapi-gen-0001' });
    expect(again.status()).toBe(200);
    const repeat = (await again.json()).data;
    expect(repeat.repeated).toBe(true);
    expect(repeat.codes.map((c: { code: string }) => c.code).sort()).toEqual([...codes].sort());
    for (const bad of [{ ...body, count: 0 }, { ...body, count: 201 }, { ...body, count: 2.5 }, { ...body, expiresAt: undefined }, { ...body, expiresAt: '2020-01-01T00:00:00Z' }]) {
      expect((await post('/coupons/generate', bad, { 'Idempotency-Key': 'qaaapi-gen-0005' })).status(), JSON.stringify(bad).slice(0, 50)).toBe(400);
    }
    expect((await post('/coupons/generate', body, { 'Idempotency-Key': 'x y' })).status()).toBe(400);
    // a different key makes a different batch
    const other = (await (await post('/coupons/generate', { ...body, count: 3 }, { 'Idempotency-Key': 'qaaapi-gen-0002' })).json()).data.codes.map((c: { code: string }) => c.code);
    expect(other.some((c: string) => codes.includes(c))).toBe(false);
  });

  test('[AAPI-CPN-010] the list shows each state: unused, voided, expired, active, inactive; used codes cannot be changed or deleted', async () => {
    const gen = (await (await post('/coupons/generate', { count: 3, discount: pct(30), expiresAt: future(3) }, { 'Idempotency-Key': 'qaaapi-gen-0003' })).json()).data.codes.map((c: { code: string }) => c.code);
    const [a, b, c] = gen as string[];
    expect((await getCoupon(a)).state).toBe('unused');
    expect((await (await patch(b, { active: false })).json()).data.state).toBe('voided');
    await adminDb().from('coupons').update({ expires_at: new Date(Date.now() - 3600_000).toISOString() }).eq('code', c);
    expect((await getCoupon(c)).state).toBe('expired');
    const byState = async (state: string) => (await (await admin.request.get(`${BASE}/coupons?state=${state}&limit=100`)).json()).data.items.map((x: { code: string }) => x.code);
    expect(await byState('voided')).toContain(b);
    expect(await byState('expired')).toContain(c);
    // normal coupons: inactive and expired
    await post('/coupons', { code: 'QAAPI-STATE', kind: 'everyone', discount: pct(5), expiresAt: future(2) });
    expect((await (await patch('QAAPI-STATE', { active: false })).json()).data.state).toBe('inactive');
    expect((await (await patch('QAAPI-STATE', { active: true, expiresAt: future(9) })).json()).data.state).toBe('active');
    // a redeemed one-time code is frozen
    await adminDb().from('coupons').update({ redeemed_by: 'user_qa', redeemed_at: new Date().toISOString(), redemptions: 1 }).eq('code', a);
    expect((await getCoupon(a))).toMatchObject({ state: 'redeemed', redeemedBy: 'user_qa' });
    expect((await patch(a, { active: false })).status()).toBe(422);
    expect((await admin.request.delete(`${BASE}/coupons/${a}`)).status()).toBe(422);
    // an unused one can be deleted
    expect((await admin.request.delete(`${BASE}/coupons/${b}`)).status()).toBe(200);
    expect((await admin.request.get(`${BASE}/coupons/${b}`)).status()).toBe(404);
  });

  test('[AAPI-CPN-011][AAPI-COH-004] a discount that would leave an amount above zero and below the minimum is refused, from both sides', async () => {
    await admin.request.post(`${BASE}/courses`, { data: course('qa-aapi-cp-course') });
    expect((await admin.request.post(`${BASE}/cohorts`, { data: cohort('qa-aapi-cp-co', 'qa-aapi-cp-course', { pricing: plansPricing() }) })).status()).toBe(201);   // community 1999, personal 2999
    // fixed 1998.6 on 1999 leaves 0.4 -> refused; scoped to another plan it is fine
    const bad = await post('/coupons', { code: 'QAAPI-TINY', kind: 'everyone', discount: fixed(1998.6), expiresAt: future(5), appliesTo: { cohortSlugs: ['qa-aapi-cp-co'], planIds: ['community'] } });
    expect(bad.status()).toBe(422);
    expect((await bad.json()).error.message).toMatch(/0\.4 INR.*plan community/);
    expect((await post('/coupons', { code: 'QAAPI-TINY', kind: 'everyone', discount: fixed(1998.6), expiresAt: future(5), appliesTo: { cohortSlugs: ['qa-aapi-cp-co'], planIds: ['personal'] } })).status()).toBe(201);
    // 99.99 percent of 1999 leaves 0.2
    expect((await post('/coupons', { code: 'QAAPI-TINY2', kind: 'everyone', discount: pct(99.99), expiresAt: future(5), appliesTo: { cohortSlugs: ['qa-aapi-cp-co'] } })).status()).toBe(422);
    // exactly zero (a free course) is allowed: it goes through free enrolment
    expect((await post('/coupons', { code: 'QAAPI-FREE1999', kind: 'everyone', discount: fixed(1999), expiresAt: future(5), appliesTo: { cohortSlugs: ['qa-aapi-cp-co'], planIds: ['community'] } })).status()).toBe(201);
    expect((await post('/coupons', { code: 'QAAPI-FULL', kind: 'everyone', discount: pct(100), expiresAt: future(5), appliesTo: { cohortSlugs: ['qa-aapi-cp-co'] } })).status()).toBe(201);
    // reverse side: the live coupon QAAPI-TINY leaves 2999-1998.6 = 1000.4 on personal; lowering personal to 1998.9 would leave 0.3
    const version = (await (await admin.request.get(`${BASE}/cohorts/qa-aapi-cp-co`)).json()).data.version;
    const lowered = plansPricing(); lowered.plans[1].price.amount = 1998.9;
    const refused = await admin.request.patch(`${BASE}/cohorts/qa-aapi-cp-co`, { data: { pricing: lowered }, headers: { 'If-Match': String(version) } });
    expect(refused.status()).toBe(422);
    expect((await refused.json()).error.message).toMatch(/QAAPI-TINY/);
  });

  test('[AAPI-CPN-013] an optional overall limit and scope can be set; a one-time code cannot change its limit', async () => {
    const res = await post('/coupons', { code: 'QAAPI-LIM', kind: 'everyone', discount: pct(10), expiresAt: future(5), maxRedemptions: 50 });
    expect((await res.json()).data.maxRedemptions).toBe(50);
    expect((await post('/coupons', { code: 'QAAPI-LIM0', kind: 'everyone', discount: pct(10), expiresAt: future(5), maxRedemptions: 0 })).status()).toBe(400);
    const gen = (await (await post('/coupons/generate', { count: 1, discount: pct(10), expiresAt: future(5) }, { 'Idempotency-Key': 'qaaapi-gen-0004' })).json()).data.codes[0].code;
    expect((await patch(gen, { maxRedemptions: 5 })).status()).toBe(400);
  });

  test('[AAPI-AUD-001] coupon changes are audited without leaking people', async () => {
    await post('/coupons', { code: 'QAAPI-AUD', kind: 'selected', discount: pct(10), expiresAt: future(5), users: [EMAIL.edu] });
    await patch('QAAPI-AUD', { active: false });
    await admin.request.delete(`${BASE}/coupons/QAAPI-AUD`);
    const items = (await (await admin.request.get(`${BASE}/audit?resourceId=QAAPI-AUD&limit=10`)).json()).data.items as Array<{ action: string }>;
    expect(items.map((i) => i.action).reverse()).toEqual(['create', 'update', 'delete']);
  });
});
