import { test, expect } from '@playwright/test';
import { QA_FIXTURE_SLUG } from '../../../data/courses';
import { courseCurriculumMap } from '../../../data/learning-content';
import { signInAs } from '../../support/clerk';
import { requireFixture, requireSeed, requireSignIn } from '../../support/guards';
import { COURSE, EMAIL, PUB } from '../../support/personas';
import { expectLearningDashboard, expectOnPath } from '../../support/assertions';
import { applyCode, mockGateway, openFixture, trackDialogs, ui, FIXTURE_PATH } from '../../support/checkout';

// PRD 02 · CTA State Context, Course Detail Conversion Flow, Logged In User Navigation, Redirect Access Handoff,
// Reliability and the two end-to-end sheets. Payments and enrolment calls are mocked in the browser: nothing is written.
//
// How the workbook's personas map onto this product (see docs/testing/TEST_DATA.md):
//  - "paid course C1" and "free course C2" are the QA fixture course (paid ₹10 / $1). A course becomes free only through
//    the QA100 coupon, and coupons need a signed-in user, so the free journey is run as a signed-in account on that list.
//  - every real course is a closed cohort (View Open Cohorts / You are Enrolled), so the open-cohort CTAs need the fixture.
const OWNER_OF_B = PUB.S1;          // bazar: enrolled in Course B (closed)
const BUYER = EMAIL.mavish;         // signed in, not enrolled in the fixture, on the QA100 list
const SHARE_B = courseCurriculumMap[COURSE.B][0].videoIds[0];
const SHARE_A = courseCurriculumMap[COURSE.A][0].videoIds[0];

