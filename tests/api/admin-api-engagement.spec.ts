import { test, expect } from '@playwright/test';
import { EMAIL } from '../support/personas';
import { requireSeed } from '../support/guards';
import { API_UA, sessionFor, type Session } from '../support/api';
import { BASE, PREFIX, clearWriteLimits, cleanupAdminApi, cohort, course, future } from '../support/adminApi';
import { adminDb } from '../support/db';

// PRD 19 · slice 3a: banners, settings, e-mail templates. Settings and templates have fixed keys (no test prefix is possible), so the
// spec saves what QA holds before it starts and puts it back afterwards.
const COURSE = 'qa-aapi-en-course';
const COHORT = 'qa-aapi-en-batch';
const B = 'qa-aapi-en-banner';
const hdr = (v: number) => ({ 'If-Match': String(v) });
const banner = (extra: object = {}) => ({ slug: B, purpose: 'offer', message: 'QA offer: 20% off', placement: 'courses', ...extra });
type Snapshot = Record<string, unknown>[];

test.describe('AAPI banners, settings, templates @regression', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async () => { test.setTimeout(90_000); requireSeed(); await clearWriteLimits(); });
  let admin: Session; let saved: Snapshot = []; let startedAt = '';
  test.beforeAll(async ({ browser }) => {
    startedAt = new Date().toISOString();
    saved = (await adminDb().from('content_docs').select('*').in('kind', ['setting', 'email_template'])).data ?? [];
    await adminDb().from('content_docs').delete().in('kind', ['setting', 'email_template']);
    admin = await sessionFor(browser, EMAIL.admin);
    await admin.request.post(`${BASE}/courses`, { data: course(COURSE) });
    await admin.request.post(`${BASE}/cohorts`, { data: cohort(COHORT, COURSE) });
  });
  test.afterAll(async () => {
    const db = adminDb();
    await db.from('content_docs').delete().in('kind', ['setting', 'email_template']);
    if (saved.length) await db.from('content_docs').insert(saved);
    await db.from('admin_audit').delete().in('resource', ['setting', 'email_template']).gte('at', startedAt);
    await cleanupAdminApi(); await clearWriteLimits(); await admin?.close();
  });
  const get = async (p: string) => (await (await admin.request.get(`${BASE}${p}`)).json()).data;

  test('[AAPI-ENG-001] a banner is created as a draft with safe defaults; unsafe or inconsistent input is refused and nothing is stored', async () => {
    const res = await admin.request.post(`${BASE}/banners`, { data: banner() });
    expect(res.status()).toBe(201);
    expect((await res.json()).data).toMatchObject({ slug: B, status: 'draft', version: 1, style: 'info', audience: { kind: 'all' }, dismissible: true, priority: 0, allowMultiple: false, startsAt: null, endsAt: null });
    expect((await admin.request.post(`${BASE}/banners`, { data: banner() })).status()).toBe(409);
    for (const [name, extra] of [
      ['html', { message: '<script>alert(1)</script>' }], ['line break', { message: 'one\ntwo' }], ['too long', { message: 'x'.repeat(281) }],
      ['javascript link', { ctaLabel: 'Go', ctaUrl: 'javascript:alert(1)' }], ['protocol-relative link', { ctaLabel: 'Go', ctaUrl: '//evil.example' }], ['label without url', { ctaLabel: 'Go' }],
      ['end before start', { startsAt: future(2), endsAt: future(1) }], ['bad placement', { placement: 'footer' }], ['priority', { priority: 101 }], ['unknown field', { html: '<b>x</b>' }], ['bad audience', { audience: { kind: 'cohort' } }],
    ] as const) {
      const r = await admin.request.post(`${BASE}/banners`, { data: banner({ slug: `${B}-bad`, ...extra }) });
      expect(r.status(), name).toBe(400);
      expect((await r.json()).error.code).toBe('validation_failed');
    }
    expect((await admin.request.post(`${BASE}/banners`, { data: banner({ slug: `${B}-bad`, audience: { kind: 'cohort', cohortSlug: 'qa-aapi-no-such-cohort' } }) })).status()).toBe(422);
    expect((await admin.request.get(`${BASE}/banners/${B}-bad`)).status()).toBe(404);
    const list = (await get(`/banners?q=${B}`)).items;
    expect(list.map((b: { slug: string }) => b.slug)).toEqual([B]);
    expect((await admin.request.get(`${BASE}/banners/Bad Slug`)).status()).toBe(404);
  });

  test('[AAPI-ENG-002] updating needs If-Match; a stale version is 409; null clears the link; the audience can point at a real cohort', async () => {
    const url = `${BASE}/banners/${B}`;
    expect((await admin.request.patch(url, { data: { message: 'New' } })).status()).toBe(428);
    expect((await admin.request.patch(url, { data: { message: 'New' }, headers: hdr(99) })).status()).toBe(409);
    expect((await admin.request.patch(url, { data: {}, headers: hdr(1) })).status()).toBe(400);
    expect((await admin.request.patch(url, { data: { slug: 'other' }, headers: hdr(1) })).status()).toBe(400);
    const a = await admin.request.patch(url, { data: { message: 'Updated offer', ctaLabel: 'Buy now', ctaUrl: '/courses', priority: 5, audience: { kind: 'cohort', cohortSlug: COHORT } }, headers: hdr(1) });
    expect(a.status()).toBe(200);
    expect((await a.json()).data).toMatchObject({ version: 2, message: 'Updated offer', ctaLabel: 'Buy now', ctaUrl: '/courses', priority: 5, audience: { kind: 'cohort', cohortSlug: COHORT } });
    expect((await admin.request.patch(url, { data: { ctaLabel: 'Only label' }, headers: hdr(2) })).status()).toBe(200);   // the link is already there: changing the label alone is fine
    expect((await admin.request.patch(url, { data: { ctaUrl: null }, headers: hdr(3) })).status()).toBe(400);               // removing only the url leaves a label without a link
    const cleared = await admin.request.patch(url, { data: { ctaLabel: null, ctaUrl: null }, headers: hdr(3) });
    expect(cleared.status()).toBe(200);
    const c = (await cleared.json()).data;
    expect(c).not.toHaveProperty('ctaLabel');
    expect(c).not.toHaveProperty('ctaUrl');
    expect((await admin.request.patch(url, { data: { endsAt: future(1) }, headers: hdr(4) })).status()).toBe(200);
    expect((await admin.request.patch(url, { data: { startsAt: future(2) }, headers: hdr(5) })).status()).toBe(400);        // would start after it ends
    expect((await admin.request.patch(url, { data: { audience: { kind: 'cohort', cohortSlug: 'qa-aapi-no-such-cohort' } }, headers: hdr(5) })).status()).toBe(422);
  });

  test('[AAPI-ENG-003] banner life cycle: publish, unpublish, archive, restore; a published banner cannot be deleted; every change is audited', async () => {
    const act = (a: string) => admin.request.post(`${BASE}/banners/${B}/${a}`);
    expect((await act('unpublish')).status()).toBe(422);
    expect((await act('restore')).status()).toBe(422);
    expect((await act('publish')).status()).toBe(200);
    expect((await act('publish')).status()).toBe(422);
    expect((await get(`/banners/${B}`)).status).toBe('published');
    expect((await admin.request.delete(`${BASE}/banners/${B}`)).status()).toBe(422);
    expect((await act('unpublish')).status()).toBe(200);
    expect((await act('archive')).status()).toBe(200);
    expect((await get(`/banners?status=archived&q=${B}`)).items).toHaveLength(1);
    expect((await act('restore')).status()).toBe(200);
    expect((await admin.request.post(`${BASE}/banners/qa-aapi-none/publish`)).status()).toBe(404);
    const audit = (await get(`/audit?resource=banner&resourceId=${B}&limit=100`)).items.map((a: { action: string }) => a.action);
    expect(audit).toEqual(expect.arrayContaining(['create', 'update', 'publish', 'unpublish', 'archive', 'restore']));
    expect((await admin.request.delete(`${BASE}/banners/${B}`)).status()).toBe(200);
    expect((await admin.request.get(`${BASE}/banners/${B}`)).status()).toBe(404);
    expect((await get(`/audit?resource=banner&resourceId=${B}&limit=100`)).items.map((a: { action: string }) => a.action)).toContain('delete');
  });

  test('[AAPI-ENG-004] settings: the four keys read as defaults; values are range checked; the first save needs no version, later ones do', async () => {
    const items = (await get('/settings')).items;
    expect(items.map((s: { key: string }) => s.key)).toEqual(['announcement-email-cap', 'daily-email-cap', 'support-phone', 'support-email']);
    expect(items.find((s: { key: string }) => s.key === 'daily-email-cap')).toMatchObject({ value: 200, default: 200, source: 'default', version: null });
    expect((await admin.request.put(`${BASE}/settings/dailyEmailCap`, { data: { value: 10 } })).status()).toBe(404);
    expect((await admin.request.put(`${BASE}/settings/__proto__`, { data: { value: 10 } })).status()).toBe(404);
    for (const [key, value] of [['announcement-email-cap', 0], ['announcement-email-cap', 201], ['daily-email-cap', 501], ['daily-email-cap', '200'], ['daily-email-cap', null], ['support-phone', 'call me'], ['support-email', 'nope']] as const)
      expect((await admin.request.put(`${BASE}/settings/${key}`, { data: { value } })).status(), `${key} ${value}`).toBe(400);
    expect((await admin.request.put(`${BASE}/settings/daily-email-cap`, { data: {} })).status()).toBe(400);
    expect((await admin.request.put(`${BASE}/settings/daily-email-cap`, { data: { value: 300, extra: 1 } })).status()).toBe(400);
    const first = await admin.request.put(`${BASE}/settings/daily-email-cap`, { data: { value: 300 } });
    expect(first.status()).toBe(201);
    expect((await first.json()).data).toMatchObject({ key: 'daily-email-cap', value: 300, source: 'custom', version: 1 });
    expect((await admin.request.put(`${BASE}/settings/daily-email-cap`, { data: { value: 250 } })).status()).toBe(428);
    expect((await admin.request.put(`${BASE}/settings/daily-email-cap`, { data: { value: 250 }, headers: hdr(9) })).status()).toBe(409);
    expect((await admin.request.put(`${BASE}/settings/daily-email-cap`, { data: { value: 250 }, headers: hdr(1) })).status()).toBe(200);
    expect((await get('/settings')).items.find((s: { key: string }) => s.key === 'daily-email-cap')).toMatchObject({ value: 250, version: 2 });
  });

  test('[AAPI-ENG-005] settings: one announcement may not exceed the daily total (422); phone and e-mail can be set and cleared; changes are audited', async () => {
    const put = (key: string, value: unknown, v?: number) => admin.request.put(`${BASE}/settings/${key}`, { data: { value }, headers: v ? hdr(v) : {} });
    // daily-email-cap is 250 (version 2) from the previous test; the announcement cap still has its default of 50
    expect((await put('daily-email-cap', 40, 2)).status()).toBe(422);
    expect((await put('announcement-email-cap', 200)).status()).toBe(201);
    expect((await put('daily-email-cap', 150, 2)).status()).toBe(422);
    expect((await put('announcement-email-cap', 100, 1)).status()).toBe(200);
    expect((await put('daily-email-cap', 150, 2)).status()).toBe(200);
    expect((await get('/settings')).items.find((s: { key: string }) => s.key === 'daily-email-cap').value).toBe(150);   // refused changes stored nothing
    const phone = await put('support-phone', '+91 98765 43210');
    expect(phone.status()).toBe(201);
    expect((await phone.json()).data.value).toBe('+91 98765 43210');
    const cleared = await put('support-phone', null, 1);
    expect(cleared.status()).toBe(200);
    expect((await cleared.json()).data).toMatchObject({ value: null, source: 'custom', version: 2 });
    expect((await (await put('support-email', 'Help@Example.com')).json()).data.value).toBe('help@example.com');
    const audit = (await get('/audit?resource=setting&resourceId=daily-email-cap&limit=100')).items;
    expect(audit.map((a: { action: string }) => a.action)).toEqual(expect.arrayContaining(['create', 'update']));
    expect(audit.find((a: { action: string }) => a.action === 'update')).toMatchObject({ before: { value: 250 }, after: { value: 150 } });
  });

  test('[AAPI-ENG-006] e-mail templates: built-in text until saved; unknown placeholders and bad subjects are refused; saves are versioned', async () => {
    const items = (await get('/email-templates')).items;
    expect(items.map((t: { key: string }) => t.key)).toEqual(['welcome', 'payment-receipt', 'free-enrolment']);
    expect(items.every((t: { source: string; version: null }) => t.source === 'default' && t.version === null)).toBe(true);
    expect(items.find((t: { key: string }) => t.key === 'payment-receipt').placeholders).toEqual(['name', 'course', 'amount', 'orderId']);
    for (const key of ['Welcome', 'toString', 'other']) expect((await admin.request.get(`${BASE}/email-templates/${key}`)).status(), key).toBe(404);
    const url = `${BASE}/email-templates/welcome`;
    const put = (data: object, v?: number) => admin.request.put(url, { data, headers: v ? hdr(v) : {} });
    for (const [name, data] of [['unknown placeholder', { subject: 'Hi', body: 'Order {{orderId}}' }], ['multi-line subject', { subject: 'a\nb', body: 'ok' }], ['no body', { subject: 'Hi' }],
      ['empty subject', { subject: '  ', body: 'ok' }], ['unfinished placeholder', { subject: 'Hi', body: 'Hello {{name' }], ['extra field', { subject: 'Hi', body: 'ok', html: '<b>x</b>' }], ['too long', { subject: 'Hi', body: 'x'.repeat(5001) }]] as const) {
      const r = await put(data);
      expect(r.status(), name).toBe(400);
    }
    expect((await admin.request.put(`${BASE}/email-templates/other`, { data: { subject: 'a', body: 'b' } })).status()).toBe(404);
    expect((await get('/email-templates/welcome')).source).toBe('default');                  // refused saves stored nothing
    const first = await put({ subject: 'Welcome {{name}}', body: 'Hello {{name}},\n\nWelcome to **{{course}}**.' });
    expect(first.status()).toBe(201);
    expect((await first.json()).data).toMatchObject({ key: 'welcome', source: 'custom', version: 1, subject: 'Welcome {{name}}' });
    expect((await put({ subject: 'x', body: 'y' })).status()).toBe(428);
    expect((await put({ subject: 'x', body: 'y' }, 9)).status()).toBe(409);
    const second = await put({ subject: 'Welcome again {{name}}', body: 'Hello {{name}}, see [site](https://example.com).' }, 1);
    expect(second.status()).toBe(200);
    expect((await second.json()).data.version).toBe(2);
    const audit = (await get('/audit?resource=email_template&resourceId=welcome&limit=100')).items.map((a: { action: string }) => a.action);
    expect(audit).toEqual(expect.arrayContaining(['create', 'update']));
  });

  test('[AAPI-ENG-007] template preview renders with sample values, escapes everything, and saves and sends nothing', async () => {
    const url = `${BASE}/email-templates/welcome/preview`;
    const saved = await admin.request.post(url);                                             // no body: the saved template
    expect(saved.status()).toBe(200);
    const a = (await saved.json()).data;
    expect(a).toMatchObject({ key: 'welcome', subject: 'Welcome again Asha' });
    expect(a.html).toContain('<a href="https://example.com">site</a>');
    expect(a.text).toContain('site (https://example.com)');
    const hostile = await admin.request.post(url, { data: { subject: 'Hi {{name}}', body: '<script>alert(1)</script> {{name}} [x](javascript:alert(1)) <img src=x onerror=alert(1)>' } });
    expect(hostile.status()).toBe(200);
    const h = (await hostile.json()).data;
    expect(h.html).not.toMatch(/<script|<img|<a /);
    expect(h.html).toContain('&lt;script&gt;');
    expect((await admin.request.post(url, { data: { body: 'Order {{orderId}}' } })).status()).toBe(400);
    expect((await admin.request.post(url, { data: '{not json', headers: { 'Content-Type': 'application/json' } })).status()).toBe(400);
    expect((await admin.request.post(`${BASE}/email-templates/other/preview`, { data: {} })).status()).toBe(404);
    expect((await get('/email-templates/welcome')).version).toBe(2);                         // previews saved nothing
    expect((await (await admin.request.post(`${BASE}/email-templates/payment-receipt/preview`)).json()).data.html).toContain('order_QA123456');   // built-in text, sample values
  });

  test('[AAPI-ENG-008] a staff key can read banners, settings and templates and preview, but cannot change anything', async ({ request }) => {
    const key = await admin.request.post(`${BASE}/api-keys`, { data: { name: 'QA-AAPI engagement staff', level: 'staff' } });
    const auth = { 'User-Agent': API_UA, Authorization: `Bearer ${(await key.json()).data.token}` };
    for (const p of ['/banners', '/settings', '/email-templates', '/email-templates/welcome']) expect((await request.get(BASE + p, { headers: auth })).status(), p).toBe(200);
    expect((await request.post(`${BASE}/email-templates/welcome/preview`, { headers: auth })).status()).toBe(200);
    expect((await request.post(`${BASE}/banners`, { headers: auth, data: banner({ slug: `${B}-staff` }) })).status()).toBe(403);
    expect((await request.patch(`${BASE}/banners/${B}`, { headers: { ...auth, 'If-Match': '1' }, data: { message: 'x' } })).status()).toBe(403);
    expect((await request.post(`${BASE}/banners/${B}/publish`, { headers: auth })).status()).toBe(403);
    expect((await request.put(`${BASE}/settings/daily-email-cap`, { headers: { ...auth, 'If-Match': '2' }, data: { value: 100 } })).status()).toBe(403);
    expect((await request.put(`${BASE}/email-templates/welcome`, { headers: { ...auth, 'If-Match': '2' }, data: { subject: 'x', body: 'y' } })).status()).toBe(403);
    expect((await get('/settings')).items.find((s: { key: string }) => s.key === 'daily-email-cap').value).toBe(150);
    expect(PREFIX).toBe('qa-aapi');
  });
});
