import { test, expect } from '@playwright/test';
import { EMAIL } from '../support/personas';
import { requireSeed } from '../support/guards';
import { API_UA, sessionFor, type Session } from '../support/api';
import { BASE, clearWriteLimits, cleanupAdminApi } from '../support/adminApi';
import { adminDb } from '../support/db';
import { clerkUserId } from '../support/clerk';

// SCP-115 part C · read-only admin API for exam attempts: a list without code or notes, one attempt with both, owner and admin keys only for the code.
// Rows are made here under the course slug below and removed afterwards. Skips until docs/testing/sql/step10-exam-attempts.sql has been run.
const SLUG = 'qa-aapi-exa-batch';
const SECRET = "print('qa-exam-secret-answer')";
const NOTES = [{ q: 1, label: 'Q1 (Lists)', passed: true, note: 'Good.' }, { q: 2, label: 'Q2 (Strings)', passed: false, note: 'Fix the masking.' }];

test.describe('AAPI exam attempts @regression', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async () => { test.setTimeout(90_000); requireSeed(); await clearWriteLimits(); });
  let admin: Session; let uid = ''; let firstId = '';
  const db = () => adminDb();
  test.beforeAll(async ({ browser }) => {
    const probe = await db().from('exam_attempts').select('id').limit(1);
    test.skip(!!probe.error, 'exam_attempts does not exist on this Supabase project: run docs/testing/sql/step10-exam-attempts.sql');
    uid = await clerkUserId(EMAIL.edu);
    admin = await sessionFor(browser, EMAIL.admin);
    const base = { user_id: uid, user_name: 'QA Exam Learner', user_email: EMAIL.edu, course_slug: SLUG, notes: NOTES, mail_learner: 'skipped', mail_owner: 'skipped' };
    expect((await db().from('exam_attempts').insert([
      { ...base, attempt_no: 1, score: 40, passed: false, code: SECRET, created_at: new Date(Date.now() - 2 * 86400_000).toISOString() },
      { ...base, attempt_no: 2, score: 100, passed: true, code: 'print(2)', created_at: new Date(Date.now() - 86400_000).toISOString() },
    ])).error).toBeNull();
    firstId = (await db().from('exam_attempts').select('id').eq('course_slug', SLUG).eq('attempt_no', 1).single()).data!.id;
  });
  test.afterAll(async () => { await db().from('exam_attempts').delete().eq('course_slug', SLUG); await cleanupAdminApi(); await clearWriteLimits(); await admin?.close(); });
  const get = (p: string) => admin.request.get(`${BASE}${p}`);
  const keyHeaders = async (level: 'admin' | 'staff') => {
    const r = await admin.request.post(`${BASE}/api-keys`, { data: { name: `QA-AAPI exam attempts ${level}`, level } });
    return { 'User-Agent': API_UA, Authorization: `Bearer ${(await r.json()).data.token}` };
  };

  test('[AAPI-EXA-001] the list has one row per attempt, newest first, with the named fields only and no code or notes', async () => {
    const body = await (await get(`/exam-attempts?cohortSlug=${SLUG}`)).json();
    expect(body.data.items.map((i: { attemptNo: number }) => i.attemptNo)).toEqual([2, 1]);
    expect(body.data.items[1]).toEqual({
      id: firstId, userId: uid, name: 'QA Exam Learner', email: EMAIL.edu, cohortSlug: SLUG, attemptNo: 1, score: 40, passed: false,
      createdAt: expect.any(String), codeLength: SECRET.length, mailLearner: 'skipped', mailOwner: 'skipped',
    });
    expect(JSON.stringify(body)).not.toContain('qa-exam-secret-answer');
  });

  test('[AAPI-EXA-002] filters: status passed or failed, search by name, userId; a bad status is 400', async () => {
    const ids = async (q: string) => (await (await get(`/exam-attempts?cohortSlug=${SLUG}${q}`)).json()).data.items.map((i: { attemptNo: number }) => i.attemptNo);
    expect(await ids('&status=passed')).toEqual([2]);
    expect(await ids('&status=failed')).toEqual([1]);
    expect(await ids('&q=Exam%20Learner')).toEqual([2, 1]);
    expect(await ids('&q=nobody-here')).toEqual([]);
    expect(await ids(`&userId=${uid}`)).toEqual([2, 1]);
    expect((await get('/exam-attempts?status=maybe')).status()).toBe(400);
  });

  test('[AAPI-EXA-003] one attempt carries the code, the notes and the improvement note text; an unknown or malformed id is 404', async () => {
    const d = (await (await get(`/exam-attempts/${firstId}`)).json()).data;
    expect(d).toMatchObject({ id: firstId, code: SECRET, passMark: 80, notes: NOTES });
    expect(d.notesText).toContain('Score: 40% (passing score: 80%)');
    expect(d.notesText).toContain('[IMPROVE] Q2 (Strings): Fix the masking.');
    expect((await get('/exam-attempts/00000000-0000-4000-8000-000000000000')).status()).toBe(404);
    expect((await get('/exam-attempts/not-an-id')).status()).toBe(404);
  });

  test('[AAPI-EXA-004] a staff key can list but not read the code; an admin key can; nobody without a login or key can do either', async () => {
    const staff = await keyHeaders('staff'); const adminKey = await keyHeaders('admin');
    const req = admin.request;
    expect((await req.get(`${BASE}/exam-attempts?cohortSlug=${SLUG}`, { headers: staff })).status()).toBe(200);
    expect((await req.get(`${BASE}/exam-attempts/${firstId}`, { headers: staff })).status()).toBe(403);
    expect((await req.get(`${BASE}/exam-attempts/${firstId}`, { headers: adminKey })).status()).toBe(200);
    const anon = await fetch(`${process.env.BASE_URL ?? 'http://localhost:3100'}/api/admin/v1/exam-attempts`, { headers: { 'User-Agent': API_UA } });
    expect([401, 403]).toContain(anon.status);
  });
});

// Runs only while the table is missing (before step10-exam-attempts.sql): the list must say so instead of looking empty (SCP-116).
test.describe('AAPI exam attempts without the table @regression', () => {
  test('[AAPI-EXA-005] while exam_attempts is missing the list answers 424 naming the SQL file, and one attempt is 404', async ({ browser }) => {
    requireSeed();
    const probe = await adminDb().from('exam_attempts').select('id').limit(1);
    test.skip(!probe.error, 'exam_attempts exists on this project');
    const admin = await sessionFor(browser, EMAIL.admin);
    try {
      const res = await admin.request.get(`${BASE}/exam-attempts`);
      expect(res.status()).toBe(424);
      expect((await res.json()).error).toMatchObject({ code: 'not_set_up', message: expect.stringContaining('step10-exam-attempts.sql') });
      expect((await admin.request.get(`${BASE}/exam-attempts/00000000-0000-4000-8000-000000000000`)).status()).toBe(404);
    } finally { await admin.close(); }
  });
});