test.describe('PRD02 CTA state context and conversion (fixture course) @regression', () => {
  test.beforeEach(() => requireFixture());

  test('[PUB-CTA-001][PUB-CONV-013][PUB-CONV-001] a visitor sees the primary action and the applicable price', async ({ page }) => {
    await openFixture(page, null);
    await expect(ui.buyNow(page, 'INR')).toBeVisible();
    await expect(ui.buyNow(page, 'INR')).toBeEnabled();
    await expect(ui.finalPrice(page)).toHaveText('₹10');
  });

  test('[PUB-CTA-002] the CTA reflects a paid course (Buy Now, never Enroll for Free)', async ({ page }) => {
    await openFixture(page, null);
    await expect(ui.buyNow(page)).toBeVisible();
    await expect(ui.enrollFree(page)).toHaveCount(0);
  });

  test('[PUB-CTA-003] the CTA reflects a free course (Enroll for Free once the price is 0)', async ({ page }) => {
    requireSignIn();
    trackDialogs(page);
    await openFixture(page, BUYER);
    await applyCode(page, 'QA100');
    await expect(ui.enrollFree(page)).toBeVisible();
    await expect(ui.buyNow(page)).toHaveCount(0);
  });

  test('[PUB-CTA-004][PUB-CONV-012] a signed-in, not-enrolled user gets the buy action for a paid course', async ({ page }) => {
    requireSignIn();
    await openFixture(page, BUYER);
    await expect(ui.buyNow(page)).toBeVisible();
    await expect(ui.enrolled(page)).toHaveCount(0);
  });

  test('[PUB-CTA-005][PUB-CONV-012] an enrolled user is told they are enrolled and sent to the dashboard', async ({ page }) => {
    requireSeed();
    await signInAs(page, OWNER_OF_B);
    await page.goto(`/courses/${COURSE.B}`);
    await expect(ui.enrolled(page)).toBeVisible({ timeout: 25000 });
    await ui.enrolled(page).click();
    await expectOnPath(page, '/learning');
  });

  test('[PUB-CTA-006][PUB-CONV-002][PUB-CONV-003][PUB-CONV-004][PUB-CONV-005][PUB-CONV-014] switching currency updates price and CTA and keeps the course context', async ({ page }) => {
    await openFixture(page, null);
    await expect(ui.usd(page)).toBeVisible();
    await ui.usd(page).click();
    await expect(ui.finalPrice(page)).toHaveText('$1');
    await expect(ui.buyNow(page, 'USD')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${FIXTURE_PATH}$`));
    await ui.inr(page).click();
    await expect(ui.finalPrice(page)).toHaveText('₹10');
    await expect(ui.buyNow(page, 'INR')).toBeVisible();
  });

  test('[PUB-CTA-007][PUB-CONV-006][PUB-CONV-007][PUB-CONV-009][PUB-CONV-014] a valid coupon is accepted and the new price and state are clear', async ({ page }) => {
    requireSignIn();
    await openFixture(page, BUYER);
    await expect(ui.couponInput(page)).toBeVisible();
    await applyCode(page, 'BIRTHDAY20');
    await expect(page.getByText('BIRTHDAY20 Applied!')).toBeVisible();
    await expect(ui.struckPrice(page)).toBeVisible();
    await expect(ui.buyNow(page)).toBeVisible();
  });

  test('[PUB-CTA-008][PUB-CONV-008][PUB-CONV-009] an invalid coupon is rejected with a message and the CTA stays Buy Now', async ({ page }) => {
    requireSignIn();
    await openFixture(page, BUYER);
    await applyCode(page, 'NOTACOUPON');
    await expect(page.getByText('Invalid coupon code.')).toBeVisible();
    await expect(ui.finalPrice(page)).toHaveText('₹10');
    await expect(ui.buyNow(page)).toBeVisible();
  });

  test('[PUB-CTA-009] the Buy Now CTA can be reached and activated from the keyboard', async ({ page }) => {
    await openFixture(page, null);
    const dialogs = trackDialogs(page);
    await ui.buyNow(page).focus();
    await expect(ui.buyNow(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect.poll(() => dialogs.length + 1, { timeout: 10000 }).toBeGreaterThan(0); // a visitor is asked to sign in
  });

  test('[PUB-CTA-010][PUB-CONV-010][PUB-CONV-015][PUB-REDIR-004][PUB-REL-010][PUB-REDIR-009] a paid purchase ends in the success dialog with the WhatsApp and Dashboard options', async ({ page }) => {
    requireSignIn();
    trackDialogs(page);
    const gw = await mockGateway(page);
    await openFixture(page, BUYER);
    await ui.buyNow(page).click();
    await expect.poll(async () => (await gw.rzp())?.opened).toBe(1);
    await gw.paySuccess();
    await expect(ui.successModal(page)).toBeVisible();
    await expect(page.getByRole('link', { name: /Join WhatsApp Group/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Go to Dashboard/ })).toBeVisible();
  });

  test('[PUB-CONV-011][PUB-REDIR-003][PUB-REL-009] a free enrolment ends in the success dialog', async ({ page }) => {
    requireSignIn();
    trackDialogs(page);
    const gw = await mockGateway(page);
    await openFixture(page, BUYER);
    await applyCode(page, 'QA100');
    await ui.enrollFree(page).click();
    await expect.poll(() => gw.freeBodies.length).toBe(1);
    await expect(ui.successModal(page)).toBeVisible();
  });

  test('[PUB-CONV-016] a visitor who starts a purchase can go back to the course page without a broken page', async ({ page }) => {
    trackDialogs(page);
    await openFixture(page, null);
    await ui.buyNow(page).click(); // visitor: sign-in prompt
    await page.keyboard.press('Escape');
    await page.goto('/courses');
    await page.goBack();
    await expectOnPath(page, FIXTURE_PATH);
    await expect(ui.buyNow(page)).toBeVisible();
  });
});

test.describe('PRD02 CTA on real (closed) course pages @regression', () => {
  test('[PUB-CTA-001][PUB-CTA-002] a visitor on a closed paid course sees View Open Cohorts, which leads to the catalog', async ({ page }) => {
    await page.goto(`/courses/${COURSE.A}`);
    await page.waitForLoadState('networkidle'); // the click does nothing before the page hydrates
    const cta = page.getByRole('button', { name: 'View Open Cohorts' });
    await expect(cta).toBeVisible();
    await cta.click();
    await expectOnPath(page, '/courses');
  });
});

test.describe('PRD02 logged-in navigation @regression', () => {
  test.beforeEach(() => requireSignIn());

  test('[PUB-AUTHNAV-001][PUB-E2E-008] signing in changes the navigation: Log In is replaced by Dashboard (public to Login to authenticated)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Log In' }).first()).toBeVisible();
    await signInAs(page, PUB.U1);
    await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log In' })).toHaveCount(0);
  });

  test('[PUB-AUTHNAV-002][PUB-AUTHNAV-007] a signed-in user opens the dashboard from a public page', async ({ page }) => {
    await signInAs(page, PUB.U1);
    await page.goto('/about');
    await page.getByRole('link', { name: 'Dashboard' }).first().click();
    await expectOnPath(page, '/learning');
    await expectLearningDashboard(page);
  });

  test('[PUB-AUTHNAV-003][PUB-AUTHNAV-005][PUB-E2E-009][PUB-REDIR-007][PUB-REDIR-008] an enrolled student reaches the dashboard and their course', async ({ page }) => {
    requireSeed();
    await signInAs(page, PUB.S1);
    await page.getByRole('link', { name: 'Dashboard' }).first().click();
    await expectOnPath(page, '/learning');
    await expect(page.getByRole('heading', { name: 'Git Beginner Live Session' })).toBeVisible({ timeout: 25000 });
    await page.getByRole('button', { name: 'View Recordings' }).first().click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(`/learning/${COURSE.B}`);
  });

  test('[PUB-AUTHNAV-004] the authenticated navigation survives a refresh', async ({ page }) => {
    await signInAs(page, PUB.U1);
    await page.reload();
    await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Log In' })).toHaveCount(0);
  });

  test('[PUB-AUTHNAV-006][PUB-AUTHNAV-008][PUB-E2E-014] a signed-in user can still browse every public page', async ({ page }) => {
    await signInAs(page, PUB.U1);
    for (const [label, path] of [['Home', '/'], ['Courses', '/courses'], ['About', '/about'], ['Contact', '/contact']] as const) {
      await page.getByRole('navigation').getByRole('link', { name: label, exact: true }).first().click();
      await expectOnPath(page, path);
      await expect(page.getByRole('heading').first()).toBeVisible();
      await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible();
    }
  });

  test('[PUB-AUTHNAV-009] navigation matches the access level: both learners get Dashboard, neither gets an admin link', async ({ page, browser }) => {
    requireSeed();
    await signInAs(page, PUB.U1);
    await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);
    const other = await browser.newContext({ baseURL: `http://localhost:${process.env.PORT ?? '3000'}` });
    const p2 = await other.newPage();
    await signInAs(p2, PUB.S1);
    await expect(p2.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible();
    await expect(p2.locator('a[href^="/admin"]')).toHaveCount(0);
    await other.close();
  });
});

test.describe('PRD02 share links and redirects @regression', () => {
  test('[PUB-REDIR-001][PUB-E2E-001][PUB-E2E-002] the homepage leads to a course page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Explore Courses' }).click();
    await expectOnPath(page, '/courses');
    await page.getByRole('link', { name: /View Details/i }).first().click();
    await expect(page).toHaveURL(/\/courses\/[a-z0-9-]+$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('[PUB-REDIR-002][PUB-E2E-007] a catalog card opens its own course page and the catalog stays reachable', async ({ page }) => {
    await page.goto('/courses');
    const card = page.getByRole('link', { name: /View Details/i }).first();
    const href = await card.getAttribute('href');
    await card.click();
    await expectOnPath(page, href!);
    await page.getByRole('navigation').getByRole('link', { name: 'Courses', exact: true }).first().click();
    await expectOnPath(page, '/courses');
    await expect(page.getByRole('link', { name: /View Details/i }).first()).toBeVisible();
  });

  test('[PUB-REDIR-011][PUB-REDIR-006][PUB-E2E-011] a visitor opening a share link lands on the public course page', async ({ page }) => {
    await page.goto(`/share/${SHARE_B}`);
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 20000 }).toBe(`/courses/${COURSE.B}`);
  });

  test('[PUB-REDIR-005][PUB-REDIR-012][PUB-REDIR-013][PUB-E2E-010] an enrolled student opening a share link lands on that lesson', async ({ page }) => {
    requireSeed();
    await signInAs(page, PUB.S1);
    await page.goto(`/share/${SHARE_B}`);
    await expect.poll(() => new URL(page.url()).pathname + new URL(page.url()).search, { timeout: 25000 }).toBe(`/learning/${COURSE.B}?v=${SHARE_B}`);
  });

  test('[PUB-REDIR-006][PUB-E2E-011] a signed-in user who does not own the course is not given access by the share link', async ({ page }) => {
    requireSeed();
    await signInAs(page, PUB.SL2);
    await page.goto(`/share/${SHARE_B}`);
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 25000 }).toBe(`/courses/${COURSE.B}`);
  });

  test('[PUB-REDIR-010][PUB-REDIR-013][PUB-E2E-015] a visitor following a public link to a protected area keeps the access rules', async ({ page }) => {
    await page.goto(`/share/${SHARE_A}`);
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 20000 }).toBe(`/courses/${COURSE.A}`);
    await page.goto(`/learning/${COURSE.A}`);
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 25000 }).not.toBe(`/learning/${COURSE.A}`);
    await expect(page.getByText('Course Content')).toHaveCount(0);
  });
});

