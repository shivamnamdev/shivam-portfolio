import { test, expect } from '@playwright/test';
import { EMAIL } from '../support/personas';
import { requireSeed } from '../support/guards';
import { sessionFor, type Session } from '../support/api';
import { BASE, PREFIX, clearWriteLimits, cleanupAdminApi, cohort, course } from '../support/adminApi';
import { adminDb } from '../support/db';
import { clerkUserId } from '../support/clerk';

// PRD 17 · courses: CRUD, status changes, versions, delete rules, validation, audit, paging, write rate limit.
test.describe('AAPI courses @regression', () => {
  test.describe.configure({ mode: 'default' });
  test.beforeEach(async () => { test.setTimeout(90_000); requireSeed(); await clearWriteLimits(); });
  let admin: Session;
  test.beforeAll(async ({ browser }) => { admin = await sessionFor(browser, EMAIL.admin); });
  test.afterAll(async () => { await adminDb().from('user_enrollments').delete().like('course_slug', `${PREFIX}%`); await cleanupAdminApi(); await clearWriteLimits(); await admin?.close(); });
  const post = (p: string, data: object) => admin.request.post(BASE + p, { data });
  const patch = (p: string, version: number | string | null, data: object) => admin.request.patch(BASE + p, { data, headers: version === null ? {} : { 'If-Match': String(version) } });

  test('[AAPI-CRS-001] create, read, update and list a course; it starts as a draft', async () => {
    const created = await post('/courses', course('qa-aapi-c1'));
    expect(created.status()).toBe(201);
    const c = (await created.json()).data;
    expect(c).toMatchObject({ slug: 'qa-aapi-c1', status: 'draft', version: 1, title: 'QA course qa-aapi-c1', pitch: { vsl: { headline: 'QA' } } });
    const read = (await (await admin.request.get(`${BASE}/courses/qa-aapi-c1`)).json()).data;
    expect(read.title).toBe(c.title);
    const upd = await patch('/courses/qa-aapi-c1', 1, { title: 'QA renamed' });
    expect(upd.status()).toBe(200);
    expect((await upd.json()).data).toMatchObject({ title: 'QA renamed', version: 2, summary: 'created by the admin API tests' });
    const list = (await (await admin.request.get(`${BASE}/courses?q=qa-aapi-c1`)).json()).data.items;
    expect(list.map((x: { slug: string }) => x.slug)).toContain('qa-aapi-c1');
  });

  test('[AAPI-ENV-002] lists page with limit and cursor and show every record once', async () => {
    for (let i = 1; i <= 5; i++) expect((await post('/courses', course(`qa-aapi-pg${i}`))).status()).toBe(201);
    const seen: string[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 6; page++) {
      const res: { data: { items: { slug: string }[]; nextCursor: string | null } } = await (await admin.request.get(`${BASE}/courses?q=qa-aapi-pg&limit=2${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`)).json();
      seen.push(...res.data.items.map((x) => x.slug));
      cursor = res.data.nextCursor;
      if (!cursor) break;
    }
    expect(seen).toEqual(['qa-aapi-pg1', 'qa-aapi-pg2', 'qa-aapi-pg3', 'qa-aapi-pg4', 'qa-aapi-pg5']);
    expect((await admin.request.get(`${BASE}/courses?limit=0`)).status()).toBe(400);
    expect((await admin.request.get(`${BASE}/courses?limit=101`)).status()).toBe(400);
    const drafts = (await (await admin.request.get(`${BASE}/courses?q=qa-aapi-pg&status=published`)).json()).data.items;
    expect(drafts).toHaveLength(0);
  });

  test('[AAPI-ENV-003] an update needs the current version: a stale one is 409, a missing one is 428', async () => {
    await post('/courses', course('qa-aapi-v1'));
    expect((await patch('/courses/qa-aapi-v1', 1, { title: 'first' })).status()).toBe(200);
    const stale = await patch('/courses/qa-aapi-v1', 1, { title: 'second' });
    expect(stale.status()).toBe(409);
    expect((await patch('/courses/qa-aapi-v1', null, { title: 'x' })).status()).toBe(428);
    expect((await patch('/courses/qa-aapi-v1', 'abc', { title: 'x' })).status()).toBe(400);
    expect((await patch('/courses/qa-aapi-v1', 2, {})).status()).toBe(400);   // nothing to change
    expect((await (await admin.request.get(`${BASE}/courses/qa-aapi-v1`)).json()).data.title).toBe('first');
  });

  test('[AAPI-CRS-002] a duplicate slug is a 409', async () => {
    expect((await post('/courses', course('qa-aapi-dup'))).status()).toBe(201);
    const again = await post('/courses', course('qa-aapi-dup'));
    expect(again.status()).toBe(409);
    expect((await again.json()).error.code).toBe('conflict');
  });

  test('[AAPI-CRS-003] publish, unpublish, archive and restore follow the allowed steps', async () => {
    await post('/courses', course('qa-aapi-st'));
    const step = async (a: string) => admin.request.post(`${BASE}/courses/qa-aapi-st/${a}`);
    expect((await step('unpublish')).status()).toBe(422);        // a draft cannot be unpublished
    expect((await step('restore')).status()).toBe(422);          // only archived ones are restored
    expect((await (await step('publish')).json()).data.status).toBe('published');
    expect((await step('publish')).status()).toBe(422);          // already published
    expect((await (await step('unpublish')).json()).data.status).toBe('draft');
    expect((await (await step('archive')).json()).data.status).toBe('archived');
    expect((await step('publish')).status()).toBe(422);          // an archived course cannot be published directly
    expect((await (await step('restore')).json()).data.status).toBe('draft');
    expect((await admin.request.post(`${BASE}/courses/qa-aapi-none/publish`)).status()).toBe(404);
  });

  test('[AAPI-CRS-004] a course with cohorts or enrolments cannot be deleted; an empty one can', async () => {
    await post('/courses', course('qa-aapi-del-cohort'));
    expect((await post('/cohorts', cohort('qa-aapi-del-cohort-1', 'qa-aapi-del-cohort'))).status()).toBe(201);
    const withCohort = await admin.request.delete(`${BASE}/courses/qa-aapi-del-cohort`);
    expect(withCohort.status()).toBe(422);
    await admin.request.delete(`${BASE}/cohorts/qa-aapi-del-cohort-1`);
    expect((await admin.request.delete(`${BASE}/courses/qa-aapi-del-cohort`)).status()).toBe(200);

    await post('/courses', course('qa-aapi-del-enrol'));
    const uid = await clerkUserId(EMAIL.edu);
    const ins = await adminDb().from('user_enrollments').insert([{ user_id: uid, course_slug: 'qa-aapi-del-enrol', user_name: 'QA', user_email: EMAIL.edu }]);
    expect(ins.error).toBeNull();
    expect((await admin.request.delete(`${BASE}/courses/qa-aapi-del-enrol`)).status()).toBe(422);
    expect((await admin.request.post(`${BASE}/courses/qa-aapi-del-enrol/archive`)).status()).toBe(200);   // archive is the way out
    await adminDb().from('user_enrollments').delete().eq('course_slug', 'qa-aapi-del-enrol');
    expect((await admin.request.delete(`${BASE}/courses/qa-aapi-del-enrol`)).status()).toBe(200);
    expect((await admin.request.get(`${BASE}/courses/qa-aapi-del-enrol`)).status()).toBe(404);
  });

  test('[AAPI-CRS-005] duplicate copies a course as a draft with a new slug', async () => {
    await post('/courses', course('qa-aapi-src'));
    await admin.request.post(`${BASE}/courses/qa-aapi-src/publish`);
    const copy = await post('/courses/qa-aapi-src/duplicate', { slug: 'qa-aapi-copy', title: 'Copy of QA' });
    expect(copy.status()).toBe(201);
    expect((await copy.json()).data).toMatchObject({ slug: 'qa-aapi-copy', status: 'draft', version: 1, title: 'Copy of QA', pitch: { vsl: { headline: 'QA' } } });
    expect((await post('/courses/qa-aapi-src/duplicate', { slug: 'qa-aapi-copy' })).status()).toBe(409);
    expect((await post('/courses/qa-aapi-nothing/duplicate', { slug: 'qa-aapi-copy2' })).status()).toBe(404);
  });

  test('[AAPI-VAL-001] bad input is refused with 400 and field errors, and nothing is stored or audited', async () => {
    const before = (await adminDb().from('admin_audit').select('id', { count: 'exact', head: true }).like('resource_id', `${PREFIX}-bad%`)).count;
    for (const body of [{}, { slug: 'Bad Slug', title: 'x' }, { slug: 'qa-aapi-bad1', title: '' }, { slug: 'qa-aapi-bad2', title: 'x'.repeat(201) }, { slug: 'qa-aapi-bad3', title: 'x', extra: 1 }, { slug: 'qa-aapi-bad4', title: 5 }, { slug: 'qa-aapi-bad5', title: 'x', pitch: 'text' }, []]) {
      const res = await admin.request.post(`${BASE}/courses`, { data: body });
      expect(res.status(), JSON.stringify(body).slice(0, 40)).toBe(400);
      expect((await res.json()).error.code).toBe('validation_failed');
    }
    const bigPitch = await post('/courses', { slug: 'qa-aapi-bad6', title: 'x', pitch: { a: 'x'.repeat(4001) } });
    expect(bigPitch.status()).toBe(400);
    const stored = await adminDb().from('content_docs').select('key').like('key', `${PREFIX}-bad%`);
    expect(stored.data ?? []).toHaveLength(0);
    expect((await adminDb().from('admin_audit').select('id', { count: 'exact', head: true }).like('resource_id', `${PREFIX}-bad%`)).count).toBe(before);
    const fields = (await (await post('/courses', { slug: 'Bad Slug', title: '' })).json()).error.fields;
    expect(Object.keys(fields).sort()).toEqual(['slug', 'title']);
  });

  test('[AAPI-VAL-003] hostile text is stored as text and returned as JSON', async () => {
    const evil = '<script>alert(1)</script><img src=x onerror=alert(2)>';
    const created = await post('/courses', course('qa-aapi-evil', { title: evil }));
    expect(created.status()).toBe(201);
    const read = await admin.request.get(`${BASE}/courses/qa-aapi-evil`);
    expect(read.headers()['content-type']).toContain('application/json');
    expect((await read.json()).data.title).toBe(evil);
  });

  test('[AAPI-AUD-001][AAPI-AUD-003] every write is in the audit log with before and after; the log is read only', async () => {
    await post('/courses', course('qa-aapi-aud'));
    await patch('/courses/qa-aapi-aud', 1, { title: 'Audited' });
    await admin.request.post(`${BASE}/courses/qa-aapi-aud/publish`);
    await admin.request.post(`${BASE}/courses/qa-aapi-aud/unpublish`);
    await admin.request.delete(`${BASE}/courses/qa-aapi-aud`);
    const items = (await (await admin.request.get(`${BASE}/audit?resourceId=qa-aapi-aud&limit=20`)).json()).data.items as Array<{ action: string; before: any; after: any; actor: string }>;
    const actions = items.map((i) => i.action).reverse();
    expect(actions).toEqual(['create', 'update', 'publish', 'unpublish', 'delete']);
    const update = items.find((i) => i.action === 'update')!;
    expect(update.before.title).toBe('QA course qa-aapi-aud');
    expect(update.after.title).toBe('Audited');
    expect(items.every((i) => !!i.actor)).toBe(true);
    for (const method of ['POST', 'PATCH', 'DELETE', 'PUT']) {
      expect((await admin.request.fetch(`${BASE}/audit`, { method, data: {} })).status(), method).toBe(405);
    }
  });

  test('[AAPI-RTE-001] write routes are rate limited (120 a minute per admin or key); reads are not', async () => {
    test.setTimeout(150_000);
    // The limit is a fixed 60-second window: start just after a window begins so the whole burst lands in one window.
    const second = (Date.now() / 1000) % 60;
    if (second > 6) await new Promise((r) => setTimeout(r, (61 - second) * 1000));
    await clearWriteLimits();
    const codes: number[] = [];
    for (let batch = 0; batch < 6; batch++) {
      const res = await Promise.all(Array.from({ length: 25 }, () => admin.request.post(`${BASE}/courses`, { data: {} })));
      codes.push(...res.map((r) => r.status()));
    }
    expect(codes.filter((c) => c === 400).length).toBeLessThanOrEqual(120);
    expect(codes.filter((c) => c === 429).length).toBeGreaterThanOrEqual(25);
    const limited = await admin.request.post(`${BASE}/courses`, { data: {} });
    expect(limited.status()).toBe(429);
    expect((await limited.json()).error.code).toBe('rate_limited');
    expect((await admin.request.get(`${BASE}/courses?limit=1`)).status()).toBe(200);
  });
});
