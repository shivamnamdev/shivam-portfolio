import { test, expect } from '@playwright/test';
import { QA_FIXTURE_SLUG } from '../../../data/courses';
import { requireFixture, requireSignIn } from '../../support/guards';
import { EMAIL } from '../../support/personas';
import { signInAs } from '../../support/clerk';
import { cannotScrollSideways } from '../../support/dashboard';
import { applyCode, mockGateway, openFixture, trackDialogs, ui } from '../../support/checkout';

// PRD 05 cases for the free-enrolment path with the API mocked in the browser (no row is written).
// USER = mavish is on the QA100 list (NEXT_PUBLIC_QA_FREE_COUPON_USERS); bazar is not.
const USER = EMAIL.mavish;
const SLUG = QA_FIXTURE_SLUG;

test.describe('PRD05 free enrolment UI (mocked API) @regression', () => {
  test.describe.configure({ mode: 'default' });
  test.beforeEach(() => { requireFixture(); requireSignIn(); });

  test('[FRE-CTA-001][FRE-CTA-006] a 100% coupon makes the price ₹0 and the list price stays struck through', async ({ page }) => {
    trackDialogs(page);
    await openFixture(page, USER);
    await applyCode(page, 'QA100');
    await expect(ui.finalPrice(page)).toHaveText('₹0');
    await expect(ui.struckPrice(page)).toBeVisible();
    await expect(ui.enrollFree(page)).toBeVisible();
    await expect(ui.buyNow(page, 'INR')).toHaveCount(0);
  });

  test('[FRE-CTA-003][FRE-REQ-003] in USD the free coupon gives $0 and the request carries currency USD', async ({ page }) => {
    trackDialogs(page);
    const gw = await mockGateway(page);
    await openFixture(page, USER);
    await ui.usd(page).click();
    await applyCode(page, 'QA100');
    await expect(ui.finalPrice(page)).toHaveText('$0');
    await ui.enrollFree(page).click();
    await expect(ui.successModal(page)).toBeVisible();
    expect(gw.freeBodies).toEqual([{ courseId: SLUG, currency: 'USD', couponCode: 'QA100' }]);
  });

  test('[FRE-CTA-005][FRE-CTA-008] a partial coupon keeps Buy Now, including when it replaces the free coupon', async ({ page }) => {
    trackDialogs(page);
    await openFixture(page, USER);
    await applyCode(page, 'BIRTHDAY20');
    await expect(ui.buyNow(page, 'INR')).toBeVisible();
    await expect(ui.enrollFree(page)).toHaveCount(0);
    await applyCode(page, 'QA100');
    await expect(ui.enrollFree(page)).toBeVisible();
    await applyCode(page, 'BIRTHDAY20');
    await expect(ui.buyNow(page, 'INR')).toBeVisible();
    await expect(ui.enrollFree(page)).toHaveCount(0);
  });

  test('[FRE-CTA-007] replacing the free coupon with an invalid code restores Buy Now', async ({ page }) => {
    trackDialogs(page);
    await openFixture(page, USER);
    await applyCode(page, 'QA100');
    await expect(ui.enrollFree(page)).toBeVisible();
    await applyCode(page, 'NOT-A-CODE');
    await expect(page.getByText('Invalid coupon code.')).toBeVisible();
    await expect(ui.buyNow(page, 'INR')).toBeVisible();
  });

  test('[FRE-CTA-009] a closed cohort offers no coupon box and no free enrolment', async ({ page }) => {
    await signInAs(page, USER);
    await page.goto('/courses/git-beginner-batch-1');
    await expect(page.getByRole('heading', { name: 'Enrollment Closed' })).toBeVisible();
    await expect(ui.couponInput(page)).toHaveCount(0);
    await expect(ui.enrollFree(page)).toHaveCount(0);
  });

  test('[FRE-CTA-010][FRE-CTA-011][FRE-E2E-003] a restricted coupon is refused for an account not on its list and never enrols', async ({ page }) => {
    trackDialogs(page);
    const gw = await mockGateway(page);
    await openFixture(page, EMAIL.bazar);
    await applyCode(page, 'QA100');
    await expect(page.getByText('This coupon is restricted to specific accounts.')).toBeVisible();
    await expect(ui.buyNow(page, 'INR')).toBeVisible();
    await expect(ui.enrollFree(page)).toHaveCount(0);
    expect(gw.freeBodies).toHaveLength(0);
  });

  test('[FRE-CTA-012][FRE-REQ-005][FRE-E2E-004] a visitor applying a coupon is asked to sign in and no request is sent', async ({ page }) => {
    const dialogs = trackDialogs(page);
    const gw = await mockGateway(page);
    await page.goto(`/courses/${SLUG}`);
    await page.waitForLoadState('networkidle');
    await ui.couponInput(page).fill('QA100');
    await ui.applyButton(page).click();
    await expect.poll(() => dialogs.join('|')).toContain('Please log in first to apply a coupon!');
    expect(gw.freeBodies).toHaveLength(0);
  });

  test('[FRE-CTA-013][FRE-MOB-004][FRE-MOB-005] keyboard: apply the coupon, enrol and reach the modal button with Enter', async ({ page }) => {
    trackDialogs(page);
    await mockGateway(page);
    await openFixture(page, USER);
    await ui.couponInput(page).fill('QA100');
    await ui.applyButton(page).focus();
    await page.keyboard.press('Enter');
    await expect(ui.enrollFree(page)).toBeVisible();
    await ui.enrollFree(page).focus();
    await page.keyboard.press('Enter');
    await expect(ui.successModal(page)).toBeVisible();
    await page.getByRole('button', { name: 'Go to Dashboard' }).focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => new URL(page.url()).pathname).toBe('/learning');
  });

  test('[FRE-SUC-003][FRE-SUC-010] the success modal links to the course WhatsApp group and has named buttons', async ({ page }) => {
    trackDialogs(page);
    await mockGateway(page);
    await openFixture(page, USER);
    await applyCode(page, 'QA100');
    await ui.enrollFree(page).click();
    await expect(ui.successModal(page)).toBeVisible();
    const link = page.getByRole('link', { name: /Join WhatsApp Group/ });
    await expect(link).toHaveAttribute('href', /.+/);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(page.getByRole('button', { name: 'Go to Dashboard' })).toBeVisible();
  });

  // Known gap R-FE-3 (SCP-42): the page behind the modal is not marked enrolled until it is reloaded.
  test.fixme('[FRE-POS-006] the button behind the success modal already shows the enrolled state without a reload (SCP-42)', async ({ page }) => {
    trackDialogs(page);
    await mockGateway(page);
    await openFixture(page, USER);
    await applyCode(page, 'QA100');
    await ui.enrollFree(page).click();
    await expect(ui.successModal(page)).toBeVisible();
    await expect(ui.enrolled(page)).toBeVisible();
  });

  test('[FRE-SUC-004] the modal copy does not claim a payment for a free enrolment (SCP-42)', async ({ page }) => {
    test.fixme(true, 'SCP-42: the success modal says "Your payment is verified" for free enrolments too');
    trackDialogs(page);
    await mockGateway(page);
    await openFixture(page, USER);
    await applyCode(page, 'QA100');
    await ui.enrollFree(page).click();
    await expect(ui.successModal(page)).toBeVisible();
    await expect(page.getByText(/payment is verified/i)).toHaveCount(0);
  });

  test('[FRE-ERR-003][FRE-ERR-005] a network failure shows a message, grants nothing and keeps coupon and currency', async ({ page }) => {
    const dialogs = trackDialogs(page);
    await mockGateway(page, { free: 'abort' });
    await openFixture(page, USER);
    await ui.usd(page).click();
    await applyCode(page, 'QA100');
    await ui.enrollFree(page).click();
    await expect.poll(() => dialogs.length).toBeGreaterThan(0);
    await expect(ui.successModal(page)).toHaveCount(0);
    await expect(ui.couponInput(page)).toHaveValue('QA100');
    await expect(ui.enrollFree(page)).toBeEnabled();
  });

  test('[FRE-MOB-001][FRE-MOB-003][FRE-E2E-009] the free path works on a 390 px phone and the success buttons are reachable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    trackDialogs(page);
    await mockGateway(page);
    await openFixture(page, USER);
    await cannotScrollSideways(page);
    await applyCode(page, 'QA100');
    await ui.enrollFree(page).click();
    await expect(ui.successModal(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to Dashboard' })).toBeInViewport();
  });

  test('[FRE-MOB-002] with a free coupon applied the page cannot be dragged sideways on a 390 px phone', async ({ page }) => {
    test.fixme(true, 'Defect (SCP-52): after QA100 is applied the sales page scrolls about 10 px sideways at 390 px width');
    await page.setViewportSize({ width: 390, height: 844 });
    trackDialogs(page);
    await openFixture(page, USER);
    await applyCode(page, 'QA100');
    await expect(ui.enrollFree(page)).toBeVisible();
    await cannotScrollSideways(page);
  });
});
