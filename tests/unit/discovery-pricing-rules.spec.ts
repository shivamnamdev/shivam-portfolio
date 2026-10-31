import { test, expect } from '@playwright/test';
import { activeCoupons } from '../../data/coupons';
import { activeCourses } from '../../data/courses';
import { applyCoupon, formatPrice, parsePrice, resolveCoupon, toMinorUnits } from '../../lib/pricing';

// PRD 03 pricing/coupon rules at the logic layer (the same functions the sales page and the payment APIs use).
const course = activeCourses.find(c => c.slug === 'python-beginners-batch-2')!; // ₹1,999 / $25
const inr = parsePrice(course.pricing.inr.currentPrice);
const usd = parsePrice(course.pricing.usd.currentPrice);
const byCode = (code: string) => activeCoupons.find(c => c.code === code)!;
const percent = byCode('BIRTHDAY20');
const fixed = byCode('EXISTINGSTUDENT_BATCH03');
const full = { code: 'FULL', discountType: 'percentage', discountValue: 100, allowedUsers: [] as string[] };

test.describe('PRD03 pricing rules @regression', () => {

  test('[CDP-PRICE-004][CDP-COUP-012] percentage coupon discounts by the configured percent', () => {
    expect(applyCoupon(inr, percent, 'INR')).toBe(Math.round(inr * 0.8));
    expect(applyCoupon(usd, percent, 'USD')).toBe(usd * 0.8);
  });

  test('[CDP-PRICE-005][CDP-COUP-006] coupon outcome follows data/coupons.ts for each currency', () => {
    expect(applyCoupon(inr, fixed, 'INR')).toBe(Math.max(inr - (fixed.discountValue as any).inr, 0));
    expect(applyCoupon(usd, fixed, 'USD')).toBe(Math.max(usd - (fixed.discountValue as any).usd, 0));
    expect(resolveCoupon('BIRTHDAY20', 'user_any')).toMatchObject({ ok: true });
  });

  test('[CDP-PRICE-009][CDP-FREE-001] a 100% coupon brings the price to zero in INR and USD', () => {
    expect(applyCoupon(inr, full, 'INR')).toBe(0);
    expect(applyCoupon(usd, full, 'USD')).toBe(0);
    expect(formatPrice(0, 'INR')).toBe('₹0');
    expect(formatPrice(0, 'USD')).toBe('$0');
  });

  test('[CDP-PRICE-010] a discount larger than the price never produces a negative total', () => {
    const huge = { code: 'HUGE', discountType: 'fixed', discountValue: { inr: 999999, usd: 999999 }, allowedUsers: [] as string[] };
    expect(applyCoupon(inr, huge, 'INR')).toBe(0);
    expect(applyCoupon(usd, huge, 'USD')).toBe(0);
    expect(applyCoupon(inr, { ...full, discountValue: 250 }, 'INR')).toBe(0);
  });

  test('[CDP-PRICE-006][CDP-COUP-013][CDP-COUP-014] replacing or removing a coupon recalculates from the base price', () => {
    const a = applyCoupon(inr, percent, 'INR');
    const b = applyCoupon(inr, fixed, 'INR');
    expect(a).not.toBe(b);
    expect(applyCoupon(inr, null, 'INR')).toBe(inr);          // removal returns the full price
    expect(applyCoupon(inr, percent, 'INR')).toBe(a);         // no hidden state between calls
  });

  test('[CDP-PRICE-007][CDP-CUR-015][CDP-E2E-007] currency + coupon: USD uses the USD base and USD rounding (cents)', () => {
    expect(formatPrice(applyCoupon(usd, percent, 'USD'), 'USD')).toBe('$20');
    expect(formatPrice(applyCoupon(9.99, percent, 'USD'), 'USD')).toBe('$7.99');
    expect(formatPrice(applyCoupon(inr, percent, 'INR'), 'INR')).toBe('₹1599');
  });

  test('[CDP-COUP-004] unknown coupon is rejected with the documented message', () => {
    expect(resolveCoupon('NOT-A-REAL-CODE', 'user_any')).toEqual({ ok: false, status: 400, error: 'Invalid coupon code' });
  });

  test('[CDP-COUP-005] empty or missing coupon means "no coupon", not an error', () => {
    expect(resolveCoupon('', 'user_any')).toEqual({ ok: true, coupon: null });
    expect(resolveCoupon(undefined, 'user_any')).toEqual({ ok: true, coupon: null });
  });

  test('[CDP-COUP-015] coupon codes ignore case and surrounding whitespace', () => {
    expect(resolveCoupon('  birthday20  ', 'user_any')).toMatchObject({ ok: true, coupon: { code: 'BIRTHDAY20' } });
    expect(resolveCoupon('BIRTH DAY20', 'user_any')).toMatchObject({ ok: false });
  });

  test('[CDP-COUP-006] restricted coupons only work for listed accounts', () => {
    expect(resolveCoupon('SHIVAMSPECIAL', 'user_someone_else')).toMatchObject({ ok: false, status: 403 });
    expect(resolveCoupon('SHIVAMSPECIAL', null)).toMatchObject({ ok: false, status: 403 });
    expect(resolveCoupon('SHIVAMSPECIAL', 'user_2aBcD1234567890')).toMatchObject({ ok: true });
  });

  test('[CHK-AMT-009] a 20% coupon on the $25 price is $20.00, which is 2000 cents at the gateway', () => {
    expect(applyCoupon(usd, percent, 'USD')).toBe(20);
    expect(toMinorUnits(applyCoupon(usd, percent, 'USD'))).toBe(2000);
  });

  test('[CHK-AMT-017] a USD price label is parsed as dollars and cents, not as 999', () => {
    expect(parsePrice('$9.99')).toBe(9.99);
    expect(parsePrice('₹1,999')).toBe(1999);
  });

  // The coupon model has no expiry date and no usage counter, so these two cases cannot pass today.
  test.fixme('[CDP-COUP-007] expired coupon is rejected (coupon model has no expiry field)', () => {});
  test.fixme('[CDP-COUP-008] coupon usage limit is enforced (coupon model has no usage counter)', () => {});
});
