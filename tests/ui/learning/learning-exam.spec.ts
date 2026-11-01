import { test, expect } from '@playwright/test';
import { EMAIL, COURSE } from '../../support/personas';
import { requireSeed } from '../../support/guards';
import { adminDb, grantTestEnrolment, revokeTestEnrolment } from '../../support/db';
import { clerkUserId } from '../../support/clerk';
import { courseCurriculumMap } from '../../../data/learning-content';
import { clearProgress, labReady, lessonButton, lessonIds, openCourse, progressRows, sidebar, tab } from '../../support/learning';

// PRD 07 exam, locked advanced lessons, certificate and likes. The exam exists only in Course C (python-beginners), which
// no persona owns, so U = edu gets a temporary grant (removed after every test) and its exam/progress rows are cleared.
// The exam state is prepared through the service role; passing the real auto-grader needs the full solution, so a pass is seeded.
// NOTE: edu is also used by the dashboard and checkout specs: run those files in one worker (see tests/README.md).
const U = EMAIL.edu;
const SLUG = COURSE.C;
const EXAM_ID = 'WhP2F-xk3Kk';
const ADVANCED_ID = 'Q8vLb-kmFYs';

async function setExam(attempts: number, passed: boolean) {
  const { error } = await adminDb().from('exam_progress').upsert(
    { user_id: await clerkUserId(U), course_slug: SLUG, attempts_used: attempts, is_passed: passed, last_score: passed ? 90 : 40 },
    { onConflict: 'user_id, course_slug' });
  if (error) throw error;
}
async function completeEverything() {
  const uid = await clerkUserId(U);
  const ids = lessonIds(SLUG);
  const assignments = (courseCurriculumMap[SLUG] as any[]).flatMap(m => Object.keys(m.githubAssignments ?? {}));
  const v = await adminDb().from('video_progress').insert(ids.map(video_id => ({ user_id: uid, course_slug: SLUG, video_id })));
  if (v.error) throw v.error;
  const a = await adminDb().from('assignment_progress').insert(assignments.map(video_id => ({
    user_id: uid, course_slug: SLUG, video_id, submitted_code: '# QA', user_name: 'QA persona', completed_at: new Date().toISOString() })));
  if (a.error) throw a.error;
}

