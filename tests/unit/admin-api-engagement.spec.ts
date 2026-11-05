import { test, expect } from '@playwright/test';
import {
  assertBanner, audienceMatches, bannerCreateShape, bannerDefaults, bannerProblems, bannerUpdateShape, cleanBanner, ctaLink, plainText, visibleBanners,
  type Banner, type BannerRow, type Viewer,
} from '../../lib/adminApi/banners';
import { SETTINGS, SETTING_KEYS, assertSettingsConsistent, checkSettingValue, effectiveSettings, isSettingKey } from '../../lib/adminApi/settings';
import { LIMITS, TEMPLATES, TEMPLATE_KEYS, assertTemplate, isTemplateKey, placeholdersIn, renderTemplate, sampleValues, templateProblems } from '../../lib/adminApi/emailTemplates';
import { parseObject } from '../../lib/adminApi/validate';
import { ApiError } from '../../lib/adminApi/envelope';
import { roleCan } from '../../lib/adminApi/permissions';

// Unit level (phase 3a): banners, settings and e-mail templates. No database, no network.
const refusal = (fn: () => unknown): ApiError => { try { fn(); } catch (e) { return e as ApiError; } throw new Error('expected a refusal'); };
const NOW = new Date('2026-11-10T12:00:00.000Z');
const iso = (hours: number) => new Date(NOW.getTime() + hours * 3600_000).toISOString();
const banner = (extra: Partial<Banner> = {}): Banner => ({ purpose: 'announcement', message: 'Hello', placement: 'site-top', ...bannerDefaults, ...extra } as Banner);
const row = (slug: string, doc: Partial<Banner> = {}, status = 'published'): BannerRow => ({ slug, status, doc: banner(doc) });
const learner: Viewer = { kind: 'learner', cohortSlugs: ['python-batch-1'], planIds: ['personal'] };
const visitor: Viewer = { kind: 'visitor' };
const slugs = (rows: BannerRow[], v: Viewer = visitor, p: Banner['placement'] = 'site-top') => visibleBanners(rows, v, p, NOW).map((b) => b.slug);

