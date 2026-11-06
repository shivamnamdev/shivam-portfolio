import { test, expect } from '@playwright/test';
import { EXPORT_FILES, SIGNUP_WINDOWS, barWidths, emptyGrantForm, exportFilename, grantBody, grantProblems, needsForce, revokePath, type GrantForm, type PlanLite } from '../../lib/adminUi/people';
import { EXPORTS, REPORT_DAYS, assertGrantTarget, assertPlanFits, grantShape } from '../../lib/adminApi/enrolments';
import { parseObject } from '../../lib/adminApi/validate';
import type { Pricing } from '../../lib/adminApi/cohorts';
import { NAV } from '../../lib/adminUi/nav';

// Unit level (slice 4e): the grant form, the two-step revoke, report bars and the CSV file name. The drift guard runs the form through the server's grant checks.
const refuses = (fn: () => unknown): boolean => { try { fn(); return false; } catch { return true; } };
const plans: PlanLite[] = [{ id: 'community', name: 'Community' }, { id: 'personal', name: 'Personal' }];
const pricing: Pricing = { kind: 'plans', currency: 'INR', plans: plans.map((p, i) => ({ id: p.id, name: p.name, price: { amount: 1999 + i * 1000 }, features: ['x'] })) };
const single: Pricing = { kind: 'single', inr: { amount: 1999 } };
const form = (extra: Partial<GrantForm> = {}): GrantForm => ({ ...emptyGrantForm(), cohortSlug: 'py-1', email: 'Asha@Example.com', ...extra });

test.describe('Admin UI people helpers @regression', () => {
  test('[ADMUI-UNIT-PPL-001] grant hints agree with the server: a form that looks fine is accepted, any hint means the server refuses', () => {
    const cases: Array<[string, Partial<GrantForm>, Pricing | undefined]> = [
      ['plain', {}, single], ['plain on a static course', {}, undefined], ['plan ok', { planId: 'personal' }, pricing], ['plan unknown', { planId: 'gold' }, pricing], ['plan on single', { planId: 'personal' }, single],
      ['plan on static', { planId: 'personal' }, undefined], ['no cohort', { cohortSlug: '' }, single], ['bad cohort', { cohortSlug: 'Bad Slug' }, single], ['no email', { email: '' }, single],
      ['bad email', { email: 'not-an-email' }, single], ['padded email', { email: '  a@x.com ' }, single], ['empty plan with plans', { planId: '' }, pricing],
    ];
    for (const [name, extra, p] of cases) {
      const f = form(extra);
      const hints = grantProblems(f, p?.kind === 'plans' ? plans : undefined);
      const serverRefuses = refuses(() => { const i = parseObject(grantBody(f), grantShape); assertGrantTarget(i); assertPlanFits(p, i.planId); });
      expect(hints.length === 0, `${name}: ${hints.join(' | ')}`).toBe(!serverRefuses);
    }
    expect(grantBody(form({ planId: ' personal ' }))).toEqual({ cohortSlug: 'py-1', email: 'asha@example.com', planId: 'personal' });
    expect(grantBody(form())).not.toHaveProperty('planId');
    expect(grantProblems(form({ planId: 'gold' }), plans)[0]).toContain('community, personal');
  });

  test('[ADMUI-UNIT-PPL-002] revoke: only a 409 opens the owner\'s "remove anyway" step; force is added only on the second call', () => {
    expect(needsForce({ status: 409, code: 'conflict', message: 'x' })).toBe(true);
    for (const status of [400, 403, 404, 422, 429, 500, 0]) expect(needsForce({ status, code: 'x', message: 'x' }), String(status)).toBe(false);
    expect(revokePath('7b1c', false)).toBe('/enrolments/7b1c');
    expect(revokePath('7b1c', true)).toBe('/enrolments/7b1c?force=true');
    expect(revokePath('a/b', false)).toBe('/enrolments/a%2Fb');
  });

  test('[ADMUI-UNIT-PPL-003] report bars: the largest is full, small counts stay visible, zero is empty, nothing breaks on empty or all-zero', () => {
    expect(barWidths([10, 5, 1, 0])).toEqual([100, 50, 10, 0]);
    expect(barWidths([1000, 1])).toEqual([100, 3]);
    expect(barWidths([])).toEqual([]);
    expect(barWidths([0, 0])).toEqual([0, 0]);
    expect(barWidths([-4, 2])).toEqual([0, 100]);
  });

  test('[ADMUI-UNIT-PPL-004] export names and windows equal the server\'s; the file name carries the UTC day', () => {
    expect([...EXPORT_FILES]).toEqual([...EXPORTS]);
    expect([...SIGNUP_WINDOWS]).toEqual([7, 30, 90, 180, 365]);
    for (const d of SIGNUP_WINDOWS) expect(d >= REPORT_DAYS.min && d <= REPORT_DAYS.max, String(d)).toBe(true);
    expect(exportFilename('enrolments.csv', new Date('2026-11-06T23:59:00Z'))).toBe('enrolments-2026-11-06.csv');
    expect(exportFilename('learners.csv', new Date('2026-01-02T00:00:00Z'))).toBe('learners-2026-01-02.csv');
  });

  test('[ADMUI-UNIT-PPL-005] the sidebar offers Enrolments and Reports', () => {
    for (const href of ['/admin/enrolments', '/admin/reports']) expect(NAV.find((n) => n.href === href)?.ready, href).toBe(true);
  });
});
