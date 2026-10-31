import { test, expect, type Page } from '@playwright/test';
import crypto from 'crypto';
import { QA_FIXTURE_SLUG, activeCourses } from '../../../data/courses';
import { EMAIL, COURSE } from '../../support/personas';
import { requireFixture, requireSeed } from '../../support/guards';
import { adminDb, grantTestEnrolment, revokeTestEnrolment } from '../../support/db';
import { clerkUserId, signInAs } from '../../support/clerk';
import { expectDeniedForVisitor, expectOnPath, signOutThroughUi } from '../../support/assertions';
import { applyCode, openFixture, trackDialogs, ui } from '../../support/checkout';
import { cards, denied, emptyState, failRoute, openDashboard } from '../../support/dashboard';

// PRD 06 leftovers: streak / XP / leaderboard (user_stats), course-list edge cases, live lobby link, session expiry and
// the new-learner journeys. They change the edu account's stats and enrolments, and bazar's enrolments, so every change is
// undone afterwards. edu is shared with the other edu specs: run those files in one worker (tests/README.md).
const U1 = EMAIL.edu;
const FIXTURE = QA_FIXTURE_SLUG;
const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().split('T')[0]; };
const haveTestKeys = () => !!process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') && !!process.env.RAZORPAY_KEY_SECRET;

const streakValue = (page: Page) => page.getByText('Log in daily to keep the fire alive!').locator('xpath=../..').locator('span.text-3xl');
const statsRow = async (email: string) => {
  const { data, error } = await adminDb().from('user_stats').select('*').eq('user_id', await clerkUserId(email));
  if (error) throw error;
  return data![0] ?? null;
};
const setStats = async (email: string, fields: object | null) => {
  const uid = await clerkUserId(email);
  await adminDb().from('user_stats').delete().eq('user_id', uid);
  if (fields) {
    const { error } = await adminDb().from('user_stats').insert([{ user_id: uid, user_name: 'QA persona', user_email: email, total_points: 0, ...fields }]);
    if (error) throw error;
  }
};

const sign = (orderId: string, paymentId: string) =>
  crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest('hex');
async function buyFixtureViaApi(page: Page) {
  const { order } = await (await page.request.post('/api/create-order', { data: { courseId: FIXTURE, currency: 'INR' } })).json();
  const payment = 'pay_QA' + order.id.slice(-8);
  const res = await page.request.post('/api/verify-payment', { data: { razorpay_order_id: order.id, razorpay_payment_id: payment, razorpay_signature: sign(order.id, payment) } });
  expect(res.status()).toBe(200);
}
const deleteLogs = async (email: string, like: string) => { await adminDb().from('admin_activity_log').delete().eq('user_email', email).like('message', `%${like}%`); };

