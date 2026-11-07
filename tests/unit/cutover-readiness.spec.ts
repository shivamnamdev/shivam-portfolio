import { test, expect } from '@playwright/test';
import { FLAGS, lines, readiness } from '../../scripts/cutover-rules.mjs';

// Phase 6c: the pure rules behind scripts/cutover-check.mjs (is a flag ready to turn on?). No database.
const ready = {
  publishedCourses: 2, publishedCohorts: 3, cohortsWithPublishedCourse: 3, cohortsWithEnrolmentsMissingCurriculum: [] as string[], publishedCurricula: 3,
  plansCohorts: 1, planIdColumn: true, notificationTables: true, activeCoupons: 2, cohortsWithoutPrice: [] as string[],
};
const one = (c: object, flag: string) => readiness({ ...ready, ...c }, [flag])[0] as { flag: string; ready: boolean; reasons: string[] };

test.describe('Cutover readiness rules @smoke', () => {
  test('CUT-UNIT-001 everything in place: all four flags are ready, one OK line each', () => {
    const all = readiness(ready) as Array<{ ready: boolean }>;
    expect(all.length).toBe(FLAGS.length);
    expect(all.every((r) => r.ready)).toBe(true);
    expect(lines(all)).toEqual(FLAGS.map((f: string) => `${f}: OK`));
  });

  test('CUT-UNIT-002 catalog needs a published course and cohort, and each cohort a published course', () => {
    expect(one({ publishedCourses: 0 }, 'PORTAL_CATALOG').reasons.join()).toMatch(/no published course/);
    expect(one({ publishedCohorts: 0, cohortsWithPublishedCourse: 0 }, 'PORTAL_CATALOG').reasons.join()).toMatch(/no published cohort/);
    expect(one({ cohortsWithPublishedCourse: 1 }, 'PORTAL_CATALOG').reasons.join()).toMatch(/2 published cohort\(s\) belong to a course that is not published/);
  });

  test('CUT-UNIT-003 learning needs curricula, and one for every cohort that has learners', () => {
    expect(one({ publishedCurricula: 0 }, 'PORTAL_LEARNING').ready).toBe(false);
    const r = one({ cohortsWithEnrolmentsMissingCurriculum: ['py-1', 'git-2'] }, 'PORTAL_LEARNING');
    expect(r.ready).toBe(false);
    expect(r.reasons.join()).toContain('py-1, git-2');
  });

  test('CUT-UNIT-004 engagement needs the notification tables', () => {
    expect(one({ notificationTables: false }, 'PORTAL_ENGAGEMENT').reasons.join()).toMatch(/step8-notifications/);
  });

  test('CUT-UNIT-005 coupons need prices, the plan_id column when plans are sold, and an active coupon', () => {
    expect(one({ cohortsWithoutPrice: ['x'] }, 'PORTAL_COUPONS').reasons.join()).toMatch(/without a valid price: x/);
    expect(one({ planIdColumn: false }, 'PORTAL_COUPONS').reasons.join()).toMatch(/plan_id/);
    expect(one({ planIdColumn: false, plansCohorts: 0 }, 'PORTAL_COUPONS').ready).toBe(true);   // no plans sold: the column is not needed
    expect(one({ activeCoupons: 0 }, 'PORTAL_COUPONS').reasons.join()).toMatch(/no active coupon/);
    expect(lines([one({ activeCoupons: 0 }, 'PORTAL_COUPONS')])[0]).toMatch(/^PORTAL_COUPONS: NOT READY: /);
  });

  test('CUT-UNIT-006 an unknown flag is never ready', () => {
    expect(one({}, 'PORTAL_NOPE').ready).toBe(false);
  });
});
