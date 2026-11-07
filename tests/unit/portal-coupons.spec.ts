import { test, expect } from '@playwright/test';
import { evaluateCoupon, MESSAGES, toCheckoutCoupon, type CouponRow } from '../../lib/catalog/couponRules';
import { applyCoupon, getBasePrice } from '../../lib/pricing';
import { chooseSource, pricingSource } from '../../lib/catalog/source';
import { buildCourse, plansFromCohort, sellableFromCohort } from '../../lib/catalog/mapping';
import { boxText } from '../../lib/couponClient';

// Phase 5d (PORTAL_COUPONS=database): pure rules only. The database calls are covered by tests/api/portal-coupons-db.spec.ts.
const NOW = Date.parse('2026-11-10T10:00:00Z');
const row = (o: Partial<CouponRow> = {}): CouponRow => ({
  code: 'WELCOME20', kind: 'everyone', discount: { type: 'percentage', percent: 20 }, expires_at: '2026-12-01T00:00:00Z', active: true, user_ids: [],
  applies_to: null, max_redemptions: null, redemptions: 0, reserved_by: null, reserved_until: null, redeemed_by: null, redeemed_at: null, ...o,
});
const ctx = (o: Record<string, unknown> = {}) => ({ userId: 'user_a', cohortSlug: 'python-batch-3', planId: null, currency: 'INR' as const, basePrice: 2000, now: NOW, ...o });

