import { test, expect } from '@playwright/test';
import { discount, discountProblem, newCode, couponState, shapeCoupon, couponCreateShape, couponUpdateShape, generateShape, CODE_PATTERN, MAX_GENERATE, GENERATED_CODE_LENGTH } from '../../lib/adminApi/coupons';
import { checkPricing, priceList, buildCohortDoc, publicCohort, cohortCreateShape, type Pricing } from '../../lib/adminApi/cohorts';
import { COURSE_ACTIONS, courseCreateShape } from '../../lib/adminApi/courses';
import { shape } from '../../lib/adminApi/docStore';
import { ifMatchVersion, listParams, likeSafe } from '../../lib/adminApi/request';
import { ApiError, handle } from '../../lib/adminApi/envelope';
import { parseObject } from '../../lib/adminApi/validate';
import { discountedAmount } from '../../lib/adminApi/payMinimum';
import { buildOpenApi, OPERATIONS } from '../../lib/adminApi/openapi';

// Unit level: the admin API's business rules, with no database, no network and no Clerk.
const FUTURE = '2099-01-01T00:00:00Z';
const single = (inr: number, usd?: number): Pricing => ({ kind: 'single', inr: { amount: inr }, ...(usd !== undefined ? { usd: { amount: usd } } : {}) });
const plans = (...p: Array<[string, number]>): Pricing => ({ kind: 'plans', currency: 'INR', plans: p.map(([id, amount]) => ({ id, name: id, price: { amount }, features: [] })) });
const refusal = (fn: () => unknown): ApiError => { try { fn(); } catch (e) { return e as ApiError; } throw new Error('expected a refusal'); };

