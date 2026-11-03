import { test, expect } from '@playwright/test';
import { EMAIL, COURSE } from '../support/personas';
import { courseCurriculumMap } from '../../data/learning-content';
import { clerkUserId } from '../support/clerk';
import { adminDb } from '../support/db';
import { requireSeed } from '../support/guards';
import { API_UA, sessionFor, type Session } from '../support/api';

// PRD 13 · Learning-support APIs: POST /api/ai-tutor, POST /api/generate-certificate, POST /api/track-time, POST /api/xp/sync.
// The tutor is a mock today (no model is called). track-time and xp/sync write the stats row of mavish, which is snapshotted
// first and restored after every test. Certificates are generated in memory and nothing is stored.
test.use({ userAgent: API_UA });
const U = EMAIL.mavish;
const fixtureProgress = 'qa-checkout-sandbox';

test.describe('PRD13 AI tutor, certificate, track-time and xp/sync @regression', () => {
  test.describe.configure({ mode: 'default' });

  test.describe('POST /api/ai-tutor', () => {
    const ask = (request: any, data: object) => request.post('/api/ai-tutor', { data });

    test('[AIA-TUT-001] a visitor can call it (public route): 200 with a message', async ({ request }) => {
      const res = await ask(request, { labType: 'python', code: 'print(1)', output: '' });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(typeof body.message).toBe('string');
    });

    test('[AIA-TUT-002] the hint depends on the error in the output (syntax, name) and an empty editor', async ({ request }) => {
      const syntax = (await (await ask(request, { labType: 'python', code: 'print(', output: 'SyntaxError: invalid syntax' })).json()).message;
      const name = (await (await ask(request, { labType: 'python', code: 'x', output: "NameError: name 'x' is not defined" })).json()).message;
      const empty = (await (await ask(request, { labType: 'python', code: '   ', output: '' })).json()).message;
      expect(syntax).toMatch(/Syntax Error/i);
      expect(name).toMatch(/not been defined/i);
      expect(empty).toMatch(/editor is empty/i);
    });

    test('[AIA-TUT-003] a Git lab gets a Git hint based on the last command', async ({ request }) => {
      const a = (await (await ask(request, { labType: 'git', gitContext: { commandHistory: ['git commit -m x', 'nothing to commit'] } })).json()).message;
      const b = (await (await ask(request, { labType: 'git', gitContext: { commandHistory: ['git rebase', 'not supported'] } })).json()).message;
      const c = (await (await ask(request, { labType: 'git', gitContext: { commandHistory: [] } })).json()).message;
      expect(a).toMatch(/staged changes/i);
      expect(b).toMatch(/simulator/i);
      expect(c).toMatch(/git status/i);
    });

    test('[AIA-TUT-004] a body with none of the expected fields still gets the default hint', async ({ request }) => {
      const res = await ask(request, {});
      expect(res.status()).toBe(200);
      expect((await res.json()).message).toMatch(/Test Mode/i);
    });

    test('[AIA-TUT-005] an unreadable body is a client error, not a server error', async ({ request }) => {
      const res = await request.post('/api/ai-tutor', { data: '{not json', headers: { 'content-type': 'application/json' } });
      expect(res.status()).toBeLessThan(500);
    });

    test('[AIA-TUT-006] a very large code field is accepted or refused in a controlled way', async ({ request }) => {
      const res = await ask(request, { labType: 'python', code: 'x = 1\n'.repeat(200000), output: '' });
      expect([200, 400, 413]).toContain(res.status());
    });

    test('[AIA-TUT-007] (SCP-70) the endpoint needs a signed-in learner (it is public today, so a real model would be free to anyone)', async ({ request }) => {
      const res = await ask(request, { labType: 'python', code: 'print(1)', output: '' });
      expect([401, 403]).toContain(res.status());
    });
  });

  test.describe('POST /api/generate-certificate', () => {
    test('[AIA-CRT-001] a visitor is refused (sign-in required)', async ({ request }) => {
      const res = await request.post('/api/generate-certificate', { data: { courseSlug: 'python-beginners' }, maxRedirects: 0 });
      expect([401, 403, 307]).toContain(res.status());
    });

    test.describe('signed in', () => {
      test.describe.configure({ mode: 'default' });
      test.beforeEach(() => requireSeed());
      let s: Session, uid = '';
      const CERT = COURSE.C;   // python-beginners: the only course with a final exam
      const modules = courseCurriculumMap[CERT] as any[];
      const lessons: string[] = modules.flatMap(m => m.videoIds);
      const assignments: string[] = modules.flatMap(m => Object.keys(m.githubAssignments ?? {}));
      const total = lessons.length + assignments.length;
      test.beforeAll(async ({ browser }) => { s = await sessionFor(browser, U); uid = await clerkUserId(U); });
      test.afterAll(async () => { await clear(); await s?.close(); });
      const clear = async () => {
        const db = adminDb();
        for (const t of ['video_progress', 'assignment_progress', 'exam_progress']) await db.from(t).delete().eq('user_id', uid).eq('course_slug', CERT);
      };
      test.afterEach(clear);
      // Seeds exactly `n` finished tasks (lessons first, then assignments) and the exam state.
      async function seed(n: number, examPassed: boolean) {
        const db = adminDb();
        const v = lessons.slice(0, n), a = assignments.slice(0, Math.max(0, n - lessons.length));
        if (v.length) { const r = await db.from('video_progress').insert(v.map(video_id => ({ user_id: uid, course_slug: CERT, video_id }))); if (r.error) throw r.error; }
        if (a.length) { const r = await db.from('assignment_progress').insert(a.map(video_id => ({ user_id: uid, course_slug: CERT, video_id, submitted_code: '# QA', user_name: 'QA', completed_at: new Date().toISOString() }))); if (r.error) throw r.error; }
        const r = await db.from('exam_progress').upsert({ user_id: uid, course_slug: CERT, attempts_used: 1, is_passed: examPassed, last_score: examPassed ? 90 : 40 }, { onConflict: 'user_id,course_slug' });
        if (r.error) throw r.error;
      }
      const ask = (data: object) => s.request.post('/api/generate-certificate', { data });
      const need = Math.ceil(total * 0.8);

      test('[AIA-CRT-002] a missing or unknown course is refused with 400', async () => {
        for (const data of [{}, { courseSlug: '' }, { courseSlug: 'no-such-course' }, { studentName: 'QA', courseTitle: 'QA' }]) {
          const res = await ask(data);
          expect(res.status(), JSON.stringify(data)).toBe(400);
          expect((await res.json()).error).toBe('Missing data');
        }
      });

      test('[AIA-CRT-003] a learner with 80% of the tasks and the exam passed gets a PDF', async () => {
        await seed(need, true);
        const res = await ask({ courseSlug: CERT });
        expect(res.status()).toBe(200);
        expect(res.headers()['content-type']).toContain('application/pdf');
        const bytes = await res.body();
        expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
        expect(bytes.length).toBeGreaterThan(1000);
      });

      test('[AIA-CRT-004] (SCP-72) a name or title in the request is ignored, so unprintable or other people\'s names never reach the PDF', async () => {
        await seed(need, true);
        const res = await ask({ courseSlug: CERT, studentName: '日本語の名前', courseTitle: 'Someone Else Entirely' });
        expect(res.status()).toBe(200);
        expect(res.headers()['content-disposition'] ?? '').not.toMatch(/Someone|Else|\?/);
      });

      test('[AIA-CRT-005] (SCP-71) no certificate without 80% of the tasks AND a passed exam', async () => {
        expect((await ask({ courseSlug: CERT })).status(), 'no progress').toBe(403);
        await seed(need - 1, true);
        expect((await ask({ courseSlug: CERT })).status(), 'just under 80%').toBe(403);
        await clear();
        await seed(total, false);
        const noExam = await ask({ courseSlug: CERT });
        expect(noExam.status(), 'everything done, exam not passed').toBe(403);
        expect(await noExam.json()).toMatchObject({ examPassed: false, percent: 100 });
        await clear();
        await seed(0, true);
        expect((await ask({ courseSlug: CERT })).status(), 'exam passed, nothing else').toBe(403);
      });
    });
  });

  test.describe('POST /api/track-time and POST /api/xp/sync', () => {
    test.beforeEach(() => requireSeed());
    let s: Session, original: any = null, uid = '';
    test.beforeAll(async ({ browser }) => { s = await sessionFor(browser, U); uid = await clerkUserId(U); });
    test.afterAll(async () => { await s?.close(); });
    test.beforeEach(async () => { original = (await adminDb().from('user_stats').select('*').eq('user_id', uid)).data?.[0] ?? null; });
    test.afterEach(async () => {
      if (original) await adminDb().from('user_stats').update({ total_time_seconds: original.total_time_seconds, total_points: original.total_points }).eq('user_id', uid);
    });
    const stats = async () => (await adminDb().from('user_stats').select('*').eq('user_id', uid)).data![0];

    test('[AIA-TRK-001][AIA-XP-001] a visitor is refused on both routes with 401', async ({ request }) => {
      expect((await request.post('/api/track-time', { data: { seconds: 60 } })).status()).toBe(401);
      expect((await request.post('/api/xp/sync')).status()).toBe(401);
    });

    test('[AIA-TRK-002] only a whole number of seconds from 1 to 60 is accepted', async () => {
      for (const seconds of [0, -1, 61, 1.5, '60', null, undefined, 1e9]) {
        const res = await s.request.post('/api/track-time', { data: { seconds } });
        expect(res.status(), String(seconds)).toBe(400);
        expect((await res.json()).error).toBe('Invalid seconds');
      }
    });

    test('[AIA-TRK-003] a valid ping adds the seconds to the learner\'s total and returns the new total', async () => {
      test.skip(!original, 'mavish has no stats row (created by the first dashboard visit)');
      const res = await s.request.post('/api/track-time', { data: { seconds: 60 } });
      expect(res.status()).toBe(200);
      const { newTotal } = await res.json();
      expect(newTotal).toBe((original.total_time_seconds || 0) + 60);
      expect((await stats()).total_time_seconds).toBe(newTotal);
    });

    test('[AIA-TRK-004] (SCP-73) the total cannot be pushed up faster than real time (a limit of one ping a minute)', async () => {
      test.skip(!original, 'mavish has no stats row');
      const results = await Promise.all(Array.from({ length: 10 }, () => s.request.post('/api/track-time', { data: { seconds: 60 } })));
      const accepted = (await Promise.all(results.map(r => r.json()))).filter(b => b.success).length;
      expect(accepted, 'ten pings at once must not add ten minutes').toBeLessThan(10);
    });

    test('[AIA-XP-002] xp/sync sets the points to 10 per video and 50 per assignment, and calling it again changes nothing', async () => {
      test.skip(!original, 'mavish has no stats row');
      await adminDb().from('video_progress').insert(['qa-x1', 'qa-x2'].map(video_id => ({ user_id: uid, course_slug: fixtureProgress, video_id })));
      await adminDb().from('assignment_progress').insert([{ user_id: uid, course_slug: fixtureProgress, video_id: 'qa-x1', submitted_code: '# QA', user_name: 'QA', completed_at: new Date().toISOString() }]);
      try {
        const before = await adminDb().from('video_progress').select('id', { count: 'exact', head: true }).eq('user_id', uid);
        const after = await adminDb().from('assignment_progress').select('id', { count: 'exact', head: true }).eq('user_id', uid);
        const expected = (before.count ?? 0) * 10 + (after.count ?? 0) * 50;
        const a = await (await s.request.post('/api/xp/sync')).json();
        const b = await (await s.request.post('/api/xp/sync')).json();
        expect(a).toEqual({ success: true, points: expected });
        expect(b).toEqual(a);
        expect((await stats()).total_points).toBe(expected);
      } finally {
        await adminDb().from('video_progress').delete().eq('user_id', uid).eq('course_slug', fixtureProgress);
        await adminDb().from('assignment_progress').delete().eq('user_id', uid).eq('course_slug', fixtureProgress);
      }
    });

    test('[AIA-XP-003] xp/sync takes no input: the points cannot be set by the caller', async () => {
      test.skip(!original, 'mavish has no stats row');
      const res = await s.request.post('/api/xp/sync', { data: { points: 999999, userId: 'user_someone_else' } });
      expect(res.status()).toBe(200);
      expect((await res.json()).points).toBeLessThan(999999);
    });
  });
});
