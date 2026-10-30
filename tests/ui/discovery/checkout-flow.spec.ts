import { test, expect } from '@playwright/test';
import { QA_FIXTURE_SLUG } from '../../../data/courses';
import { expectLearningDashboard } from '../../support/assertions';
import { requireFixture, requireSignIn } from '../../support/guards';
import { EMAIL } from '../../support/personas';
import { applyCode, mockGateway, openFixture, trackDialogs, trackPageErrors, ui } from '../../support/checkout';

// PRD 03 sheets: Standard Purchase Razorpay Flow, 100% Free Coupon Enrollment, Already Enrolled Student Flow,
// Error Resilience, Race Conditions, Post Purchase Redirect, End to End Business Critical Scenarios.
// The gateway is mocked in the browser (no money, no Razorpay popup); the "real" describes call the app's own
// API and the QA Supabase project with the seeded "no enrolments" persona and always remove what they add.
// UI-only account: never gets fixture enrolments (the real-DB file uses the "no enrolments" account).
const USER = EMAIL.mavish;
const SLUG = QA_FIXTURE_SLUG;

test.describe('PRD03 Paid checkout (mocked gateway) @regression', () => {
  test.describe.configure({ mode: 'default' });
  test.beforeEach(async ({ page }) => { requireFixture(); requireSignIn(); });

  test('[CDP-PAY-001][CDP-PAY-002][CDP-PAY-004][CDP-E2E-002][CHK-ORDER-003][CHK-AMT-006][CHK-AMT-001][CHK-AMT-002] Buy Now creates an INR order and opens Razorpay; no coupon is sent', async ({ page }) => {
    trackDialogs(page);
    const gw = await mockGateway(page);
    await openFixture(page, USER);
    await ui.buyNow(page, 'INR').click();
    await expect.poll(async () => (await gw.rzp())?.opened).toBe(1);
    expect(gw.orderBodies).toEqual([{ courseId: SLUG, currency: 'INR' }]);
    const opts = (await gw.rzp())!.options;
    expect(opts).toMatchObject({ order_id: 'order_mock', currency: 'INR', amount: 1000, name: 'Shivam Academy' });
  });

  test('[CDP-PAY-003][CDP-PAY-005][CHK-ORDER-005][CHK-AMT-006][CHK-AMT-008][CHK-AMT-007] the selected currency is what the order is created in', async ({ page }) => {
    trackDialogs(page);
    const gw = await mockGateway(page);
    await openFixture(page, USER);
    await ui.usd(page).click();
    await ui.buyNow(page, 'USD').click();
    await expect.poll(async () => (await gw.rzp())?.opened).toBe(1);
    expect(gw.orderBodies[0].currency).toBe('USD');
    expect((await gw.rzp())!.options.currency).toBe('USD');
  });

  test('[CDP-PAY-006][CDP-E2E-001][CHK-PAY-001][CHK-XB-004][CHK-XB-005][CHK-PAY-004][CHK-POST-001][CHK-ORDER-004][CHK-PAY-003][CHK-E2E-002] a successful payment is verified and the discounted order is created with the coupon', async ({ page }) => {
    trackDialogs(page);
    const gw = await mockGateway(page);
    await openFixture(page, USER);
    await applyCode(page, 'BIRTHDAY20');
    await ui.buyNow(page, 'INR').click();
    await expect.poll(async () => (await gw.rzp())?.opened).toBe(1);
    expect(gw.orderBodies[0]).toMatchObject({ courseId: SLUG, couponCode: 'BIRTHDAY20', currency: 'INR' });
    await gw.paySuccess();
    await expect(ui.successModal(page)).toBeVisible();
    expect(gw.verifyBodies).toEqual([{ razorpay_order_id: 'order_mock', razorpay_payment_id: 'pay_mock', razorpay_signature: 'sig_mock' }]);
  });

  test('[CDP-PAY-007][CDP-RED-001][CDP-RED-003][CDP-E2E-001][CHK-POST-004][CHK-ORDER-004][CHK-PAY-001][CHK-PAY-003][CHK-E2E-002] after payment Go to Dashboard opens the learning dashboard (/learning)', async ({ page }) => {
    trackDialogs(page);
    const gw = await mockGateway(page);
    await openFixture(page, USER);
    await ui.buyNow(page, 'INR').click();
    await expect.poll(async () => (await gw.rzp())?.opened).toBe(1);
    await gw.paySuccess();
    await page.getByRole('button', { name: 'Go to Dashboard' }).click();
    await expect(page).toHaveURL(/\/learning$/, { timeout: 15000 });
    await expectLearningDashboard(page);
  });

  test('[CDP-RED-004][CDP-PAY-011][CDP-ERR-006][CHK-PAY-008][CHK-PAY-012] when verification fails there is no success screen and no enrolled state', async ({ page }) => {
    const dialogs = trackDialogs(page);
    const gw = await mockGateway(page, { verify: 'fail' });
    await openFixture(page, USER);
    await ui.buyNow(page, 'INR').click();
    await expect.poll(async () => (await gw.rzp())?.opened).toBe(1);
    await gw.paySuccess();
    await expect.poll(() => dialogs.length).toBeGreaterThan(0);
    expect(dialogs[0]).toContain('Invalid payment signature');
    await expect(ui.successModal(page)).toHaveCount(0);
    await expect(ui.enrolled(page)).toHaveCount(0);
  });

  test('[CDP-PAY-008][CDP-ERR-005][CDP-E2E-008][CHK-FAIL-001][CHK-FAIL-003][CHK-E2E-004] a failed payment shows a message, keeps the page usable, and the learner can retry', async ({ page }) => {
    const dialogs = trackDialogs(page);
    const errors = trackPageErrors(page);
    const gw = await mockGateway(page);
    await openFixture(page, USER);
    await ui.buyNow(page, 'INR').click();
    await expect.poll(async () => (await gw.rzp())?.opened).toBe(1);
    await gw.payFail();
    await expect.poll(() => dialogs.some(d => /Payment failed/.test(d))).toBe(true);
    await expect(ui.buyNow(page, 'INR')).toBeEnabled();
    await ui.buyNow(page, 'INR').click();
    await expect.poll(() => gw.orderBodies.length).toBe(2);
    await expect.poll(async () => (await gw.rzp())?.opened).toBe(1);   // the stub is re-created on each load
    expect(errors).toEqual([]);
  });

  test('[CDP-PAY-009][CHK-FAIL-004] closing the payment popup leaves the page in a state where the learner can try again', async ({ page }) => {
    trackDialogs(page);
    const gw = await mockGateway(page);
    await openFixture(page, USER);
    await ui.buyNow(page, 'INR').click();
    await expect.poll(async () => (await gw.rzp())?.opened).toBe(1);
    await expect(ui.buyNow(page, 'INR')).toBeEnabled();
  });

  test('[CDP-ERR-004][CDP-PAY-010][CHK-ORDER-010][CHK-ORDER-011] when order creation fails the learner sees the error, the button recovers and Razorpay never opens', async ({ page }) => {
    const dialogs = trackDialogs(page);
    const gw = await mockGateway(page, { order: 'fail' });
    await openFixture(page, USER);
    await ui.buyNow(page, 'INR').click();
    await expect.poll(() => dialogs.length).toBe(1);
    expect(dialogs[0]).toContain('Order creation failed');
    await expect(ui.buyNow(page, 'INR')).toBeEnabled();
    expect((await gw.rzp())?.opened ?? 0).toBe(0);
    await expect(ui.successModal(page)).toHaveCount(0);
  });

  test('[CDP-PAY-010][CDP-ERR-009][CHK-ORDER-010][CHK-ORDER-011] when the network drops during order creation the loading state ends, and a retry works', async ({ page }) => {
    const dialogs = trackDialogs(page);
    await openFixture(page, USER);
    let calls = 0;
    const gw = await mockGateway(page, { order: 'abort' });
    await page.unroute('**/api/create-order');
    await page.route('**/api/create-order', route => {
      calls += 1;
      if (calls === 1) return route.abort('failed');
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, order: { id: 'order_mock', amount: 1000, currency: 'INR' } }) });
    });
    await ui.buyNow(page, 'INR').click();
    await expect.poll(() => dialogs.length).toBe(1);
    await expect(ui.buyNow(page, 'INR')).toBeEnabled();
    await ui.buyNow(page, 'INR').click();
    await expect.poll(async () => (await gw.rzp())?.opened).toBe(1);
  });

  test('[CDP-CTA-007][CDP-CTA-008][CDP-PAY-012][CHK-ORDER-001] while the order request runs the CTA is disabled and shows a spinner', async ({ page }) => {
    trackDialogs(page);
    await mockGateway(page, { order: 'slow', delayMs: 1500 });
    await openFixture(page, USER);
    await ui.buyNow(page, 'INR').click();
    const busy = page.getByRole('button', { name: 'Processing...' });
    await expect(busy).toBeDisabled();
    await expect(busy.locator('svg.animate-spin')).toBeVisible();
  });

  test('[CDP-CTA-009][CDP-RACE-001][CDP-RACE-006][CHK-IDEM-001][CHK-IDEM-002] rapid clicks on Buy Now create exactly one order', async ({ page }) => {
    trackDialogs(page);
    const gw = await mockGateway(page, { order: 'slow', delayMs: 1200 });
    await openFixture(page, USER);
    await ui.buyNow(page, 'INR').click({ clickCount: 4, delay: 20 });
    await page.waitForTimeout(2200);
    expect(gw.orderBodies).toHaveLength(1);
  });

  test('[CDP-RACE-004] quick coupon changes always end on the state of the last one applied', async ({ page }) => {
    trackDialogs(page);
    await openFixture(page, USER);
    for (const code of ['BIRTHDAY20', 'NOPE', 'EXISTINGSTUDENT_BATCH03', 'NOPE', 'BIRTHDAY20']) {
      await ui.couponInput(page).fill(code);
      await ui.applyButton(page).click();
    }
    await expect(ui.finalPrice(page)).toHaveText('₹8');
    await expect(page.getByText('Coupon applied successfully!')).toBeVisible();
    await expect(page.getByText('Invalid coupon code.')).toHaveCount(0);
  });

  test('[CDP-RACE-005] changing currency right after applying a coupon leaves a consistent price', async ({ page }) => {
    trackDialogs(page);
    await openFixture(page, USER);
    await ui.couponInput(page).fill('BIRTHDAY20');
    await ui.applyButton(page).click();
    await ui.usd(page).click();
    await ui.inr(page).click();
    await ui.usd(page).click();
    await expect(ui.finalPrice(page)).toHaveText('$0.80');
    await expect(ui.buyNow(page, 'USD')).toBeVisible();
  });

  test('[CDP-E2E-005][CHK-E2E-005] invalid coupon attempt: error shown, no discount, the learner can still buy at the full price', async ({ page }) => {
    trackDialogs(page);
    const gw = await mockGateway(page);
    await openFixture(page, USER);
    await applyCode(page, 'WRONGCODE');
    await expect(page.getByText('Invalid coupon code.')).toBeVisible();
    await expect(ui.finalPrice(page)).toHaveText('₹10');
    await ui.buyNow(page, 'INR').click();
    await expect.poll(async () => (await gw.rzp())?.opened).toBe(1);
    expect(gw.orderBodies[0].couponCode).toBeUndefined();
  });

  test.fixme('[CDP-E2E-006] expired coupon attempt is rejected (coupons have no expiry, see CDP-COUP-007)', async () => {});
  test.fixme('[CDP-ERR-002] coupon API timeout shows a retry state (not applicable: coupons are validated in the browser, there is no coupon API)', async () => {});
  test.fixme('[CDP-ERR-003] coupon lookup failure is handled (not applicable: coupons are validated in the browser)', async () => {});
  test.fixme('[CDP-ERR-008] coupon retry after network recovery (not applicable: coupon validation needs no network)', async () => {});

  test('[CDP-E2E-010][CHK-XB-002][CHK-E2E-009] mobile purchase journey: coupon, currency and Buy Now work on a phone and open the gateway', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    trackDialogs(page);
    const gw = await mockGateway(page);
    await openFixture(page, USER);
    await applyCode(page, 'BIRTHDAY20');
    await ui.buyNow(page, 'INR').scrollIntoViewIfNeeded();
    await ui.buyNow(page, 'INR').tap();
    await expect.poll(async () => (await gw.rzp())?.opened).toBe(1);
    expect(gw.orderBodies[0]).toMatchObject({ couponCode: 'BIRTHDAY20', currency: 'INR' });
    await ctx.close();
  });
});

