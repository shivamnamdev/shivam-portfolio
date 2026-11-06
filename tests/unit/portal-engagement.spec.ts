import { test, expect } from '@playwright/test';
import { feedFor, idsToMark, notificationReaches, type BellRow, type BellViewer } from '../../lib/catalog/bell';
import { renderSaved } from '../../lib/catalog/mail';
import { dismissKey, formatCountdown, secondsLeft } from '../../lib/catalog/bannerView';
import { BANNERS_TAG, touchesBanners } from '../../lib/catalog/tags';
import { TEMPLATES, TEMPLATE_KEYS } from '../../lib/adminApi/emailTemplates';

// Unit level (phase 5, slice 5c): who a notification reaches and what one bell shows, when a mail uses a saved template, the banner countdown and
// the dismissal key. No database, no network.
const NOW = new Date('2026-11-10T12:00:00.000Z');
const viewer: BellViewer = { userId: 'user_me', cohortSlugs: ['py-1'], planIds: ['personal'] };
const row = (id: string, extra: Partial<BellRow> = {}): BellRow => ({
  id, type: 'announcement', title: `T ${id}`, body: 'Body **bold** and [site](https://example.com).', link: null, target: { kind: 'all' },
  publishAt: '2026-11-09T12:00:00.000Z', expiresAt: null, ...extra,
});

