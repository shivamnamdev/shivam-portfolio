import { test, expect } from '@playwright/test';
import { EMAIL } from '../support/personas';
import { requireSeed } from '../support/guards';
import { API_UA, sessionFor, type Session } from '../support/api';
import { BASE, clearWriteLimits, cleanupAdminApi } from '../support/adminApi';
import { adminDb } from '../support/db';
import { clerkUserId } from '../support/clerk';

// PRD 19 · slice 4f API: read-only progress, submissions (code only for one opened submission) and engagement. The learner is the "edu" persona
// (enrolled in nothing). Rows are made here under qa-aapi-pg-* cohorts and removed afterwards; the persona's user_stats row is saved and put back.
const WITH = 'qa-aapi-pg-batch';      // has a published curriculum: 3 videos, one of them with an assignment
const BARE = 'qa-aapi-pg-bare';       // no curriculum anywhere: totals unknown
const SECRET = "print('qa-aapi-secret-answer')";
const LEARNER = EMAIL.edu;
const FRAGMENT = 'shivamnamdev.edu';
const day = (n: number) => new Date(Date.now() - n * 86400_000).toISOString();

test.describe('AAPI progress @regression', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async () => { test.setTimeout(90_000); requireSeed(); await clearWriteLimits(); });
  let admin: Session; let learnerId = ''; let savedStats: Record<string, unknown>[] = []; let submissionId = '';
  const db = () => adminDb();
  test.beforeAll(async ({ browser }) => {
    learnerId = await clerkUserId(LEARNER);
    admin = await sessionFor(browser, EMAIL.admin);
    savedStats = (await db().from('user_stats').select('*').eq('user_id', learnerId)).data ?? [];
    const lessons = [{ id: 'qa-pg-v1', kind: 'video' }, { id: 'qa-pg-v2', kind: 'video', assignment: { title: 'Print hello' } }, { id: 'qa-pg-v3', kind: 'video' }];
    const doc = { modules: [], published: [{ id: 'm1', title: 'QA basics', advanced: false, lessons }], publishedAt: day(1) };
    expect((await db().from('content_docs').insert([{ kind: 'curriculum', key: WITH, doc, status: 'published', created_by: 'qa', updated_by: 'qa' }])).error).toBeNull();
    for (const slug of [WITH, BARE]) expect((await db().from('user_enrollments').insert([{ user_id: learnerId, course_slug: slug, user_email: LEARNER, user_name: 'QA Learner PG' }])).error).toBeNull();
    expect((await db().from('video_progress').insert([
      { user_id: learnerId, course_slug: WITH, video_id: 'qa-pg-v1', completed_at: day(3) }, { user_id: learnerId, course_slug: WITH, video_id: 'qa-pg-v2', completed_at: day(2) },
    ])).error).toBeNull();
    expect((await db().from('assignment_progress').insert([
      { user_id: learnerId, user_name: 'QA Learner PG', course_slug: WITH, video_id: 'qa-pg-v2', submitted_code: SECRET, completed_at: day(1) },
      { user_id: learnerId, user_name: 'QA Learner PG', course_slug: BARE, video_id: 'qa-pg-x1', submitted_code: 'x = 1', completed_at: day(5) },
    ])).error).toBeNull();
    submissionId = (await db().from('assignment_progress').select('id').eq('user_id', learnerId).eq('course_slug', WITH).single()).data!.id;
    await db().from('user_stats').delete().eq('user_id', learnerId);
    expect((await db().from('user_stats').insert([{ user_id: learnerId, user_name: 'QA Learner PG', total_time_seconds: 99999999, current_streak: 7, last_active_date: day(0).slice(0, 10) }])).error).toBeNull();
  });
  test.afterAll(async () => {
    const d = db();
    for (const t of ['video_progress', 'assignment_progress', 'user_enrollments'] as const) await d.from(t).delete().in('course_slug', [WITH, BARE]);
    await d.from('user_stats').delete().eq('user_id', learnerId);
    if (savedStats.length) await d.from('user_stats').insert(savedStats);
    await cleanupAdminApi(); await clearWriteLimits(); await admin?.close();
  });
  const get = async (p: string) => admin.request.get(`${BASE}${p}`);
  const data = async (p: string) => (await (await get(p)).json()).data;
  const keyHeaders = async (level: 'admin' | 'staff') => {
    const r = await admin.request.post(`${BASE}/api-keys`, { data: { name: `QA-AAPI progress ${level}`, level } });
    return { 'User-Agent': API_UA, Authorization: `Bearer ${(await r.json()).data.token}` };
  };

  test('[AAPI-PRG-001] progress: one row per enrolment, counts and percent come from the published curriculum, and only the named fields are returned', async () => {
    const d = await data(`/progress?cohortSlug=${WITH}`);
    expect(d.items).toHaveLength(1);
    expect(d.items[0]).toEqual({
      userId: learnerId, name: expect.any(String), email: LEARNER, cohortSlug: WITH, videosDone: 2, totalVideos: 3, assignmentsDone: 1, totalAssignments: 1, percent: 75, lastActivityAt: expect.any(String),
    });
    expect(Date.parse(d.items[0].lastActivityAt)).toBeGreaterThan(Date.now() - 2 * 86400_000);   // the assignment, one day ago, is the latest
    expect(JSON.stringify(d)).not.toContain('qa-aapi-secret-answer');
    expect(d.nextCursor).toBeNull();
  });

  test('[AAPI-PRG-002] progress: a cohort with no lessons known has null totals and percent (nothing is guessed); filters, search and paging work; bad input is 400', async () => {
    const bare = (await data(`/progress?cohortSlug=${BARE}`)).items[0];
    expect(bare).toMatchObject({ videosDone: 0, totalVideos: null, assignmentsDone: 1, totalAssignments: null, percent: null });
    const both = await data(`/progress?userId=${learnerId}&limit=1`);
    expect(both.items).toHaveLength(1);
    expect(both.nextCursor).toBeTruthy();
    const next = await data(`/progress?userId=${learnerId}&limit=1&cursor=${encodeURIComponent(both.nextCursor)}`);
    expect(next.items[0].cohortSlug).not.toBe(both.items[0].cohortSlug);
    expect((await data(`/progress?cohortSlug=${WITH}&q=${FRAGMENT}`)).items).toHaveLength(1);
    expect((await data(`/progress?cohortSlug=${WITH}&q=zzz-nobody-zzz`)).items).toHaveLength(0);
    expect((await data('/progress?cohortSlug=qa-aapi-pg-none')).items).toEqual([]);
    for (const bad of ['cohortSlug=Bad%20Slug', 'userId=nope', 'limit=0', 'limit=101', 'cursor=notadate']) expect((await get(`/progress?${bad}`)).status(), bad).toBe(400);
  });

  test('[AAPI-PRG-003] submissions: the list names the lesson and the code length but never the code; a title comes from the curriculum; search and paging work', async () => {
    const list = await data(`/submissions?userId=${learnerId}`);
    const mine = list.items.filter((s: { cohortSlug: string }) => [WITH, BARE].includes(s.cohortSlug));
    expect(mine.map((s: { cohortSlug: string }) => s.cohortSlug)).toEqual([WITH, BARE]);   // newest first
    expect(mine[0]).toEqual({ id: submissionId, userId: learnerId, name: expect.any(String), email: LEARNER, cohortSlug: WITH, lessonId: 'qa-pg-v2', lessonTitle: 'Print hello', completedAt: expect.any(String), codeLength: SECRET.length });
    expect(mine[1]).toMatchObject({ lessonId: 'qa-pg-x1', lessonTitle: 'Unknown lesson', codeLength: 5 });
    const text = JSON.stringify(list);
    expect(text).not.toContain('qa-aapi-secret-answer');
    expect(text).not.toContain('submittedCode');
    const page1 = await data(`/submissions?userId=${learnerId}&limit=1`);
    expect(page1.nextCursor).toBeTruthy();
    const page2 = await data(`/submissions?userId=${learnerId}&limit=1&cursor=${encodeURIComponent(page1.nextCursor)}`);
    expect(page2.items[0].id).not.toBe(page1.items[0].id);
    expect((await data(`/submissions?cohortSlug=${WITH}&q=${FRAGMENT}`)).items.map((s: { id: string }) => s.id)).toEqual([submissionId]);
    expect((await data(`/submissions?cohortSlug=${WITH}&q=zzz-nobody-zzz`)).items).toEqual([]);
    for (const bad of ['cohortSlug=Bad%20Slug', 'userId=nope', 'limit=0', 'cursor=notadate']) expect((await get(`/submissions?${bad}`)).status(), bad).toBe(400);
  });

  test('[AAPI-PRG-004] one submission returns its code to the owner and an admin key; a bad or unknown id is 404', async () => {
    const one = await data(`/submissions/${submissionId}`);
    expect(one).toMatchObject({ id: submissionId, lessonTitle: 'Print hello', submittedCode: SECRET, codeLength: SECRET.length });
    const viaKey = await admin.request.get(`${BASE}/submissions/${submissionId}`, { headers: await keyHeaders('admin') });
    expect(viaKey.status()).toBe(200);
    expect((await viaKey.json()).data.submittedCode).toBe(SECRET);
    for (const bad of ['not-a-uuid', '00000000-0000-0000-0000-000000000000', '1; drop table assignment_progress']) expect((await get(`/submissions/${encodeURIComponent(bad)}`)).status(), bad).toBe(404);
  });

  test('[AAPI-PRG-005] a staff key can list progress, submissions and engagement but cannot read code (403); nobody signed in gets 401 everywhere', async ({ request }) => {
    const staff = await keyHeaders('staff');
    for (const p of ['/progress', '/submissions', '/engagement']) expect((await request.get(BASE + p, { headers: staff })).status(), p).toBe(200);
    const denied = await request.get(`${BASE}/submissions/${submissionId}`, { headers: staff });
    expect(denied.status()).toBe(403);
    expect(JSON.stringify(await denied.json())).not.toContain('qa-aapi-secret-answer');
    for (const p of ['/progress', '/submissions', `/submissions/${submissionId}`, '/engagement']) expect((await request.get(BASE + p, { headers: { 'User-Agent': API_UA } })).status(), p).toBe(401);
    expect((await request.post(`${BASE}/progress`, { headers: staff, data: {} })).status()).toBeGreaterThanOrEqual(400);   // read only: no write verb exists
  });

  test('[AAPI-LRN-001] the learners directory: newest first, each with a join date, enrolment count and status; paging by position; the picker fields are still there; staff may read', async ({ request }) => {
    const found = (await data(`/learners?q=${FRAGMENT}`)).items.find((l: { id: string }) => l.id === learnerId);
    expect(found).toEqual({ id: learnerId, email: LEARNER, name: expect.any(String), joinedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/), enrolments: 2, status: 'enrolled' });   // the two cohorts seeded above
    expect(Object.keys(found).sort()).toEqual(['email', 'enrolments', 'id', 'joinedAt', 'name', 'status']);
    const first = await data('/learners?limit=1');
    expect(first.items).toHaveLength(1);
    if (first.nextCursor) {
      expect(first.nextCursor).toBe('1');
      expect((await data('/learners?limit=1&cursor=1')).items[0].id).not.toBe(first.items[0].id);
    }
    const all = (await data('/learners?limit=100')).items as Array<{ joinedAt: string }>;
    expect(all.map((l) => l.joinedAt)).toEqual([...all.map((l) => l.joinedAt)].sort().reverse());   // newest first
    expect((await data('/learners?q=zzz-nobody-zzz')).items).toEqual([]);
    for (const bad of ['cursor=-1', 'cursor=abc', 'limit=0', 'limit=101']) expect((await get(`/learners?${bad}`)).status(), bad).toBe(400);
    expect((await request.get(`${BASE}/learners?limit=2`, { headers: await keyHeaders('staff') })).status()).toBe(200);
    expect((await request.get(`${BASE}/learners`, { headers: { 'User-Agent': API_UA } })).status()).toBe(401);
  });

  test('[AAPI-PRG-006] engagement: time, streak and last active day per learner, most time first; search, paging by position, and bad cursors', async () => {
    const top = await data('/engagement?limit=1');
    expect(top.items[0]).toEqual({ userId: learnerId, name: expect.any(String), email: LEARNER, totalTimeSeconds: 99999999, currentStreak: 7, lastActiveDate: expect.any(String) });
    if (top.nextCursor) {
      expect(top.nextCursor).toBe('1');
      expect((await data('/engagement?limit=1&cursor=1')).items[0].userId).not.toBe(learnerId);
    }
    expect((await data(`/engagement?q=${FRAGMENT}`)).items.map((s: { userId: string }) => s.userId)).toContain(learnerId);
    expect((await data('/engagement?q=zzz-nobody-zzz')).items).toEqual([]);
    for (const bad of ['cursor=-1', 'cursor=abc', 'limit=0']) expect((await get(`/engagement?${bad}`)).status(), bad).toBe(400);
  });
});