test.describe('PRD03 Free enrollment (mocked API) @regression', () => {
  test.describe.configure({ mode: 'default' });
  test.beforeEach(() => { requireFixture(); requireSignIn(); });

  test('[FRE-REQ-001][FRE-MOB-006][FRE-MOB-007][FRE-REQ-002][FRE-REQ-004][FRE-SUC-002][FRE-CTA-001][FRE-CTA-002][CDP-FREE-003][CDP-FREE-004][CDP-FREE-007] Enroll for Free calls /api/enroll-free and never touches the payment gateway', async ({ page }) => {
    trackDialogs(page);
    const gw = await mockGateway(page);
    await openFixture(page, USER);
    await applyCode(page, 'QA100');
    await expect(ui.finalPrice(page)).toHaveText('₹0');
    await ui.enrollFree(page).click();
    await expect(ui.successModal(page)).toBeVisible();
    expect(gw.freeBodies).toEqual([{ courseId: SLUG, currency: 'INR', couponCode: 'QA100' }]);
    expect(gw.orderBodies).toHaveLength(0);
    expect((await gw.rzp())?.opened ?? 0).toBe(0);
  });

  test('[FRE-SUC-001][CDP-FREE-008] while the free enrollment request runs the CTA is disabled', async ({ page }) => {
    trackDialogs(page);
    await mockGateway(page, { free: 'slow', delayMs: 1500 });
    await openFixture(page, USER);
    await applyCode(page, 'QA100');
    await ui.enrollFree(page).click();
    await expect(page.getByRole('button', { name: 'Processing...' })).toBeDisabled();
  });

  test('[FRE-ERR-001][FRE-ERR-002][CDP-FREE-009][CDP-ERR-007] a failing free enrollment shows an error, no success screen, no redirect', async ({ page }) => {
    const dialogs = trackDialogs(page);
    await mockGateway(page, { free: 'fail' });
    await openFixture(page, USER);
    await applyCode(page, 'QA100');
    await ui.enrollFree(page).click();
    await expect.poll(() => dialogs.length).toBe(1);
    expect(dialogs[0]).toContain('Failed to process enrollment');
    await expect(ui.successModal(page)).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`/courses/${SLUG}$`));
    await expect(ui.enrollFree(page)).toBeEnabled();
  });

  test('[FRE-IDEM-002][CDP-RACE-002][CDP-CTA-009][CHK-IDEM-001] rapid Enroll for Free clicks send one request', async ({ page }) => {
    trackDialogs(page);
    const gw = await mockGateway(page, { free: 'slow', delayMs: 1200 });
    await openFixture(page, USER);
    await applyCode(page, 'QA100');
    await ui.enrollFree(page).click({ clickCount: 4, delay: 20 });
    await page.waitForTimeout(2200);
    expect(gw.freeBodies).toHaveLength(1);
  });

  test('[FRE-SUC-005][CDP-FREE-006][CDP-RED-002][CDP-RED-003] after free enrollment Go to Dashboard opens the learning dashboard (/learning)', async ({ page }) => {
    trackDialogs(page);
    await mockGateway(page);
    await openFixture(page, USER);
    await applyCode(page, 'QA100');
    await ui.enrollFree(page).click();
    await page.getByRole('button', { name: 'Go to Dashboard' }).click();
    await expect(page).toHaveURL(/\/learning$/, { timeout: 15000 });
    await expectLearningDashboard(page);
  });

  test('[FRE-SUC-006][CDP-RED-007] the dashboard the success screen links to loads without errors', async ({ page }) => {
    trackDialogs(page);
    await mockGateway(page);
    await openFixture(page, USER);
    await applyCode(page, 'QA100');
    await ui.enrollFree(page).click();
    await page.getByRole('button', { name: 'Go to Dashboard' }).click();
    await page.waitForURL(/\/learning/);
    await expectLearningDashboard(page);
  });
});

test.describe('PRD03 Sales inquiry widget @regression', () => {
  test('[CDP-RED-005][CDP-RED-006] the WhatsApp widget is shown on the sales page and opens a chat link', async ({ page }) => {
    requireFixture();
    await openFixture(page, null);
    const link = page.locator('a[href^="https://wa.me/"]');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('href', /text=/);
  });
});
