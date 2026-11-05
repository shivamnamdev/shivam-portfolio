import { test, expect } from '@playwright/test';
import {
  CHANNELS_BY_TYPE, SITE, TYPES, allowedChannels, buildNotification, checkEmailSend, learnerVisible, notificationCreateShape, renderNotificationEmail, statusOf,
  type Channel, type NotificationType, type Target,
} from '../../lib/adminApi/notifications';
import { parseObject } from '../../lib/adminApi/validate';
import { ApiError } from '../../lib/adminApi/envelope';
import { roleCan } from '../../lib/adminApi/permissions';
import { renderPlain } from '../../lib/adminApi/emailTemplates';

// Unit level (phase 3b): notification shapes, channel rules, timing, the e-mail send checks and the e-mail text. No database, no network.
const refusal = (fn: () => unknown): ApiError => { try { fn(); } catch (e) { return e as ApiError; } throw new Error('expected a refusal'); };
const NOW = new Date('2026-11-10T12:00:00.000Z');
const iso = (hours: number) => new Date(NOW.getTime() + hours * 3600_000).toISOString();
const ALL: Target = { kind: 'all' };
const base = { type: 'announcement' as NotificationType, title: 'Class moved', body: 'Tonight at 8 pm.', target: ALL };
const build = (extra: object = {}) => buildNotification({ ...base, ...extra } as never, NOW);

