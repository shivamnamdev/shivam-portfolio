import { test, expect } from '@playwright/test';
import { QA_FIXTURE_SLUG } from '../../data/courses';
import { EMAIL } from '../support/personas';
import { clerkUserId } from '../support/clerk';
import { adminDb, grantTestEnrolment, revokeTestEnrolment } from '../support/db';
import { requireFixture, requireSeed } from '../support/guards';
import { API_UA, sessionFor, type Session } from '../support/api';

// SCP-74 to SCP-76 · the learner routes under /api/learning/*. They replace the browser's direct access to the
// progress, comment, like, stats and activity tables (which are locked for anon in the database step).
// Learner = edu (enrolled for the test, shared account: tests/README.md); a non-enrolled learner = mavish.
const SLUG = QA_FIXTURE_SLUG;
const VIDEO = 'qa-lrn-video';
const U = EMAIL.edu;
const uid = () => clerkUserId(U);

async function cleanup() {
  const db = adminDb(); const id = await uid();
  await db.from('video_progress').delete().eq('user_id', id).eq('video_id', VIDEO);
  await db.from('assignment_progress').delete().eq('user_id', id).eq('video_id', VIDEO);
  await db.from('exam_progress').delete().eq('user_id', id).eq('course_slug', SLUG);
  await db.from('video_comments').delete().eq('user_id', id).eq('video_id', VIDEO);
  await db.from('video_likes').delete().eq('user_id', id).eq('video_id', VIDEO);
  await db.from('admin_activity_log').delete().eq('user_email', U).like('message', '%QA lrn lab%');
}

