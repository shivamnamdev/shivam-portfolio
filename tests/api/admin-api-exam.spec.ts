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

  test('[AAPI-EXM-001] a read says which exam the course uses and which lesson is it: Python Batch 1 uses the Batch 1 exam (the real one), a new course has not picked one', async () => {
    const d = await read();
    expect(d).toMatchObject({ examGrader: true, examId: 'python-batch-1-final', examLessonId: 'WhP2F-xk3Kk' });
    expect(exams(d)).toEqual(['WhP2F-xk3Kk']);
    expect((await admin.request.put(url(NO_GRADER), { data: { modules: [{ title: 'M', lessons: [{ id: 'qaexm000001', assignment: { title: 'A', rawUrl: `${RAW}/a` } }] }] } })).status()).toBe(201);
    expect(await read(NO_GRADER)).toMatchObject({ examGrader: true, examId: null, examLessonId: null });   // the library has an exam to pick; this course has not picked one
  });

  test('[AAPI-EXM-002] a course that has not picked an exam from the library cannot have one marked (422 with the reason)', async () => {
    const d = await read(NO_GRADER);
    const res = await put(d.version, { lessonId: 'qaexm000001' }, NO_GRADER);
    expect(res.status()).toBe(422);
    expect((await res.json()).error.message).toMatch(/Choose an exam from a course, or None/);
    expect(exams(await read(NO_GRADER))).toEqual([]);
  });

  test('[AAPI-EXM-003] marking another lesson moves the exam: one exam only, the old lesson keeps its assignment, the new one gets the library exam\'s files (a pasted expected result is ignored)', async () => {
    touched = true;
    let d = await read(); const other = candidate(d);
    const res = await put(d.version, { lessonId: other, expectedOutcomeUrl: `${RAW}/expected.py` });
    expect(res.status()).toBe(200);
    d = (await res.json()).data;
    expect(exams(d)).toEqual([other]);
    expect(d.examLessonId).toBe(other);
    const lib = d.exams[0].links;
    expect(lessons(d).find((l) => l.id === other)!.assignment).toMatchObject({ isExam: true, serverGraded: true, title: lib.title, rawUrl: lib.rawUrl, starterCodeUrl: lib.starterCodeUrl, expectedOutcomeUrl: lib.expectedOutcomeUrl });
    const old = lessons(d).find((l) => l.id === 'WhP2F-xk3Kk')!.assignment!;
    expect(old).toMatchObject({ title: 'Final Foundation Certification Exam' });
    for (const f of ['isExam', 'serverGraded', 'expectedOutcomeUrl']) expect(old).not.toHaveProperty(f);
    expect(d.hasUnpublishedChanges).toBe(true);   // learners see it only after publishing
    // the same lesson again changes nothing visible
    expect(lessons((await (await put(d.version, { lessonId: other })).json()).data).find((l) => l.id === other)!.assignment!.expectedOutcomeUrl).toBe(lib.expectedOutcomeUrl);
  });

  test('[AAPI-EXM-004] refusals: unknown lesson 404, a new exam without an assignment file or a lesson in a locked module 422, bad body 400, missing If-Match 428, stale version 409; nothing changes', async () => {
    const d = await read(); const before = JSON.stringify(exams(d));
    expect((await put(d.version, { lessonId: 'zzzzzzzzzzz' })).status()).toBe(404);
    const noAssignment = lessons(d).find((l) => l.kind === 'video' && !l.assignment)!.id;
    expect((await put(d.version, { lessonId: noAssignment, examId: 'none' })).status()).toBe(422);   // a new exam needs its own assignment file; a library exam brings its own
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

  // Exam library, step 1 (docs/architecture/exam-library.md): a course that has not picked an exam picks one from the library; learners are graded with the PUBLISHED choice.
  const PASSING = `
print("Jaskeerat Amit Smeeta")
print("Rahul -> Yes"); print("Smeeta -> No"); print("Amit -> No"); print("Jaskeerat -> Yes"); print("Niraj -> Yes")
print("2 9 5 Py***5! Medium")
print("Finance 54000 55000 28000 Senior Mid")
def create_log_file(): pass
def add_task(): pass
def read_tasks(): pass
def search_task(): pass
def delete_task(): pass
def generate_report(): pass
class Doctor:
    def show_cabin(self): pass
class Patient:
    def calculate_discount(self): pass
class Hospital:
    def discharge_patient(self): pass
    def get_doctor_report(self): pass
`;
  const LIB = 'python-batch-1-final'; const LESSON = 'qaexm000001';
  const doc = async () => ((await adminDb().from('content_docs').select('doc').eq('kind', 'curriculum').eq('key', NO_GRADER).single()).data!.doc as { examId?: string; publishedExamId?: string });
  const gradeAs = () => admin.request.post('/api/learning/exam-grade', { data: { courseSlug: NO_GRADER, files: [{ 'main.py': PASSING }], inputs: [] } });

  test('[AAPI-EXM-008] a new course picks an exam from the library: the read lists the library without any grader script, unknown or malformed ids are refused, a pick marks the lesson', async () => {
    let d = await read(NO_GRADER);
    expect(d.exams).toEqual([{ id: LIB, title: 'Python Batch 1 final exam', questions: 5, links: expect.objectContaining({ rawUrl: expect.stringMatching(/v1\.docx$/) }) }]);
    expect(JSON.stringify(d)).not.toMatch(/EXAM_SCORE|Jaskeerat|student_output/);
    const unknown = await put(d.version, { lessonId: LESSON, examId: 'no-such-exam' }, NO_GRADER);
    expect(unknown.status()).toBe(422); expect((await unknown.json()).error.message).toMatch(/no exam "no-such-exam" in the library/);
    for (const bad of [{ examId: 5 }, { examId: 'Bad Id' }, { examId: '../x' }, { examId: '__proto__x/' }, { examId: '' }, { examId: 'a'.repeat(65) }]) expect((await put(d.version, { lessonId: LESSON, ...bad }, NO_GRADER)).status(), JSON.stringify(bad)).toBe(400);
    expect((await read(NO_GRADER)).examLessonId).toBeNull();                       // nothing changed by the refusals
    const ok = await put(d.version, { lessonId: LESSON, examId: LIB }, NO_GRADER);
    expect(ok.status()).toBe(200);
    d = (await ok.json()).data;
    expect(d).toMatchObject({ examId: LIB, examLessonId: LESSON, hasUnpublishedChanges: true });
    expect(lessons(d).find((l) => l.id === LESSON)!.assignment).toMatchObject({ isExam: true, serverGraded: true, rawUrl: expect.stringMatching(/v1\.docx$/), expectedOutcomeUrl: expect.stringMatching(/v1_expected_result\.py$/) });   // the lesson's own file was replaced by the library exam's
    expect(await doc()).toMatchObject({ examId: LIB }); expect((await doc()).publishedExamId).toBeUndefined();   // learners are not graded with it yet
  });

  test('[AAPI-EXM-009] learners are graded with the published choice only: before publishing the course has no exam, after publishing it is graded with the shared exam, removing the exam and publishing again ends it', async () => {
    const db = adminDb();
    const adminId = await clerkUserId(EMAIL.admin);
    const reset = () => db.from('exam_progress').delete().eq('user_id', adminId).eq('course_slug', NO_GRADER);
    await reset();
    try {
      expect((await gradeAs()).status()).toBe(404);                                 // chosen in the working copy, not published
      let d = await read(NO_GRADER);
      expect((await admin.request.post(url(NO_GRADER, '/publish'), { headers: { 'If-Match': String(d.version) } })).status()).toBe(200);
      expect((await doc()).publishedExamId).toBe(LIB);
      const res = await gradeAs();
      expect(res.status()).toBe(200);
      const graded = await res.json();
      expect(graded).toMatchObject({ success: true, is_passed: true });
      expect(graded.score).toBeGreaterThanOrEqual(80);                              // the same grader and pass mark as Python Batch 1
      expect((await db.from('exam_progress').select('is_passed').eq('user_id', adminId).eq('course_slug', NO_GRADER)).data).toEqual([{ is_passed: true }]);   // the result belongs to THIS course
      expect((await db.from('exam_progress').select('is_passed').eq('user_id', adminId).eq('course_slug', SLUG)).data?.length ?? 0).toBe(0);   // and not to Python Batch 1
      await reset();                                                                // nobody has passed: the exam may be removed
      d = await read(NO_GRADER);
      expect((await put(d.version, { lessonId: null }, NO_GRADER)).status()).toBe(200);
      expect((await doc()).examId).toBeUndefined();
      expect((await gradeAs()).status()).toBe(200);                                 // still the published choice until the removal is published
      d = await read(NO_GRADER);
      expect((await admin.request.post(url(NO_GRADER, '/publish'), { headers: { 'If-Match': String(d.version) } })).status()).toBe(200);
      expect((await doc()).publishedExamId).toBeUndefined();
      await reset();
      expect((await gradeAs()).status()).toBe(404);
    } finally { await reset(); }
  });

  const MODS = [{ title: 'M', lessons: [{ id: LESSON, kind: 'video', assignment: { title: 'A', rawUrl: `${RAW}/a` } }] }];
  // Exam library, step 2 (exam-library.md section 13): "None" is a new exam made of pasted files, with no grader.
  test('[AAPI-EXM-010] a new exam ("none"): marks the lesson with its own files, is not graded on the server, has no library exam, and the pasted expected result follows what is sent', async () => {
    let d = await read(NO_GRADER);
    const own = await admin.request.put(url(NO_GRADER), { data: { modules: MODS }, headers: { 'If-Match': String(d.version) } });   // the lesson's own file again (008 replaced it with the library exam's)
    expect(own.status()).toBe(200);
    d = (await own.json()).data;
    const res = await put(d.version, { lessonId: LESSON, examId: 'none', expectedOutcomeUrl: `${RAW}/e.py` }, NO_GRADER);
    expect(res.status()).toBe(200);
    d = (await res.json()).data;
    expect(d).toMatchObject({ examId: null, examLessonId: LESSON });
    const a = lessons(d).find((l) => l.id === LESSON)!.assignment!;
    expect(a).toMatchObject({ isExam: true, rawUrl: `${RAW}/a`, expectedOutcomeUrl: `${RAW}/e.py` });   // the lesson's own file, nothing from the library
    expect(a).not.toHaveProperty('serverGraded');
    expect((await doc()).examId).toBeUndefined();
    d = await read(NO_GRADER);
    const again = (await (await put(d.version, { lessonId: LESSON, examId: 'none', expectedOutcomeUrl: '' }, NO_GRADER)).json()).data;
    expect(lessons(again).find((l) => l.id === LESSON)!.assignment).not.toHaveProperty('expectedOutcomeUrl');   // an empty text removes it
    d = await read(NO_GRADER);
    expect((await admin.request.post(url(NO_GRADER, '/publish'), { headers: { 'If-Match': String(d.version) } })).status()).toBe(200);
    expect((await gradeAs()).status()).toBe(404);                                  // no grader: the server never marks it
  });

  test('[AAPI-EXM-011] a library exam needs no assignment first: a lesson without one gets the exam\'s files; "none" then "library" and back keep one exam only', async () => {
    let d = await read(NO_GRADER);
    const set = await admin.request.put(url(NO_GRADER), { data: { modules: [{ ...MODS[0], lessons: [...MODS[0].lessons, { id: 'qaexm000002', kind: 'video' }] }] }, headers: { 'If-Match': String(d.version) } });
    expect(set.status()).toBe(200);
    d = (await set.json()).data;
    expect(lessons(d).find((l) => l.id === 'qaexm000002')!.assignment).toBeUndefined();
    const ok = await put(d.version, { lessonId: 'qaexm000002', examId: LIB }, NO_GRADER);
    expect(ok.status()).toBe(200);
    d = (await ok.json()).data;
    expect(d).toMatchObject({ examId: LIB, examLessonId: 'qaexm000002' });
    expect(lessons(d).find((l) => l.id === 'qaexm000002')!.assignment).toMatchObject({ labType: 'python', isExam: true, serverGraded: true, rawUrl: expect.stringMatching(/v1\.docx$/) });
    expect(exams(d)).toEqual(['qaexm000002']);
    const back = await put(d.version, { lessonId: LESSON, examId: 'none' }, NO_GRADER);     // nobody has passed this course's exam
    expect(back.status()).toBe(200);
    expect(exams((await back.json()).data)).toEqual([LESSON]);
  });
});