test.describe('AAPI notifications @regression', () => {
  test('[AAPI-UNIT-NTF-001] channels by type: marketing, progress and admin alerts never use e-mail', () => {
    expect(TYPES).toEqual(['transactional', 'announcement', 'reminder', 'progress', 'marketing', 'admin-alert']);
    for (const t of ['transactional', 'announcement', 'reminder'] as const) expect(allowedChannels(t)).toEqual(['inbox', 'email']);
    for (const t of ['progress', 'marketing', 'admin-alert'] as const) expect(allowedChannels(t)).toEqual(['inbox']);
    expect(Object.keys(CHANNELS_BY_TYPE).sort()).toEqual([...TYPES].sort());
  });

  test('[AAPI-UNIT-NTF-002] creating: type, title, body and target are required; unsafe or unknown input is refused', () => {
    const good = parseObject({ type: 'announcement', title: 'Hello', body: 'Body', target: { kind: 'cohort', cohortSlug: 'python-batch-1' }, link: '/dashboard', channels: ['inbox', 'email'] }, notificationCreateShape);
    expect(good).toMatchObject({ type: 'announcement', target: { kind: 'cohort', cohortSlug: 'python-batch-1' }, link: '/dashboard', channels: ['inbox', 'email'] });
    expect(refusal(() => parseObject({}, notificationCreateShape)).fields).toMatchObject({ type: expect.any(String), title: expect.any(String), body: expect.any(String), target: expect.any(String) });
    const bad = (extra: object) => refusal(() => parseObject({ ...base, ...extra }, notificationCreateShape)).fields ?? {};
    expect(bad({ title: '<b>hi</b>' })).toHaveProperty('title');
    expect(bad({ title: 'two\nlines' })).toHaveProperty('title');
    expect(bad({ title: 'x'.repeat(121) })).toHaveProperty('title');
    expect(bad({ body: 'x'.repeat(2001) })).toHaveProperty('body');
    expect(bad({ body: 'a\u0000b' })).toHaveProperty('body');
    expect(bad({ link: 'javascript:alert(1)' })).toHaveProperty('link');
    expect(bad({ link: '//evil.example' })).toHaveProperty('link');
    expect(bad({ type: 'sale' })).toHaveProperty('type');
    expect(bad({ channels: [] })).toHaveProperty('channels');
    expect(bad({ channels: ['sms'] })).toHaveProperty('channels');
    expect(bad({ recipients: ['a@b.com'] })).toHaveProperty('recipients');            // recipients are never taken from the request
    expect(bad({ publishAt: 'tomorrow' })).toHaveProperty('publishAt');
  });

  test('[AAPI-UNIT-NTF-003] targets: all, one cohort, one plan, one user, admins; anything else is refused', () => {
    const parse = (t: unknown) => parseObject({ ...base, target: t }, notificationCreateShape).target;
    expect(parse({ kind: 'all' })).toEqual({ kind: 'all' });
    expect(parse({ kind: 'plan', planId: 'personal' })).toEqual({ kind: 'plan', planId: 'personal' });
    expect(parse({ kind: 'user', userId: 'user_2abcDEF123' })).toEqual({ kind: 'user', userId: 'user_2abcDEF123' });
    expect(parse({ kind: 'admins' })).toEqual({ kind: 'admins' });
    for (const bad of [{ kind: 'everyone' }, { kind: 'cohort' }, { kind: 'cohort', cohortSlug: 'Bad Slug' }, { kind: 'user', userId: 'a@b.com' }, { kind: 'user', userId: '../x' }, { kind: 'all', userId: 'user_1' }, 'all', [], null])
      expect(() => parse(bad), JSON.stringify(bad)).toThrow();
  });

  test('[AAPI-UNIT-NTF-004] defaults: inbox only, published now, no link, no expiry; channels are de-duplicated', () => {
    expect(build()).toEqual({ type: 'announcement', title: 'Class moved', body: 'Tonight at 8 pm.', link: null, channels: ['inbox'], target: ALL, publishAt: NOW.toISOString(), expiresAt: null });
    expect(build({ channels: ['email', 'inbox', 'inbox'] }).channels).toEqual(['email', 'inbox']);
    expect(build({ link: '/dashboard' }).link).toBe('/dashboard');
  });

  test('[AAPI-UNIT-NTF-005] channel rules (422): the inbox is always on; marketing, progress and admin alerts cannot use e-mail', () => {
    expect(refusal(() => build({ channels: ['email'] })).status).toBe(422);
    for (const type of ['marketing', 'progress'] as const) {
      expect(refusal(() => build({ type, channels: ['inbox', 'email'] })).status, type).toBe(422);
      expect(build({ type, channels: ['inbox'] }).channels).toEqual(['inbox']);
    }
    for (const type of ['transactional', 'announcement', 'reminder'] as const) expect(build({ type, channels: ['inbox', 'email'] }).channels.sort(), type).toEqual(['email', 'inbox']);
    expect(refusal(() => build({ type: 'marketing', channels: ['inbox', 'email'] })).message).toMatch(/marketing.*email/);
  });

  test('[AAPI-UNIT-NTF-006] an admin alert is aimed at admins and only an admin alert can be (400)', () => {
    expect(build({ type: 'admin-alert', target: { kind: 'admins' } }).target).toEqual({ kind: 'admins' });
    expect(refusal(() => build({ type: 'admin-alert', target: ALL })).fields).toHaveProperty('target');
    expect(refusal(() => build({ type: 'announcement', target: { kind: 'admins' } })).fields).toHaveProperty('target');
  });

  test('[AAPI-UNIT-NTF-007] timing: an inbox item can wait, one that carries e-mail cannot; expiry must be after publish', () => {
    expect(build({ publishAt: iso(48) }).publishAt).toBe(iso(48));
    expect(refusal(() => build({ channels: ['inbox', 'email'], publishAt: iso(48) })).status).toBe(422);
    expect(build({ channels: ['inbox', 'email'], publishAt: iso(0.01) }).channels).toContain('email');       // within a minute of now counts as now
    expect(build({ channels: ['inbox', 'email'], publishAt: iso(-5) }).publishAt).toBe(iso(-5));
    expect(build({ expiresAt: iso(1) }).expiresAt).toBe(iso(1));
    expect(refusal(() => build({ expiresAt: iso(0) })).fields).toHaveProperty('expiresAt');
    expect(refusal(() => build({ publishAt: iso(5), expiresAt: iso(4) })).fields).toHaveProperty('expiresAt');
  });

  test('[AAPI-UNIT-NTF-008] status and learner visibility: scheduled, live, expired; admin alerts are never learner-visible', () => {
    const n = (publishAt: string, expiresAt: string | null = null, type: NotificationType = 'announcement') => ({ publishAt, expiresAt, type });
    expect(statusOf(n(iso(1)), NOW)).toBe('scheduled');
    expect(statusOf(n(iso(0)), NOW)).toBe('live');                              // publish time is inclusive
    expect(statusOf(n(iso(-2), iso(1)), NOW)).toBe('live');
    expect(statusOf(n(iso(-2), iso(0)), NOW)).toBe('expired');                  // expiry time is exclusive
    expect(learnerVisible(n(iso(-1)), NOW)).toBe(true);
    expect(learnerVisible(n(iso(1)), NOW)).toBe(false);
    expect(learnerVisible(n(iso(-3), iso(-1)), NOW)).toBe(false);
    expect(learnerVisible(n(iso(-1), null, 'admin-alert'), NOW)).toBe(false);
  });

  test('[AAPI-UNIT-NTF-009] the e-mail send checks: needs the email channel, once only, someone to send to, within the announcement cap', () => {
    const n = (channels: Channel[], emailSentAt: string | null = null) => ({ channels, emailSentAt });
    expect(() => checkEmailSend(n(['inbox', 'email']), 1, 50)).not.toThrow();
    expect(() => checkEmailSend(n(['inbox', 'email']), 50, 50)).not.toThrow();                 // exactly the cap is fine
    expect(refusal(() => checkEmailSend(n(['inbox', 'email']), 51, 50)).status).toBe(422);     // one over is not
    expect(refusal(() => checkEmailSend(n(['inbox', 'email']), 51, 50)).message).toMatch(/51.*50/);
    expect(refusal(() => checkEmailSend(n(['inbox', 'email']), 0, 50)).status).toBe(422);
    expect(refusal(() => checkEmailSend(n(['inbox']), 3, 50)).status).toBe(422);
    expect(refusal(() => checkEmailSend(n(['inbox', 'email'], iso(-1)), 3, 50)).status).toBe(409);
  });

  test('[AAPI-UNIT-NTF-010] the e-mail text: safe HTML, one-line subject, site links made absolute, braces left as typed', () => {
    const out = renderNotificationEmail({ title: 'Class\r\nBcc: x@y.com', body: '<script>alert(1)</script> Hello **all** {{name}}\n\nSecond paragraph', link: '/dashboard' });
    expect(out.subject).toBe('Class Bcc: x@y.com');
    expect(out.html).not.toContain('<script');
    expect(out.html).toContain('&lt;script&gt;');
    expect(out.html).toContain('<strong>all</strong>');
    expect(out.html).toContain('{{name}}');
    expect(out.html).toContain(`<a href="${SITE}/dashboard">Open on the site</a>`);
    expect(out.text).toContain(`Open on the site (${SITE}/dashboard)`);
    expect(renderNotificationEmail({ title: 'T', body: 'B', link: 'https://example.com/x?a=1' }).html).toContain('<a href="https://example.com/x?a=1">');
    expect(renderNotificationEmail({ title: 'T', body: 'B', link: null }).html).toBe('<p>B</p>');
    expect(renderPlain('[x](javascript:alert(1))').html).not.toContain('<a ');
  });

  test('[AAPI-UNIT-NTF-011] permissions: staff read, an admin key writes, only the owner sends e-mail', () => {
    expect(roleCan('owner', 'notifications:send')).toBe(true);
    expect(roleCan('key-admin', 'notifications:send')).toBe(false);
    expect(roleCan('key-staff', 'notifications:send')).toBe(false);
    for (const r of ['owner', 'key-admin'] as const) { expect(roleCan(r, 'notifications:write')).toBe(true); expect(roleCan(r, 'notifications:read')).toBe(true); }
    expect(roleCan('key-staff', 'notifications:read')).toBe(true);
    expect(roleCan('key-staff', 'notifications:write')).toBe(false);
  });
});
