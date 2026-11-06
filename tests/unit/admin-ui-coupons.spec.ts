import { test, expect } from '@playwright/test';
import {
  addEmail, codesText, couponChanges, couponToEditForm, createBody, createProblems, defaultExpiry, discountFromForm, discountText, discountToForm, editProblems, emptyCreateForm,
  emptyDiscountForm, emptyGenerateForm, expiryProblem, generateBody, generateProblems, newIdempotencyKey, parseEmails, planIdsFrom, scopeOf, scopeText, type CouponLike, type CreateForm,
} from '../../lib/adminUi/coupons';
import { SETTING_META, capsProblem, displayValue, isSettingKey, parseSetting } from '../../lib/adminUi/settings';
import { couponCreateShape, generateShape, couponUpdateShape, MAX_GENERATE } from '../../lib/adminApi/coupons';
import { MAX_EMAILS } from '../../lib/adminUi/coupons';
import { SETTINGS, SETTING_KEYS, assertSettingsConsistent, checkSettingValue } from '../../lib/adminApi/settings';
import { parseObject } from '../../lib/adminApi/validate';

// Unit level (phase 4d-1): the pure helpers behind the coupon and settings screens. No browser, no network.
const NOW = new Date('2026-11-10T12:00:00.000Z');
const pct = { ...emptyDiscountForm(), percent: '20' };
const form = (extra: Partial<CreateForm> = {}): CreateForm => ({ ...emptyCreateForm(NOW), code: 'diwali20', discount: pct, ...extra });
const coupon = (extra: Partial<CouponLike> = {}): CouponLike => ({ kind: 'everyone', discount: { type: 'percentage', percent: 20 }, expiresAt: '2026-12-10T12:00:00.000Z', active: true, ...extra });
const refused = (fn: () => unknown) => { try { fn(); } catch { return true; } return false; };

