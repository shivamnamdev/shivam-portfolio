import { test, expect } from '@playwright/test';
import { EMAIL } from '../support/personas';
import { clerkUserId } from '../support/clerk';
import { adminDb, grantTestEnrolment, revokeTestEnrolment } from '../support/db';
import { requireSeed } from '../support/guards';
import { sessionFor, type Session } from '../support/api';

// SCP-70s hardening · POST /api/learning/exam-grade: the server runs the learner's code against the course grader and
// records the result. The browser can no longer post a score (POST /api/learning/exam-result answers 410).
const SLUG = 'python-beginners';
const U = EMAIL.edu;
const uid = () => clerkUserId(U);

// Prints every phrase the current grader looks for and defines the names it checks (the grader scores printed text and
// definitions; rewriting it to run the learner's functions is a separate follow-up).
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

test.describe('EXG exam grading on the server @regression', () => {
  test.describe.configure({ mode: 'default' });
  test.beforeEach(() => requireSeed());
  let learner: Session;
  const grade = (code: string, inputs: string[] = [], s: Session = learner) =>
    s.request.post('/api/learning/exam-grade', { data: { courseSlug: SLUG, files: [{ 'main.py': code }], inputs } });
  const reset = async () => { await adminDb().from('exam_progress').delete().eq('user_id', await uid()).eq('course_slug', SLUG); };

  test.beforeAll(async ({ browser }) => {
    await revokeTestEnrolment(U, SLUG).catch(() => {});
    await grantTestEnrolment(U, SLUG);
    learner = await sessionFor(browser, U);
  });
  test.afterAll(async () => { await reset(); await revokeTestEnrolment(U, SLUG).catch(() => {}); await learner?.close(); });
  test.beforeEach(reset);

  test('[LRNA-EXG-001] a forged score is refused (410) and changes nothing', async () => {
    const res = await learner.request.post('/api/learning/exam-result', { data: { courseSlug: SLUG, score: 100 } });
    expect(res.status()).toBe(410);
    const { data } = await adminDb().from('exam_progress').select('*').eq('user_id', await uid()).eq('course_slug', SLUG);
    expect(data ?? []).toHaveLength(0);
  });

  test('[LRNA-EXG-002] an empty program fails with a low score and uses one attempt', async () => {
    const body = await (await grade('print("hello")')).json();
    expect(body).toMatchObject({ success: true, is_passed: false, attempts_used: 1 });
    expect(body.score).toBeLessThan(80);
    expect(body.report).toContain('EXAM_SCORE:');
  });

  test('[LRNA-EXG-003] a program that satisfies the grader passes, and the pass is stored', async () => {
    const body = await (await grade(PASSING)).json();
    expect(body).toMatchObject({ success: true, is_passed: true, attempts_used: 1 });
    expect(body.score).toBeGreaterThanOrEqual(80);
    const { data } = await adminDb().from('exam_progress').select('is_passed,last_score').eq('user_id', await uid()).eq('course_slug', SLUG).single();
    expect(data?.is_passed).toBe(true);
    expect(data?.last_score).toBeGreaterThanOrEqual(80);
  });

  test('[LRNA-EXG-004] a learner who prints their own EXAM_SCORE line still gets the real score', async () => {
    const body = await (await grade('print("EXAM_SCORE:100")')).json();
    expect(body.score).toBeLessThan(80);
    expect(body.is_passed).toBe(false);
  });

  test('[LRNA-EXG-005] the sixth failed attempt is refused (403) and a stored pass sticks', async () => {
    for (let n = 1; n <= 5; n++) expect((await (await grade('print(1)')).json()).attempts_used).toBe(n);
    expect((await grade(PASSING)).status()).toBe(403);
    await reset();
    expect((await (await grade(PASSING)).json()).is_passed).toBe(true);
    const later = await (await grade('print(1)')).json();
    expect(later.is_passed).toBe(true);
  });

  test('[LRNA-EXG-006] three input() calls are answered in order from the recorded answers, with no time limit on typing', async () => {
    const code = 'a = input("A? "); b = input("B? "); c = input("C? "); print("GOT", a, b, c)';
    const body = await (await grade(code, ['one', 'two', 'three'])).json();
    expect(body.success).toBe(true);
    expect(body.report).toContain('GOT one two three');
  });

  test('[LRNA-EXG-007] asking for more answers than were recorded ends with EOFError, like closing the pop-up', async () => {
    const body = await (await grade('input(); input(); print("after")', ['only one'])).json();
    expect(body.success).toBe(true);
    expect(body.report).not.toContain('after');
  });

  test('[LRNA-EXG-008] an infinite loop is stopped after about 20 seconds, answers 408 and the attempt is counted', async () => {
    test.setTimeout(60_000);
    const res = await grade('while True:\n    pass');
    expect(res.status()).toBe(408);
    const { data } = await adminDb().from('exam_progress').select('attempts_used').eq('user_id', await uid()).eq('course_slug', SLUG).single();
    expect(data?.attempts_used).toBe(1);
  });

  test('[LRNA-EXG-009] learner code cannot read server secrets or reach the network', async () => {
    const code = `
import js
for probe in ("js.process.env.SUPABASE_SERVICE_ROLE_KEY", "js.process.env.CLERK_SECRET_KEY", "js.fetch", "js.process"):
    try:
        print("PROBE", probe, "=", eval(probe))
    except BaseException as e:
        print("PROBE", probe, "blocked", type(e).__name__)
`;
    const body = await (await grade(code)).json();
    expect(body.success).toBe(true);
    expect(body.report).not.toMatch(/eyJ|sk_test_|sk_live_/);
    for (const probe of ['js.fetch', 'js.process']) expect(body.report).toMatch(new RegExp(`PROBE ${probe.replace('.', '\\.')} = None|PROBE ${probe.replace('.', '\\.')} blocked`));
  });

  test('[LRNA-EXG-010] a course without an exam answers 404', async () => {
    const res = await learner.request.post('/api/learning/exam-grade', { data: { courseSlug: 'git-beginner-batch-1', files: [{ 'main.py': 'print(1)' }], inputs: [] } });
    expect(res.status()).toBe(404);
  });
});
