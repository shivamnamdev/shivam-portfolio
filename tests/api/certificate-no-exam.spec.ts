import { test, expect } from '@playwright/test';
import { COURSE, EMAIL } from '../support/personas';
import { requireSeed } from '../support/guards';
import { sessionFor, type Session } from '../support/api';
import { clerkUserId } from '../support/clerk';
import { adminDb } from '../support/db';
import { courseCurriculumMap } from '../../data/learning-content';

// Owner decision 2026-11-14: an exam is optional. A course without one (Git today) gives the certificate at 80% of the tasks; a course with one still needs it passed (AIA-CRT-005).
const SLUG = COURSE.B;   // git-beginner-batch-1: no exam, no grader
const U = EMAIL.bazar;   // enrolled in the Git cohort
const modules = courseCurriculumMap[SLUG] as any[];   // Git: nothing is dropped by the curriculum import, so the files and the portal agree
const lessons: string[] = modules.flatMap((m: any) => m.videoIds);
const assignments: string[] = modules.flatMap((m: any) => Object.keys(m.githubAssignments ?? {}).filter((id) => lessons.includes(id)));
const total = lessons.length + assignments.length;

test.describe('Certificate without an exam @regression', () => {
  test.describe.configure({ mode: 'default' });
  test.beforeEach(() => requireSeed());
  let s: Session; let uid = '';
  const clear = async () => { const db = adminDb(); for (const t of ['video_progress', 'assignment_progress', 'exam_progress']) await db.from(t).delete().eq('user_id', uid).eq('course_slug', SLUG); };
  test.beforeAll(async ({ browser }) => { s = await sessionFor(browser, U); uid = await clerkUserId(U); await clear(); });
  test.afterAll(async () => { await clear(); await s?.close(); });
  test.afterEach(clear);
  async function seed(n: number) {
    const db = adminDb();
    const v = lessons.slice(0, n), a = assignments.slice(0, Math.max(0, n - lessons.length));
    if (v.length) { const r = await db.from('video_progress').insert(v.map((video_id) => ({ user_id: uid, course_slug: SLUG, video_id }))); if (r.error) throw r.error; }
    if (a.length) { const r = await db.from('assignment_progress').insert(a.map((video_id) => ({ user_id: uid, course_slug: SLUG, video_id, submitted_code: '# QA', user_name: 'QA', completed_at: new Date().toISOString() }))); if (r.error) throw r.error; }
  }
  const ask = () => s.request.post('/api/generate-certificate', { data: { courseSlug: SLUG } });

  test('[AIA-CRT-006] a course without an exam: 80% of the tasks gives the PDF with no exam passed; just under is refused and the reply says no exam is required', async () => {
    expect(total).toBeGreaterThan(5);
    const need = Math.ceil(total * 0.8);
    await seed(need - 1);
    const under = await ask();
    expect(under.status()).toBe(403);
    expect(await under.json()).toMatchObject({ examRequired: false, examPassed: false, error: 'The certificate is available after 80% of the course' });
    await clear();
    await seed(need);
    const res = await ask();
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/pdf');
    expect((await res.body()).subarray(0, 5).toString()).toBe('%PDF-');
  });
});
