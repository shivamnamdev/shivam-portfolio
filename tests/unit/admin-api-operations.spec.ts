import { test, expect } from '@playwright/test';
import {
  assertGrantTarget, assertPlanFits, assertRevokeAllowed, couponUsage, countByCohort, countPerDay, csvCell, enrolmentCsv, grantShape, grantedByAdmin,
  isExportFile, isReport, learnerCsv, reportDays, summariseLearners, toCsv, type EnrolmentRow,
} from '../../lib/adminApi/enrolments';
import { parseObject } from '../../lib/adminApi/validate';
import { ApiError } from '../../lib/adminApi/envelope';
import { roleCan } from '../../lib/adminApi/permissions';
import type { Pricing } from '../../lib/adminApi/cohorts';

// Unit level (phase 3c): granting and revoking enrolments, CSV safety and the count-only reports. No database, no network.
const refusal = (fn: () => unknown): ApiError => { try { fn(); } catch (e) { return e as ApiError; } throw new Error('expected a refusal'); };
const NOW = new Date('2026-11-10T12:00:00.000Z');
const row = (extra: Partial<EnrolmentRow> = {}): EnrolmentRow => ({ id: 'r1', userId: 'user_a', email: 'a@x.com', name: 'Asha', cohortSlug: 'py-1', planId: null, couponUsed: null, enrolledAt: '2026-11-01T10:00:00.000Z', ...extra });
const plans: Pricing = { kind: 'plans', currency: 'INR', plans: [{ id: 'community', name: 'C', price: { amount: 1999 }, features: ['x'] }, { id: 'personal', name: 'P', price: { amount: 2999 }, features: ['y'] }] };
const single: Pricing = { kind: 'single', inr: { amount: 1999 } };

