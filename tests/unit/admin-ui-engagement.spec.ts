import { test, expect } from '@playwright/test';
import {
  AUDIENCE_KINDS, CHANNELS_BY_TYPE, NOTIFICATION_TYPES, PLACEMENTS, PURPOSES, STYLES, audienceFromForm, bannerBody, bannerChanges, bannerProblems, bannerToForm, bannerVisibility,
  canConfirmSend, countdownText, emailState, emailAllowed, emptyBannerForm, emptyNotificationForm, normaliseTemplate, notificationBody, notificationProblems, sendBlocker, targetText,
  templateChanged, templateHints, withType, type BannerForm, type BannerView, type NotificationForm,
} from '../../lib/adminUi/engagement';
import * as banners from '../../lib/adminApi/banners';
import * as notes from '../../lib/adminApi/notifications';
import { TEMPLATES, TEMPLATE_KEYS, assertTemplate, templateProblems, type TemplateKey } from '../../lib/adminApi/emailTemplates';
import { parseObject } from '../../lib/adminApi/validate';
import { LIFECYCLE } from '../../lib/adminUi/forms';
import { NAV } from '../../lib/adminUi/nav';

// Unit level (slice 4d-2): banner, notification and e-mail template helpers. The drift guards run the same inputs through the server's own modules.
const NOW = new Date('2026-11-10T12:00:00.000Z');
const refuses = (fn: () => unknown): boolean => { try { fn(); return false; } catch { return true; } };
const bform = (extra: Partial<BannerForm> = {}): BannerForm => ({ ...emptyBannerForm(), slug: 'diwali-offer', message: 'Diwali offer: 20% off', ...extra });
const nform = (extra: Partial<NotificationForm> = {}): NotificationForm => ({ ...emptyNotificationForm(), title: 'New batch', body: 'A new batch opens on Monday.', ...extra });
// What the server says about a banner form: it must parse and pass the cross-field rules.
const serverRefusesBanner = (f: BannerForm): boolean => refuses(() => { const { slug: _s, ...input } = parseObject(bannerBody(f), banners.bannerCreateShape); banners.assertBanner(banners.cleanBanner({ ...banners.bannerDefaults, ...input })); });
const serverRefusesNotification = (f: NotificationForm): boolean => refuses(() => notes.buildNotification(parseObject(notificationBody(f), notes.notificationCreateShape) as never, NOW));

const view = (extra: Partial<BannerView> = {}): BannerView => ({
  slug: 'b1', status: 'published', version: 1, purpose: 'offer', message: 'Hello', style: 'info', placement: 'courses', audience: { kind: 'all' },
  startsAt: null, endsAt: null, dismissible: true, priority: 0, allowMultiple: false, ...extra,
});

