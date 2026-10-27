import { test, expect } from '@playwright/test';
import { QA_FIXTURES_ENABLED, QA_FIXTURE_SLUG } from '../../data/courses';

test.describe('QA fixture course visibility', () => {

  test('is never listed in the public catalog', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.getByRole('heading', { name: 'Course Catalog' })).toBeVisible();
    await expect(page.getByText('QA Checkout Sandbox')).toHaveCount(0);
  });

  test('sales page offers Buy Now at ₹10 (INR) and $1 (USD)', async ({ page }) => {
    test.skip(!QA_FIXTURES_ENABLED, 'NEXT_PUBLIC_QA_FIXTURES is not set on the test process');
    await page.goto(`/courses/${QA_FIXTURE_SLUG}`);
    await page.waitForLoadState('networkidle'); // same pattern as sales-funnel.spec.ts: wait for hydration
    await expect(page.getByRole('button', { name: /Buy Now \(INR\)/i })).toBeVisible();
    await expect(page.getByText('₹10', { exact: true })).toBeVisible();
    const usdButton = page.getByRole('button', { name: 'International' });
    await usdButton.scrollIntoViewIfNeeded();
    await usdButton.click();
    await expect(page.getByRole('button', { name: /Buy Now \(USD\)/i })).toBeVisible();
    await expect(page.getByText('$1', { exact: true })).toBeVisible();
  });

  test('is a 404 when the flag is off', async ({ page }) => {
    test.skip(QA_FIXTURES_ENABLED, 'fixture is enabled for this run');
    await page.goto(`/courses/${QA_FIXTURE_SLUG}`);
    await expect(page.getByText('This page could not be found.')).toBeVisible();
  });
});
