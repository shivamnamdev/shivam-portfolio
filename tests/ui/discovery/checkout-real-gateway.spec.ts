import { test, expect, type FrameLocator, type Page } from '@playwright/test';
import { QA_FIXTURE_SLUG } from '../../../data/courses';
import { adminDb, revokeTestEnrolment } from '../../support/db';
import { clerkUserId } from '../../support/clerk';
import { requireFixture, requireSeed } from '../../support/guards';
import { EMAIL } from '../../support/personas';
import { openFixture, trackDialogs, ui } from '../../support/checkout';

// PRD 04 sheet "Real Gateway Sandbox (Test Mode)": drives the REAL Razorpay Checkout overlay with the test keys,
// including Razorpay's demo bank page (Success / Failure buttons). Opt-in (E2E_REAL_GATEWAY=1) because a successful
// payment calls Razorpay and sends the receipt email to the owner inbox. Test keys only: the first test refuses live keys.
const USER = EMAIL.edu;
const SLUG = QA_FIXTURE_SLUG;
const CARD = { number: '4111111111111111', expiry: '1230', cvv: '123', name: 'QA Automation', mobile: '8123456789' };

const rowCount = async () => {
  const { data, error } = await adminDb().from('user_enrollments').select('id').eq('user_id', await clerkUserId(USER)).eq('course_slug', SLUG);
  if (error) throw error;
  return data!.length;
};

// Walks the overlay: contact details -> Cards -> test card -> "Maybe later" (save card) and returns the demo bank page.
async function payToBankPage(page: Page): Promise<{ frame: FrameLocator; bank: Page }> {
  await page.waitForSelector('iframe.razorpay-checkout-frame', { timeout: 30000 });
  const frame = page.frameLocator('iframe.razorpay-checkout-frame');
  await frame.getByPlaceholder('Mobile number').pressSequentially(CARD.mobile, { delay: 40 });
  await frame.getByRole('button', { name: 'Continue' }).click();
  await frame.getByText('Cards', { exact: true }).first().click();
  await frame.getByPlaceholder('Card Number').pressSequentially(CARD.number, { delay: 30 });
  await frame.getByPlaceholder('MM / YY').pressSequentially(CARD.expiry, { delay: 30 });
  await frame.getByPlaceholder('CVV').pressSequentially(CARD.cvv, { delay: 30 });
  await frame.getByPlaceholder('Enter name on card').pressSequentially(CARD.name, { delay: 20 });
  const popup = page.waitForEvent('popup', { timeout: 45000 });
  await frame.getByRole('button', { name: 'Continue' }).click();
  await frame.getByRole('button', { name: 'Maybe later' }).click({ timeout: 15000 }).catch(() => {});
  const bank = await popup;
  await bank.waitForLoadState();
  return { frame, bank };
}

test.describe('PRD04 Real Razorpay sandbox @nightly', () => {
  test.describe.configure({ mode: 'default', timeout: 150000 });
  test.beforeEach(async () => {
    requireFixture(); requireSeed();
    test.skip(process.env.E2E_REAL_GATEWAY !== '1', 'opt-in: set E2E_REAL_GATEWAY=1 (real Razorpay test mode, sends a receipt email)');
    await revokeTestEnrolment(USER, SLUG);   // start from a clean state even after an interrupted run
  });
  test.afterEach(async () => { await revokeTestEnrolment(USER, SLUG); });

  test('[CHK-REAL-004] only Razorpay test keys are configured (live keys are refused)', () => {
    expect(process.env.RAZORPAY_KEY_ID ?? '').toMatch(/^rzp_test_/);
    expect(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? '').toMatch(/^rzp_test_/);
  });

  test('[CHK-REAL-001][CHK-AMT-005] the real overlay opens in test mode with the signed-in email', async ({ page }) => {
    trackDialogs(page);
    await openFixture(page, USER);
    await ui.buyNow(page, 'INR').click();
    await page.waitForSelector('iframe.razorpay-checkout-frame', { timeout: 30000 });
    const frame = page.frameLocator('iframe.razorpay-checkout-frame');
    await expect(frame.getByText('Shivam Academy').first()).toBeVisible({ timeout: 30000 });
    await expect(frame.getByText(USER)).toBeVisible();
    expect(await rowCount()).toBe(0);
  });

  test('[CHK-REAL-002][CHK-REAL-005] a successful test-card payment is verified and enrols the learner', async ({ page }) => {
    trackDialogs(page);
    await openFixture(page, USER);
    await ui.buyNow(page, 'INR').click();
    const { bank } = await payToBankPage(page);
    await bank.waitForURL(/amount=1000/, { timeout: 30000 });   // the demo bank page carries the order amount in paise
    await bank.getByRole('button', { name: 'Success' }).click();
    await expect(ui.successModal(page)).toBeVisible({ timeout: 60000 });
    expect(await rowCount()).toBe(1);
  });

  test('[CHK-REAL-003] a failed test-card payment shows the failure message and grants nothing', async ({ page }) => {
    const dialogs = trackDialogs(page);
    await openFixture(page, USER);
    await ui.buyNow(page, 'INR').click();
    const { bank } = await payToBankPage(page);
    await bank.getByRole('button', { name: 'Failure' }).click();
    await expect.poll(() => dialogs.some(d => /Payment failed/.test(d)), { timeout: 60000 }).toBe(true);
    await expect(ui.successModal(page)).toHaveCount(0);
    expect(await rowCount()).toBe(0);
  });
});
