import { test, expect } from '@playwright/test';
import { EMAIL, COURSE } from '../../support/personas';
import { requireSeed } from '../../support/guards';
import { signInAs } from '../../support/clerk';
import { expectDeniedForVisitor, expectOnPath } from '../../support/assertions';
import { trackPageErrors } from '../../support/checkout';
import { DASH_TITLE, cards, denied, emptyState, failRoute, lobby, noHorizontalScroll, openDashboard, slowRoute } from '../../support/dashboard';

// PRD 06 cases that only READ: S1 = bazar (Course B), S2 = mavish (Course A), A1 = admin, V1 = visitor.
// Enrolment state comes from the seeded personas; nothing here writes enrolments.
const S1 = EMAIL.bazar;
const S2 = EMAIL.mavish;

test.describe('PRD06 student dashboard: enrolled learners @regression', () => {
  test.beforeEach(() => requireSeed());

  test('[DSH-CARD-001][DSH-CARD-003][DSH-CHG-009] Course A learner sees only Course A, with full card content, and a refresh keeps the list', async ({ page }) => {
    await openDashboard(page, S2);
    await expect(page.getByRole('heading', { name: DASH_TITLE.A })).toBeVisible();
    await expect(page.getByRole('heading', { name: DASH_TITLE.B })).toHaveCount(0);
    await expect(cards(page)).toHaveCount(1);
    await expect(page.getByText('Enrolled', { exact: true })).toBeVisible();
    await expect(page.getByText('Active Access')).toBeVisible();
    await expect(page.getByText('Your learning materials and lab access are fully unlocked.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'View Recordings' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: DASH_TITLE.A })).toBeVisible();
    await expect(cards(page)).toHaveCount(1);
  });

  test('[DSH-CARD-002][DSH-CARD-006][DSH-CARD-007] Course B learner (closed cohort) sees only Course B', async ({ page }) => {
    await openDashboard(page, S1);
    await expect(page.getByRole('heading', { name: DASH_TITLE.B })).toBeVisible();
    await expect(page.getByRole('heading', { name: DASH_TITLE.A })).toHaveCount(0);
    await expect(cards(page)).toHaveCount(1);
  });

  test('[DSH-CARD-004][DSH-CARD-011] Join Live Class opens the lobby of that course and Back returns to the same dashboard', async ({ page }) => {
    await openDashboard(page, S2);
    await cards(page).click();
    await expectOnPath(page, `/live/${COURSE.A}`);
    await expect(lobby(page)).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('heading', { name: DASH_TITLE.A })).toBeVisible();
    await expect(cards(page)).toHaveCount(1);
  });

  test('[DSH-CARD-005] View Recordings opens the player of that course', async ({ page }) => {
    await openDashboard(page, S2);
    await page.getByRole('button', { name: 'View Recordings' }).click();
    await expectOnPath(page, `/learning/${COURSE.A}`);
  });

  test('[DSH-CARD-010] a double click on Join Live Class ends on one lobby', async ({ page }) => {
    await openDashboard(page, S2);
    await cards(page).dblclick();
    await expectOnPath(page, `/live/${COURSE.A}`);
    await expect(lobby(page)).toBeVisible();
  });

  test('[DSH-RES-001][DSH-RES-002][DSH-RES-003] syllabus link is listed for the owned course only and downloads a PDF', async ({ page }) => {
    await openDashboard(page, S2);
    const link = page.getByRole('link', { name: /Syllabus/ });
    await expect(link).toHaveCount(1);
    await expect(link).toContainText(`${DASH_TITLE.A} Syllabus`);
    await expect(link).toContainText('PDF Document');
    await expect(page.getByText(`${DASH_TITLE.B} Syllabus`)).toHaveCount(0);
    const res = await page.request.get((await link.getAttribute('href'))!);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('pdf');
  });

  test('[DSH-LOB-005][DSH-LOB-008][DSH-LOB-009][DSH-E2E-002] lobby of an owned course without a live link shows the checklist and goes back to the same dashboard', async ({ page }) => {
    await signInAs(page, S2);
    await page.goto(`/live/${COURSE.A}`);
    await expect(lobby(page)).toBeVisible({ timeout: 25000 });
    await expect(page.getByRole('heading', { name: 'Ready to join the class?' })).toBeVisible();
    await expect(page.getByText(DASH_TITLE.A).first()).toBeVisible();
    await expect(page.getByText('No live link configured for this cohort yet.')).toBeVisible();
    await expect(page.getByText('Live class recordings will be available on your dashboard by the next morning.')).toBeVisible();
    await expect(page.getByText('Pre-Class Checklist')).toBeVisible();
    await page.getByRole('link', { name: /Dashboard/ }).click();
    await expectOnPath(page, '/learning');
    await expect(page.getByRole('heading', { name: DASH_TITLE.A })).toBeVisible();
  });

  test('[DSH-LOB-012][DSH-LOB-013] a learner cannot open the lobby of a course they do not own', async ({ page }) => {
    await signInAs(page, S2);
    await page.goto(`/live/${COURSE.B}`);
    await expect(denied(page)).toBeVisible({ timeout: 25000 });
    await expect(lobby(page)).toHaveCount(0);
    await page.goto('/live/no-such-course');
    await expect(denied(page)).toBeVisible({ timeout: 25000 });
  });

  test('[DSH-LOB-001] lobby shows only a spinner while enrolments are being verified', async ({ page }) => {
    await signInAs(page, S2);
    await slowRoute(page, '**/rest/v1/user_enrollments*', 2500);
    await page.goto(`/live/${COURSE.A}`);
    await expect(page.locator('.animate-spin').first()).toBeVisible();
    await expect(lobby(page)).toHaveCount(0);
    await expect(denied(page)).toHaveCount(0);
    await expect(lobby(page)).toBeVisible({ timeout: 25000 });
  });

  test('[DSH-LOB-011] a failed enrolment lookup shows Access Denied (documents R-SD-4)', async ({ page }) => {
    await signInAs(page, S2);
    await failRoute(page, '**/rest/v1/user_enrollments*');
    await page.goto(`/live/${COURSE.A}`);
    await expect(denied(page)).toBeVisible({ timeout: 25000 });
  });

  test('[DSH-LOB-010][DSH-E2E-007] admin can open any lobby without an enrolment', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto(`/live/${COURSE.B}`);
    await expect(lobby(page)).toBeVisible({ timeout: 25000 });
    await expect(denied(page)).toHaveCount(0);
  });

  test('[DSH-STATE-001][DSH-STATE-002] loading state is a spinner, never "No courses yet!", and ends in the course list', async ({ page }) => {
    await signInAs(page, S2);
    await slowRoute(page, '**/rest/v1/user_enrollments*', 2500);
    await page.goto('/learning');
    await expect(page.getByText('Loading your dashboard...')).toBeVisible();
    await expect(emptyState(page)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: DASH_TITLE.A })).toBeVisible({ timeout: 25000 });
    await expect(page.getByText('Loading your dashboard...')).toHaveCount(0);
  });

  test('[DSH-ERR-001] a failed enrolment request tells the learner something went wrong instead of "No courses yet!" (SCP-46)', async ({ page }) => {
    test.fixme(true, 'SCP-46: dashboard shows the empty state when the enrolment request fails');
    await signInAs(page, S2);
    await failRoute(page, '**/rest/v1/user_enrollments*');
    await page.goto('/learning');
    await expect(page.getByText('My Enrolled Courses')).toBeVisible({ timeout: 25000 });
    await expect(emptyState(page)).toHaveCount(0);
  });

  test('[DSH-ERR-003][DSH-STAT-008] leaderboard/stats request failures keep the course cards', async ({ page }) => {
    await signInAs(page, S2);
    await failRoute(page, '**/rest/v1/user_stats*');
    await page.goto('/learning');
    await expect(page.getByRole('heading', { name: DASH_TITLE.A })).toBeVisible({ timeout: 25000 });
    await expect(page.getByText('Global Leaderboard')).toBeVisible();
  });

  test('[DSH-STAT-007] an XP sync failure does not break the page', async ({ page }) => {
    await signInAs(page, S2);
    await failRoute(page, '**/api/xp/sync');
    await page.goto('/learning');
    await expect(page.getByRole('heading', { name: DASH_TITLE.A })).toBeVisible({ timeout: 25000 });
    await expect(page.getByText('Current Streak')).toBeVisible();
  });

  test('[DSH-STAT-006] the XP sync endpoint is called once per dashboard load', async ({ page }) => {
    await signInAs(page, S2);
    const calls: string[] = [];
    page.on('request', r => { if (r.url().includes('/api/xp/sync') && r.method() === 'POST') calls.push(r.url()); });
    await page.goto('/learning');
    await expect(page.getByRole('heading', { name: DASH_TITLE.A })).toBeVisible({ timeout: 25000 });
    await page.waitForLoadState('networkidle');
    expect(calls).toHaveLength(1);
  });

  test('[DSH-STAT-010][DSH-STAT-011] leaderboard hides the four internal accounts and shows no email address', async ({ page }) => {
    await openDashboard(page, S2);
    const board = page.locator('h4', { hasText: 'Global Leaderboard' }).locator('xpath=ancestor::div[1]');
    const text = await board.innerText();
    for (const e of Object.values(EMAIL)) expect(text).not.toContain(e);
    expect(text).not.toMatch(/@/);
  });

  test('[DSH-ERR-004] a normal dashboard load raises no uncaught page errors', async ({ page }) => {
    const errors = trackPageErrors(page);
    await openDashboard(page, S2);
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });

  test('[DSH-ERR-006] dashboard stays usable after going offline and online again', async ({ page, context }) => {
    await openDashboard(page, S2);
    await context.setOffline(true);
    await context.setOffline(false);
    await cards(page).click();
    await expectOnPath(page, `/live/${COURSE.A}`);
  });

  test('[DSH-STAT-012][DSH-MOB-001][DSH-MOB-002][DSH-MOB-003] dashboard on a 390 px phone: no sideways scroll, stacked tappable buttons, Total XP hidden', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openDashboard(page, S2);
    await noHorizontalScroll(page);
    const live = cards(page);
    const rec = page.getByRole('button', { name: 'View Recordings' });
    const [a, b] = [await live.boundingBox(), await rec.boundingBox()];
    expect(b!.y, 'buttons stack vertically on mobile').toBeGreaterThan(a!.y + a!.height - 2);
    await expect(page.getByText('Total XP')).toBeHidden();
    await live.click();
    await expectOnPath(page, `/live/${COURSE.A}`);
  });

  test('[DSH-MOB-004] lobby fits a 390 px phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signInAs(page, S2);
    await page.goto(`/live/${COURSE.A}`);
    await expect(lobby(page)).toBeVisible({ timeout: 25000 });
    await noHorizontalScroll(page);
    await expect(page.getByText('Pre-Class Checklist')).toBeVisible();
  });

  test('[DSH-MOB-005] keyboard: a card button takes focus and Enter opens the lobby', async ({ page }) => {
    await openDashboard(page, S2);
    await cards(page).focus();
    await expect(cards(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expectOnPath(page, `/live/${COURSE.A}`);
  });
});

test.describe('PRD06 dashboard and lobby for visitors @regression', () => {
  test('[DSH-STATE-003] a visitor cannot see the dashboard', async ({ page }) => {
    await expectDeniedForVisitor(page, '/learning');
  });
  test('[DSH-LOB-004] a visitor never sees lobby content or the course title', async ({ page }) => {
    await expectDeniedForVisitor(page, `/live/${COURSE.A}`);
    await expect(page.getByText(DASH_TITLE.A)).toHaveCount(0);
  });
});