test.describe('Admin UI coupons and settings @regression', () => {
  test('[ADMUI-UNIT-CPN-001] a pasted e-mail list is split, lower-cased, de-duplicated and checked', () => {
    expect(parseEmails('A@x.com, b@x.com;\nc@x.com  a@X.com')).toEqual({ emails: ['a@x.com', 'b@x.com', 'c@x.com'], invalid: [], tooMany: false });
    expect(parseEmails('good@x.com nope @x.com bad@')).toMatchObject({ emails: ['good@x.com'], invalid: ['nope', '@x.com', 'bad@'] });
    expect(parseEmails('')).toEqual({ emails: [], invalid: [], tooMany: false });
    expect(parseEmails(Array.from({ length: MAX_EMAILS + 1 }, (_, i) => `u${i}@x.com`).join('\n')).tooMany).toBe(true);
    expect(parseEmails(Array.from({ length: MAX_EMAILS }, (_, i) => `u${i}@x.com`).join('\n')).tooMany).toBe(false);
    expect(addEmail('a@x.com', 'B@x.com')).toBe('a@x.com\nb@x.com');
    expect(addEmail('a@x.com', 'A@X.com')).toBe('a@x.com');   // already there
    expect(addEmail('', 'a@x.com')).toBe('a@x.com');
  });

  test('[ADMUI-UNIT-CPN-002] the discount boxes become a discount or a clear message, and read back the same', () => {
    expect(discountFromForm({ ...emptyDiscountForm(), percent: '25' })).toEqual({ ok: true, value: { type: 'percentage', percent: 25 } });
    for (const bad of ['', '0', '101', '-5', 'abc']) expect(discountFromForm({ ...emptyDiscountForm(), percent: bad }).ok, bad).toBe(false);
    expect(discountFromForm({ ...emptyDiscountForm(), percent: '100' }).ok).toBe(true);   // 100% = free, a deliberate choice
    expect(discountFromForm({ type: 'fixed', percent: '', inr: '500', usd: '' })).toEqual({ ok: true, value: { type: 'fixed', inr: 500 } });
    expect(discountFromForm({ type: 'fixed', percent: '', inr: '500', usd: '10.5' })).toEqual({ ok: true, value: { type: 'fixed', inr: 500, usd: 10.5 } });
    for (const bad of [{ inr: '', usd: '' }, { inr: '0', usd: '' }, { inr: 'x', usd: '' }, { inr: '', usd: '-1' }]) expect(discountFromForm({ type: 'fixed', percent: '', ...bad }).ok, JSON.stringify(bad)).toBe(false);
    for (const d of [{ type: 'percentage', percent: 15 }, { type: 'fixed', inr: 300 }, { type: 'fixed', usd: 5, inr: 100 }] as const) {
      const back = discountFromForm(discountToForm(d)); expect(back.ok && back.value).toEqual(d);
    }
    expect(discountText({ type: 'percentage', percent: 20 })).toBe('20% off');
    expect(discountText({ type: 'fixed', inr: 500, usd: 10 })).toBe('₹500 off / $10 off');
    expect(discountText({ type: 'fixed', usd: 10 })).toBe('$10 off');
  });

  test('[ADMUI-UNIT-CPN-003] expiry is mandatory and must be in the future; the default is 30 days ahead', () => {
    expect(expiryProblem('', NOW)).toMatch(/required/);
    expect(expiryProblem('garbage', NOW)).toMatch(/valid/);
    expect(expiryProblem(defaultExpiry(NOW), NOW)).toBeNull();
    expect(expiryProblem(defaultExpiry(new Date(NOW.getTime() - 40 * 86_400_000)), NOW)).toMatch(/future/);
    const past = new Date(NOW.getTime() - 60_000); const pad = (n: number) => String(n).padStart(2, '0');
    expect(expiryProblem(`${past.getFullYear()}-${pad(past.getMonth() + 1)}-${pad(past.getDate())}T${pad(past.getHours())}:${pad(past.getMinutes())}`, NOW)).toMatch(/future/);
  });

  test('[ADMUI-UNIT-CPN-004] what the create form sends is accepted by the server\'s own validator, and a bad form lists every problem', () => {
    const ok = parseObject(createBody(form()), couponCreateShape);
    expect(ok).toMatchObject({ code: 'DIWALI20', kind: 'everyone', discount: { type: 'percentage', percent: 20 } });
    expect(createProblems(form(), NOW)).toEqual([]);
    const sel = form({ kind: 'selected', usersText: 'a@x.com\nb@x.com', maxRedemptions: '5', cohortSlugs: ['py-1'], planIds: 'community, personal' });
    expect(createBody(sel)).toMatchObject({ kind: 'selected', users: ['a@x.com', 'b@x.com'], maxRedemptions: 5, appliesTo: { cohortSlugs: ['py-1'], planIds: ['community', 'personal'] } });
    expect(parseObject(createBody(sel), couponCreateShape)).toMatchObject({ kind: 'selected', users: ['a@x.com', 'b@x.com'] });
    expect(createBody(form())).not.toHaveProperty('users');   // an "everyone" coupon never sends students
    expect(createBody(form())).not.toHaveProperty('appliesTo');
    const probs = createProblems(form({ code: 'ab', discount: emptyDiscountForm(), expiresAt: '', kind: 'selected', usersText: 'nope', maxRedemptions: '0', planIds: 'Bad!' }), NOW);
    expect(probs.length).toBeGreaterThanOrEqual(6);
    expect(probs.join(' ')).toMatch(/4 to 40/); expect(probs.join(' ')).toMatch(/percentage/); expect(probs.join(' ')).toMatch(/expires/); expect(probs.join(' ')).toMatch(/Not an e-mail/); expect(probs.join(' ')).toMatch(/whole number/); expect(probs.join(' ')).toMatch(/Not a plan id/);
    expect(createProblems(form({ kind: 'selected', usersText: '' }), NOW)).toContain('Add at least one student e-mail');
    expect(refused(() => createBody(form({ discount: emptyDiscountForm() })))).toBe(true);
  });

  test('[ADMUI-UNIT-CPN-005] generating: the count is 1 to 200, the body is accepted by the server\'s validator, and the idempotency key is safe', () => {
    const g = emptyGenerateForm(NOW);
    expect(generateProblems({ ...g, discount: pct }, NOW)).toEqual([]);
    for (const bad of ['', '0', '201', '2.5', 'abc']) expect(generateProblems({ ...g, discount: pct, count: bad }, NOW).join(' '), bad).toMatch(/whole number from 1 to 200/);
    expect(MAX_GENERATE).toBe(200);
    expect(generateProblems({ ...g, discount: pct, count: '200' }, NOW)).toEqual([]);
    expect(parseObject(generateBody({ ...g, discount: pct, count: '25' }), generateShape)).toMatchObject({ count: 25, discount: { percent: 20 } });
    expect(generateBody({ ...g, discount: pct, cohortSlugs: ['py-1'] })).toMatchObject({ appliesTo: { cohortSlugs: ['py-1'] } });
    const key = newIdempotencyKey(() => '123e4567-e89b-12d3-a456-426614174000');
    expect(key).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
    expect(newIdempotencyKey(() => 'a-b-c-d-e-f-g-h')).toMatch(/^ui-[A-Za-z0-9]+$/);
    expect(codesText([{ code: 'AAAA1111BB' }, { code: 'CCCC2222DD' }])).toBe('AAAA1111BB\nCCCC2222DD');
    expect(refused(() => generateBody({ ...g, count: '5' }))).toBe(true);
  });

  test('[ADMUI-UNIT-CPN-006] scope: plan ids and cohort picks become the API\'s appliesTo, or nothing', () => {
    expect(planIdsFrom('Community, personal; community')).toEqual({ ids: ['community', 'personal'], invalid: [] });
    expect(planIdsFrom('ok bad_ Bad!')).toMatchObject({ invalid: ['bad!'] });
    expect(scopeOf([], [])).toBeUndefined();
    expect(scopeOf(['a'], [])).toEqual({ cohortSlugs: ['a'] });
    expect(scopeOf([], ['p'])).toEqual({ planIds: ['p'] });
    expect(scopeText(undefined)).toBe('Every cohort and plan');
    expect(scopeText({ cohortSlugs: [], planIds: [] })).toBe('Every cohort and plan');
    expect(scopeText({ cohortSlugs: ['a', 'b'], planIds: ['p'] })).toBe('Cohorts: a, b · Plans: p');
  });

  test('[ADMUI-UNIT-CPN-007] changing a coupon sends only what changed, never an empty limit, and the result passes the server\'s update validator', () => {
    const c = coupon({ maxRedemptions: 10 });
    const base = couponToEditForm(c);
    expect(couponChanges(c, base)).toEqual({});
    expect(couponChanges(c, { ...base, discount: { ...base.discount, percent: '30' } })).toEqual({ discount: { type: 'percentage', percent: 30 } });
    expect(couponChanges(c, { ...base, maxRedemptions: '20' })).toEqual({ maxRedemptions: 20 });
    expect(couponChanges(c, { ...base, maxRedemptions: '' })).toEqual({});   // the API cannot clear a limit
    const later = couponChanges(c, { ...base, expiresAt: defaultExpiry(new Date(NOW.getTime() + 400 * 86_400_000)) });
    expect(Object.keys(later)).toEqual(['expiresAt']);
    expect(parseObject(later, couponUpdateShape)).toHaveProperty('expiresAt');
    // the database returns jsonb with its own key order: the same discount must still count as unchanged
    const dbOrder = coupon({ discount: JSON.parse('{"inr":300,"type":"fixed"}') });
    expect(couponChanges(dbOrder, couponToEditForm(dbOrder))).toEqual({});
    const sel = coupon({ kind: 'selected', users: [{ email: 'a@x.com' }, { email: 'b@x.com' }] });
    const sf = couponToEditForm(sel);
    expect(sf.usersText).toBe('a@x.com\nb@x.com');
    expect(couponChanges(sel, { ...sf, usersText: 'b@x.com\na@x.com' })).toEqual({});   // same people, other order
    expect(couponChanges(sel, { ...sf, usersText: 'a@x.com\nc@x.com' })).toEqual({ users: ['a@x.com', 'c@x.com'] });
    expect(couponChanges(coupon({ kind: 'single-use' }), { ...couponToEditForm(coupon({ kind: 'single-use' })), maxRedemptions: '5' })).toEqual({});   // a one-time code stays one use
    expect(editProblems(sel, { ...sf, usersText: '' }, NOW)).toEqual(['A selected-students coupon needs at least one e-mail']);
    expect(editProblems(c, { ...base, discount: { ...base.discount, percent: '0' } }, NOW)[0]).toMatch(/percentage/);
    expect(editProblems(c, { ...base, expiresAt: '2020-01-01T00:00' }, NOW)[0]).toMatch(/future/);
    expect(editProblems(c, base, NOW)).toEqual([]);   // an unchanged (already past) expiry is not re-checked
  });

  test('[ADMUI-UNIT-SET-001] the four settings: typed values become API values and agree with the server\'s own checks, boundaries included', () => {
    expect(SETTING_META.map((m) => m.key)).toEqual(SETTING_KEYS);
    for (const m of SETTING_META) { expect(isSettingKey(m.key)).toBe(true); expect(m.clearable).toBe(SETTINGS[m.key].nullable); }
    expect(isSettingKey('nope')).toBe(false);
    const cases: Array<[Parameters<typeof parseSetting>[0], string]> = [
      ['announcement-email-cap', '0'], ['announcement-email-cap', '1'], ['announcement-email-cap', '200'], ['announcement-email-cap', '201'], ['announcement-email-cap', '1.5'], ['announcement-email-cap', 'abc'], ['announcement-email-cap', ''],
      ['daily-email-cap', '0'], ['daily-email-cap', '1'], ['daily-email-cap', '500'], ['daily-email-cap', '501'],
      ['support-phone', '+91 98765 43210'], ['support-phone', '12345'], ['support-phone', 'call me'], ['support-phone', ''],
      ['support-email', 'help@example.com'], ['support-email', 'Help@Example.com'], ['support-email', 'nope'], ['support-email', ''],
    ];
    for (const [key, text] of cases) {
      const mine = parseSetting(key, text);
      let serverOk = true; let serverValue: unknown;
      try { serverValue = checkSettingValue(key, mine.ok ? mine.value : text === '' ? null : text); } catch { serverOk = false; }
      expect(mine.ok, `${key} "${text}"`).toBe(serverOk);
      if (mine.ok && serverOk) expect(serverValue, `${key} "${text}"`).toBe(mine.value);
    }
    expect(parseSetting('support-phone', '  ')).toEqual({ ok: true, value: null });
    expect(parseSetting('support-email', 'Help@Example.com')).toEqual({ ok: true, value: 'help@example.com' });
    expect(parseSetting('daily-email-cap', ' 120 ')).toEqual({ ok: true, value: 120 });
  });

  test('[ADMUI-UNIT-SET-002] the cap rule matches the server: the announcement limit may equal but not exceed the daily limit', () => {
    expect(capsProblem(50, 200)).toBeNull();
    expect(capsProblem(200, 200)).toBeNull();
    expect(capsProblem(201, 200)).toMatch(/cannot be higher/);
    for (const [a, d] of [[50, 200], [200, 200], [201, 200], [1, 1]] as const) {
      const serverRefuses = refused(() => assertSettingsConsistent({ 'announcement-email-cap': a, 'daily-email-cap': d, 'support-phone': null, 'support-email': null }));
      expect(capsProblem(a, d) !== null, `${a}/${d}`).toBe(serverRefuses);
    }
    expect(displayValue(null)).toBe('not set');
    expect(displayValue('')).toBe('not set');
    expect(displayValue(0)).toBe('0');
    expect(displayValue(50)).toBe('50');
  });
});
