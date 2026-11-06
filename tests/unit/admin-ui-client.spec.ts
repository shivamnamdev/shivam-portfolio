import { test, expect } from '@playwright/test';
import { failureAction, failureText, fieldErrorLines, ifMatchHeader, networkFailure, parseEnvelope, queryString, timeAgo, type Failure } from '../../lib/adminUi/client';
import { NAV, NAV_GROUPS, isActive } from '../../lib/adminUi/nav';

// Unit level (phase 4a): the pure helpers behind the admin screens. No browser, no network.
const NOW = new Date('2026-11-10T12:00:00.000Z');
const fail = (status: number, message = 'm', extra: Partial<Failure> = {}): Failure => ({ status, code: 'c', message, ...extra });

test.describe('Admin UI helpers @regression', () => {
  test('[ADMUI-UNIT-ENV-001] the envelope is read as data, as a failure with fields, or as a bad answer', () => {
    expect(parseEnvelope(200, { success: true, data: { a: 1 } })).toEqual({ ok: true, data: { a: 1 } });
    expect(parseEnvelope(201, { success: true, data: [] })).toEqual({ ok: true, data: [] });
    expect(parseEnvelope(400, { success: false, error: { code: 'validation_failed', message: 'Some fields are not valid', fields: { title: 'is required', n: 5 } } }))
      .toEqual({ ok: false, failure: { status: 400, code: 'validation_failed', message: 'Some fields are not valid', fields: { title: 'is required' } } });
    expect(parseEnvelope(404, { success: false, error: { code: 'not_found', message: 'Not found' } })).toEqual({ ok: false, failure: { status: 404, code: 'not_found', message: 'Not found' } });
    for (const bad of [null, 'text', 42, {}, { success: false }, { success: false, error: {} }]) {
      const r = parseEnvelope(200, bad);
      expect(r.ok, JSON.stringify(bad)).toBe(false);
      if (!r.ok) expect(r.failure.code).toBe('bad_response');
    }
    expect(parseEnvelope(500, { success: true, data: 1 }).ok).toBe(false);   // a success body with an error status is not trusted
    expect(parseEnvelope(502, '<html>').ok).toBe(false);
  });

  test('[ADMUI-UNIT-ENV-002] each failure maps to one screen action and a plain message', () => {
    const cases: Array<[number, string]> = [[401, 'sign-in'], [403, 'forbidden'], [409, 'conflict'], [428, 'conflict'], [400, 'fix'], [422, 'fix'], [429, 'wait'], [500, 'retry'], [503, 'retry'], [0, 'retry'], [404, 'show'], [418, 'show']];
    for (const [status, action] of cases) expect(failureAction(fail(status)), String(status)).toBe(action);
    expect(failureText(fail(401))).toMatch(/Sign in again/);
    expect(failureText(fail(403))).toMatch(/permission/);
    expect(failureText(fail(500, 'boom stack at /Users/x'))).not.toMatch(/boom|Users/);
    expect(failureText(networkFailure())).toMatch(/Could not reach/);
    expect(failureText(fail(409, 'The page changed since you opened it'))).toBe('The page changed since you opened it');
    expect(failureText(fail(428))).toMatch(/Reload/);
    expect(failureText(fail(422, 'announcement-email-cap cannot be higher than daily-email-cap'))).toMatch(/announcement-email-cap/);
    expect(fieldErrorLines(fail(400, 'm', { fields: { title: 'is required', slug: 'must be lower case' } }))).toEqual(['title: is required', 'slug: must be lower case']);
    expect(fieldErrorLines(fail(400))).toEqual([]);
  });

  test('[ADMUI-UNIT-REQ-001] query strings leave out unset values and encode the rest; If-Match carries the version', () => {
    expect(queryString({})).toBe('');
    expect(queryString({ a: 1, b: '', c: null, d: undefined })).toBe('?a=1');
    expect(queryString({ q: 'a b&c=d', limit: 25, open: false })).toBe('?q=a%20b%26c%3Dd&limit=25&open=false');
    expect(queryString({ cursor: '2026-11-01T10:00:00.000Z' })).toBe('?cursor=2026-11-01T10%3A00%3A00.000Z');
    expect(ifMatchHeader(3)).toEqual({ 'If-Match': '3' });
  });

  test('[ADMUI-UNIT-FMT-001] relative times: just now, minutes, hours, days, then the date; bad and future times never say "ago"', () => {
    const ago = (s: number) => new Date(NOW.getTime() - s * 1000).toISOString();
    expect(timeAgo(ago(5), NOW)).toBe('just now');
    expect(timeAgo(ago(60), NOW)).toBe('1 minute ago');
    expect(timeAgo(ago(59 * 60), NOW)).toBe('59 minutes ago');
    expect(timeAgo(ago(3600), NOW)).toBe('1 hour ago');
    expect(timeAgo(ago(5 * 3600), NOW)).toBe('5 hours ago');
    expect(timeAgo(ago(86400), NOW)).toBe('1 day ago');
    expect(timeAgo(ago(29 * 86400), NOW)).toBe('29 days ago');
    expect(timeAgo(ago(40 * 86400), NOW)).toBe('2026-10-01');
    expect(timeAgo('2026-12-01T00:00:00.000Z', NOW)).toBe('2026-12-01');
    expect(timeAgo('not a date', NOW)).toBe('not a date');
  });

  test('[ADMUI-UNIT-NAV-001] the sidebar: unique links, every entry in a known group, active matching is exact for /admin and by path for the rest', () => {
    const hrefs = NAV.map((n) => n.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const n of NAV) { expect(NAV_GROUPS).toContain(n.group); expect(n.href.startsWith('/admin')).toBe(true); }
    expect(NAV.filter((n) => n.ready).map((n) => n.label)).toEqual(['Overview', 'Courses', 'Cohorts', 'Curriculum', 'Coupons', 'Banners', 'Notifications', 'E-mail templates', 'Settings', 'Enrolments', 'Reports', 'Learner CRM (classic)', 'Audit log', 'API keys', 'API docs']);
    expect(NAV.filter((n) => !n.ready).map((n) => n.slice).filter((x, i, a) => a.indexOf(x) === i).sort()).toEqual(['4f']);
    expect(NAV.find((n) => n.label === 'Student progress')?.slice).toBe('4f');
    expect(NAV.find((n) => n.label === 'Code submissions')?.slice).toBe('4f');
    expect(isActive('/admin', '/admin')).toBe(true);
    expect(isActive('/admin/audit', '/admin')).toBe(false);   // the classic page is not "active" on other screens
    expect(isActive('/admin/audit', '/admin/audit')).toBe(true);
    expect(isActive('/admin/audit/', '/admin/audit')).toBe(true);
    expect(isActive('/admin/audit/42', '/admin/audit')).toBe(true);
    expect(isActive('/admin/audit-x', '/admin/audit')).toBe(false);
    expect(isActive('/admin/overview', '/admin/audit')).toBe(false);
  });
});
