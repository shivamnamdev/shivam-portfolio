import { test, expect } from '@playwright/test';
import { EMAIL } from '../support/personas';
import { requireSeed } from '../support/guards';
import { API_UA, sessionFor, type Session } from '../support/api';
import { BASE, clearWriteLimits, cleanupAdminApi, cohort, course, future } from '../support/adminApi';
import { adminDb, grantTestEnrolment } from '../support/db';
import { clerkUserId } from '../support/clerk';

// PRD 19 · slice 3b: notifications. Needs docs/testing/sql/step8-notifications.sql on the QA project.
// These tests never send a real e-mail: they check every refusal and that a refusal sends and records nothing. The real send is a manual case (NTF-M-001).
const COURSE = 'qa-aapi-nt-course';
const COHORT = 'qa-aapi-nt-batch';
const T = 'QA-AAPI ';
const note = (extra: object = {}) => ({ type: 'announcement', title: `${T}class moved`, body: 'Tonight at 8 pm.', target: { kind: 'cohort', cohortSlug: COHORT }, ...extra });
const hoursFrom = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

test.describe('AAPI notifications @regression', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async () => { test.setTimeout(90_000); requireSeed(); await clearWriteLimits(); });
  let admin: Session; let startedAt = ''; let savedSettings: Record<string, unknown>[] = [];
  let missingTables = false;
  test.beforeAll(async ({ browser }) => {
    startedAt = new Date().toISOString();
    missingTables = !!(await adminDb().from('notifications').select('id').limit(1)).error;
    savedSettings = (await adminDb().from('content_docs').select('*').eq('kind', 'setting')).data ?? [];
    admin = await sessionFor(browser, EMAIL.admin);
    await admin.request.post(`${BASE}/courses`, { data: course(COURSE) });
    await admin.request.post(`${BASE}/cohorts`, { data: cohort(COHORT, COURSE) });
  });
  test.afterAll(async () => {
    const db = adminDb();
    await db.from('notifications').delete().like('title', `${T}%`);
    await db.from('user_enrollments').delete().eq('course_slug', COHORT);
    await db.from('content_docs').delete().eq('kind', 'setting');
    if (savedSettings.length) await db.from('content_docs').insert(savedSettings);
    await db.from('admin_audit').delete().in('resource', ['notification', 'setting']).gte('at', startedAt);
    await cleanupAdminApi(); await clearWriteLimits(); await admin?.close();
  });
  test.beforeEach(() => { test.skip(missingTables, 'run docs/testing/sql/step8-notifications.sql on this Supabase project first'); });
  const get = async (p: string) => (await (await admin.request.get(`${BASE}${p}`)).json()).data;
  const create = async (extra: object = {}) => { const r = await admin.request.post(`${BASE}/notifications`, { data: note(extra) }); expect(r.status(), JSON.stringify(await r.json())).toBe(201); return (await r.json()).data; };

  test('[AAPI-NTF-001] a notification is created live with safe defaults; unsafe input and rule breaks are refused and nothing is stored', async () => {
    const n = await create();
    expect(n).toMatchObject({ type: 'announcement', status: 'live', channels: ['inbox'], link: null, expiresAt: null, emailSentAt: null, emailRecipients: null, target: { kind: 'cohort', cohortSlug: COHORT } });
    expect(n.id).toMatch(/^[0-9a-f-]{36}$/);
    const refused = async (extra: object, status: number, name: string) => expect((await admin.request.post(`${BASE}/notifications`, { data: note({ title: `${T}refused`, ...extra }) })).status(), name).toBe(status);
    await refused({ title: '<b>hi</b>' }, 400, 'html title');
    await refused({ body: 'x'.repeat(2001) }, 400, 'long body');
    await refused({ link: 'javascript:alert(1)' }, 400, 'bad link');
    await refused({ recipients: ['a@b.com'] }, 400, 'recipients in the request');
    await refused({ target: { kind: 'admins' } }, 400, 'admins target for a normal type');
    await refused({ type: 'admin-alert', target: { kind: 'all' } }, 400, 'admin alert for everyone');
    await refused({ expiresAt: hoursFrom(-5) }, 400, 'expiry before publish');
    await refused({ type: 'marketing', channels: ['inbox', 'email'] }, 422, 'marketing by e-mail');
    await refused({ type: 'progress', channels: ['inbox', 'email'] }, 422, 'progress by e-mail');
    await refused({ channels: ['email'] }, 422, 'no inbox');
    await refused({ channels: ['inbox', 'email'], publishAt: hoursFrom(48) }, 422, 'scheduled e-mail');
    await refused({ target: { kind: 'cohort', cohortSlug: 'qa-aapi-no-such-cohort' } }, 422, 'unknown cohort');
    expect((await get(`/notifications?q=refused`)).items).toHaveLength(0);
  });

  test('[AAPI-NTF-002] list filters by status; an inbox item can be scheduled; admin alerts are accepted for admins', async () => {
    const scheduled = await create({ title: `${T}later`, publishAt: hoursFrom(48) });
    const expired = await adminDb().from('notifications').insert([{ type: 'reminder', title: `${T}old`, body: 'old', channels: ['inbox'], target: { kind: 'all' }, publish_at: hoursFrom(-48), expires_at: hoursFrom(-24), created_by: 'qa' }]).select('id').single();
    const alert = await create({ title: `${T}alert`, type: 'admin-alert', target: { kind: 'admins' } });
    expect(scheduled.status).toBe('scheduled');
    expect(alert.status).toBe('live');
    const ids = async (status: string) => (await get(`/notifications?status=${status}&q=${encodeURIComponent(T.trim())}&limit=100`)).items.map((i: { id: string }) => i.id);
    expect(await ids('scheduled')).toEqual([scheduled.id]);
    expect(await ids('expired')).toEqual([expired.data!.id]);
    expect(await ids('live')).toEqual(expect.arrayContaining([alert.id]));
    expect(await ids('live')).not.toContain(scheduled.id);
    expect((await admin.request.get(`${BASE}/notifications?status=sometimes`)).status()).toBe(400);
    const page = await get(`/notifications?q=${encodeURIComponent(T.trim())}&limit=2`);
    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBeTruthy();
    const next = await get(`/notifications?q=${encodeURIComponent(T.trim())}&limit=2&cursor=${encodeURIComponent(page.nextCursor)}`);
    expect(next.items.map((i: { id: string }) => i.id)).not.toEqual(expect.arrayContaining(page.items.map((i: { id: string }) => i.id)));
  });

  test('[AAPI-NTF-003] reading one shows how many have read it, never who; deleting removes the read marks; bad ids are 404', async () => {
    const n = await create({ title: `${T}reads` });
    expect((await get(`/notifications/${n.id}`)).readCount).toBe(0);
    const uid = await clerkUserId(EMAIL.edu);
    await adminDb().from('notification_reads').insert([{ notification_id: n.id, user_id: uid }]);
    const one = await get(`/notifications/${n.id}`);
    expect(one.readCount).toBe(1);
    expect(JSON.stringify(one)).not.toContain(uid);
    expect((await admin.request.get(`${BASE}/notifications/not-a-uuid`)).status()).toBe(404);
    expect((await admin.request.get(`${BASE}/notifications/00000000-0000-4000-8000-000000000000`)).status()).toBe(404);
    expect((await admin.request.delete(`${BASE}/notifications/${n.id}`)).status()).toBe(200);
    expect((await admin.request.get(`${BASE}/notifications/${n.id}`)).status()).toBe(404);
    expect((await adminDb().from('notification_reads').select('user_id').eq('notification_id', n.id)).data).toHaveLength(0);
    expect((await admin.request.delete(`${BASE}/notifications/${n.id}`)).status()).toBe(404);
    const audit = (await get(`/audit?resource=notification&resourceId=${n.id}&limit=50`)).items.map((a: { action: string }) => a.action);
    expect(audit).toEqual(expect.arrayContaining(['create', 'delete']));
  });

  test('[AAPI-NTF-004] recipients: a count and a sample of at most 5, resolved on the server', async () => {
    const empty = await create({ title: `${T}empty` });
    expect(await get(`/notifications/${empty.id}/recipients`)).toMatchObject({ count: 0, sample: [], sampleSize: 5 });
    await grantTestEnrolment(EMAIL.edu, COHORT);
    await grantTestEnrolment(EMAIL.mavish, COHORT);
    const two = await get(`/notifications/${empty.id}/recipients`);
    expect(two.count).toBe(2);
    expect(two.sample).toHaveLength(2);
    expect(Object.keys(two.sample[0]).sort()).toEqual(['email', 'name']);
    const mine = await create({ title: `${T}one person`, target: { kind: 'user', userId: await clerkUserId(EMAIL.edu) } });
    expect((await get(`/notifications/${mine.id}/recipients`)).count).toBe(1);
    const everyone = await create({ title: `${T}everyone`, target: { kind: 'all' } });
    const all = await get(`/notifications/${everyone.id}/recipients`);
    expect(all.count).toBeGreaterThanOrEqual(2);
    expect(all.sample).toEqual([]);                                                      // no names for a broadcast
  });

  test('[AAPI-NTF-005] the e-mail send refuses every bad case and sends and records nothing', async () => {
    const send = (id: string) => admin.request.post(`${BASE}/notifications/${id}/send-email`);
    const inboxOnly = await create({ title: `${T}inbox only` });
    expect((await send(inboxOnly.id)).status()).toBe(422);                               // no email channel
    expect((await admin.request.post(`${BASE}/notifications`, { data: note({ title: `${T}ghost`, channels: ['inbox', 'email'], target: { kind: 'cohort', cohortSlug: COHORT + '-x' } }) })).status()).toBe(422);   // a cohort that does not exist cannot be targeted
    const both = await create({ title: `${T}two people`, channels: ['inbox', 'email'] }); // the cohort holds 2 people (NTF-004)
    // the announcement cap is 1: two people are too many
    expect((await admin.request.put(`${BASE}/settings/announcement-email-cap`, { data: { value: 1 } })).status()).toBe(201);
    const over = await send(both.id);
    expect(over.status()).toBe(422);
    expect((await over.json()).error.message).toMatch(/2 people.*1/);
    const stored = await get(`/notifications/${both.id}`);
    expect(stored.emailSentAt).toBeNull();
    expect(stored.emailRecipients).toBeNull();
    expect((await admin.request.post(`${BASE}/notifications`, { data: note({ title: `${T}admins mail`, channels: ['inbox', 'email'], target: { kind: 'admins' } }) })).status()).toBe(400);   // admins can only be aimed at by an admin alert, which is inbox only
    const audit = (await get(`/audit?resource=notification&resourceId=${both.id}&limit=50`)).items.map((a: { action: string }) => a.action);
    expect(audit).not.toContain('send-email');
    expect((await admin.request.post(`${BASE}/notifications/not-a-uuid/send-email`)).status()).toBe(404);
  });

  test('[AAPI-NTF-006] only the owner can send e-mail; an admin key can create and delete, a staff key can only read', async ({ request }) => {
    const mk = async (level: 'admin' | 'staff') => ({ 'User-Agent': API_UA, Authorization: `Bearer ${(await (await admin.request.post(`${BASE}/api-keys`, { data: { name: `QA-AAPI notifications ${level}`, level } })).json()).data.token}` });
    const adminKey = await mk('admin'); const staffKey = await mk('staff');
    const n = await create({ title: `${T}keys`, channels: ['inbox', 'email'] });
    expect((await request.post(`${BASE}/notifications/${n.id}/send-email`, { headers: adminKey })).status()).toBe(403);
    expect((await request.post(`${BASE}/notifications/${n.id}/send-email`, { headers: staffKey })).status()).toBe(403);
    const made = await request.post(`${BASE}/notifications`, { headers: adminKey, data: note({ title: `${T}by key` }) });
    expect(made.status()).toBe(201);
    expect((await request.delete(`${BASE}/notifications/${(await made.json()).data.id}`, { headers: adminKey })).status()).toBe(200);
    for (const p of ['/notifications', `/notifications/${n.id}`, `/notifications/${n.id}/recipients`]) expect((await request.get(BASE + p, { headers: staffKey })).status(), p).toBe(200);
    expect((await request.post(`${BASE}/notifications`, { headers: staffKey, data: note({ title: `${T}staff` }) })).status()).toBe(403);
    expect((await request.delete(`${BASE}/notifications/${n.id}`, { headers: staffKey })).status()).toBe(403);
    expect((await get(`/notifications/${n.id}`)).emailSentAt).toBeNull();
    expect(future(1)).toBeTruthy();
  });
});
