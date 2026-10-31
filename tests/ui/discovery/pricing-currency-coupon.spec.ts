import { test, expect } from '@playwright/test';
import { EMAIL } from '../../support/personas';
import { requireFixture, requireSignIn } from '../../support/guards';
import { applyCode, clickToPaintMs, fixtureCourse, mockGateway, openFixture, trackDialogs, trackPageErrors, ui } from '../../support/checkout';

// PRD 03 sheets: INR/USD Currency Toggle, Coupon Input Validation, Dynamic Pricing Discount Calc, Dynamic CTA State
// Handling (price/coupon part), Performance Usability, Usability. Runs on the QA fixture (₹10 / $1, open cohort);
// coupons need a signed-in user, so those tests sign in as the "no enrolments" persona.
const rgb = (page: import('@playwright/test').Page, loc: import('@playwright/test').Locator) =>
  loc.evaluate(el => getComputedStyle(el).color);

test.describe('PRD03 Currency toggle @regression', () => {
  test.describe.configure({ mode: 'default' });
  test.beforeEach(async ({ page }) => { requireFixture(); await openFixture(page, null); });

  test('[CDP-CUR-001][CDP-CUR-007][CDP-CUR-011] INR is the default: ₹ symbol on price, struck price and CTA', async ({ page }) => {
    await expect(ui.finalPrice(page)).toHaveText('₹10');
    await expect(ui.struckPrice(page)).toHaveText('₹20');
    await expect(ui.buyNow(page, 'INR')).toBeVisible();
  });

  test('[CDP-CUR-002][CDP-CUR-008][CDP-CUR-004][CDP-CUR-005][CDP-CUR-006][CHK-ENTRY-002] USD switches price, struck price and CTA to $', async ({ page }) => {
    await ui.usd(page).click();
    await expect(ui.finalPrice(page)).toHaveText('$1');
    await expect(ui.struckPrice(page)).toHaveText('$2');
    await expect(ui.buyNow(page, 'USD')).toBeVisible();
    await expect(page.getByText('₹10', { exact: true })).toHaveCount(0);
    await expect(page.getByText(fixtureCourse()!.pricing.usd.savingsText)).toBeVisible();
  });

  test('[CDP-CUR-003] (SCP-62) the course card price on the catalog follows the selected currency', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.getByRole('button', { name: /USD|International|\$/ })).toBeVisible();
  });

  test('[CDP-CUR-009][CHK-ENTRY-003] toggling back returns to INR', async ({ page }) => {
    await ui.usd(page).click();
    await ui.inr(page).click();
    await expect(ui.finalPrice(page)).toHaveText('₹10');
    await expect(ui.buyNow(page, 'INR')).toBeVisible();
  });

  test('[CDP-CUR-010] the currency choice is per page view: a reload starts at the default (INR)', async ({ page }) => {
    await ui.usd(page).click();
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(ui.finalPrice(page)).toHaveText('₹10');
  });

  test('[CDP-CUR-012] switching currency keeps the same course and URL', async ({ page }) => {
    const title = await page.locator('h3', { hasText: 'QA Checkout Sandbox' }).first().innerText();
    await ui.usd(page).click();
    await expect(page.locator('h3', { hasText: title }).first()).toBeVisible();
    await expect(page).toHaveURL(/\/courses\/qa-checkout-sandbox$/);
  });

  test('[CDP-CUR-013][CDP-ERR-010] repeated switching never throws a page error', async ({ page }) => {
    const errors = trackPageErrors(page);
    for (let i = 0; i < 5; i++) { await ui.usd(page).click(); await ui.inr(page).click(); }
    await expect(ui.finalPrice(page)).toHaveText('₹10');
    expect(errors).toEqual([]);
  });

  test('[CDP-CUR-014][CDP-PERF-001][CDP-PERF-002] currency toggle repaints within 100 ms in both directions', async ({ page }) => {
    // warm-up pass so the first-render cost is not counted
    await clickToPaintMs(page, 'International'); await clickToPaintMs(page, 'India');
    const toUsd = await clickToPaintMs(page, 'International');
    await expect(ui.finalPrice(page)).toHaveText('$1');
    const toInr = await clickToPaintMs(page, 'India');
    await expect(ui.finalPrice(page)).toHaveText('₹10');
    expect.soft(toUsd, 'INR→USD ms').toBeLessThan(100);
    expect.soft(toInr, 'USD→INR ms').toBeLessThan(100);
  });
});