test.describe('AAPI banners, settings, templates @regression', () => {
  test('[AAPI-UNIT-BAN-001] banner text is plain: no angle brackets, no line breaks, limited length', () => {
    expect(plainText(280)('Diwali offer: 20% off').ok).toBe(true);
    for (const bad of ['<script>alert(1)</script>', 'a < b', 'x > y', '<b>bold</b>', 'two\nlines', 'tab\there', '', '   ', 5, null]) expect(plainText(280)(bad).ok, String(bad)).toBe(false);
    expect(plainText(280)('x'.repeat(280)).ok).toBe(true);
    expect(plainText(280)('x'.repeat(281)).ok).toBe(false);
  });

  test('[AAPI-UNIT-BAN-002] the call-to-action link is https or a path on this site, never another scheme or a protocol-relative link', () => {
    for (const good of ['https://shivamnamdev.com/courses', '/courses', '/courses/python?x=1#top', '/']) expect(ctaLink(good).ok, good).toBe(true);
    for (const bad of ['http://example.com', '//evil.example/x', '/\\evil.example', 'javascript:alert(1)', 'data:text/html,hi', 'courses', 'https://user:pw@example.com/x', '/a b', '/<x>', '/' + 'a'.repeat(500), 5]) expect(ctaLink(bad).ok, String(bad)).toBe(false);
  });

  test('[AAPI-UNIT-BAN-003] creating: purpose, message and placement are required, the rest has safe defaults, unknown fields are refused', () => {
    const input = parseObject({ slug: 'diwali', purpose: 'offer', message: 'Diwali offer', placement: 'courses' }, bannerCreateShape);
    expect(input).toMatchObject({ slug: 'diwali', purpose: 'offer', message: 'Diwali offer', placement: 'courses' });
    expect(refusal(() => parseObject({ slug: 'x' }, bannerCreateShape)).fields).toMatchObject({ purpose: expect.any(String), message: expect.any(String), placement: expect.any(String) });
    expect(refusal(() => parseObject({ slug: 'Bad Slug', purpose: 'offer', message: 'm', placement: 'courses' }, bannerCreateShape)).fields).toHaveProperty('slug');
    expect(refusal(() => parseObject({ slug: 'x', purpose: 'offer', message: 'm', placement: 'courses', html: '<b>' }, bannerCreateShape)).fields).toHaveProperty('html');
    expect(refusal(() => parseObject({ slug: 'x', purpose: 'sale', message: 'm', placement: 'nowhere', style: 'loud', priority: 101 }, bannerCreateShape)).fields).toMatchObject({ purpose: expect.any(String), placement: expect.any(String), style: expect.any(String), priority: expect.any(String) });
    expect(bannerDefaults).toEqual({ style: 'info', audience: { kind: 'all' }, startsAt: null, endsAt: null, dismissible: true, priority: 0, allowMultiple: false });
  });

  test('[AAPI-UNIT-BAN-004] audience: all, visitors, learners, one cohort or one plan; anything else is refused', () => {
    const parse = (audience: unknown) => parseObject({ slug: 'a', purpose: 'offer', message: 'm', placement: 'courses', audience }, bannerCreateShape).audience;
    expect(parse({ kind: 'learners' })).toEqual({ kind: 'learners' });
    expect(parse({ kind: 'cohort', cohortSlug: 'python-batch-1' })).toEqual({ kind: 'cohort', cohortSlug: 'python-batch-1' });
    expect(parse({ kind: 'plan', planId: 'personal' })).toEqual({ kind: 'plan', planId: 'personal' });
    for (const bad of [{ kind: 'everyone' }, { kind: 'cohort' }, { kind: 'cohort', cohortSlug: 'Bad Slug' }, { kind: 'plan', planId: '' }, { kind: 'all', cohortSlug: 'x' }, 'all', []])
      expect(() => parse(bad), JSON.stringify(bad)).toThrow();
  });

  test('[AAPI-UNIT-BAN-005] a link needs both label and url; the end must be after the start', () => {
    expect(bannerProblems(banner({ ctaLabel: 'Buy', ctaUrl: '/courses' }))).toEqual({});
    expect(bannerProblems(banner({ ctaLabel: 'Buy' }))).toHaveProperty('ctaUrl');
    expect(bannerProblems(banner({ ctaUrl: '/courses' }))).toHaveProperty('ctaLabel');
    expect(bannerProblems(banner({ startsAt: iso(1), endsAt: iso(2) }))).toEqual({});
    expect(bannerProblems(banner({ startsAt: iso(2), endsAt: iso(1) }))).toHaveProperty('endsAt');
    expect(bannerProblems(banner({ startsAt: iso(1), endsAt: iso(1) }))).toHaveProperty('endsAt');
    expect(bannerProblems(banner({ startsAt: null, endsAt: iso(-5) }))).toEqual({});   // an end in the past is allowed to be saved (it simply never shows)
    expect(refusal(() => assertBanner(banner({ ctaLabel: 'Buy' }))).status).toBe(400);
  });

  test('[AAPI-UNIT-BAN-006] updating: null clears the link, the dates and the countdown; undefined leaves them', () => {
    const body = parseObject({ ctaLabel: null, ctaUrl: null, endsAt: null, countdownTo: null }, bannerUpdateShape);
    expect(body).toMatchObject({ ctaLabel: null, ctaUrl: null, endsAt: null, countdownTo: null });
    const merged = cleanBanner({ ...banner({ ctaLabel: 'Buy', ctaUrl: '/courses', countdownTo: iso(5), endsAt: iso(9) }), ...body });
    expect(merged).not.toHaveProperty('ctaLabel');
    expect(merged).not.toHaveProperty('countdownTo');
    expect(merged.endsAt).toBeNull();
    expect(parseObject({}, bannerUpdateShape)).toMatchObject({});
    expect(refusal(() => parseObject({ slug: 'new-slug' }, bannerUpdateShape)).fields).toHaveProperty('slug');   // the slug cannot be changed
  });

  test('[AAPI-UNIT-BAN-007] visibleBanners: only published banners inside their window, in the right placement', () => {
    const rows = [row('a'), row('draft', {}, 'draft'), row('archived', {}, 'archived'), row('future', { startsAt: iso(1) }), row('over', { endsAt: iso(-1) }), row('elsewhere', { placement: 'learning' })];
    expect(slugs(rows)).toEqual(['a']);
    expect(slugs([row('now', { startsAt: iso(0) })])).toEqual(['now']);          // starts exactly now: shows
    expect(slugs([row('ends-now', { endsAt: iso(0) })])).toEqual([]);            // ends exactly now: gone
    expect(slugs(rows, visitor, 'learning')).toEqual(['elsewhere']);
    expect(slugs([])).toEqual([]);
  });

  test('[AAPI-UNIT-BAN-008] visibleBanners: audience rules for visitors, learners, cohorts and plans', () => {
    const rows = [row('all'), row('v', { audience: { kind: 'visitors' }, priority: 1 }), row('l', { audience: { kind: 'learners' }, priority: 2 }),
      row('c', { audience: { kind: 'cohort', cohortSlug: 'python-batch-1' }, priority: 3 }), row('c2', { audience: { kind: 'cohort', cohortSlug: 'other' }, priority: 4 }),
      row('p', { audience: { kind: 'plan', planId: 'personal' }, priority: 5 }), row('p2', { audience: { kind: 'plan', planId: 'community' }, priority: 6 })];
    const all = (v: Viewer) => visibleBanners(rows.map((r) => ({ ...r, doc: { ...r.doc, allowMultiple: true } })), v, 'site-top', NOW).map((b) => b.slug);
    expect(all(visitor)).toEqual(['v', 'all']);
    expect(all(learner)).toEqual(['p', 'c', 'l', 'all']);
    expect(all({ kind: 'learner' })).toEqual(['l', 'all']);                        // a learner with no cohorts or plans matches neither
    expect(audienceMatches({ kind: 'cohort', cohortSlug: 'x' }, visitor)).toBe(false);
  });

  test('[AAPI-UNIT-BAN-009] visibleBanners: best priority wins alone, unless it allows several; ties are stable', () => {
    expect(slugs([row('low', { priority: 1 }), row('high', { priority: 9 })])).toEqual(['high']);
    expect(slugs([row('b', { priority: 5 }), row('a', { priority: 5 })])).toEqual(['a']);          // same priority: alphabetical, always the same answer
    expect(slugs([row('m1', { priority: 9, allowMultiple: true }), row('m2', { priority: 5, allowMultiple: true }), row('single', { priority: 7 })])).toEqual(['m1', 'm2']);
    expect(slugs([row('single', { priority: 9 }), row('m1', { priority: 5, allowMultiple: true })])).toEqual(['single']);
  });

  test('[AAPI-UNIT-BAN-010] countdown: seconds left, never negative, absent without a target', () => {
    const shown = (countdownTo?: string) => visibleBanners([row('a', countdownTo ? { countdownTo } : {})], visitor, 'site-top', NOW)[0];
    expect(shown(iso(1)).countdownSeconds).toBe(3600);
    expect(shown(iso(0)).countdownSeconds).toBeNull();
    expect(shown(iso(-3)).countdownSeconds).toBeNull();
    expect(shown().countdownSeconds).toBeNull();
    const withLink = visibleBanners([row('a', { ctaLabel: 'Buy', ctaUrl: '/courses' })], visitor, 'site-top', NOW)[0];
    expect(withLink).toMatchObject({ ctaLabel: 'Buy', ctaUrl: '/courses', style: 'info', dismissible: true });
    expect(visibleBanners([row('a')], visitor, 'site-top', NOW)[0]).not.toHaveProperty('ctaLabel');
  });

  test('[AAPI-UNIT-SET-001] only the four known settings exist, with their defaults', () => {
    expect(SETTING_KEYS.sort()).toEqual(['announcement-email-cap', 'daily-email-cap', 'support-email', 'support-phone']);
    expect(isSettingKey('daily-email-cap')).toBe(true);
    for (const bad of ['dailyEmailCap', 'unknown', '__proto__', 'constructor', 'toString', '']) expect(isSettingKey(bad), bad).toBe(false);
    expect(effectiveSettings({})).toEqual({ 'announcement-email-cap': 50, 'daily-email-cap': 200, 'support-phone': null, 'support-email': null });
    expect(effectiveSettings({ 'daily-email-cap': 300 })['daily-email-cap']).toBe(300);
    expect(SETTINGS['daily-email-cap'].description).toBeTruthy();
  });

  test('[AAPI-UNIT-SET-002] setting values: whole numbers in range, a phone number, an e-mail; null clears only phone and e-mail', () => {
    expect(checkSettingValue('announcement-email-cap', 1)).toBe(1);
    expect(checkSettingValue('announcement-email-cap', 200)).toBe(200);
    expect(checkSettingValue('daily-email-cap', 500)).toBe(500);
    for (const [k, v] of [['announcement-email-cap', 0], ['announcement-email-cap', 201], ['announcement-email-cap', 1.5], ['announcement-email-cap', '50'], ['daily-email-cap', 501], ['daily-email-cap', -1], ['daily-email-cap', null],
      ['support-phone', 'call me'], ['support-phone', '12'], ['support-phone', '+91 98765 43210; drop'], ['support-email', 'not-an-email'], ['support-email', 5]] as const)
      expect(refusal(() => checkSettingValue(k, v)).status, `${k} ${String(v)}`).toBe(400);
    expect(checkSettingValue('support-phone', '+91 98765 43210')).toBe('+91 98765 43210');
    expect(checkSettingValue('support-email', 'Help@Example.com')).toBe('help@example.com');
    expect(checkSettingValue('support-phone', null)).toBeNull();
    expect(checkSettingValue('support-email', null)).toBeNull();
  });

  test('[AAPI-UNIT-SET-003] one announcement may not reach more people than the day allows (422)', () => {
    expect(() => assertSettingsConsistent(effectiveSettings({}))).not.toThrow();
    expect(() => assertSettingsConsistent(effectiveSettings({ 'announcement-email-cap': 100, 'daily-email-cap': 100 }))).not.toThrow();
    expect(refusal(() => assertSettingsConsistent(effectiveSettings({ 'announcement-email-cap': 200, 'daily-email-cap': 100 }))).status).toBe(422);
    expect(refusal(() => assertSettingsConsistent(effectiveSettings({ 'daily-email-cap': 20 }))).status).toBe(422);   // lowering the day below the default announcement cap (50)
  });

  test('[AAPI-UNIT-TPL-001] the built-in templates are valid for themselves and cover every placeholder with a sample', () => {
    expect(TEMPLATE_KEYS.sort()).toEqual(['free-enrolment', 'payment-receipt', 'welcome']);
    for (const key of TEMPLATE_KEYS) {
      const t = TEMPLATES[key];
      expect(templateProblems(key, t.subject, t.body), key).toEqual({});
      for (const p of t.placeholders) expect(sampleValues(key)[p], `${key}.${p}`).toBeTruthy();
      const out = renderTemplate(key, t.subject, t.body, sampleValues(key));
      expect(out.html, key).not.toMatch(/\{\{|\}\}/);
      expect(out.text, key).not.toMatch(/\{\{|\}\}|\*\*/);
    }
    expect(isTemplateKey('welcome')).toBe(true);
    for (const bad of ['', 'Welcome', 'toString', '__proto__', 'other']) expect(isTemplateKey(bad), bad).toBe(false);
  });

  test('[AAPI-UNIT-TPL-002] saving a template: required parts, one-line subject, only placeholders that template has, no unfinished placeholder', () => {
    expect(templateProblems('welcome', 'Hi {{name}}', 'Hello {{name}}, welcome to {{course}}')).toEqual({});
    expect(templateProblems('welcome', '', 'ok')).toHaveProperty('subject');
    expect(templateProblems('welcome', 'ok', '   ')).toHaveProperty('body');
    expect(templateProblems('welcome', 'two\nlines', 'ok')).toHaveProperty('subject');
    expect(templateProblems('welcome', 'ok', 'Your order {{orderId}}').body).toMatch(/orderId/);        // orderId only exists on payment-receipt
    expect(templateProblems('payment-receipt', 'ok', 'Your order {{orderId}} for {{amount}}')).toEqual({});
    expect(templateProblems('welcome', 'ok', '{{ name }}').body).toMatch(/not available/);                // spaces inside the braces are not a known name
    expect(templateProblems('welcome', 'ok', 'Hello {{name')).toHaveProperty('body');
    expect(templateProblems('welcome', 'ok', 'Hello name}}')).toHaveProperty('body');
    expect(templateProblems('welcome', 'ok', '{{constructor}}').body).toMatch(/not available/);
    expect(templateProblems('welcome', 'x'.repeat(LIMITS.subject + 1), 'ok')).toHaveProperty('subject');
    expect(templateProblems('welcome', 'ok', 'x'.repeat(LIMITS.body + 1))).toHaveProperty('body');
    expect(templateProblems('welcome', 5, null)).toMatchObject({ subject: expect.any(String), body: expect.any(String) });
    expect(placeholdersIn('a {{name}} b {{ course }} {{}}')).toEqual(['name', ' course ', '']);
    expect(refusal(() => assertTemplate('welcome', '', '')).status).toBe(400);
    expect(assertTemplate('welcome', '  Hi {{name}}  ', 'Line 1\r\n\r\nLine 2  ')).toEqual({ subject: 'Hi {{name}}', body: 'Line 1\n\nLine 2' });
  });

  test('[AAPI-UNIT-TPL-003] rendering turns blank lines into paragraphs and knows only **bold** and https links', () => {
    const out = renderTemplate('welcome', 'Hi', 'First **line**\nsame paragraph\n\nSecond [site](https://example.com/a?x=1&y=2)', {});
    expect(out.html).toBe('<p>First <strong>line</strong><br>same paragraph</p>\n<p>Second <a href="https://example.com/a?x=1&amp;y=2">site</a></p>');
    expect(out.text).toBe('First line\nsame paragraph\n\nSecond site (https://example.com/a?x=1&y=2)');
    const odd = renderTemplate('welcome', 'Hi', '[bad](javascript:alert(1)) [http](http://example.com) [rel](/x)', {});
    expect(odd.html).not.toContain('<a ');
    expect(renderTemplate('welcome', 'Hi', '_italic_ # heading `code`', {}).html).toBe('<p>_italic_ # heading `code`</p>');
  });

  test('[AAPI-UNIT-TPL-004] rendering escapes everything: script tags in the body, in the values, in link labels and in quotes', () => {
    const body = '<script>alert(1)</script> {{name}} [<img src=x onerror=alert(1)>](https://example.com/"onmouseover="x)';
    const out = renderTemplate('welcome', 'Hi', body, { name: '<b onclick="x">Asha</b>' });
    expect(out.html).not.toMatch(/<script|<img|<b |onclick="|onerror=alert\(1\)>|"onmouseover="/);
    expect(out.html).toContain('&lt;script&gt;');
    expect(out.html).toContain('&lt;b onclick=&quot;x&quot;&gt;Asha&lt;/b&gt;');
    const quote = renderTemplate('welcome', 'Hi', 'Hello {{name}}', { name: `O'Brien "Pat" & Sons` });
    expect(quote.html).toBe('<p>Hello O&#39;Brien &quot;Pat&quot; &amp; Sons</p>');
  });

  test('[AAPI-UNIT-TPL-005] a value cannot add formatting or links, and an unknown or missing value renders empty', () => {
    const out = renderTemplate('welcome', 'Hi {{name}}', 'Hello {{name}} {{course}}', { name: '**bold** [x](https://evil.example)' });
    expect(out.html).toBe('<p>Hello **bold** [x](https://evil.example) </p>');
    expect(out.html).not.toContain('<a ');
    expect(out.html).not.toContain('<strong>');
    expect(renderTemplate('welcome', 'Hi', 'Order {{orderId}}', { orderId: 'order_1' }).html).toBe('<p>Order </p>');     // not a welcome placeholder: ignored
    expect(renderTemplate('welcome', 'Hi', '{{name}}', { name: '{{course}}', course: 'X' }).html).toBe('<p>{{course}}</p>');  // no second round of substitution
  });

  test('[AAPI-UNIT-TPL-006] the subject is one line: line breaks in a value cannot add e-mail headers', () => {
    const out = renderTemplate('welcome', 'Welcome {{name}}', 'Hi', { name: 'Asha\r\nBcc: victim@example.com' });
    expect(out.subject).not.toMatch(/[\r\n]/);
    expect(out.subject).toBe('Welcome Asha Bcc: victim@example.com');
    expect(renderTemplate('welcome', '{{course}}', 'Hi', { course: 'A\u0000B\u0007C' }).subject).toBe('A B C');
  });

  test('[AAPI-UNIT-PERM-003] permissions: the owner and an admin key can change content and settings, a staff key can only read', () => {
    const writes = ['banners:write', 'settings:write', 'templates:write'] as const;
    const reads = ['banners:read', 'settings:read', 'templates:read'] as const;
    for (const p of [...writes, ...reads]) { expect(roleCan('owner', p), p).toBe(true); expect(roleCan('key-admin', p), p).toBe(true); }
    for (const p of reads) expect(roleCan('key-staff', p), p).toBe(true);
    for (const p of writes) expect(roleCan('key-staff', p), p).toBe(false);
  });
});