test.describe('portal coupons: rules @smoke', () => {
  test('PCP-UNIT-001 an open code is accepted and applyCoupon takes the percentage off', () => {
    const v = evaluateCoupon(row(), ctx());
    expect(v.ok).toBe(true);
    if (v.ok) { expect(v.kind).toBe('everyone'); expect(applyCoupon(2000, v.coupon, 'INR')).toBe(1600); }
  });

  test('PCP-UNIT-002 a fixed discount is per currency and a missing currency takes nothing off', () => {
    const c = toCheckoutCoupon(row({ discount: { type: 'fixed', inr: 500 } }));
    expect(applyCoupon(2000, c, 'INR')).toBe(1500);
    expect(applyCoupon(30, c, 'USD')).toBe(30);
    expect(applyCoupon(300, toCheckoutCoupon(row({ discount: { type: 'fixed', inr: 5000 } })), 'INR')).toBe(0);   // never below zero
  });

  test('PCP-UNIT-003 unknown, switched-off and expired codes are refused with the file rules\' texts', () => {
    expect(evaluateCoupon(null, ctx())).toEqual({ ok: false, status: 400, error: 'Invalid coupon code' });
    expect(evaluateCoupon(row({ active: false }), ctx())).toEqual({ ok: false, status: 400, error: MESSAGES.invalid });
    expect(evaluateCoupon(row({ expires_at: '2026-11-10T09:59:59Z' }), ctx())).toEqual({ ok: false, status: 400, error: MESSAGES.expired });
    expect(evaluateCoupon(row({ expires_at: '2026-11-10T10:00:00Z' }), ctx()).ok).toBe(false);   // expiry instant counts as expired
  });

  test('PCP-UNIT-004 a selected code is only for the picked accounts (403)', () => {
    const r = row({ kind: 'selected', user_ids: ['user_b'] });
    expect(evaluateCoupon(r, ctx())).toEqual({ ok: false, status: 403, error: 'This coupon is not valid for your account.' });
    expect(evaluateCoupon(r, ctx({ userId: 'user_b' })).ok).toBe(true);
  });

  test('PCP-UNIT-005 scope: cohort and plan limits', () => {
    const r = row({ applies_to: { cohortSlugs: ['other-batch'], planIds: ['personal'] } });
    expect(evaluateCoupon(r, ctx())).toEqual({ ok: false, status: 400, error: MESSAGES.wrongCourse });
    const onlyPlan = row({ applies_to: { planIds: ['personal'] } });
    expect(evaluateCoupon(onlyPlan, ctx({ planId: 'community' }))).toEqual({ ok: false, status: 400, error: MESSAGES.wrongPlan });
    expect(evaluateCoupon(onlyPlan, ctx({ planId: null }))).toEqual({ ok: false, status: 400, error: MESSAGES.wrongPlan });
    expect(evaluateCoupon(onlyPlan, ctx({ planId: 'personal' })).ok).toBe(true);
    expect(evaluateCoupon(row({ applies_to: { cohortSlugs: [], planIds: [] } }), ctx()).ok).toBe(true);   // empty lists mean "everything"
  });

  test('PCP-UNIT-006 maxRedemptions stops an open code at the limit', () => {
    expect(evaluateCoupon(row({ max_redemptions: 2, redemptions: 1 }), ctx()).ok).toBe(true);
    expect(evaluateCoupon(row({ max_redemptions: 2, redemptions: 2 }), ctx())).toEqual({ ok: false, status: 400, error: MESSAGES.fullyUsed });
  });

  test('PCP-UNIT-007 one-time codes: used, held by someone else, held by me, hold over', () => {
    const one = (o: Partial<CouponRow>) => row({ kind: 'single-use', ...o });
    expect(evaluateCoupon(one({ redeemed_at: '2026-11-09T00:00:00Z' }), ctx())).toEqual({ ok: false, status: 400, error: MESSAGES.alreadyUsed });
    expect(evaluateCoupon(one({ reserved_by: 'user_b', reserved_until: '2026-11-10T10:20:00Z' }), ctx())).toEqual({ ok: false, status: 400, error: MESSAGES.busy });
    expect(evaluateCoupon(one({ reserved_by: 'user_a', reserved_until: '2026-11-10T10:20:00Z' }), ctx()).ok).toBe(true);
    expect(evaluateCoupon(one({ reserved_by: 'user_b', reserved_until: '2026-11-10T09:59:00Z' }), ctx()).ok).toBe(true);   // hold expired
    expect(evaluateCoupon(one({ redeemed_at: '2026-11-09T00:00:00Z', active: false }), ctx())).toEqual({ ok: false, status: 400, error: MESSAGES.alreadyUsed });   // used wins over switched off
  });

  test('PCP-UNIT-008 a discount that would leave a price between 0 and the payment minimum is refused', () => {
    const r = row({ discount: { type: 'fixed', inr: 1999.5 } });
    expect(evaluateCoupon(r, ctx({ basePrice: 2000 }))).toEqual({ ok: false, status: 400, error: MESSAGES.priceTooLow });
    expect(evaluateCoupon(row({ discount: { type: 'percentage', percent: 100 } }), ctx()).ok).toBe(true);   // free goes through free enrolment
  });
});

