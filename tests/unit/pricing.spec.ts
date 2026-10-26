import { test, expect } from '@playwright/test';
import { activeCourses } from '../../data/courses';
import { activeCoupons } from '../../data/coupons';
import { applyCoupon, formatPrice, parsePrice, resolveCoupon, roundForCurrency, toMinorUnits } from '../../lib/pricing';

// Pure logic tests for lib/pricing.ts — shared by the checkout UI and the payment APIs.
test.describe('lib/pricing @smoke', () => {

  test('parsePrice handles symbols, thousands separators and decimals', () => {
    expect(parsePrice('₹1,999')).toBe(1999);
    expect(parsePrice('₹399')).toBe(399);
    expect(parsePrice('$9.99')).toBe(9.99);   // regression: was parsed as 999
    expect(parsePrice('$25')).toBe(25);
    expect(() => parsePrice('Free')).toThrow();
  });

  test('every configured course price parses', () => {
    for (const course of activeCourses) {
      for (const p of [course.pricing.inr, course.pricing.usd]) {
        expect(Number.isFinite(parsePrice(p.currentPrice)), `${course.slug} ${p.currentPrice}`).toBe(true);
        expect(Number.isFinite(parsePrice(p.originalPrice)), `${course.slug} ${p.originalPrice}`).toBe(true);
      }
    }
  });

  test('rounding: whole rupees, cents for USD', () => {
    expect(roundForCurrency(1599.2, 'INR')).toBe(1599);
    expect(roundForCurrency(7.992, 'USD')).toBe(7.99);
    expect(toMinorUnits(9.99)).toBe(999);
    expect(toMinorUnits(1999)).toBe(199900);
  });

  test('formatPrice keeps integers clean and shows cents when needed', () => {
    expect(formatPrice(1999, 'INR')).toBe('₹1999');
    expect(formatPrice(25, 'USD')).toBe('$25');
    expect(formatPrice(9.99, 'USD')).toBe('$9.99');
    expect(formatPrice(7.5, 'USD')).toBe('$7.50');
  });

  test('applyCoupon: percentage, fixed per-currency, floor at zero', () => {
    const pct = { code: 'T20', discountType: 'percentage', discountValue: 20, allowedUsers: [] } as any;
    const fixed = { code: 'TFIX', discountType: 'fixed', discountValue: { inr: 200, usd: 50 }, allowedUsers: [] } as any;
    expect(applyCoupon(1999, null, 'INR')).toBe(1999);
    expect(applyCoupon(1999, pct, 'INR')).toBe(1599);
    expect(applyCoupon(9.99, pct, 'USD')).toBe(7.99);
    expect(applyCoupon(1999, fixed, 'INR')).toBe(1799);
    expect(applyCoupon(25, fixed, 'USD')).toBe(0);
  });

  test('resolveCoupon: unknown, case-insensitive, user-restricted', () => {
    expect(resolveCoupon(undefined, 'u1')).toEqual({ ok: true, coupon: null });
    expect(resolveCoupon('NOPE', 'u1')).toEqual({ ok: false, status: 400, error: 'Invalid coupon code' });

    const publicCoupon = activeCoupons.find(c => c.allowedUsers.length === 0);
    test.skip(!publicCoupon, 'no public coupon configured');
    const lower = resolveCoupon(publicCoupon!.code.toLowerCase(), 'anyone');
    expect(lower.ok && lower.coupon?.code).toBe(publicCoupon!.code);

    const restricted = activeCoupons.find(c => c.allowedUsers.length > 0);
    if (restricted) {
      expect(resolveCoupon(restricted.code, 'someone-else')).toMatchObject({ ok: false, status: 403 });
      expect(resolveCoupon(restricted.code, restricted.allowedUsers[0])).toMatchObject({ ok: true });
    }
  });
});