test.describe('PRD06 stats, lobby link, expiry and learner journeys', () => {
  test.describe.configure({ mode: 'default' });
  test.describe('@regression', () => {
    test.beforeEach(() => requireSeed());

    test.describe('streak, XP and leaderboard (edu stats row)', () => {
      let original: any = null;
      test.beforeEach(async () => { original = await statsRow(U1); });
      test.afterEach(async () => {
        await setStats(U1, null);
        if (original) await adminDb().from('user_stats').insert([original]);
        await adminDb().from('user_stats').delete().like('user_id', 'qa_lb_%');
        const uid = await clerkUserId(U1);
        await adminDb().from('video_progress').delete().eq('user_id', uid).eq('course_slug', FIXTURE);
        await adminDb().from('assignment_progress').delete().eq('user_id', uid).eq('course_slug', FIXTURE);
      });

      test('[DSH-STAT-001] the first visit creates the stats row with streak 1 and 0 XP', async ({ page }) => {
        await setStats(U1, null);
        await openDashboard(page, U1);
        await expect(streakValue(page)).toHaveText('1');
        await expect.poll(async () => (await statsRow(U1))?.current_streak).toBe(1);
        expect((await statsRow(U1)).total_points).toBe(0);
      });

      test('[DSH-STAT-002][DSH-STAT-004] a visit the next day adds one to the streak and a second visit the same day changes nothing', async ({ page }) => {
        await setStats(U1, { current_streak: 3, last_active_date: day(-1) });
        await openDashboard(page, U1);
        await expect(streakValue(page)).toHaveText('4');
        await expect.poll(async () => (await statsRow(U1)).last_active_date).toBe(day(0));
        await page.reload();
        await expect(streakValue(page)).toHaveText('4');
        expect((await statsRow(U1)).current_streak).toBe(4);
      });

      test('[DSH-STAT-003] a gap of several days resets the streak to 1', async ({ page }) => {
        await setStats(U1, { current_streak: 5, last_active_date: day(-3) });
        await openDashboard(page, U1);
        await expect(streakValue(page)).toHaveText('1');
        await expect.poll(async () => (await statsRow(U1)).current_streak).toBe(1);
      });

      test('[DSH-STAT-005] Total XP equals the server value: 10 per video and 50 per assignment', async ({ page }) => {
        await setStats(U1, { current_streak: 1, last_active_date: day(0) });
        const uid = await clerkUserId(U1);
        await adminDb().from('video_progress').insert(['qa-v1', 'qa-v2', 'qa-v3'].map(video_id => ({ user_id: uid, course_slug: FIXTURE, video_id })));
        await adminDb().from('assignment_progress').insert([{ user_id: uid, course_slug: FIXTURE, video_id: 'qa-v1', submitted_code: '# QA', user_name: 'QA persona', completed_at: new Date().toISOString() }]);
        await page.setViewportSize({ width: 1280, height: 800 });
        await openDashboard(page, U1);
        await expect(page.getByText('Total XP', { exact: true }).locator('xpath=..').locator('p').nth(1)).toHaveText('80');
        await expect.poll(async () => (await statsRow(U1)).total_points).toBe(80);
      });

      test('[DSH-STAT-009] the leaderboard shows at most five learners, highest XP first, with medals for the top three', async ({ page }) => {
        await setStats(U1, { current_streak: 1, last_active_date: day(0) });
        const rows = [1, 2, 3, 4, 5, 6, 7].map(n => ({
          user_id: `qa_lb_${n}`, user_name: `QA Leader ${n}`, user_email: `qa-lb-${n}@example.test`,
          current_streak: 1, total_points: 900000 + n * 100, last_active_date: day(0),
        }));
        const { error } = await adminDb().from('user_stats').insert(rows);
        if (error) throw error;
        await openDashboard(page, U1);
        const board = page.getByRole('heading', { name: 'Global Leaderboard' }).locator('xpath=..');
        await expect(board.getByText(/QA Leader \d/)).toHaveCount(5);
        await expect(board.getByText(/QA Leader \d/)).toHaveText(['QA Leader 7', 'QA Leader 6', 'QA Leader 5', 'QA Leader 4', 'QA Leader 3']);
        for (const medal of ['🥇', '🥈', '🥉']) await expect(board.getByText(medal)).toBeVisible();
        await expect(board.getByText('#4')).toBeVisible();
        await expect(board.getByText('#5')).toBeVisible();
        await expect(board.getByText('QA Leader 1')).toHaveCount(0);
      });
    });

    test.describe('course list edge cases and changes', () => {
      test.afterEach(async () => {
        for (const slug of [FIXTURE, 'qa-no-such-course']) await revokeTestEnrolment(U1, slug).catch(() => {});
        await revokeTestEnrolment(EMAIL.bazar, FIXTURE).catch(() => {});
        await deleteLogs(U1, 'New Free Enrollment'); await deleteLogs(U1, 'New Paid Enrollment'); await deleteLogs(EMAIL.bazar, 'New Paid Enrollment');
      });

      test('[DSH-CARD-008] an enrolment row for a course that does not exist is ignored', async ({ page }) => {
        await grantTestEnrolment(U1, 'qa-no-such-course');
        await openDashboard(page, U1);
        await expect(emptyState(page)).toBeVisible();
        await expect(cards(page)).toHaveCount(0);
      });

      test('[DSH-CARD-009] the admin sees only the courses they are enrolled in', async ({ page }) => {
        const { data } = await adminDb().from('user_enrollments').select('course_slug').eq('user_id', await clerkUserId(EMAIL.admin));
        const mine = new Set((data ?? []).map(r => r.course_slug));
        const expected = activeCourses.filter(c => mine.has(c.slug)).length;
        await openDashboard(page, EMAIL.admin);
        if (expected === 0) await expect(emptyState(page)).toBeVisible();
        else await expect(cards(page)).toHaveCount(expected);
        expect(expected).toBeLessThan(activeCourses.length);
      });

      test('[DSH-CHG-005][DSH-E2E-001] a new learner enrols for free and the course appears on the dashboard', async ({ page }) => {
        requireFixture();
        trackDialogs(page);
        await openDashboard(page, U1);
        await expect(emptyState(page)).toBeVisible();
        await page.getByRole('button', { name: 'Browse Catalog' }).click();
        await expectOnPath(page, '/courses');
        await page.goto(`/courses/${FIXTURE}`);
        await page.waitForLoadState('networkidle');
        await applyCode(page, 'QA100');
        await ui.enrollFree(page).click();
        await expect(ui.successModal(page)).toBeVisible();
        await page.getByRole('button', { name: /Go to Dashboard/ }).click();
        await expectOnPath(page, '/learning');
        await expect(cards(page)).toHaveCount(1);
        await expect(page.getByRole('heading', { name: 'QA Checkout Sandbox' })).toBeVisible();
        await page.getByRole('button', { name: 'View Recordings' }).first().click();
        await expectOnPath(page, `/learning/${FIXTURE}`);
        const { data } = await adminDb().from('user_enrollments').select('id').eq('user_id', await clerkUserId(U1)).eq('course_slug', FIXTURE);
        expect(data).toHaveLength(1);
      });

      test('[DSH-CHG-006] after a paid purchase the course appears on the dashboard', async ({ page }) => {
        requireFixture();
        test.skip(!haveTestKeys(), 'needs rzp_test_ keys and RAZORPAY_KEY_SECRET in the environment');
        await openFixture(page, U1);
        await buyFixtureViaApi(page);
        await page.reload();
        await page.waitForLoadState('networkidle');
        await ui.enrolled(page).click();
        await expectOnPath(page, '/learning');
        await expect(page.getByRole('heading', { name: 'QA Checkout Sandbox' })).toBeVisible({ timeout: 25000 });
      });

      test('[DSH-E2E-003] a learner who buys a second course sees both cards with the right buttons', async ({ page }) => {
        requireFixture();
        test.skip(!haveTestKeys(), 'needs rzp_test_ keys and RAZORPAY_KEY_SECRET in the environment');
        await openFixture(page, EMAIL.bazar);
        await buyFixtureViaApi(page);
        await page.goto('/learning');
        await expect(cards(page)).toHaveCount(2, { timeout: 25000 });
        await expect(page.getByRole('heading', { name: 'QA Checkout Sandbox' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Git Beginner Live Session' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'View Recordings' })).toHaveCount(2);
      });
    });

    test.describe('lobby link', () => {
      test.afterEach(async () => { await revokeTestEnrolment(U1, FIXTURE).catch(() => {}); });

      test('[DSH-LOB-006][DSH-LOB-007] an enrolled learner sees Enter Google Meet, which opens the link in a new tab and leaves the dashboard tab alone', async ({ page, context }) => {
        requireFixture();
        await grantTestEnrolment(U1, FIXTURE);
        await signInAs(page, U1);
        await page.goto(`/live/${FIXTURE}`);
        const link = page.getByRole('link', { name: /Enter Google Meet/ });
        await expect(link).toBeVisible({ timeout: 25000 });
        await expect(link).toHaveAttribute('href', 'https://meet.google.com/qa-checkout-sandbox');
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', /noreferrer/);
        await context.route('https://meet.google.com/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>meet</title>' }));
        const [popup] = await Promise.all([context.waitForEvent('page'), link.click()]);
        await expect.poll(() => popup.url()).toContain('meet.google.com/qa-checkout-sandbox');
        expect(new URL(page.url()).pathname).toBe(`/live/${FIXTURE}`);
      });
    });

    test.describe('session and failure behaviour', () => {
      test('[DSH-STATE-010] after signing out, /learning behaves like a visitor and shows no courses', async ({ page }) => {
        await openDashboard(page, EMAIL.mavish);
        await signOutThroughUi(page);
        await expectDeniedForVisitor(page, '/learning');
        await expect(page.getByText(/Join Live Class/)).toHaveCount(0);
      });

      test('[DSH-ERR-002] after a failed load, restoring the network and reloading brings the course card back', async ({ page }) => {
        await signInAs(page, EMAIL.mavish);
        await failRoute(page, '**/rest/v1/user_enrollments*');
        await page.goto('/learning');
        await expect(cards(page)).toHaveCount(0, { timeout: 25000 });
        await page.unroute('**/rest/v1/user_enrollments*');
        await page.reload();
        await expect(cards(page)).toHaveCount(1, { timeout: 25000 });
      });

      test('[DSH-ERR-005] when the session ends while the page is open, the next protected action asks for sign-in and shows no lobby', async ({ page, context }) => {
        await openDashboard(page, EMAIL.bazar);
        await context.clearCookies();
        await cards(page).first().click();
        await expect.poll(async () => {
          const path = new URL(page.url()).pathname;
          const onLobby = await page.getByText('Secure Lobby').count();
          return path.startsWith('/live') && onLobby > 0 ? 'lobby' : 'ok';
        }, { timeout: 25000 }).toBe('ok');
        await expect(page.getByText('Secure Lobby')).toHaveCount(0);
      });
    });

    test('[DSH-E2E-006] a visitor who opens /learning, signs in and returns lands on the dashboard with the right list', async ({ page }) => {
      await expectDeniedForVisitor(page, '/learning');
      await openDashboard(page, EMAIL.mavish);
      await expect(page.getByRole('heading', { name: 'Python Live Session (Batch 2)' })).toBeVisible();
      await expect(denied(page)).toHaveCount(0);
    });

    // Every course in data/courses.ts has a syllabusPdf, so this cannot be set up without changing course data.
    test.fixme('[DSH-RES-004] a course without a syllabus adds no row', async () => {});

    test('[DSH-MOB-007][DSH-MOB-008] smoke: the empty-state-free dashboard, cards and lobby entry work in this browser (run with --project=firefox / webkit)', async ({ page }) => {
      await openDashboard(page, EMAIL.mavish);
      await expect(cards(page)).toHaveCount(1);
      await expect(page.getByRole('button', { name: 'View Recordings' })).toHaveCount(1);
      await cards(page).first().click();
      await expectOnPath(page, `/live/${COURSE.A}`);
      await expect(page.getByText('Secure Lobby')).toBeVisible({ timeout: 25000 });
    });
  });
});