test.describe('PRD07 exam, advanced lessons and certificate', () => {
  test.describe.configure({ mode: 'default' });
  test.describe('@regression', () => {
    test.beforeEach(async () => { requireSeed(); await grantTestEnrolment(U, SLUG); await clearProgress(U, SLUG); });
    test.afterEach(async () => { await clearProgress(U, SLUG).catch(() => {}); await revokeTestEnrolment(U, SLUG).catch(() => {}); });

    test('[LRN-EXM-006][LRN-EXM-007] advanced lessons are locked until the exam is passed: sidebar marker and locked message', async ({ page }) => {
      await openCourse(page, U, SLUG);
      await expect(sidebar(page).getByText('🔒 Locked (Pass Exam Required)').first()).toBeVisible();
      await lessonButton(page, ADVANCED_ID).click();
      await expect(page.getByText('Advanced Content Locked')).toBeVisible();
      await expect(page.getByText('Pass the Final Exam with 80% to unlock this lesson.')).toBeVisible();
      await expect(page.getByRole('heading', { name: `QA Lesson ${ADVANCED_ID}` })).toHaveCount(0);
    });

    test('[LRN-EXM-003] a passed exam unlocks the advanced lessons', async ({ page }) => {
      await setExam(2, true);
      await openCourse(page, U, SLUG);
      await expect(sidebar(page).getByText('🔒 Locked (Pass Exam Required)')).toHaveCount(0);
      await lessonButton(page, ADVANCED_ID).click();
      await expect(page.getByRole('heading', { name: `QA Lesson ${ADVANCED_ID}` })).toBeVisible();
    });

    test('[LRN-EXM-008] admin opens a locked advanced lesson without passing', async ({ page }) => {
      await openCourse(page, EMAIL.admin, SLUG);
      await lessonButton(page, ADVANCED_ID).click();
      await expect(page.getByRole('heading', { name: `QA Lesson ${ADVANCED_ID}` })).toBeVisible();
    });

    test.describe('exam lab', () => {
      test.setTimeout(150000);
      const toExam = async (page: any) => {
        await openCourse(page, U, SLUG);
        await lessonButton(page, EXAM_ID).click();
        await tab(page, /Practice/).click();
        await labReady(page);
      };

      test('[LRN-TAB-004][LRN-EXM-001] the exam lesson has no Visualize tab and shows the attempts counter', async ({ page }) => {
        await toExam(page);
        await expect(tab(page, /Visualize/)).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Submit Exam (0/5)' })).toBeVisible();
      });

      test('[LRN-EXM-002][LRN-EXM-012] a failed attempt uses one attempt, shows the score message and saves one row', async ({ page }) => {
        await toExam(page);
        await page.getByRole('button', { name: 'Submit Exam (0/5)' }).click();
        await expect(page.getByText(/Exam Failed/)).toBeVisible({ timeout: 60000 });
        await expect(page.getByText(/Attempts left: 4/)).toBeVisible();
        await expect(page.getByRole('button', { name: 'Submit Exam (1/5)' })).toBeVisible();
        const rows = await progressRows(U, SLUG, 'exam_progress');
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ attempts_used: 1, is_passed: false });
      });

      test('[LRN-EXM-004] a failed exam keeps the advanced lessons locked', async ({ page }) => {
        await toExam(page);
        await page.getByRole('button', { name: 'Submit Exam (0/5)' }).click();
        await expect(page.getByText(/Exam Failed/)).toBeVisible({ timeout: 60000 });
        await expect(sidebar(page).getByText('🔒 Locked (Pass Exam Required)').first()).toBeVisible();
      });

      test('[LRN-EXM-005] with five attempts used the exam is refused with a message', async ({ page }) => {
        await setExam(5, false);
        await toExam(page);
        await page.getByRole('button', { name: 'Submit Exam (5/5)' }).click();
        await expect(page.getByText('Maximum Attempts Reached')).toBeVisible();
        expect((await progressRows(U, SLUG, 'exam_progress'))[0].attempts_used).toBe(5);
      });
    });

    test('[LRN-EXM-010] the certificate is not offered before the course is complete', async ({ page }) => {
      await openCourse(page, U, SLUG);
      await expect(page.getByRole('button', { name: /Certificate/ })).toHaveCount(0);
    });

    test('[LRN-EXM-009][LRN-E2E-005] a completed course offers the certificate and downloads a PDF named after the learner', async ({ page }) => {
      await setExam(1, true);
      await completeEverything();
      await openCourse(page, U, SLUG);
      await expect(page.getByText(/^(\d+)\/\1 Completed/)).toBeVisible();
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 30000 }),
        page.getByRole('button', { name: /Certificate/ }).click(),
      ]);
      expect(download.suggestedFilename()).toMatch(/_Certificate\.pdf$/);
    });

    test('[LRN-EXM-011] a certificate generation failure shows the alert', async ({ page }) => {
      await setExam(1, true);
      await completeEverything();
      await openCourse(page, U, SLUG);
      const alerts: string[] = [];
      page.on('dialog', d => { alerts.push(d.message()); d.accept().catch(() => {}); });
      await page.route(/jspdf/i, route => route.abort('failed'));
      await page.getByRole('button', { name: /Certificate/ }).click();
      await expect.poll(() => alerts.join('|')).toContain('Something went wrong while generating your certificate.');
    });

    test('[LRN-TAB-011] a learner can like a lesson and remove the like', async ({ page }) => {
      const probe = await adminDb().from('video_likes').select('id').limit(1);
      test.skip(!!probe.error, 'video_likes does not exist on this Supabase project: run docs/testing/sql/qa-schema-gap.sql');
      const uid = await clerkUserId(U);
      await adminDb().from('video_likes').delete().eq('user_id', uid);
      try {
        await openCourse(page, U, SLUG);
        const like = page.getByRole('button', { name: /\d+ Likes?$/ });
        await expect(like).toHaveText(/^\s*0 Likes$/);
        await like.click();
        await expect(like).toHaveText(/^\s*1 Like$/);
        await expect(like).toHaveAttribute('aria-pressed', 'true');
        // the count moves at once; the row is written by the server call that follows
        await expect.poll(async () => ((await adminDb().from('video_likes').select('id').eq('user_id', uid)).data ?? []).length, { timeout: 15000 }).toBe(1);
        await page.reload();
        await expect(page.getByRole('button', { name: /\d+ Likes?$/ })).toHaveText(/^\s*1 Like$/, { timeout: 30000 });
        await page.getByRole('button', { name: /\d+ Likes?$/ }).click();
        await expect(page.getByRole('button', { name: /\d+ Likes?$/ })).toHaveText(/^\s*0 Likes$/);
        await expect.poll(async () => ((await adminDb().from('video_likes').select('id').eq('user_id', uid)).data ?? []).length, { timeout: 15000 }).toBe(0);
      } finally {
        await adminDb().from('video_likes').delete().eq('user_id', uid);
      }
    });

    test('[LRN-E2E-006] an advanced lesson is locked, passing the exam opens it', async ({ page }) => {
      await openCourse(page, U, SLUG);
      await lessonButton(page, ADVANCED_ID).click();
      await expect(page.getByText('Advanced Content Locked')).toBeVisible();
      await setExam(1, true);   // a pass is seeded: the real auto-grader needs the full solution
      await page.reload();
      await expect(page.getByText('Course Content')).toBeVisible({ timeout: 40000 });
      await lessonButton(page, ADVANCED_ID).click();
      await expect(page.getByText('Advanced Content Locked')).toHaveCount(0);
    });
  });
});