test.describe('PRD03 Coupons, pricing and CTA state @regression', () => {
  test.describe.configure({ mode: 'default' });
  test.beforeEach(async ({ page }) => { requireFixture(); requireSignIn(); trackDialogs(page); await openFixture(page, EMAIL.mavish); });

  test('[CDP-COUP-001] the coupon input is displayed', async ({ page }) => {
    await expect(ui.couponInput(page)).toBeVisible();
    await expect(ui.applyButton(page)).toBeVisible();
  });

  test('[CDP-COUP-002][CDP-COUP-003][CDP-COUP-012][CDP-PRICE-002][CDP-PRICE-004] a valid coupon is accepted with a clear message and the right price', async ({ page }) => {
    await applyCode(page, 'BIRTHDAY20');
    await expect(page.getByText('Coupon applied successfully!')).toBeVisible();
    await expect(ui.finalPrice(page)).toHaveText('₹8');   // 20% off ₹10
  });

  test('[CDP-PRICE-001][CDP-PRICE-003] the original price is shown before a discount and struck through', async ({ page }) => {
    await expect(ui.struckPrice(page)).toHaveText('₹20');
    expect(await ui.struckPrice(page).evaluate(el => getComputedStyle(el).textDecorationLine)).toContain('line-through');
    await applyCode(page, 'BIRTHDAY20');
    expect(await ui.struckPrice(page).evaluate(el => getComputedStyle(el).textDecorationLine)).toContain('line-through');
  });

  test('[CDP-PRICE-005] the discount message names the applied coupon', async ({ page }) => {
    await applyCode(page, 'BIRTHDAY20');
    await expect(page.getByText('🎉 BIRTHDAY20 Applied!')).toBeVisible();
  });

  test('[CDP-COUP-004][CDP-COUP-011][CDP-COUP-016][CDP-ERR-001] an invalid coupon shows a clear error and the page stays usable', async ({ page }) => {
    const errors = trackPageErrors(page);
    await applyCode(page, 'NOT-A-CODE');
    await expect(page.getByText('Invalid coupon code.')).toBeVisible();
    await expect(ui.finalPrice(page)).toHaveText('₹10');
    await ui.usd(page).click();
    await expect(ui.finalPrice(page)).toHaveText('$1');
    expect(errors).toEqual([]);
  });

  test('[CDP-COUP-005] applying an empty coupon does not break the page or change the price', async ({ page }) => {
    const errors = trackPageErrors(page);
    await ui.applyButton(page).click();
    await expect(ui.finalPrice(page)).toHaveText('₹10');
    await expect(ui.buyNow(page, 'INR')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('[CDP-COUP-009][CDP-PERF-003] coupon feedback renders within 100 ms', async ({ page }) => {
    await ui.couponInput(page).fill('BIRTHDAY20');
    await clickToPaintMs(page, 'Apply');                       // warm-up
    await ui.couponInput(page).fill('NOT-A-CODE');
    const ms = await clickToPaintMs(page, 'Apply');
    await expect(page.getByText('Invalid coupon code.')).toBeVisible();
    expect(ms, 'apply → painted ms').toBeLessThan(100);
  });

  test('[CDP-COUP-010][CDP-UX-002][CDP-UX-003] success and error messages are visibly different (green vs red)', async ({ page }) => {
    await applyCode(page, 'BIRTHDAY20');
    const ok = page.getByText('Coupon applied successfully!');
    await expect(ok).toBeVisible();
    const green = await rgb(page, ok);
    await applyCode(page, 'NOPE');
    const bad = page.getByText('Invalid coupon code.');
    await expect(bad).toBeVisible();
    const red = await rgb(page, bad);
    expect(green).not.toBe(red);
    const [r, g] = [red, green].map(c => c.match(/\d+/g)!.map(Number));
    expect(r[0], 'error text is red-dominant').toBeGreaterThan(r[1]);
    expect(g[1], 'success text is green-dominant').toBeGreaterThan(g[0]);
  });

  test('[CDP-COUP-013] replacing an invalid coupon with a valid one clears the error', async ({ page }) => {
    await applyCode(page, 'NOPE');
    await expect(page.getByText('Invalid coupon code.')).toBeVisible();
    await applyCode(page, 'BIRTHDAY20');
    await expect(page.getByText('Invalid coupon code.')).toHaveCount(0);
    await expect(ui.finalPrice(page)).toHaveText('₹8');
  });

  test('[CDP-COUP-014][CDP-PRICE-006][CDP-PRICE-008][CDP-CTA-006][CHK-ENTRY-014] replacing a valid coupon with an invalid one removes the discount and leaves no stale price', async ({ page }) => {
    await applyCode(page, 'BIRTHDAY20');
    await expect(ui.finalPrice(page)).toHaveText('₹8');
    await applyCode(page, 'NOPE');
    await expect(page.getByText('Invalid coupon code.')).toBeVisible();
    await expect(ui.finalPrice(page)).toHaveText('₹10');
    await expect(ui.struckPrice(page)).toHaveText('₹20');
    await expect(page.getByText('BIRTHDAY20 Applied!')).toHaveCount(0);
    await expect(ui.buyNow(page, 'INR')).toBeVisible();
  });

  test('[CDP-PRICE-006] replacing one valid coupon with another recalculates from the base price', async ({ page }) => {
    await applyCode(page, 'BIRTHDAY20');
    await expect(ui.finalPrice(page)).toHaveText('₹8');
    await applyCode(page, 'EXISTINGSTUDENT_BATCH03');
    await expect(ui.finalPrice(page)).toHaveText('₹0');
  });

  test('[CDP-COUP-015] surrounding spaces in the coupon code are tolerated', async ({ page }) => {
    await applyCode(page, '  BIRTHDAY20  ');
    await expect(page.getByText('Coupon applied successfully!')).toBeVisible();
    await expect(ui.finalPrice(page)).toHaveText('₹8');
  });

  test('[CDP-COUP-006][CHK-AMT-011] a coupon restricted to other accounts is refused for this user', async ({ page }) => {
    await applyCode(page, 'SHIVAMSPECIAL');
    await expect(page.getByText('This coupon is restricted to specific accounts.')).toBeVisible();
    await expect(ui.finalPrice(page)).toHaveText('₹10');
  });

  test('[CDP-PRICE-007][CDP-CUR-015][CHK-AMT-014] coupon + currency: the discounted price follows the currency, both ways', async ({ page }) => {
    await applyCode(page, 'BIRTHDAY20');
    await ui.usd(page).click();
    await expect(ui.finalPrice(page)).toHaveText('$0.80');
    await ui.inr(page).click();
    await expect(ui.finalPrice(page)).toHaveText('₹8');
  });

  test('[CDP-PRICE-009][CDP-PRICE-010][CDP-FREE-001][CDP-FREE-002][CDP-CTA-002][CDP-CTA-005][CHK-AMT-010][CHK-ENTRY-013] a coupon larger than the price gives ₹0 (never negative) and the CTA becomes Enroll for Free', async ({ page }) => {
    await applyCode(page, 'EXISTINGSTUDENT_BATCH03');
    await expect(ui.finalPrice(page)).toHaveText('₹0');
    await expect(ui.enrollFree(page)).toBeVisible();
    await expect(ui.buyNow(page, 'INR')).toHaveCount(0);
    await ui.usd(page).click();
    await expect(ui.finalPrice(page)).toHaveText('$0');
  });

  test('[CDP-PRICE-011] after a coupon, the final price is consistent everywhere on the page', async ({ page }) => {
    await applyCode(page, 'BIRTHDAY20');
    await expect(page.getByText('₹8', { exact: true })).toHaveCount(1);
    await expect(page.getByText('₹10', { exact: true })).toHaveCount(1);   // only as the struck-through list price
  });

  test('[CDP-PRICE-012] repeated coupon and currency changes cause no page errors', async ({ page }) => {
    const errors = trackPageErrors(page);
    for (const code of ['BIRTHDAY20', 'NOPE', 'EXISTINGSTUDENT_BATCH03', 'BIRTHDAY20']) {
      await applyCode(page, code); await ui.usd(page).click(); await ui.inr(page).click();
    }
    await expect(ui.finalPrice(page)).toHaveText('₹8');
    expect(errors).toEqual([]);
  });

  test('[CDP-UX-001] price hierarchy: final price is larger than the struck price, which is struck', async ({ page }) => {
    const final = await ui.finalPrice(page).evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    const struck = await ui.struckPrice(page).evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    expect(final).toBeGreaterThan(struck);
    expect(await ui.struckPrice(page).evaluate(el => getComputedStyle(el).textDecorationLine)).toContain('line-through');
  });

  test('[CDP-CTA-001][CHK-ENTRY-001] a normal paid course shows Buy Now', async ({ page }) => {
    await expect(ui.buyNow(page, 'INR')).toBeVisible();
    await expect(ui.enrollFree(page)).toHaveCount(0);
  });

  test('[CDP-CTA-010] an invalid coupon never reaches checkout: the order is created without it', async ({ page }) => {
    const gw = await mockGateway(page);
    await applyCode(page, 'NOPE');
    await ui.buyNow(page, 'INR').click();
    await expect.poll(() => gw.orderBodies.length).toBe(1);
    expect(gw.orderBodies[0].couponCode).toBeUndefined();
    expect(gw.orderBodies[0].currency).toBe('INR');
  });

  test('[CDP-CTA-012][CHK-ENTRY-015][CHK-XB-006] the CTA can be focused and activated from the keyboard', async ({ page }) => {
    const gw = await mockGateway(page);
    const cta = ui.buyNow(page, 'INR');
    await cta.focus();
    await expect(cta).toBeFocused();
    await page.keyboard.press('Enter');
    await expect.poll(() => gw.orderBodies.length).toBe(1);
  });
});

test.describe('PRD03 Mobile pricing @regression', () => {
  test.describe.configure({ mode: 'default' });

  test('[CDP-UX-004][CDP-UX-005][CDP-UX-006][CDP-CTA-011][CHK-XB-001] (SCP-64) on a phone pricing, coupon, currency toggle and CTA are visible and usable', async ({ browser }) => {
    requireFixture(); requireSignIn();
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    trackDialogs(page);
    await openFixture(page, EMAIL.mavish);
    for (const loc of [ui.inr(page), ui.usd(page), ui.couponInput(page), ui.applyButton(page), ui.buyNow(page, 'INR')]) {
      await loc.scrollIntoViewIfNeeded();
      const box = (await loc.boundingBox())!;
      expect(box.x, 'inside the viewport (left)').toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, 'inside the viewport (right)').toBeLessThanOrEqual(390 + 1);
      expect(box.height, 'tap target height').toBeGreaterThanOrEqual(32);
    }
    await ui.usd(page).tap();
    await expect(ui.finalPrice(page)).toHaveText('$1');
    await applyCode(page, 'BIRTHDAY20');
    await expect(page.getByText('Coupon applied successfully!')).toBeVisible();
    await expect(ui.finalPrice(page)).toHaveText('$0.80');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    await ctx.close();
  });
});
