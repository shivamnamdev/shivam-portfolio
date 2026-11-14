import { test, expect } from '@playwright/test';
import { EMAIL } from '../support/personas';
import { requireSeed } from '../support/guards';
import { API_UA, sessionFor, type Session } from '../support/api';
import { BASE, clearWriteLimits, cleanupAdminApi, cohort, course } from '../support/adminApi';
import { clerkUserId } from '../support/clerk';
import { adminDb } from '../support/db';

// PRD 18 · marking the final exam through the portal API (docs/architecture/exam-switch.md, rule R6 amended). Runs on the REAL python-beginners curriculum on QA
// (the only course with a grader in code), moves the exam flag and puts everything back in afterAll. A cohort without a grader is used for the refusals.
const SLUG = 'python-beginners';
const NO_GRADER = 'qa-aapi-exm-batch';
const NO_GRADER_COURSE = 'qa-aapi-exm-course';
const RAW = 'https://raw.githubusercontent.com/shivamnamdev/qa-exam';
type Lesson = { id: string; kind: string; assignment?: Record<string, unknown> };
type Mod = { id: string; advanced: boolean; lessons: Lesson[] };

test.describe('AAPI exam switch @regression', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async () => { test.setTimeout(120_000); requireSeed(); await clearWriteLimits(); });
  let admin: Session; let uid = ''; let origExam = ''; let origOutcome: string | undefined; let examRow: Record<string, unknown> | null = null; let touched = false;
  const url = (c = SLUG, p = '') => `${BASE}/curriculum/${c}${p}`;
  const read = async (c = SLUG) => (await (await admin.request.get(url(c))).json()).data;
  const put = (v: number, data: object, c = SLUG) => admin.request.put(url(c, '/exam'), { data, headers: { 'If-Match': String(v) } });
  const lessons = (d: { modules: Mod[] }) => d.modules.flatMap((m) => m.lessons);
  const exams = (d: { modules: Mod[] }) => lessons(d).filter((l) => l.assignment?.isExam).map((l) => l.id);
  // a lesson with an assignment file in an open module that is not the exam
  const candidate = (d: { modules: Mod[] }) => d.modules.filter((m) => !m.advanced).flatMap((m) => m.lessons).find((l) => l.kind === 'video' && l.assignment?.rawUrl && !l.assignment.isExam)!.id;

  test.beforeAll(async ({ browser }) => {
    admin = await sessionFor(browser, EMAIL.admin);
    uid = await clerkUserId(EMAIL.edu);
    if ((await admin.request.get(url())).status() === 404) await admin.request.post(`${BASE}/import/curriculum`, { data: { cohorts: [SLUG], apply: true } });
    const d = await read();
    origExam = exams(d)[0]; origOutcome = lessons(d).find((l) => l.id === origExam)?.assignment?.expectedOutcomeUrl as string | undefined;
    examRow = (await adminDb().from('exam_progress').select('*').eq('user_id', uid).eq('course_slug', SLUG)).data?.[0] ?? null;
    await admin.request.post(`${BASE}/courses`, { data: course(NO_GRADER_COURSE) });
    await admin.request.post(`${BASE}/cohorts`, { data: cohort(NO_GRADER, NO_GRADER_COURSE) });
  });
  test.afterAll(async () => {
    const db = adminDb();
    await db.from('exam_progress').delete().eq('user_id', uid).eq('course_slug', SLUG);
    if (examRow) await db.from('exam_progress').insert(examRow);
    if (touched && origExam) { const d = await read(); await put(d.version, { lessonId: origExam, ...(origOutcome ? { expectedOutcomeUrl: origOutcome } : {}) }); }
    await db.from('admin_audit').delete().in('action', ['exam.set', 'exam.clear']).eq('resource_id', SLUG);
    await cleanupAdminApi(); await clearWriteLimits(); await admin?.close();
  });

  test('[AAPI-EXM-001] a read says whether the course can have an exam and which lesson is it: Python Batch 1 yes (the real exam), a course without a grader no', async () => {
    const d = await read();
    expect(d).toMatchObject({ examGrader: true, examLessonId: 'WhP2F-xk3Kk' });
    expect(exams(d)).toEqual(['WhP2F-xk3Kk']);
    expect(await read(NO_GRADER).catch(() => null)).toBeNull;   // no curriculum yet is a 404 below
    expect((await admin.request.put(url(NO_GRADER), { data: { modules: [{ title: 'M', lessons: [{ id: 'qaexm000001', assignment: { title: 'A', rawUrl: `${RAW}/a` } }] }] } })).status()).toBe(201);
    expect(await read(NO_GRADER)).toMatchObject({ examGrader: false, examLessonId: null });
  });

  test('[AAPI-EXM-002] a course without a grader in code cannot have an exam marked (422 with the reason)', async () => {
    const d = await read(NO_GRADER);
    const res = await put(d.version, { lessonId: 'qaexm000001' }, NO_GRADER);
    expect(res.status()).toBe(422);
    expect((await res.json()).error.message).toMatch(/no exam grader yet/);
    expect(exams(await read(NO_GRADER))).toEqual([]);
  });

  test('[AAPI-EXM-003] marking another lesson moves the exam: one exam only, the old lesson keeps its assignment, the expected result follows what is sent', async () => {
    touched = true;
    let d = await read(); const other = candidate(d);
    const res = await put(d.version, { lessonId: other, expectedOutcomeUrl: `${RAW}/expected.py` });
    expect(res.status()).toBe(200);
    d = (await res.json()).data;
    expect(exams(d)).toEqual([other]);
    expect(d.examLessonId).toBe(other);
    expect(lessons(d).find((l) => l.id === other)!.assignment).toMatchObject({ isExam: true, serverGraded: true, expectedOutcomeUrl: `${RAW}/expected.py` });
    const old = lessons(d).find((l) => l.id === 'WhP2F-xk3Kk')!.assignment!;
    expect(old).toMatchObject({ title: 'Final Foundation Certification Exam' });
    for (const f of ['isExam', 'serverGraded', 'expectedOutcomeUrl']) expect(old).not.toHaveProperty(f);
    expect(d.hasUnpublishedChanges).toBe(true);   // learners see it only after publishing
    // the same lesson again with no url keeps it; an empty url removes it
    expect(lessons((await (await put(d.version, { lessonId: other })).json()).data).find((l) => l.id === other)!.assignment!.expectedOutcomeUrl).toBe(`${RAW}/expected.py`);
    d = await read();
    expect(lessons((await (await put(d.version, { lessonId: other, expectedOutcomeUrl: '' })).json()).data).find((l) => l.id === other)!.assignment).not.toHaveProperty('expectedOutcomeUrl');
  });

  test('[AAPI-EXM-004] refusals: unknown lesson 404, a lesson without an assignment file or in a locked module 422, bad body 400, missing If-Match 428, stale version 409; nothing changes', async () => {
    const d = await read(); const before = JSON.stringify(exams(d));
    expect((await put(d.version, { lessonId: 'zzzzzzzzzzz' })).status()).toBe(404);
    const noAssignment = lessons(d).find((l) => l.kind === 'video' && !l.assignment)!.id;
    expect((await put(d.version, { lessonId: noAssignment })).status()).toBe(422);
    const locked = d.modules.find((m: Mod) => m.advanced)!.lessons[0].id;
    expect((await put(d.version, { lessonId: locked })).status()).toBe(422);
    for (const bad of [{}, { lessonId: 5 }, { lessonId: 'short' }, { lessonId: candidate(d), expectedOutcomeUrl: 'https://evil.example/x.py' }, { lessonId: candidate(d), expectedOutcomeUrl: 'http://raw.githubusercontent.com/x' }, { lessonId: candidate(d), extra: 1 }]) {
      expect((await put(d.version, bad)).status(), JSON.stringify(bad)).toBe(400);
    }
    expect((await admin.request.put(url(SLUG, '/exam'), { data: { lessonId: candidate(d) } })).status()).toBe(428);
    expect((await put(d.version - 1, { lessonId: candidate(d) })).status()).toBe(409);
    expect(JSON.stringify(exams(await read()))).toBe(before);
  });

  test('[AAPI-EXM-005] the generic lesson calls still cannot create or change the exam flags (R6): only the exam call can', async () => {
    const d = await read(); const id = candidate(d);
    const res = await admin.request.patch(url(SLUG, `/lessons/${id}`), { data: { assignment: { title: 'x', rawUrl: `${RAW}/a`, isExam: true } }, headers: { 'If-Match': String(d.version) } });
    expect(res.status()).toBe(400);
    const d2 = await read();
    expect(exams(d2)).toEqual(exams(d));
  });

  test('[AAPI-EXM-006] removing the exam: refused with 409 once a learner has passed it, allowed when nobody has; an exam is optional so a course can end with none', async () => {
    const db = adminDb();
    await db.from('exam_progress').delete().eq('user_id', uid).eq('course_slug', SLUG);
    await db.from('exam_progress').insert({ user_id: uid, course_slug: SLUG, attempts_used: 1, is_passed: true, last_score: 90 });
    let d = await read(); const had = exams(d);
    const blocked = await put(d.version, { lessonId: null });
    expect(blocked.status()).toBe(409);
    expect((await blocked.json()).error.message).toMatch(/passed this exam/);
    expect(exams(await read())).toEqual(had);
    // moving it is always allowed
    expect((await put(d.version, { lessonId: candidate(d) })).status()).toBe(200);
    await db.from('exam_progress').update({ is_passed: false }).eq('user_id', uid).eq('course_slug', SLUG);   // failed attempts only: removal is fine
    d = await read();
    const cleared = await put(d.version, { lessonId: null });
    expect(cleared.status()).toBe(200);
    const after = (await cleared.json()).data;
    expect(exams(after)).toEqual([]); expect(after.examLessonId).toBeNull();
    expect(lessons(after).filter((l) => l.assignment).length).toBe(lessons(d).filter((l) => l.assignment).length);   // every assignment stays
    expect((await put(after.version, { lessonId: null })).status()).toBe(200);   // repeatable
  });

  test('[AAPI-EXM-007] who may: an admin key can mark the exam, a read-only key and a visitor cannot; every change is audited without links', async ({ request }) => {
    const mk = async (level: string) => (await (await admin.request.post(`${BASE}/api-keys`, { data: { name: `QA-AAPI exam ${level}`, level } })).json()).data.token as string;
    const asKey = (t: string) => ({ 'User-Agent': API_UA, Authorization: `Bearer ${t}` });
    let d = await read(); const id = candidate(d);
    const staff = await mk('staff');
    expect((await request.put(url(SLUG, '/exam'), { headers: { ...asKey(staff), 'If-Match': String(d.version) }, data: { lessonId: id } })).status()).toBe(403);
    expect((await request.put(url(SLUG, '/exam'), { headers: { 'If-Match': String(d.version) }, data: { lessonId: id } })).status()).toBe(401);
    const key = await mk('admin');
    const ok = await request.put(url(SLUG, '/exam'), { headers: { ...asKey(key), 'If-Match': String(d.version) }, data: { lessonId: id, expectedOutcomeUrl: `${RAW}/e.py` } });
    expect(ok.status()).toBe(200);
    expect((await (await ok.json()).data.examLessonId)).toBe(id);
    d = await read();
    const audit = (await (await admin.request.get(`${BASE}/audit?resource=curriculum&resourceId=${SLUG}&action=exam.set`)).json()).data.items;
    expect(audit.length).toBeGreaterThan(0);
    expect(JSON.stringify(audit)).not.toMatch(/raw\.githubusercontent|qa-exam/);
    expect(d.examLessonId).toBe(id);
  });
});