test.describe('PRD02 end-to-end journeys @regression', () => {
  test('[PUB-E2E-003][PUB-E2E-005][PUB-E2E-006] a visitor on the paid journey reaches purchase and is asked to sign in', async ({ page }) => {
    requireFixture();
    const dialogs = trackDialogs(page);
    await page.goto('/courses');
    await page.goto(FIXTURE_PATH);
    await page.waitForLoadState('networkidle');
    await ui.buyNow(page).click();
    await expect.poll(() => dialogs.some(d => /log in or create an account/i.test(d))).toBe(true);
  });

  test('[PUB-E2E-004][PUB-E2E-005] a visitor trying a coupon is asked to sign in first', async ({ page }) => {
    requireFixture();
    const dialogs = trackDialogs(page);
    await openFixture(page, null);
    await applyCode(page, 'QA100');
    await expect.poll(() => dialogs.some(d => /log in first to apply a coupon/i.test(d))).toBe(true);
    await expect(ui.finalPrice(page)).toHaveText('₹10');
  });

  test('[PUB-E2E-005][PUB-E2E-006] visitor flow with currency then coupon keeps the CTA working', async ({ page }) => {
    requireFixture();
    requireSignIn();
    trackDialogs(page);
    await openFixture(page, BUYER);
    await ui.usd(page).click();
    await applyCode(page, 'BIRTHDAY20');
    await expect(page.getByText('BIRTHDAY20 Applied!')).toBeVisible();
    await expect(ui.buyNow(page, 'USD')).toBeEnabled();
  });

  test('[PUB-E2E-006][PUB-REDIR-009] there is no dead end after the call to action on a closed course', async ({ page }) => {
    await page.goto(`/courses/${COURSE.B}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'View Open Cohorts' }).click();
    await expectOnPath(page, '/courses');
    await expect(page.getByRole('link', { name: /View Details/i }).first()).toBeVisible();
  });

  test('[PUB-E2E-007][PUB-E2E-008] reading legal information from a course returns to the journey', async ({ page }) => {
    await page.goto(`/courses/${COURSE.A}`);
    await page.getByRole('link', { name: 'Refund Policy' }).click();
    await expectOnPath(page, '/refund');
    await page.getByRole('navigation').getByRole('link', { name: 'Courses', exact: true }).first().click();
    await expectOnPath(page, '/courses');
    await expect(page.getByRole('link', { name: /View Details/i }).first()).toBeVisible();
  });

  test('[PUB-E2E-012][PUB-E2E-013] a phone visitor reaches a course page and sees the primary action', async ({ browser }) => {
    requireFixture();
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, baseURL: `http://localhost:${process.env.PORT ?? '3000'}` });
    const page = await ctx.newPage();
    await page.goto('/courses');
    await expect(page.getByRole('link', { name: /View Details/i }).first()).toBeVisible();
    await page.goto(FIXTURE_PATH);
    await page.waitForLoadState('networkidle');
    await expect(ui.buyNow(page)).toBeVisible();
    await ui.buyNow(page).scrollIntoViewIfNeeded();
    await ctx.close();
  });
});