test.describe('AAPI operations @regression', () => {
  test('[AAPI-UNIT-ENR-001] granting: a cohort and exactly one of userId or email are needed; the plan must be a plan of that cohort', () => {
    expect(parseObject({ cohortSlug: 'py-1', userId: 'user_2abcXYZ' }, grantShape)).toMatchObject({ cohortSlug: 'py-1', userId: 'user_2abcXYZ' });
    expect(parseObject({ cohortSlug: 'py-1', email: 'A@X.com' }, grantShape)).toMatchObject({ email: 'a@x.com' });
    expect(refusal(() => parseObject({ cohortSlug: 'py-1', userId: 'nope' }, grantShape)).fields).toHaveProperty('userId');
    expect(refusal(() => parseObject({ userId: 'user_1' }, grantShape)).fields).toHaveProperty('cohortSlug');
    expect(refusal(() => parseObject({ cohortSlug: 'py-1', userId: 'user_1', extra: 1 }, grantShape)).fields).toHaveProperty('extra');
    expect(() => assertGrantTarget({ userId: 'user_1' })).not.toThrow();
    expect(() => assertGrantTarget({ email: 'a@x.com' })).not.toThrow();
    expect(refusal(() => assertGrantTarget({})).status).toBe(400);
    expect(refusal(() => assertGrantTarget({ userId: 'user_1', email: 'a@x.com' })).fields).toHaveProperty('email');

    expect(() => assertPlanFits(plans, undefined)).not.toThrow();
    expect(() => assertPlanFits(plans, 'personal')).not.toThrow();
    expect(refusal(() => assertPlanFits(plans, 'gold')).fields?.planId).toContain('community, personal');
    expect(refusal(() => assertPlanFits(single, 'personal')).fields?.planId).toContain('no plans');
    expect(refusal(() => assertPlanFits(undefined, 'personal')).status).toBe(400);
  });

  test('[AAPI-UNIT-ENR-002] revoking: admin-granted rows go freely; anything else needs the owner and force', () => {
    expect(() => assertRevokeAllowed({ adminGranted: true, force: false, role: 'key-admin' })).not.toThrow();
    expect(() => assertRevokeAllowed({ adminGranted: true, force: false, role: 'owner' })).not.toThrow();
    expect(refusal(() => assertRevokeAllowed({ adminGranted: false, force: false, role: 'owner' })).status).toBe(409);
    expect(refusal(() => assertRevokeAllowed({ adminGranted: false, force: false, role: 'key-admin' })).status).toBe(409);
    expect(refusal(() => assertRevokeAllowed({ adminGranted: false, force: true, role: 'key-admin' })).status).toBe(403);
    expect(refusal(() => assertRevokeAllowed({ adminGranted: false, force: true, role: 'key-staff' })).status).toBe(403);
    expect(() => assertRevokeAllowed({ adminGranted: false, force: true, role: 'owner' })).not.toThrow();
  });

  test('[AAPI-UNIT-ENR-003] a grant entry only covers the exact enrolment it created, never a later one for the same learner and cohort', () => {
    const grants = [{ after: { id: 'row-1', userId: 'user_a', cohortSlug: 'py-1' } }];
    expect(grantedByAdmin('row-1', grants)).toBe(true);
    expect(grantedByAdmin('row-2', grants)).toBe(false);   // granted, revoked, then the learner paid: a new row
    expect(grantedByAdmin('row-1', [])).toBe(false);
    expect(grantedByAdmin('row-1', [{ after: null }, { after: 'text' }, { after: {} }])).toBe(false);
    expect(grantedByAdmin('row-1', [{ after: null }, ...grants])).toBe(true);
  });

  test('[AAPI-UNIT-CSV-001] CSV: formula starters are neutralised, quotes are doubled, every cell is quoted', () => {
    for (const bad of ['=SUM(A1)', '+1', '-2+3', '@cmd', '\tx', '\rx']) expect(csvCell(bad), bad).toBe(`"'${bad}"`);
    expect(csvCell('=HYPERLINK("http://evil","click")')).toBe(`"'=HYPERLINK(""http://evil"",""click"")"`);
    expect(csvCell('say "hi", ok')).toBe('"say ""hi"", ok"');
    expect(csvCell('a\nb')).toBe('"a\nb"');
    expect(csvCell('Asha')).toBe('"Asha"');
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
    expect(csvCell(-5)).toBe('"-5"');   // a real number is not text and cannot start a formula
    expect(csvCell(true)).toBe('"true"');
    expect(csvCell('2026-11-01T10:00:00.000Z')).toBe('"2026-11-01T10:00:00.000Z"');
    expect(toCsv(['a', 'b'], [['1', '=x'], ['2', 'y']])).toBe('"a","b"\r\n"1","\'=x"\r\n"2","y"\r\n');
    expect(toCsv(['a'], [])).toBe('"a"\r\n');
  });

  test('[AAPI-UNIT-CSV-002] the enrolments export has fixed columns, neutralises hostile names and never contains payment or link fields', () => {
    const csv = enrolmentCsv([row({ name: '=cmd|\' /C calc\'!A0', email: null, planId: 'personal', couponUsed: 'DIWALI' })]);
    const [head, line] = csv.trim().split('\r\n');
    expect(head).toBe('"userId","email","name","cohortSlug","planId","couponUsed","enrolledAt"');
    expect(line).toContain(`"'=cmd|' /C calc'!A0"`);
    expect(line.split(',')[1]).toBe('""');
    expect(csv).not.toMatch(/payment|order|signature|token|whatsapp|live/i);
  });

  test('[AAPI-UNIT-CSV-003] the learners export has one row per learner with a count and the first enrolment', () => {
    const rows = [row(), row({ id: 'r2', cohortSlug: 'git-1', enrolledAt: '2026-10-20T08:00:00.000Z' }), row({ id: 'r3', userId: 'user_b', name: '+91 Bob', email: 'b@x.com', enrolledAt: '2026-11-02T00:00:00.000Z' })];
    const people = summariseLearners(rows);
    expect(people).toEqual([
      { userId: 'user_a', email: 'a@x.com', name: 'Asha', enrolments: 2, firstEnrolledAt: '2026-10-20T08:00:00.000Z' },
      { userId: 'user_b', email: 'b@x.com', name: '+91 Bob', enrolments: 1, firstEnrolledAt: '2026-11-02T00:00:00.000Z' },
    ]);
    const lines = learnerCsv(people).trim().split('\r\n');
    expect(lines[0]).toBe('"userId","email","name","enrolments","firstEnrolledAt"');
    expect(lines[1]).toBe('"user_a","a@x.com","Asha","2","2026-10-20T08:00:00.000Z"');
    expect(lines[2]).toContain(`"'+91 Bob"`);
    expect(summariseLearners([])).toEqual([]);
  });

  test('[AAPI-UNIT-RPT-001] reports: counts per cohort, zero-filled days, coupon usage; no person appears in any of them', () => {
    expect(countByCohort(['b', 'a', 'b', 'c', 'a', 'b'])).toEqual([{ cohortSlug: 'b', enrolments: 3 }, { cohortSlug: 'a', enrolments: 2 }, { cohortSlug: 'c', enrolments: 1 }]);
    expect(countByCohort([])).toEqual([]);

    const days = countPerDay(['2026-11-10T01:00:00Z', '2026-11-10T23:59:59Z', '2026-11-08T05:00:00Z', '2026-11-01T00:00:00Z', 'garbage', Date.parse('2026-11-09T12:00:00Z')], 3, NOW);
    expect(days).toEqual([{ date: '2026-11-08', count: 1 }, { date: '2026-11-09', count: 1 }, { date: '2026-11-10', count: 2 }]);   // 11-01 is outside, garbage ignored
    expect(countPerDay([], 2, NOW)).toEqual([{ date: '2026-11-09', count: 0 }, { date: '2026-11-10', count: 0 }]);

    const usage = couponUsage([
      { code: 'B', kind: 'everyone', redemptions: 2, max_redemptions: 10, active: true, expires_at: '2026-12-01T00:00:00Z' },
      { code: 'A', kind: 'single-use', redemptions: null, max_redemptions: null, active: false, expires_at: '2026-11-01T00:00:00Z' },
      { code: 'C', kind: 'selected', redemptions: 2, max_redemptions: null, active: true, expires_at: '2026-11-10T12:00:00Z' },
    ], NOW);
    expect(usage.map((u) => [u.code, u.redemptions, u.expired])).toEqual([['B', 2, false], ['C', 2, true], ['A', 0, true]]);
    const text = JSON.stringify([countByCohort(['a']), days, usage]);
    expect(text).not.toMatch(/email|name|userId|user_/i);
  });

  test('[AAPI-UNIT-RPT-002] report and export names and the days window are checked', () => {
    expect(isReport('coupon-usage') && isReport('signups-per-day') && isReport('enrolments-per-cohort')).toBe(true);
    expect(isReport('learners')).toBe(false);
    expect(isReport('__proto__')).toBe(false);
    expect(isExportFile('enrolments.csv') && isExportFile('learners.csv')).toBe(true);
    for (const bad of ['payments.csv', 'enrolments', '../x.csv', 'toString']) expect(isExportFile(bad), bad).toBe(false);
    expect(reportDays(null)).toBe(30);
    expect(reportDays('7')).toBe(7);
    expect(reportDays('90')).toBe(90);
    expect(reportDays('180')).toBe(180);
    expect(reportDays('365')).toBe(365);
    for (const bad of ['0', '366', '2.5', 'abc', '-1']) expect(refusal(() => reportDays(bad)).status, bad).toBe(400);
  });

  test('[AAPI-UNIT-PERM-004] permissions: staff keys read enrolments and counts but cannot change them or export; admin keys can export; only the owner is sure to force', () => {
    expect(roleCan('key-staff', 'enrolments:read')).toBe(true);
    expect(roleCan('key-staff', 'reports:read')).toBe(true);
    expect(roleCan('key-staff', 'enrolments:write')).toBe(false);
    expect(roleCan('key-staff', 'exports:run')).toBe(false);
    for (const p of ['enrolments:read', 'enrolments:write', 'reports:read', 'exports:run'] as const) {
      expect(roleCan('owner', p), p).toBe(true);
      expect(roleCan('key-admin', p), p).toBe(true);
    }
  });
});