test.describe('Admin UI engagement helpers @regression', () => {
  test('[ADMUI-UNIT-ENG-001] the lists the screens offer equal the server lists (banners, notification types, channels, life cycle)', () => {
    expect([...PURPOSES]).toEqual([...banners.PURPOSES]);
    expect([...STYLES]).toEqual([...banners.STYLES]);
    expect([...PLACEMENTS]).toEqual([...banners.PLACEMENTS]);
    expect([...NOTIFICATION_TYPES]).toEqual([...notes.TYPES]);
    expect(CHANNELS_BY_TYPE).toEqual(notes.CHANNELS_BY_TYPE);
    for (const k of AUDIENCE_KINDS) expect(refuses(() => parseObject({ ...bannerBody(bform({ audienceKind: k, audienceValue: 'py-1' })) }, banners.bannerCreateShape)), k).toBe(false);
    expect(Object.keys(LIFECYCLE)).toEqual(['publish', 'unpublish', 'archive', 'restore']);   // banners use the same four actions as courses
  });

  test('[ADMUI-UNIT-ENG-002] banner hints: whenever the form looks fine the server accepts it, and whenever there is a hint the server refuses', () => {
    const cases: Array<[string, Partial<BannerForm>]> = [
      ['plain', {}], ['html', { message: '<b>x</b>' }], ['empty message', { message: '  ' }], ['too long', { message: 'x'.repeat(281) }], ['exactly 280', { message: 'x'.repeat(280) }],
      ['line break', { message: 'a\nb' }], ['bad slug', { slug: 'Bad Slug' }], ['empty slug', { slug: '' }],
      ['link ok', { ctaLabel: 'Buy', ctaUrl: '/courses' }], ['https link', { ctaLabel: 'Buy', ctaUrl: 'https://example.com/x' }],
      ['javascript link', { ctaLabel: 'Buy', ctaUrl: 'javascript:alert(1)' }], ['protocol-relative', { ctaLabel: 'Buy', ctaUrl: '//evil.example' }], ['http link', { ctaLabel: 'Buy', ctaUrl: 'http://example.com' }],
      ['label only', { ctaLabel: 'Buy' }], ['url only', { ctaUrl: '/courses' }], ['label too long', { ctaLabel: 'x'.repeat(41), ctaUrl: '/c' }],
      ['cohort ok', { audienceKind: 'cohort', audienceValue: 'py-1' }], ['cohort empty', { audienceKind: 'cohort', audienceValue: '' }], ['plan bad', { audienceKind: 'plan', audienceValue: 'Bad Plan' }],
      ['priority 100', { priority: '100' }], ['priority 101', { priority: '101' }], ['priority text', { priority: 'high' }], ['priority 1.5', { priority: '1.5' }], ['priority empty', { priority: '' }],
      ['window ok', { startsAt: '2026-12-01T10:00', endsAt: '2026-12-02T10:00' }], ['end before start', { startsAt: '2026-12-02T10:00', endsAt: '2026-12-01T10:00' }],
      ['countdown', { countdownTo: '2026-12-05T10:00' }],
    ];
    for (const [name, extra] of cases) {
      const f = bform(extra);
      expect(bannerProblems(f, true).length === 0, `${name}: hint says fine = ${bannerProblems(f, true).length === 0}`).toBe(!serverRefusesBanner(f));
    }
    expect(bannerProblems(bform({ slug: '' }), false)).toEqual([]);   // the slug rule only applies when creating
  });

  test('[ADMUI-UNIT-ENG-003] a banner edit sends only what changed; emptied optional parts become null; an untouched form sends nothing', () => {
    const b = view({ ctaLabel: 'Buy', ctaUrl: '/courses', startsAt: '2026-12-01T10:00:00.000Z', audience: { kind: 'cohort', cohortSlug: 'py-1' } });
    expect(bannerChanges(b, bannerToForm(b))).toEqual({});
    expect(bannerChanges(b, { ...bannerToForm(b), message: '  Hello  ' })).toEqual({});   // trimmed before comparing
    expect(bannerChanges(b, { ...bannerToForm(b), message: 'New text', priority: '7' })).toEqual({ message: 'New text', priority: 7 });
    expect(bannerChanges(b, { ...bannerToForm(b), ctaLabel: '', ctaUrl: '' })).toEqual({ ctaLabel: null, ctaUrl: null });
    expect(bannerChanges(b, { ...bannerToForm(b), startsAt: '' })).toEqual({ startsAt: null });
    expect(bannerChanges(b, { ...bannerToForm(b), audienceKind: 'learners', audienceValue: '' })).toEqual({ audience: { kind: 'learners' } });
    expect(bannerChanges(b, { ...bannerToForm(b), audienceValue: 'py-2' })).toEqual({ audience: { kind: 'cohort', cohortSlug: 'py-2' } });
    const changed = bannerChanges(b, { ...bannerToForm(b), dismissible: false, allowMultiple: true, countdownTo: '2026-12-05T10:00' });
    expect(Object.keys(changed).sort()).toEqual(['allowMultiple', 'countdownTo', 'dismissible']);
    expect(audienceFromForm({ audienceKind: 'plan', audienceValue: ' personal ' })).toEqual({ kind: 'plan', planId: 'personal' });
  });

  test('[ADMUI-UNIT-ENG-004] "would it show" gives the same yes or no as the server rule, with a reason when not', () => {
    const viewers = [{ kind: 'visitor' as const }, { kind: 'learner' as const }, { kind: 'learner' as const, cohortSlugs: ['py-1'] }, { kind: 'learner' as const, planIds: ['personal'] }];
    const audiences = [{ kind: 'all' as const }, { kind: 'visitors' as const }, { kind: 'learners' as const }, { kind: 'cohort' as const, cohortSlug: 'py-1' }, { kind: 'plan' as const, planId: 'personal' }];
    const windows: Array<[string | null, string | null]> = [[null, null], ['2026-11-01T00:00:00.000Z', '2026-12-01T00:00:00.000Z'], ['2026-11-11T00:00:00.000Z', null], [null, '2026-11-10T12:00:00.000Z'], [null, '2026-11-09T00:00:00.000Z']];
    for (const status of ['draft', 'published', 'archived']) for (const audience of audiences) for (const [startsAt, endsAt] of windows) for (const viewer of viewers) {
      const row = view({ status, audience, startsAt, endsAt });
      const server = banners.visibleBanners([{ slug: row.slug, status, doc: row as never }], viewer, row.placement, NOW).length === 1;
      const mine = bannerVisibility(row, viewer, NOW);
      expect(mine.visible, JSON.stringify({ status, audience, startsAt, endsAt, viewer })).toBe(server);
      if (!mine.visible) expect(mine.reason).toMatch(/^Not shown/);
    }
    expect(bannerVisibility(view({ status: 'draft' }), { kind: 'visitor' }, NOW).reason).toContain('draft');
    expect(bannerVisibility(view({ startsAt: '2026-11-11T00:00:00.000Z' }), { kind: 'visitor' }, NOW).reason).toContain('starts 2026-11-11 00:00');
  });

  test('[ADMUI-UNIT-ENG-005] countdown text: days, hours, minutes; nothing once it has passed', () => {
    expect(countdownText(undefined, NOW)).toBeNull();
    expect(countdownText('2026-11-10T12:00:00.000Z', NOW)).toBeNull();
    expect(countdownText('2026-11-09T12:00:00.000Z', NOW)).toBeNull();
    expect(countdownText('2026-11-12T15:30:00.000Z', NOW)).toBe('2d 3h left');
    expect(countdownText('2026-11-10T15:30:00.000Z', NOW)).toBe('3h 30m left');
    expect(countdownText('2026-11-10T12:05:00.000Z', NOW)).toBe('5m left');
  });

  test('[ADMUI-UNIT-ENG-006] notification hints agree with the server, and changing the type fixes up channel and target', () => {
    const cases: Array<[string, Partial<NotificationForm>]> = [
      ['plain', {}], ['html title', { title: '<b>x</b>' }], ['empty title', { title: '' }], ['long title', { title: 'x'.repeat(121) }], ['empty body', { body: '  ' }], ['long body', { body: 'x'.repeat(2001) }],
      ['bad link', { link: 'javascript:alert(1)' }], ['site link', { link: '/courses' }],
      ['email on announcement', { email: true }], ['email on marketing', { type: 'marketing', email: true }], ['email on progress', { type: 'progress', email: true }],
      ['admin alert to everyone', { type: 'admin-alert' }], ['admin alert to admins', { type: 'admin-alert', targetKind: 'admins' }], ['admins for a normal type', { targetKind: 'admins' }],
      ['cohort ok', { targetKind: 'cohort', targetValue: 'py-1' }], ['cohort empty', { targetKind: 'cohort', targetValue: '' }], ['plan ok', { targetKind: 'plan', targetValue: 'personal' }],
      ['user ok', { targetKind: 'user', targetValue: 'user_2abc' }], ['user bad', { targetKind: 'user', targetValue: 'abc' }],
      ['scheduled inbox', { publishAt: '2026-12-01T10:00' }], ['scheduled email', { email: true, publishAt: '2026-12-01T10:00' }], ['expiry before publish', { publishAt: '2026-12-01T10:00', expiresAt: '2026-11-30T10:00' }],
      ['expiry in the past', { expiresAt: '2026-11-01T10:00' }], ['expiry ok', { expiresAt: '2026-12-31T10:00' }],
    ];
    for (const [name, extra] of cases) {
      const f = nform(extra);
      expect(notificationProblems(f, NOW).length === 0, name).toBe(!serverRefusesNotification(f));
    }
    const a = withType(nform({ email: true, targetKind: 'cohort', targetValue: 'py-1' }), 'marketing');
    expect(a).toMatchObject({ type: 'marketing', email: false, targetKind: 'cohort', targetValue: 'py-1' });
    const b = withType(nform({ targetKind: 'cohort', targetValue: 'py-1' }), 'admin-alert');
    expect(b).toMatchObject({ type: 'admin-alert', email: false, targetKind: 'admins', targetValue: '' });
    expect(withType(b, 'reminder')).toMatchObject({ targetKind: 'all' });
    expect(emailAllowed('announcement') && !emailAllowed('marketing') && !emailAllowed('admin-alert')).toBe(true);
    expect(notificationBody(nform({ email: true, link: ' /courses ' }))).toMatchObject({ channels: ['inbox', 'email'], link: '/courses', target: { kind: 'all' } });
    expect(notificationBody(nform())).toMatchObject({ channels: ['inbox'] });
    expect(notificationBody(nform())).not.toHaveProperty('link');
    expect(targetText({ kind: 'cohort', cohortSlug: 'py-1' })).toBe('Cohort py-1');
    expect(targetText({ kind: 'admins' })).toBe('Admins only');
  });

  test('[ADMUI-UNIT-ENG-007] the send dialog: blocked like the server blocks it; the owner must tick the box', () => {
    const n = (extra: object = {}) => ({ channels: ['inbox', 'email'] as Array<'inbox' | 'email'>, emailSentAt: null as string | null, ...extra });
    const serverSays = (x: ReturnType<typeof n>, count: number, cap: number) => refuses(() => notes.checkEmailSend(x, count, cap));
    for (const [x, count, cap] of [
      [n(), 10, 50], [n(), 50, 50], [n(), 51, 50], [n(), 0, 50], [n({ channels: ['inbox'] }), 10, 50], [n({ emailSentAt: '2026-11-09T00:00:00Z' }), 10, 50],
    ] as const) expect(sendBlocker(x, count, cap) !== null, JSON.stringify([x, count, cap])).toBe(serverSays(x, count, cap));
    expect(sendBlocker(n(), 51, 50)).toContain('limit for one announcement is 50');
    expect(emailState({ channels: ['inbox'], emailSentAt: null, emailRecipients: null })).toBe('No e-mail');
    expect(emailState({ channels: ['inbox', 'email'], emailSentAt: null, emailRecipients: null })).toBe('Not sent');
    expect(emailState({ channels: ['inbox', 'email'], emailSentAt: '2026-11-09T00:00:00Z', emailRecipients: 12 })).toBe('Sent to 12');
    expect(canConfirmSend(false, null)).toBe(false);
    expect(canConfirmSend(true, 'blocked')).toBe(false);
    expect(canConfirmSend(true, null)).toBe(true);
  });

  test('[ADMUI-UNIT-ENG-008] template hints agree with the server for every template; what is saved is trimmed like the server trims it', () => {
    const subjects = ['Welcome', '', '  ', 'a\nb', 'x'.repeat(151), 'Hi {{name}}', 'Hi {{nope}}', 'Hi {{name'];
    const bodies = ['Hello {{name}}', '', 'x'.repeat(5001), 'Order {{orderId}}', 'Hello {{name', 'ok }} bad', 'tab\u0001', '**bold** and [site](https://example.com)'];
    for (const key of TEMPLATE_KEYS as TemplateKey[]) for (const s of subjects) for (const b of bodies) {
      const server = Object.keys(templateProblems(key, s, b)).sort();
      const mine = Array.from(new Set(templateHints(TEMPLATES[key].placeholders, s, b).map((l) => l.split(':')[0]))).sort();
      expect(mine, `${key} | ${JSON.stringify(s)} | ${JSON.stringify(b).slice(0, 30)}`).toEqual(server);
    }
    expect(normaliseTemplate('  Hi  ', 'a\r\nb\r\n')).toEqual(assertTemplate('welcome', '  Hi  ', 'a\r\nb\r\n'));
    expect(templateChanged({ subject: 'Hi', body: 'a\nb' }, ' Hi ', 'a\r\nb\r\n')).toBe(false);
    expect(templateChanged({ subject: 'Hi', body: 'a\nb' }, 'Hi', 'a\nc')).toBe(true);
  });

  test('[ADMUI-UNIT-ENG-009] the sidebar offers banners, notifications and e-mail templates', () => {
    for (const href of ['/admin/banners', '/admin/notifications', '/admin/email-templates']) expect(NAV.find((n) => n.href === href)?.ready, href).toBe(true);
  });
});