test.describe('AAPI rules @regression', () => {
  test('[AAPI-UNIT-CPN-001] discounts: percentage 1..100, fixed needs inr or usd, bad shapes refused', () => {
    expect(discount({ type: 'percentage', percent: 20 }).ok).toBe(true);
    expect(discount({ type: 'percentage', percent: 100 }).ok).toBe(true);
    expect(discount({ type: 'fixed', inr: 200 }).ok).toBe(true);
    expect(discount({ type: 'fixed', usd: 3 }).ok).toBe(true);
    for (const bad of [{ type: 'percentage', percent: 0 }, { type: 'percentage', percent: 101 }, { type: 'percentage', percent: '20' }, { type: 'fixed' }, { type: 'fixed', inr: -5 },
      { type: 'fixed', inr: 0 }, { type: 'other', percent: 5 }, { type: 'percentage', percent: 5, extra: 1 }, null, 'x', 5])
      expect(discount(bad).ok, JSON.stringify(bad)).toBe(false);
  });

  test('[AAPI-UNIT-CPN-002] coupon create: code is upper-cased, expiry is mandatory and future, kind is one of three', () => {
    const base = { code: 'welcome20', kind: 'everyone', discount: { type: 'percentage', percent: 20 }, expiresAt: FUTURE };
    expect(parseObject(base, couponCreateShape)).toMatchObject({ code: 'WELCOME20', kind: 'everyone' });
    const { expiresAt: _e, ...noExpiry } = base;
    expect(refusal(() => parseObject(noExpiry, couponCreateShape)).fields).toHaveProperty('expiresAt');
    expect(refusal(() => parseObject({ ...base, expiresAt: '2020-01-01T00:00:00Z' }, couponCreateShape)).fields).toHaveProperty('expiresAt');
    expect(refusal(() => parseObject({ ...base, kind: 'vip' }, couponCreateShape)).fields).toHaveProperty('kind');
    for (const code of ['abc', 'has space', 'bad!code', 'x'.repeat(41)]) expect(refusal(() => parseObject({ ...base, code }, couponCreateShape)).fields, code).toHaveProperty('code');
    for (const kind of ['everyone', 'selected', 'single-use']) expect(parseObject({ ...base, kind, users: kind === 'selected' ? ['a@b.co'] : undefined }, couponCreateShape).kind).toBe(kind);
    expect(refusal(() => parseObject({ ...base, kind: 'selected', users: ['not-an-email'] }, couponCreateShape)).fields).toHaveProperty('users');
    expect(refusal(() => parseObject({ ...base, maxRedemptions: 0 }, couponCreateShape)).fields).toHaveProperty('maxRedemptions');
  });

  test('[AAPI-UNIT-CPN-003] coupon update and generate shapes', () => {
    expect(parseObject({ active: false }, couponUpdateShape)).toEqual({ active: false });
    expect(parseObject({ active: true, expiresAt: FUTURE }, couponUpdateShape)).toMatchObject({ active: true });
    expect(refusal(() => parseObject({ active: 'no' }, couponUpdateShape)).fields).toHaveProperty('active');
    expect(refusal(() => parseObject({ code: 'NEW1' }, couponUpdateShape)).fields).toHaveProperty('code');   // the code can never change
    const g = { count: 25, discount: { type: 'fixed', inr: 500 }, expiresAt: FUTURE };
    expect(parseObject(g, generateShape).count).toBe(25);
    for (const count of [0, -1, MAX_GENERATE + 1, 1.5, '5']) expect(refusal(() => parseObject({ ...g, count }, generateShape)).fields, String(count)).toHaveProperty('count');
    expect(parseObject({ ...g, count: MAX_GENERATE }, generateShape).count).toBe(MAX_GENERATE);
  });

  test('[AAPI-UNIT-CPN-004] generated codes: right length and alphabet (no 0 O 1 I L), valid pattern, no repeats in a large batch', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const c = newCode();
      expect(c).toHaveLength(GENERATED_CODE_LENGTH);
      expect(c).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/);
      expect(CODE_PATTERN.test(c)).toBe(true);
      seen.add(c);
    }
    expect(seen.size).toBe(2000);
  });

  test('[AAPI-UNIT-CPN-005] coupon state for every kind', () => {
    const now = Date.parse('2027-01-01T00:00:00Z');
    const row = (o: object): any => ({ code: 'X', kind: 'everyone', discount: { type: 'percentage', percent: 10 }, expires_at: '2027-06-01T00:00:00Z', active: true, user_ids: [], applies_to: null, max_redemptions: null,
      redemptions: 0, reserved_by: null, reserved_until: null, redeemed_by: null, redeemed_at: null, batch_id: null, created_by: 'a', created_at: '2026-11-01T00:00:00Z', ...o });
    expect(couponState(row({}), now)).toBe('active');
    expect(couponState(row({ active: false }), now)).toBe('inactive');
    expect(couponState(row({ expires_at: '2026-12-31T00:00:00Z' }), now)).toBe('expired');
    const once = { kind: 'single-use' };
    expect(couponState(row(once), now)).toBe('unused');
    expect(couponState(row({ ...once, reserved_by: 'u1', reserved_until: '2027-01-01T00:10:00Z' }), now)).toBe('reserved');
    expect(couponState(row({ ...once, reserved_by: 'u1', reserved_until: '2026-12-31T23:00:00Z' }), now)).toBe('unused');   // hold ran out
    expect(couponState(row({ ...once, redeemed_at: '2026-12-01T00:00:00Z' }), now)).toBe('redeemed');
    expect(couponState(row({ ...once, active: false }), now)).toBe('voided');
    expect(couponState(row({ ...once, redeemed_at: '2026-12-01T00:00:00Z', active: false }), now)).toBe('redeemed');
    expect(couponState(row({ ...once, expires_at: '2026-12-31T00:00:00Z' }), now)).toBe('expired');
  });

  test('[AAPI-UNIT-CPN-006] a selected coupon shows its students; the others carry no student list', () => {
    const r: any = { code: 'S', kind: 'selected', discount: { type: 'percentage', percent: 10 }, expires_at: FUTURE, active: true, user_ids: ['user_1'], applies_to: null, max_redemptions: null, redemptions: 0,
      reserved_by: null, reserved_until: null, redeemed_by: null, redeemed_at: null, batch_id: null, created_by: 'a', created_at: 'x' };
    expect((shapeCoupon(r) as any).users).toEqual([{ id: 'user_1', email: null, name: '' }]);
    expect(shapeCoupon({ ...r, kind: 'everyone' })).not.toHaveProperty('users');
    expect(shapeCoupon({ ...r, kind: 'single-use' })).not.toHaveProperty('users');
  });

  test('[AAPI-UNIT-PRC-001] discount arithmetic matches checkout (percentage, fixed per currency, never below zero)', () => {
    expect(discountedAmount(1999, { type: 'percentage', percent: 20 }, 'INR')).toBe(1599.2);
    expect(discountedAmount(1999, { type: 'fixed', inr: 200 }, 'INR')).toBe(1799);
    expect(discountedAmount(25, { type: 'fixed', inr: 200 }, 'USD')).toBe(25);   // no usd amount: price unchanged
    expect(discountedAmount(100, { type: 'fixed', inr: 500 }, 'INR')).toBe(0);
    expect(discountedAmount(1999, { type: 'percentage', percent: 100 }, 'INR')).toBe(0);
  });

  test('[AAPI-UNIT-PRC-002] a discount that leaves more than 0 and less than 1 is found; exactly 0 and exactly 1 are fine', () => {
    const p = plans(['community', 1999], ['personal', 2999]);
    expect(discountProblem({ type: 'fixed', inr: 1998.6 }, { cohortSlugs: ['b2'], planIds: ['community'] }, 'b2', p)).toMatchObject({ label: 'plan community', result: 0.4 });
    expect(discountProblem({ type: 'fixed', inr: 1999 }, { cohortSlugs: ['b2'], planIds: ['community'] }, 'b2', p)).toBeNull();
    expect(discountProblem({ type: 'fixed', inr: 1998 }, { cohortSlugs: ['b2'], planIds: ['community'] }, 'b2', p)).toBeNull();   // leaves exactly 1
    expect(discountProblem({ type: 'percentage', percent: 100 }, null, 'b2', p)).toBeNull();
    expect(discountProblem({ type: 'percentage', percent: 99.99 }, null, 'b2', plans(['a', 50]))).toMatchObject({ result: 0.01 });
  });

  test('[AAPI-UNIT-PRC-003] a discount only looks at the cohorts, plans and currencies it covers', () => {
    const p = plans(['community', 1999], ['personal', 2999]);
    expect(discountProblem({ type: 'fixed', inr: 1998.6 }, { cohortSlugs: ['other'] }, 'b2', p)).toBeNull();                  // another cohort
    expect(discountProblem({ type: 'fixed', inr: 1998.6 }, { planIds: ['personal'] }, 'b2', p)).toBeNull();                  // another plan (2999 - 1998.6 = 1000.4)
    expect(discountProblem({ type: 'fixed', inr: 1998.6 }, { planIds: ['community'] }, 'b2', p)).not.toBeNull();
    expect(discountProblem({ type: 'fixed', usd: 24.5 }, null, 'b1', single(1999, 25))).toMatchObject({ currency: 'USD', result: 0.5 });
    expect(discountProblem({ type: 'fixed', usd: 24.5 }, null, 'b1', single(1999))).toBeNull();                              // no USD price
    expect(discountProblem({ type: 'fixed', inr: 1998.6 }, { planIds: ['community'] }, 'b1', single(1999))).toBeNull();       // single price has no plan
  });

  test('[AAPI-UNIT-COH-001] pricing check: 0 is free, below 1 refused, plan ids unique, original not below price', () => {
    expect(() => checkPricing(single(0))).not.toThrow();
    expect(() => checkPricing(single(1))).not.toThrow();
    expect(() => checkPricing(single(1999, 25))).not.toThrow();
    for (const bad of [single(0.4), single(1999, 0.5), plans(['a', 0.99]), plans(['a', 100], ['a', 200]), { kind: 'single', inr: { amount: 100, original: 50 } } as Pricing])
      expect(refusal(() => checkPricing(bad)).status, JSON.stringify(bad)).toBe(400);
  });

  test('[AAPI-UNIT-COH-002] cohort create: single and plans pricing, 1 to 6 plans, https-only links, phone format', () => {
    const base = { slug: 'demo-b1', courseSlug: 'demo', title: 'Batch 1', pricing: single(1999, 25) };
    expect(parseObject(base, cohortCreateShape).slug).toBe('demo-b1');
    expect(parseObject({ ...base, pricing: plans(['a', 100]), whatsappLink: 'https://chat.whatsapp.com/x', liveLink: '' }, cohortCreateShape).liveLink).toBe('');
    const many = { kind: 'plans', currency: 'INR', plans: Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, name: 'P', price: { amount: 10 }, features: [] })) };
    for (const [k, v] of [['pricing', many], ['pricing', { kind: 'plans', currency: 'INR', plans: [] }], ['pricing', { kind: 'free' }], ['pricing', { kind: 'single', inr: { amount: -1 } }],
      ['whatsappLink', 'http://insecure.example'], ['liveLink', 'javascript:alert(1)'], ['contactPhone', 'call me'], ['startsAt', 'tomorrow'], ['slug', 'Bad Slug']] as const)
      expect(refusal(() => parseObject({ ...base, [k]: v }, cohortCreateShape)).fields, k).toHaveProperty(k);
  });

  test('[AAPI-UNIT-COH-003] priceList labels every chargeable price', () => {
    expect(priceList(single(1999, 25))).toEqual([{ label: 'INR price', amount: 1999, currency: 'INR', planId: null }, { label: 'USD price', amount: 25, currency: 'USD', planId: null }]);
    expect(priceList(plans(['a', 100], ['b', 200])).map((x) => x.planId)).toEqual(['a', 'b']);
  });

  test('[AAPI-UNIT-COH-004] cohort document: links are private, defaults applied, a later update keeps untouched links', () => {
    const created = buildCohortDoc({ slug: 'b1', title: 'T', pricing: single(10), whatsappLink: 'https://w.example/x', liveLink: 'https://l.example/y' });
    expect(created).toMatchObject({ title: 'T', enrollmentClosed: false, listed: true, private: { whatsappLink: 'https://w.example/x', liveLink: 'https://l.example/y' } });
    expect(created).not.toHaveProperty('slug');
    expect(created).not.toHaveProperty('whatsappLink');
    const updated = buildCohortDoc({ duration: '8 Weeks', liveLink: '' }, created);
    expect(updated.private).toEqual({ whatsappLink: 'https://w.example/x', liveLink: '' });
    expect(updated.duration).toBe('8 Weeks');
    expect(publicCohort(updated)).not.toHaveProperty('private');
    expect(buildCohortDoc({ enrollmentClosed: true }, created).enrollmentClosed).toBe(true);
  });

  test('[AAPI-UNIT-DOC-001] a normal read never returns the private part', () => {
    const row: any = { kind: 'cohort', key: 'b1', status: 'draft', version: 3, doc: { title: 'T', private: { whatsappLink: 'https://secret.example' } }, created_by: 'a', updated_by: 'a', created_at: 'c', updated_at: 'u' };
    const out = shape(row);
    expect(out).toMatchObject({ slug: 'b1', status: 'draft', version: 3, title: 'T' });
    expect(JSON.stringify(out)).not.toContain('secret.example');
  });

  test('[AAPI-UNIT-CRS-001] course create/update shapes and the pitch limits', () => {
    expect(parseObject({ slug: 'demo', title: 'T', pitch: { a: ['x'] } }, courseCreateShape).slug).toBe('demo');
    const pitchFault = (pitch: unknown) => refusal(() => parseObject({ slug: 'demo', title: 'T', pitch }, courseCreateShape)).fields;
    expect(pitchFault('x'.repeat(10))).toHaveProperty('pitch');                                  // must be an object
    expect(pitchFault(['a'])).toHaveProperty('pitch');
    expect(pitchFault({ long: 'x'.repeat(4001) })).toHaveProperty('pitch');                      // one text too long
    let deep: any = {}; for (let i = 0; i < 12; i++) deep = { n: deep };
    expect(pitchFault(deep)).toHaveProperty('pitch');                                            // nested too deeply
    expect(pitchFault({ list: Array.from({ length: 30 }, () => 'x'.repeat(4000)) })).toHaveProperty('pitch');   // 120,000 characters in total
    expect(pitchFault({ fn: () => 1 })).toHaveProperty('pitch');                                 // not plain data
    expect(parseObject({ slug: 'demo', title: 'T', pitch: { list: Array.from({ length: 20 }, () => 'x'.repeat(4000)) } }, courseCreateShape).pitch).toBeDefined();   // 80,000: allowed
  });

  test('[AAPI-UNIT-STS-001] status transitions: only the allowed steps', () => {
    const can = (action: string, from: string) => (COURSE_ACTIONS[action].from as string[]).includes(from);
    expect(can('publish', 'draft')).toBe(true);   expect(can('publish', 'published')).toBe(false);  expect(can('publish', 'archived')).toBe(false);
    expect(can('unpublish', 'published')).toBe(true); expect(can('unpublish', 'draft')).toBe(false);
    expect(can('archive', 'draft')).toBe(true);   expect(can('archive', 'published')).toBe(true);   expect(can('archive', 'archived')).toBe(false);
    expect(can('restore', 'archived')).toBe(true); expect(can('restore', 'draft')).toBe(false);
    expect(Object.fromEntries(Object.entries(COURSE_ACTIONS).map(([k, v]) => [k, v.to]))).toEqual({ publish: 'published', unpublish: 'draft', archive: 'archived', restore: 'draft' });
  });

  test('[AAPI-UNIT-REQ-001] If-Match: required (428), must be a version number (400), quotes allowed', () => {
    const req = (h?: string) => new Request('http://x/api', { headers: h === undefined ? {} : { 'if-match': h } });
    expect(refusal(() => ifMatchVersion(req())).status).toBe(428);
    expect(ifMatchVersion(req('3'))).toBe(3);
    expect(ifMatchVersion(req('"4"'))).toBe(4);
    for (const bad of ['0', '-1', 'abc', '1.5', '']) expect(refusal(() => ifMatchVersion(req(bad))).status, bad).toBe(400);
  });

  test('[AAPI-UNIT-REQ-002] list parameters: defaults, limit 1..100, long values refused, empty means none', () => {
    const url = (q: string) => new Request(`http://x/api?${q}`);
    expect(listParams(url(''))).toEqual({ limit: 25, cursor: null, q: null, status: null });
    expect(listParams(url('limit=100&q=py&status=draft&cursor=abc'))).toEqual({ limit: 100, cursor: 'abc', q: 'py', status: 'draft' });
    expect(listParams(url('q=')).q).toBeNull();
    for (const bad of ['limit=0', 'limit=101', 'limit=abc', 'limit=1.5', `q=${'x'.repeat(101)}`, `cursor=${'x'.repeat(301)}`]) expect(refusal(() => listParams(url(bad))).status, bad).toBe(400);
    expect(likeSafe('a%b_c,d(e)')).toBe('a b c d e');
  });

  test('[AAPI-UNIT-ENV-001] errors become the standard envelope; unexpected errors show no details', async () => {
    const known = await handle(async () => { throw new ApiError(422, 'rule_violation', 'Nope', { a: 'b' }); });
    expect(known.status).toBe(422);
    expect(await known.json()).toEqual({ success: false, error: { code: 'rule_violation', message: 'Nope', fields: { a: 'b' } } });
    const origError = console.error; console.error = () => {};
    try {
      const unknown = await handle(async () => { throw new Error('password=hunter2 at /srv/app/secret.ts'); });
      expect(unknown.status).toBe(500);
      const body = JSON.stringify(await unknown.json());
      expect(body).toContain('internal_error');
      expect(body).not.toMatch(/hunter2|secret\.ts/);
    } finally { console.error = origError; }
    const fine = await handle(async () => Response.json({ success: true, data: 1 }) as any);
    expect(fine.status).toBe(200);
  });

  test('[AAPI-UNIT-OAS-001] the OpenAPI document: valid version, every operation has a security rule and a documented path', () => {
    const doc: any = buildOpenApi();
    expect(doc.openapi).toMatch(/^3\./);
    expect(OPERATIONS.length).toBeGreaterThan(20);
    for (const [path, ops] of Object.entries<any>(doc.paths)) {
      expect(path.startsWith('/')).toBe(true);
      for (const op of Object.values<any>(ops)) { expect(op.summary || op.operationId, path).toBeTruthy(); expect(op.responses, path).toBeTruthy(); }
    }
  });
});