test.describe('portal coupons: prices and plans @smoke', () => {
  test('PCP-UNIT-009 pricingSource is database only when catalog and coupons are both database', () => {
    expect(pricingSource('database', 'database')).toBe('database');
    expect(pricingSource('DATABASE ', ' database')).toBe('database');
    expect(pricingSource('files', 'database')).toBe('files');
    expect(pricingSource('database', undefined)).toBe('files');
    expect(pricingSource(undefined, undefined)).toBe('files');
    expect(chooseSource('database')).toBe('database');
  });

  const plansPricing = { kind: 'plans' as const, currency: 'INR' as const, plans: [
    { id: 'community', name: 'Community', price: { amount: 1999, original: 2499 }, features: ['A'] },
    { id: 'personal', name: 'Personal', subtitle: 'Mentor', price: { amount: 2999 }, features: ['A', 'B'], popular: true },
  ] };

  test('PCP-UNIT-010 plans become plan cards and price an order by plan id', () => {
    const plans = plansFromCohort(plansPricing)!;
    expect(plans.map((p) => [p.id, p.price, p.originalPrice, p.isPopular])).toEqual([['community', '₹1,999', '₹2,499', false], ['personal', '₹2,999', undefined, true]]);
    const s = sellableFromCohort('python-batch-3', { title: 'Python', enrollmentClosed: false, pricing: plansPricing })!;
    expect(getBasePrice(s, 'INR', 'personal')).toMatchObject({ ok: true, amount: 2999 });
    expect(getBasePrice(s, 'INR', 'nope')).toEqual({ ok: false, error: 'Please choose a valid plan' });
    expect(getBasePrice(s, 'INR', null).ok).toBe(false);
    expect(getBasePrice(s, 'USD', 'personal')).toEqual({ ok: false, error: 'This course is priced in INR only' });
  });

  test('PCP-UNIT-011 a single-price cohort without a USD price is INR only; with one it prices both', () => {
    const inrOnly = sellableFromCohort('x', { title: 'X', pricing: { kind: 'single', inr: { amount: 1500 } } })!;
    expect(getBasePrice(inrOnly, 'INR')).toMatchObject({ ok: true, amount: 1500 });
    expect(getBasePrice(inrOnly, 'USD')).toEqual({ ok: false, error: 'This course is priced in INR only' });
    const both = sellableFromCohort('x', { title: 'X', pricing: { kind: 'single', inr: { amount: 1500 }, usd: { amount: 19.5 } } })!;
    expect(getBasePrice(both, 'USD')).toMatchObject({ ok: true, amount: 19.5 });
    expect(sellableFromCohort('x', { title: 'X', pricing: { kind: 'weird' } })).toBeNull();
    expect(sellableFromCohort('x', { title: 'X' })).toBeNull();
    expect(inrOnly.enrollmentClosed).toBe(false);
  });

  test('PCP-UNIT-012 the page object carries the plans that price the order (database) or the file\'s plans (files)', () => {
    const cohort = { slug: 'b3', courseSlug: 'py', title: 'B3', pricing: plansPricing };
    const course = { slug: 'py', title: 'Py' };
    const fromDb = buildCourse(cohort, course, 'database', undefined);
    expect(fromDb.pricingPlans.map((p: { id: string }) => p.id)).toEqual(['community', 'personal']);
    const filePlans = [{ id: 'community', name: 'C', price: '₹1999', features: [] }];
    const fromFiles = buildCourse(cohort, course, 'files', { slug: 'b3', enrollmentClosed: false, pricing: { inr: { currentPrice: '₹1999', originalPrice: '', savingsText: '', currencyCode: 'INR' } }, pricingPlans: filePlans });
    expect(fromFiles.pricingPlans).toEqual(filePlans);
    const single = buildCourse({ ...cohort, pricing: { kind: 'single', inr: { amount: 100 } } }, course, 'database', undefined);
    expect('pricingPlans' in single).toBe(false);
  });

  test('PCP-UNIT-013 only a course priced from the portal asks the server for coupons; a fallback to the files behaves like files', () => {
    const cohort = { slug: 'b3', courseSlug: 'py', title: 'B3', pricing: plansPricing };
    const course = { slug: 'py', title: 'Py' };
    expect(buildCourse(cohort, course, 'database', undefined).pricedBy).toBe('database');
    expect('pricedBy' in buildCourse(cohort, course, 'files', undefined)).toBe(false);
  });

  test('PCP-UNIT-014 the coupon box keeps the site\'s wording for the common refusals and shows other server texts as they are', () => {
    expect(boxText(403, 'This coupon is not valid for your account.')).toBe('This coupon is restricted to specific accounts.');
    expect(boxText(400, 'Invalid coupon code')).toBe('Invalid coupon code.');
    expect(boxText(400, 'This coupon has expired.')).toBe('This coupon has expired.');
    expect(boxText(503, undefined)).toBe('Could not check the coupon. Please try again.');
    expect(boxText(401, '')).toBe('Could not check the coupon. Please try again.');
  });
});