test.describe('LRN learner routes @regression', () => {
  test.describe.configure({ mode: 'default' });
  test.beforeEach(() => { requireFixture(); requireSeed(); });
  let learner: Session, outsider: Session;
  test.beforeAll(async ({ browser }) => {
    await revokeTestEnrolment(U, SLUG).catch(() => {});
    await grantTestEnrolment(U, SLUG);
    learner = await sessionFor(browser, U); outsider = await sessionFor(browser, EMAIL.mavish);
  });
  test.afterAll(async () => { await cleanup(); await revokeTestEnrolment(U, SLUG).catch(() => {}); await learner?.close(); await outsider?.close(); });
  test.afterEach(cleanup);
  const post = (path: string, data: object, s: Session = learner) => s.request.post(path, { data });

  test('[LRNA-AUTH-001] every route refuses a visitor with 401', async ({ request }) => {
    const h = { 'User-Agent': API_UA };
    for (const [m, p] of [['GET', `/api/learning/progress?courseSlug=${SLUG}`], ['GET', `/api/learning/social?videoId=${VIDEO}`], ['GET', '/api/learning/leaderboard'],
      ['POST', '/api/learning/complete-video'], ['POST', '/api/learning/submit-assignment'], ['POST', '/api/learning/exam-result'],
      ['POST', '/api/learning/comment'], ['POST', '/api/learning/like'], ['POST', '/api/learning/stats']]) {
      const res = m === 'GET' ? await request.get(p, { headers: h }) : await request.post(p, { data: {}, headers: h });
      expect(res.status(), `${m} ${p}`).toBe(401);
    }
  });

  test('[LRNA-ACC-001] a learner who is not enrolled cannot read or write course progress (403)', async () => {
    expect((await outsider.request.get(`/api/learning/progress?courseSlug=${SLUG}`)).status()).toBe(403);
    for (const [p, body] of [['/api/learning/complete-video', { courseSlug: SLUG, videoId: VIDEO }],
      ['/api/learning/submit-assignment', { courseSlug: SLUG, videoId: VIDEO, submittedCode: 'print(1)' }],
      ['/api/learning/exam-result', { courseSlug: SLUG, score: 90 }]] as const) {
      expect((await post(p, body, outsider)).status(), p).toBe(403);
    }
    const { data } = await adminDb().from('video_progress').select('id').eq('user_id', await clerkUserId(EMAIL.mavish)).eq('course_slug', SLUG);
    expect(data ?? []).toHaveLength(0);
  });

  test('[LRNA-VAL-001] bad input is refused with 400 and nothing is stored', async () => {
    expect((await learner.request.get('/api/learning/progress?courseSlug=Bad Slug!')).status()).toBe(400);
    expect((await post('/api/learning/complete-video', { courseSlug: SLUG })).status()).toBe(400);
    expect((await post('/api/learning/submit-assignment', { courseSlug: SLUG, videoId: VIDEO, submittedCode: '' })).status()).toBe(400);
    expect((await post('/api/learning/submit-assignment', { courseSlug: SLUG, videoId: VIDEO, submittedCode: 'x'.repeat(200_001) })).status()).toBe(400);
    for (const score of [-1, 101, 55.5, '90']) expect((await post('/api/learning/exam-result', { courseSlug: SLUG, score })).status(), String(score)).toBe(400);
    expect((await post('/api/learning/comment', { videoId: VIDEO, content: '   ' })).status()).toBe(400);
    expect((await post('/api/learning/comment', { videoId: VIDEO, content: 'x'.repeat(1001) })).status()).toBe(400);
    expect((await post('/api/learning/like', { videoId: '../x' })).status()).toBe(400);
    const { data } = await adminDb().from('video_comments').select('id').eq('user_id', await uid()).eq('video_id', VIDEO);
    expect(data ?? []).toHaveLength(0);
  });

  test('[LRNA-VID-001] marking a lesson complete is stored once and is idempotent', async () => {
    for (let i = 0; i < 2; i++) expect((await post('/api/learning/complete-video', { courseSlug: SLUG, videoId: VIDEO })).status()).toBe(200);
    const { data } = await adminDb().from('video_progress').select('id').eq('user_id', await uid()).eq('video_id', VIDEO);
    expect(data).toHaveLength(1);
    const progress = await (await learner.request.get(`/api/learning/progress?courseSlug=${SLUG}`)).json();
    expect(progress.completedVideoIds).toContain(VIDEO);
  });

  test('[LRNA-ASG-001] a submission is saved with the Clerk name, logged once, and an update does not log again', async () => {
    const body = { courseSlug: SLUG, videoId: VIDEO, submittedCode: 'print("v1")', title: 'QA lrn lab' };
    const first = await (await post('/api/learning/submit-assignment', body)).json();
    expect(first.firstSubmission).toBe(true);
    const second = await (await post('/api/learning/submit-assignment', { ...body, submittedCode: 'print("v2")' })).json();
    expect(second.firstSubmission).toBe(false);
    const db = adminDb();
    const { data } = await db.from('assignment_progress').select('submitted_code, user_name').eq('user_id', await uid()).eq('video_id', VIDEO);
    expect(data).toHaveLength(1);
    expect(data![0].submitted_code).toBe('print("v2")');
    expect(data![0].user_name).toBeTruthy();
    const { data: logs } = await db.from('admin_activity_log').select('id').eq('user_email', U).like('message', '%QA lrn lab%');
    expect(logs).toHaveLength(1);
    const progress = await (await learner.request.get(`/api/learning/progress?courseSlug=${SLUG}`)).json();
    expect(progress.assignments[VIDEO]).toBe('print("v2")');
  });

  test('[LRNA-EXM-001] exam attempts are counted on the server, a pass sticks, and the sixth failed attempt is refused', async () => {
    for (let n = 1; n <= 5; n++) {
      const res = await (await post('/api/learning/exam-result', { courseSlug: SLUG, score: 40 })).json();
      expect(res.attempts_used).toBe(n);
      expect(res.is_passed).toBe(false);
    }
    expect((await post('/api/learning/exam-result', { courseSlug: SLUG, score: 95 })).status()).toBe(403);
    await adminDb().from('exam_progress').delete().eq('user_id', await uid()).eq('course_slug', SLUG);
    const pass = await (await post('/api/learning/exam-result', { courseSlug: SLUG, score: 80 })).json();
    expect(pass).toMatchObject({ is_passed: true, attempts_used: 1 });
    const later = await (await post('/api/learning/exam-result', { courseSlug: SLUG, score: 10 })).json();
    expect(later.is_passed).toBe(true);
  });

  test('[LRNA-SOC-001] a comment appears for the learner with their Clerk name and is listed back', async () => {
    const posted = await (await post('/api/learning/comment', { videoId: VIDEO, content: '  First question  ' })).json();
    expect(posted.comment).toMatchObject({ video_id: VIDEO, content: 'First question', user_id: await uid() });
    expect(posted.comment.user_name).toBeTruthy();
    const social = await (await learner.request.get(`/api/learning/social?videoId=${VIDEO}`)).json();
    expect(social.comments.map((c: any) => c.content)).toContain('First question');
  });

  test('[LRNA-SOC-002] a like toggles on and off and is counted', async () => {
    // The QA project has no video_likes table (production has): docs/testing/sql/qa-schema-gap.sql creates it.
    const probe = await adminDb().from('video_likes').select('id').limit(1);
    test.skip(!!probe.error, 'video_likes does not exist on this Supabase project; run docs/testing/sql/qa-schema-gap.sql');
    const on = await (await post('/api/learning/like', { videoId: VIDEO })).json();
    expect(on).toMatchObject({ liked: true, likesCount: 1 });
    const social = await (await learner.request.get(`/api/learning/social?videoId=${VIDEO}`)).json();
    expect(social).toMatchObject({ likesCount: 1, hasLiked: true });
    const off = await (await post('/api/learning/like', { videoId: VIDEO })).json();
    expect(off).toMatchObject({ liked: false, likesCount: 0 });
  });

  test('[LRNA-STA-001] stats returns the streak and points; the leaderboard has no e-mail addresses', async () => {
    const stats = await (await post('/api/learning/stats', {})).json();
    expect(stats.success).toBe(true);
    expect(stats.streak).toBeGreaterThanOrEqual(1);
    expect(typeof stats.points).toBe('number');
    const board = await (await learner.request.get('/api/learning/leaderboard')).json();
    expect(board.success).toBe(true);
    expect(board.leaders.length).toBeLessThanOrEqual(5);
    for (const l of board.leaders) { expect(Object.keys(l).sort()).toEqual(['total_points', 'user_name']); }
    expect(JSON.stringify(board)).not.toMatch(/@/);
  });
});
