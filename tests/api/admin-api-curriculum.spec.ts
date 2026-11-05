import { test, expect } from '@playwright/test';
import { EMAIL } from '../support/personas';
import { requireSeed } from '../support/guards';
import { API_UA, sessionFor, type Session } from '../support/api';
import { BASE, PREFIX, clearWriteLimits, cleanupAdminApi, cohort, course } from '../support/adminApi';
import { adminDb } from '../support/db';

// PRD 18 · curriculum (content API): create on first write, modules and lessons, atomic reorder, draft and publish, discard,
// learner-progress guard, read-only exam flags, audit summary, read-only keys.
const COURSE = 'qa-aapi-cu-course';
const COHORT = 'qa-aapi-cu-batch';
const RAW = 'https://raw.githubusercontent.com/shivamnamdev/repo/main/Day1/Assignment';
const V = (n: number) => `qaaapi${String(n).padStart(5, '0')}`;   // 11 characters

test.describe('AAPI curriculum @regression', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async () => { test.setTimeout(90_000); requireSeed(); await clearWriteLimits(); });
  let admin: Session;
  test.beforeAll(async ({ browser }) => {
    admin = await sessionFor(browser, EMAIL.admin);
    await admin.request.post(`${BASE}/courses`, { data: course(COURSE) });
    await admin.request.post(`${BASE}/cohorts`, { data: cohort(COHORT, COURSE) });
  });
  test.afterAll(async () => {
    await adminDb().from('video_progress').delete().eq('course_slug', COHORT);
    await adminDb().from('assignment_progress').delete().eq('course_slug', COHORT);
    await cleanupAdminApi(); await clearWriteLimits(); await admin?.close();
  });
  const url = (p = '') => `${BASE}/curriculum/${COHORT}${p}`;
  const hdr = (v: number) => ({ 'If-Match': String(v) });
  const get = async () => (await (await admin.request.get(url())).json()).data;
  const send = (method: 'post' | 'patch' | 'put' | 'delete', p: string, v: number, data?: object) => admin.request[method](url(p), { data, headers: hdr(v) });
  let m1 = '', m2 = '';

  test('[AAPI-CUR-001] the first write creates the curriculum (no version needed); an unknown cohort is 404; later writes need If-Match', async () => {
    expect((await admin.request.put(`${BASE}/curriculum/qa-aapi-nobody`, { data: { modules: [] } })).status()).toBe(404);
    expect((await admin.request.get(url())).status()).toBe(404);
    const res = await admin.request.put(url(), { data: { modules: [{ title: 'Module 1', lessons: [{ id: V(1) }, { id: V(2) }] }, { title: 'Module 2', lessons: [{ id: V(3) }, { id: 'doc-notes' }] }] } });
    expect(res.status()).toBe(201);
    const c = (await res.json()).data;
    expect(c).toMatchObject({ cohort: COHORT, status: 'draft', version: 1, published: null, hasUnpublishedChanges: true, counts: { modules: 2, lessons: 4 } });
    [m1, m2] = c.modules.map((m: { id: string }) => m.id);
    expect(m1).toMatch(/^m-[a-z0-9]{8}$/);
    expect((await admin.request.put(url(), { data: { modules: [] } })).status()).toBe(428);
    expect((await send('put', '', 99, { modules: [] })).status()).toBe(409);
    expect((await send('put', '', 1, { modules: c.modules })).status()).toBe(200);   // GET then PUT of the same data is fine
    const list = (await (await admin.request.get(`${BASE}/curriculum?q=${COHORT}`)).json()).data.items;
    expect(list.map((x: { cohort: string }) => x.cohort)).toContain(COHORT);
    expect(list[0]).not.toHaveProperty('modules');
  });

  test('[AAPI-CUR-002] modules: add at a position, rename, mark advanced, reorder atomically, delete; bad input changes nothing', async () => {
    let v = (await get()).version;
    const added = await send('post', '/modules', v, { title: 'Advanced', advanced: true, position: 0 });
    expect(added.status()).toBe(200);
    const mods = (await added.json()).data.modules;
    expect(mods.map((m: { title: string }) => m.title)).toEqual(['Advanced', 'Module 1', 'Module 2']);
    const adv = mods[0].id; v++;
    expect((await send('patch', `/modules/${m1}`, v, { title: 'Renamed' })).status()).toBe(200); v++;
    expect((await send('patch', `/modules/${m1}`, v, {})).status()).toBe(400);
    expect((await send('patch', '/modules/m-zzzzzzzz', v, { title: 'x' })).status()).toBe(404);
    const bad = await send('post', '/modules/reorder', v, { moduleIds: [m1, m2] });
    expect(bad.status()).toBe(400);                                      // misses one module
    expect((await get()).version).toBe(v);                               // nothing changed
    const ok = await send('post', '/modules/reorder', v, { moduleIds: [m2, adv, m1] }); v++;
    expect(ok.status()).toBe(200);
    expect((await get()).modules.map((m: { id: string }) => m.id)).toEqual([m2, adv, m1]);
    expect((await send('delete', `/modules/${adv}`, v)).status()).toBe(200);
    expect((await get()).modules).toHaveLength(2);
  });

  test('[AAPI-CUR-003] lessons: add, change title and assignment, move between modules, delete; ids stay unique; links are checked', async () => {
    let v = (await get()).version;
    const a = await send('post', `/modules/${m1}/lessons`, v, { id: V(9), title: 'New lesson', assignment: { title: 'Day 9', rawUrl: RAW }, resources: [{ title: 'Notes', url: RAW, type: 'Link' }], position: 0 }); v++;
    expect(a.status()).toBe(200);
    const d = (await get()).modules.find((m: { id: string }) => m.id === m1);
    expect(d.lessons[0]).toMatchObject({ id: V(9), kind: 'video', title: 'New lesson', assignment: { title: 'Day 9' } });
    expect((await send('post', `/modules/${m2}/lessons`, v, { id: V(9) })).status()).toBe(400);             // duplicate id
    expect((await send('post', `/modules/${m2}/lessons`, v, { id: 'short' })).status()).toBe(400);
    expect((await send('post', `/modules/${m2}/lessons`, v, { id: V(8), assignment: { title: 'x', rawUrl: 'http://raw.githubusercontent.com/a' } })).status()).toBe(400);
    expect((await send('post', `/modules/${m2}/lessons`, v, { id: V(8), assignment: { title: 'x', rawUrl: 'https://evil.example/a' } })).status()).toBe(400);
    expect((await send('patch', `/lessons/${V(9)}`, v, { title: 'Renamed lesson', assignment: null })).status()).toBe(200); v++;
    expect((await get()).modules.find((m: { id: string }) => m.id === m1).lessons[0]).not.toHaveProperty('assignment');
    expect((await send('patch', `/lessons/${V(77)}`, v, { title: 'x' })).status()).toBe(404);
    expect((await send('patch', `/lessons/${V(9)}`, v, { id: V(10) })).status()).toBe(400);                  // the id cannot change
    const cur = await get();
    const layout = cur.modules.map((m: { id: string; lessons: Array<{ id: string }> }) => ({ moduleId: m.id, lessonIds: m.lessons.map((l) => l.id) }));
    const first = layout.find((x: { moduleId: string }) => x.moduleId === m1);
    const moved = first.lessonIds.shift();
    layout.find((x: { moduleId: string }) => x.moduleId === m2).lessonIds.unshift(moved);
    expect((await send('post', '/lessons/reorder', v, { layout })).status()).toBe(200); v++;
    const after = await get();
    expect(after.modules.find((m: { id: string }) => m.id === m2).lessons[0].id).toBe(moved);
    expect((await send('post', '/lessons/reorder', v, { layout: layout.slice(0, 1) })).status()).toBe(400);   // module missing
    expect((await send('delete', `/lessons/${V(9)}`, v)).status()).toBe(200);
    expect((await get()).counts.lessons).toBe(4);
  });

  test('[AAPI-CUR-004] draft and publish: the working copy changes, the published copy does not until publish; discard goes back', async () => {
    let v = (await get()).version;
    const pub = await send('post', '/publish', v, undefined); v++;
    expect(pub.status()).toBe(200);
    const p = (await pub.json()).data;
    expect(p).toMatchObject({ status: 'published', hasUnpublishedChanges: false });
    expect(p.published).toEqual(p.modules);
    expect((await send('post', '/modules', v, { title: 'Draft only' })).status()).toBe(200); v++;
    const d = await get();
    expect(d).toMatchObject({ hasUnpublishedChanges: true, status: 'published' });
    expect(d.published).toHaveLength(2);
    expect(d.modules).toHaveLength(3);
    const back = await send('post', '/discard', v, undefined); v++;
    expect((await back.json()).data).toMatchObject({ hasUnpublishedChanges: false });
    expect((await get()).modules).toHaveLength(2);
    // an emptied draft cannot be published
    expect((await send('put', '', v, { modules: [] })).status()).toBe(200); v++;
    expect((await send('post', '/publish', v, undefined)).status()).toBe(422);
    expect((await send('post', '/discard', v, undefined)).status()).toBe(200);
  });

  test('[AAPI-CUR-005] a lesson that learners have progress on cannot be deleted or dropped; moving it is fine', async () => {
    const cur = await get(); let v = cur.version;
    const target = cur.modules[0].lessons[0].id as string;
    const ins = await adminDb().from('video_progress').insert([{ user_id: 'qa-aapi-learner', course_slug: COHORT, video_id: target }]);
    test.skip(!!ins.error, `could not seed progress: ${ins.error?.message}`);
    expect((await send('delete', `/lessons/${target}`, v)).status()).toBe(422);
    const m = cur.modules[0].id;
    expect((await send('delete', `/modules/${m}`, v)).status()).toBe(422);
    const without = cur.modules.map((x: { id: string; title: string; lessons: Array<{ id: string }> }) => ({ ...x, lessons: x.lessons.filter((l) => l.id !== target) }));
    expect((await send('put', '', v, { modules: without })).status()).toBe(422);
    expect((await get()).version).toBe(v);                                   // nothing changed
    expect((await send('patch', `/lessons/${target}`, v, { title: 'Renamed is fine' })).status()).toBe(200); v++;
    await adminDb().from('video_progress').delete().eq('course_slug', COHORT);
    expect((await send('delete', `/lessons/${target}`, v)).status()).toBe(200);
  });

  test('[AAPI-CUR-006] exam flags are read-only through the API; GET then PUT of an exam keeps them; removing the exam assignment is refused', async () => {
    let cur = await get(); let v = cur.version;
    const lessonId = cur.modules[0].lessons[0].id as string;
    expect((await send('patch', `/lessons/${lessonId}`, v, { assignment: { title: 'Final', rawUrl: RAW, isExam: true } })).status()).toBe(400);
    expect((await send('patch', `/lessons/${lessonId}`, v, { assignment: { title: 'Final', rawUrl: RAW, serverGraded: true } })).status()).toBe(400);
    // the owner marks the exam in the database (as the import will); the API then keeps it
    const row = await adminDb().from('content_docs').select('doc').eq('kind', 'curriculum').eq('key', COHORT).single();
    const doc = row.data!.doc as any;
    doc.modules[0].lessons[0].assignment = { title: 'Final', rawUrl: RAW, isExam: true, serverGraded: true };
    await adminDb().from('content_docs').update({ doc, version: v + 1 }).eq('kind', 'curriculum').eq('key', COHORT); v++;
    cur = await get();
    expect((await send('put', '', v, { modules: cur.modules })).status()).toBe(200); v++;                       // GET then PUT
    const noFlags = JSON.parse(JSON.stringify(cur.modules)); delete noFlags[0].lessons[0].assignment.isExam; delete noFlags[0].lessons[0].assignment.serverGraded;
    expect((await send('put', '', v, { modules: noFlags })).status()).toBe(200); v++;
    expect((await get()).modules[0].lessons[0].assignment).toMatchObject({ isExam: true, serverGraded: true });   // restored
    expect((await send('patch', `/lessons/${lessonId}`, v, { assignment: null })).status()).toBe(422);
    expect((await send('patch', `/lessons/${lessonId}`, v, { assignment: { title: 'Final', rawUrl: RAW, isExam: false } })).status()).toBe(400);
  });

  test('[AAPI-CUR-007] changes are audited with a summary (no document body); a staff key can read but not write', async ({ request }) => {
    const audit = (await (await admin.request.get(`${BASE}/audit?resource=curriculum&resourceId=${COHORT}&limit=100`)).json()).data.items;
    expect(audit.map((a: { action: string }) => a.action)).toEqual(expect.arrayContaining(['replace', 'module.add', 'lesson.add', 'publish', 'discard']));
    const entry = audit.find((a: { action: string }) => a.action === 'module.add');
    expect(entry.after).toMatchObject({ modules: expect.any(Number), lessons: expect.any(Number), version: expect.any(Number) });
    expect(JSON.stringify(audit)).not.toContain(RAW);
    const key = await admin.request.post(`${BASE}/api-keys`, { data: { name: 'QA-AAPI curriculum staff', level: 'staff' } });
    const token = (await key.json()).data.token as string;
    const auth = { 'User-Agent': API_UA, Authorization: `Bearer ${token}` };
    expect((await request.get(url(), { headers: auth })).status()).toBe(200);
    expect((await request.put(url(), { headers: { ...auth, 'If-Match': '1' }, data: { modules: [] } })).status()).toBe(403);
    expect((await request.post(url('/publish'), { headers: auth })).status()).toBe(403);
  });
});
