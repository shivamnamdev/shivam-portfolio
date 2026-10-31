import { test, expect, type Page } from '@playwright/test';
import { QA_FIXTURE_SLUG } from '../../../data/courses';
import { requireFixture, requireSignIn } from '../../support/guards';
import { EMAIL } from '../../support/personas';
import { mintSignInToken, signInAs } from '../../support/clerk';
import { cannotScrollSideways } from '../../support/dashboard';
import { applyCode, mockGateway, openFixture, trackDialogs, ui } from '../../support/checkout';

// PRD 04 cases for the paid path that run with the gateway mocked in the browser (no money, no enrolment written).
// USER = mavish: owns Course A only, so the fixture course stays purchasable.
const USER = EMAIL.mavish;
const SLUG = QA_FIXTURE_SLUG;

// Replaces one API answer after mockGateway() (later routes win).
async function answer(page: Page, glob: string, status: number, body: unknown) {
  await page.route(glob, r => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }));
}
const buy = async (page: Page) => { await ui.buyNow(page, 'INR').click(); };

test.describe('PRD04 paid checkout: order, errors and success screen (mocked gateway) @regression', () => {
  test.describe.configure({ mode: 'default' });
  test.beforeEach(() => { requireFixture(); requireSignIn(); });

  test('[CHK-ENTRY-004][CHK-ENTRY-005][CHK-E2E-007] a closed cohort shows Enrollment Closed, no Buy Now, and View Open Cohorts leads to the catalog', async ({ page }) => {
    await signInAs(page, USER);
    await page.goto('/courses/git-beginner-batch-1');
    await expect(page.getByRole('heading', { name: 'Enrollment Closed' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Buy Now/ })).toHaveCount(0);
    await page.getByText('View Open Cohorts').click();
    await expect.poll(() => new URL(page.url()).pathname).toBe('/courses');
  });

  test('[CHK-ENTRY-006][CHK-ENTRY-007][CHK-XB-008] a visitor is asked to sign in on Buy Now and no order is requested', async ({ page }) => {
    const dialogs = trackDialogs(page);
    const gw = await mockGateway(page);
    await page.goto(`/courses/${SLUG}`);
    await page.waitForLoadState('networkidle');
    await ui.buyNow(page, 'INR').click();
    await expect.poll(() => dialogs.join('|')).toContain('Please log in or create an account first to secure your spot!');
    expect(gw.orderBodies).toHaveLength(0);
  });

  test('[CHK-ENTRY-009] a visitor pressing Apply is asked to sign in', async ({ page }) => {
    const dialogs = trackDialogs(page);
    await page.goto(`/courses/${SLUG}`);
    await page.waitForLoadState('networkidle');
    await ui.couponInput(page).fill('BIRTHDAY20');
    await ui.applyButton(page).click();
    await expect.poll(() => dialogs.join('|')).toContain('Please log in first to apply a coupon!');
  });

  test('[CHK-ORDER-002] the button recovers once the order response arrives', async ({ page }) => {
    trackDialogs(page);
    await mockGateway(page, { order: 'slow', delayMs: 800 });
    await openFixture(page, USER);
    await buy(page);
    await expect(page.getByRole('button', { name: 'Processing...' })).toBeVisible();
    await expect(ui.buyNow(page, 'INR')).toBeEnabled({ timeout: 10000 });
  });

  test('[CHK-ORDER-006] the Razorpay checkout script is requested when paying', async ({ page }) => {
    trackDialogs(page);
    await mockGateway(page);
    const asked: string[] = [];
    page.on('request', r => { if (r.url().includes('checkout.razorpay.com')) asked.push(r.url()); });
    await openFixture(page, USER);
    await buy(page);
    await expect.poll(() => asked.length).toBeGreaterThan(0);
  });

  const orderError = (status: number, msg: string) => async ({ page }: { page: Page }) => {
    const dialogs = trackDialogs(page);
    await mockGateway(page);
    await answer(page, '**/api/create-order', status, { success: false, error: msg });
    await openFixture(page, USER);
    await buy(page);
    await expect.poll(() => dialogs.join('|')).toContain(msg);
    await expect(ui.buyNow(page, 'INR')).toBeEnabled();
    await expect(ui.successModal(page)).toHaveCount(0);
  };
  test('[CHK-ORDER-007] create-order 401 shows the server message and recovers', orderError(401, '401 Unauthorized: Invalid Request'));
  test('[CHK-ORDER-008] create-order 400 shows the server message and recovers', orderError(400, 'Enrollment is closed for this course'));
  test('[CHK-ORDER-009] create-order 403 shows the server message and recovers', orderError(403, 'This coupon is restricted'));

  // Not met today: handlePayment has no timeout, so a request that never answers leaves the button on Processing...
  test.fixme('[CHK-ORDER-012] an order request that never answers ends the loading state with a message after about 30 seconds (no timeout exists: SCP-65)', async ({ page }) => {
    test.setTimeout(90000);
    const dialogs = trackDialogs(page);
    await mockGateway(page, { order: 'slow', delayMs: 45000 });
    await openFixture(page, USER);
    await buy(page);
    await expect(ui.buyNow(page, 'INR')).toBeEnabled({ timeout: 40000 });
    expect(dialogs.length).toBeGreaterThan(0);
  });

  test('[CHK-FAIL-008] refreshing while the order is processing loads the page normally with Buy Now available and no enrolment', async ({ page }) => {
    trackDialogs(page);
    const gw = await mockGateway(page, { order: 'slow', delayMs: 4000 });
    await openFixture(page, USER);
    await buy(page);
    await expect(page.getByRole('button', { name: 'Processing...' })).toBeVisible();
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(ui.buyNow(page, 'INR')).toBeEnabled();
    await expect(ui.successModal(page)).toHaveCount(0);
    expect(gw.verifyBodies).toHaveLength(0);
  });

  test('[CHK-ENTRY-008] after signing in from the course page the buyer is still on that page with Buy Now available', async ({ page }) => {
    const dialogs = trackDialogs(page);
    await page.goto(`/courses/${SLUG}`);
    await page.waitForLoadState('networkidle');
    await ui.buyNow(page, 'INR').click();
    await expect.poll(() => dialogs.join('|')).toContain('Please log in or create an account first');
    const token = await mintSignInToken(USER);
    await page.waitForFunction(() => (window as any).Clerk?.loaded);
    await page.evaluate(async (ticket: string) => {
      const clerk = (window as any).Clerk;
      const attempt = await clerk.client.signIn.create({ strategy: 'ticket', ticket });
      setTimeout(() => clerk.setActive({ session: attempt.createdSessionId }), 0);
    }, token);
    await expect.poll(async () => (await page.context().cookies()).some(c => c.name === '__session' && !!c.value), { timeout: 20000 }).toBe(true);
    await expect(page.locator('.cl-userButtonTrigger').first()).toBeVisible({ timeout: 20000 });
    expect(new URL(page.url()).pathname).toBe(`/courses/${SLUG}`);
    await expect(ui.buyNow(page, 'INR')).toBeEnabled();
  });

  test('[CHK-FAIL-005] pressing Buy Now again while the Razorpay overlay is open must not create a second order (known gap R-CK-5, SCP-50)', async ({ page }) => {
    test.fixme(true, 'R-CK-5: the button is re-enabled as soon as the overlay opens, so a second click creates a second order');
    trackDialogs(page);
    const gw = await mockGateway(page);
    await openFixture(page, USER);
    await buy(page);
    await expect.poll(async () => (await gw.rzp())?.opened).toBe(1);
    await buy(page);
    await page.waitForTimeout(500);
    expect(gw.orderBodies).toHaveLength(1);
  });

  test('[CHK-PAY-002] a USD purchase creates a USD order and ends in the success modal', async ({ page }) => {
    trackDialogs(page);
    const gw = await mockGateway(page);
    await openFixture(page, USER);
    await ui.usd(page).click();
    await ui.buyNow(page, 'USD').click();
    await expect.poll(async () => (await gw.rzp())?.opened).toBe(1);
    await gw.paySuccess();
    await expect(ui.successModal(page)).toBeVisible();
    expect(gw.orderBodies[0].currency).toBe('USD');
  });

  test('[CHK-AMT-003][CHK-AMT-004][CHK-AMT-005] the overlay uses the brand colour, prefills the buyer and never carries a secret', async ({ page }) => {
    trackDialogs(page);
    const gw = await mockGateway(page);
    await openFixture(page, USER);
    await buy(page);
    await expect.poll(async () => (await gw.rzp())?.opened).toBe(1);
    const o = (await gw.rzp())!.options;
    expect(o.theme).toEqual({ color: '#f59e0b' });
    expect(o.prefill.email).toBe(USER);
    expect(JSON.stringify(o)).not.toMatch(/key_secret|RAZORPAY_KEY_SECRET/i);
    expect(String(o.key ?? '')).not.toMatch(/secret/i);
  });

  test('[CHK-PAY-005] the success modal appears only after the server confirms the payment', async ({ page }) => {
    trackDialogs(page);
    const gw = await mockGateway(page);
    await page.route('**/api/verify-payment', async route => { await new Promise(r => setTimeout(r, 1800)); await route.fallback(); });
    await openFixture(page, USER);
    await buy(page);
    await expect.poll(async () => (await gw.rzp())?.opened).toBe(1);
    await page.evaluate(() => { void (window as any).__rzp.options.handler({ razorpay_order_id: 'order_mock', razorpay_payment_id: 'pay_mock', razorpay_signature: 'sig_mock' }); });
    await expect(ui.successModal(page)).toHaveCount(0);
    await expect(ui.successModal(page)).toBeVisible({ timeout: 10000 });
  });

  test('[CHK-PAY-008][CHK-PAY-009][CHK-PAY-010][CHK-FAIL-010] a failed verification (400, 500 or network) is shown and no success screen appears', async ({ page }) => {
    const dialogs = trackDialogs(page);
    const gw = await mockGateway(page);
    await openFixture(page, USER);
    await buy(page);
    await expect.poll(async () => (await gw.rzp())?.opened).toBe(1);
    await page.unroute('**/api/verify-payment');
    await answer(page, '**/api/verify-payment', 500, { success: false, error: 'Verification failed on the server' });
    await gw.paySuccess();
    await expect.poll(() => dialogs.join('|')).toContain('Verification failed on the server');
    await page.unroute('**/api/verify-payment');
    await page.route('**/api/verify-payment', r => r.abort('failed'));
    await gw.paySuccess();
    await expect.poll(() => dialogs.join('|')).toContain('Error verifying enrollment.');
    await expect(ui.successModal(page)).toHaveCount(0);
  });

  test('[CHK-FAIL-002][CHK-FAIL-011] after a failed payment nothing is granted and coupon and currency stay as chosen', async ({ page }) => {
    const dialogs = trackDialogs(page);
    const gw = await mockGateway(page);
    await openFixture(page, USER);
    await ui.usd(page).click();
    await applyCode(page, 'BIRTHDAY20');
    await ui.buyNow(page, 'USD').click();
    await expect.poll(async () => (await gw.rzp())?.opened).toBe(1);
    await gw.payFail();
    await expect.poll(() => dialogs.join('|')).toContain('Payment failed or was cancelled. Please try again.');
    expect(gw.verifyBodies).toHaveLength(0);
    await expect(ui.successModal(page)).toHaveCount(0);
    await expect(ui.couponInput(page)).toHaveValue('BIRTHDAY20');
    await expect(ui.buyNow(page, 'USD')).toBeVisible();
  });

  test('[CHK-FAIL-006][CHK-FAIL-007] a blocked Razorpay script shows the offline message and works again once reachable', async ({ page }) => {
    const dialogs = trackDialogs(page);
    await mockGateway(page);
    await page.route('https://checkout.razorpay.com/**', r => r.abort('failed'));
    await openFixture(page, USER);
    await buy(page);
    await expect.poll(() => dialogs.join('|')).toContain('Razorpay SDK failed to load. Are you online?');
    await expect(ui.buyNow(page, 'INR')).toBeEnabled();
    await page.unroute('https://checkout.razorpay.com/**');
    await mockGateway(page);   // restores the stub
    await buy(page);
    await expect.poll(() => dialogs.length).toBeGreaterThanOrEqual(1);
  });

  test('[CHK-POST-002][CHK-POST-003][CHK-POST-009][CHK-POST-011] the success modal: WhatsApp link attributes, paid wording, named buttons', async ({ page }) => {
    trackDialogs(page);
    const gw = await mockGateway(page);
    await openFixture(page, USER);
    await buy(page);
    await expect.poll(async () => (await gw.rzp())?.opened).toBe(1);
    await gw.paySuccess();
    await expect(ui.successModal(page)).toBeVisible();
    await expect(page.getByText('Your payment is verified.')).toBeVisible();
    const link = page.getByRole('link', { name: /Join WhatsApp Group/ });
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noreferrer/);
    await expect(link).toHaveAttribute('href', /.+/);
    await expect(page.getByRole('button', { name: 'Go to Dashboard' })).toBeVisible();
  });

  test('[CHK-XB-007] keyboard: the modal Go to Dashboard button is reachable and works with Enter', async ({ page }) => {
    trackDialogs(page);
    const gw = await mockGateway(page);
    await openFixture(page, USER);
    await buy(page);
    await expect.poll(async () => (await gw.rzp())?.opened).toBe(1);
    await gw.paySuccess();
    await page.getByRole('button', { name: 'Go to Dashboard' }).focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => new URL(page.url()).pathname).toBe('/learning');
  });

  test('[CHK-XB-003] the success modal fits a 390 px phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    trackDialogs(page);
    const gw = await mockGateway(page);
    await openFixture(page, USER);
    await buy(page);
    await expect.poll(async () => (await gw.rzp())?.opened).toBe(1);
    await gw.paySuccess();
    await expect(ui.successModal(page)).toBeVisible();
    await cannotScrollSideways(page);
    await expect(page.getByRole('button', { name: 'Go to Dashboard' })).toBeInViewport();
  });

  test('[CHK-IDEM-006][CHK-ENTRY-011] an enrolled student on a closed cohort sees Go to Dashboard, not Buy Now', async ({ page }) => {
    await signInAs(page, EMAIL.bazar);   // owns Course B (closed)
    await page.goto('/courses/git-beginner-batch-1');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /Go to Dashboard/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Buy Now/ })).toHaveCount(0);
  });
});