test.describe('Portal engagement rules @regression', () => {
  test('[ENG-UNIT-BELL-001] a notification reaches everyone, one cohort, one plan or one learner; admins-only never reaches a learner', () => {
    expect(notificationReaches({ kind: 'all' }, viewer)).toBe(true);
    expect(notificationReaches({ kind: 'cohort', cohortSlug: 'py-1' }, viewer)).toBe(true);
    expect(notificationReaches({ kind: 'cohort', cohortSlug: 'git-1' }, viewer)).toBe(false);
    expect(notificationReaches({ kind: 'plan', planId: 'personal' }, viewer)).toBe(true);
    expect(notificationReaches({ kind: 'plan', planId: 'community' }, viewer)).toBe(false);
    expect(notificationReaches({ kind: 'user', userId: 'user_me' }, viewer)).toBe(true);
    expect(notificationReaches({ kind: 'user', userId: 'user_other' }, viewer)).toBe(false);
    expect(notificationReaches({ kind: 'admins' }, viewer)).toBe(false);
    expect(notificationReaches({ kind: 'cohort', cohortSlug: 'py-1' }, { userId: 'u', cohortSlugs: [], planIds: [] })).toBe(false);
  });

  test('[ENG-UNIT-BELL-002] the bell shows live notifications aimed at the learner, newest first, with read state; admin alerts, scheduled, expired and other people\'s never show', () => {
    const rows = [
      row('a', { publishAt: '2026-11-08T00:00:00.000Z' }), row('b', { publishAt: '2026-11-09T00:00:00.000Z' }),
      row('alert', { type: 'admin-alert', target: { kind: 'admins' } }), row('alert2', { type: 'admin-alert' }),
      row('later', { publishAt: '2026-11-11T00:00:00.000Z' }), row('gone', { expiresAt: '2026-11-10T11:00:00.000Z' }),
      row('theirs', { target: { kind: 'user', userId: 'user_other' } }), row('git', { target: { kind: 'cohort', cohortSlug: 'git-1' } }),
      row('mine', { target: { kind: 'user', userId: 'user_me' }, publishAt: '2026-11-10T09:00:00.000Z' }),
    ];
    const { items, unread } = feedFor(rows, viewer, ['b'], NOW);
    expect(items.map((i) => i.id)).toEqual(['mine', 'b', 'a']);
    expect(items.map((i) => i.read)).toEqual([false, true, false]);
    expect(unread).toBe(2);
    expect(feedFor([], viewer, [], NOW)).toEqual({ items: [], unread: 0 });
  });

  test('[ENG-UNIT-BELL-003] the body is plain text (marks removed, a link written out), the list is capped, and only the fields the bell needs come out', () => {
    const { items } = feedFor([row('a')], viewer, [], NOW);
    expect(items[0].body).toBe('Body bold and site (https://example.com).');
    expect(Object.keys(items[0]).sort()).toEqual(['body', 'id', 'link', 'publishAt', 'read', 'title', 'type']);   // no target, no created_by, no e-mail fields
    const many = Array.from({ length: 50 }, (_, i) => row(`n${String(i).padStart(2, '0')}`, { publishAt: new Date(Date.UTC(2026, 10, 1, i)).toISOString() }));
    expect(feedFor(many, viewer, [], NOW).items).toHaveLength(30);
    expect(feedFor(many, viewer, [], NOW, 5).items.map((i) => i.id)).toEqual(['n49', 'n48', 'n47', 'n46', 'n45']);
  });

  test('[ENG-UNIT-BELL-004] "mark as read" may only write ids the learner can see; no ids means everything unread in their bell; repeats and strangers change nothing', () => {
    const feed = feedFor([row('a'), row('b'), row('c', { target: { kind: 'cohort', cohortSlug: 'git-1' } })], viewer, ['a'], NOW).items;
    expect(idsToMark(feed, undefined)).toEqual(['b']);
    expect(idsToMark(feed, ['a', 'b'])).toEqual(['a', 'b']);
    expect(idsToMark(feed, ['c', 'zzz'])).toEqual([]);                  // not in this learner's bell
    expect(idsToMark(feed, ['b', 'b'])).toEqual(['b']);
    expect(idsToMark(feed, [])).toEqual([]);
    expect(idsToMark([], undefined)).toEqual([]);
  });

  test('[ENG-UNIT-MAIL-001] a mail uses a saved template only when it is saved and valid; everything typed is escaped; the subject is one line; unknown values are dropped', () => {
    const values = { name: 'Asha <b>x</b>', course: 'Python & Git', amount: '₹1,999', orderId: 'order_1' };
    expect(renderSaved('payment-receipt', undefined, values)).toBeNull();
    expect(renderSaved('payment-receipt', null, values)).toBeNull();
    expect(renderSaved('payment-receipt', { subject: 'Hi' }, values)).toBeNull();                              // no body
    expect(renderSaved('payment-receipt', { subject: 'Hi', body: 'Order {{nope}}' }, values)).toBeNull();      // a placeholder this template does not have
    expect(renderSaved('payment-receipt', { subject: 'a\nb', body: 'ok' }, values)).toBeNull();                // two-line subject
    expect(renderSaved('payment-receipt', { subject: 5, body: 'ok' } as never, values)).toBeNull();
    const r = renderSaved('payment-receipt', { subject: 'Receipt for {{course}}', body: 'Hi {{name}},\n\nWe received **{{amount}}** for {{course}}.\n\nOrder id: {{orderId}}' }, values)!;
    expect(r.subject).toBe('Receipt for Python & Git');
    expect(r.html).toContain('Hi Asha &lt;b&gt;x&lt;/b&gt;,');
    expect(r.html).not.toContain('<b>x</b>');
    expect(r.html).toContain('<strong>₹1,999</strong>');
    expect(r.html.startsWith('<div style="font-family')).toBe(true);
    expect(r.text).toContain('Order id: order_1');
    expect(renderSaved('welcome', { subject: 'Hi {{name}}', body: 'Welcome to {{course}} {{orderId}}' }, { ...values })).toBeNull();   // orderId is not a welcome placeholder
    const extra = renderSaved('welcome', { subject: 'Hi', body: 'Hi {{name}}' }, { name: 'A', course: 'B', orderId: 'ignored', amount: 'ignored' })!;
    expect(extra.text).toBe('Hi A');
  });

  test('[ENG-UNIT-MAIL-002] every built-in template renders with its own sample values and the same call, so the saved-template path cannot break on a field the preview already accepts', () => {
    for (const key of TEMPLATE_KEYS) {
      const t = TEMPLATES[key];
      const r = renderSaved(key, { subject: t.subject, body: t.body }, t.sample);
      expect(r, key).not.toBeNull();
      expect(r!.subject, key).not.toMatch(/\{\{|\}\}/);
      expect(r!.html, key).not.toMatch(/\{\{|\}\}/);
    }
  });

  test('[ENG-UNIT-BAN-001] the countdown is hours:minutes:seconds (with days from one day up) and disappears once the time is out; the dismissal belongs to one version of one banner', () => {
    expect(formatCountdown(0)).toBeNull();
    expect(formatCountdown(-5)).toBeNull();
    expect(formatCountdown(null)).toBeNull();
    expect(formatCountdown(undefined)).toBeNull();
    expect(formatCountdown(NaN)).toBeNull();
    expect(formatCountdown(1)).toBe('00:00:01');
    expect(formatCountdown(3661)).toBe('01:01:01');
    expect(formatCountdown(86399)).toBe('23:59:59');
    expect(formatCountdown(86400)).toBe('1d 00:00:00');
    expect(formatCountdown(2 * 86400 + 3 * 3600 + 5 * 60 + 10)).toBe('2d 03:05:10');
    expect(dismissKey('diwali', 3)).toBe('shivam_banner_dismissed:diwali:3');
    expect(dismissKey('diwali', 4)).not.toBe(dismissKey('diwali', 3));
    expect(secondsLeft(null, 0, 99999)).toBeNull();
    expect(secondsLeft(100, 1000, 1000)).toBe(100);
    expect(secondsLeft(100, 1000, 31_500)).toBe(70);
    expect(secondsLeft(100, 5000, 1000)).toBe(100);   // a clock that moved back never adds time
  });

  test('[ENG-UNIT-TAG-001] any change to a banner refreshes the banner cache; nothing else does', () => {
    expect(BANNERS_TAG).toBe('banners');
    expect(touchesBanners('banner')).toBe(true);
    for (const r of ['course', 'cohort', 'setting', 'notification', 'email_template', 'coupon', '']) expect(touchesBanners(r), r).toBe(false);
  });
});
