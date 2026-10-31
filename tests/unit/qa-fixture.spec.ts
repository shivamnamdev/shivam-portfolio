import { test, expect } from '@playwright/test';
import { activeCourses, QA_FIXTURES_ENABLED, QA_FIXTURE_SLUG } from '../../data/courses';
import { activeCoupons } from '../../data/coupons';
import { applyCoupon, resolveCoupon } from '../../lib/pricing';

// Guards the QA-only fixture (docs/testing/TEST_DATA.md). Runs with and without NEXT_PUBLIC_QA_FIXTURES=1.
test.describe('QA fixture course and coupon', () => {

  test('fixture course exists exactly when the flag is on', () => {
    const present = activeCourses.some(c => c.slug === QA_FIXTURE_SLUG);
    expect(present).toBe(QA_FIXTURES_ENABLED);
  });

  test('fixture course is open and priced ₹10 / $1', () => {
    test.skip(!QA_FIXTURES_ENABLED, 'NEXT_PUBLIC_QA_FIXTURES is not set');
    const c = activeCourses.find(x => x.slug === QA_FIXTURE_SLUG)!;
    expect(c.enrollmentClosed).toBe(false);
    expect(c.id).toBe(c.slug);
    expect(c.pricing.inr.currentPrice).toBe('₹10');
    expect(c.pricing.usd.currentPrice).toBe('$1');
  });

  test('QA100 is locked to the configured users and fails closed', () => {
    const qa = activeCoupons.find(c => c.code === 'QA100');
    const ids = (process.env.NEXT_PUBLIC_QA_FREE_COUPON_USERS ?? '').split(',').map(s => s.trim()).filter(Boolean);
    // Never created without the flag AND at least one user id (an empty allowedUsers list would mean "anyone").
    expect(!!qa).toBe(QA_FIXTURES_ENABLED && ids.length > 0);
    if (!qa) return;
    expect(qa.allowedUsers.length).toBeGreaterThan(0);
    expect(resolveCoupon('qa100', ids[0])).toMatchObject({ ok: true });
    expect(resolveCoupon('QA100', 'user_someone_else')).toMatchObject({ ok: false, status: 403 });
    expect(resolveCoupon('QA100', null)).toMatchObject({ ok: false, status: 403 });
    expect(applyCoupon(10, qa, 'INR')).toBe(0);
    expect(applyCoupon(1, qa, 'USD')).toBe(0);
  });
});
