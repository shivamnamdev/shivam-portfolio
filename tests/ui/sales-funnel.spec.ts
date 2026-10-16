import { test, expect } from '@playwright/test';
import { activeCourses } from '../../data/courses';
import { formatPrice, parsePrice } from '../../lib/pricing';

// One test per course in data/courses.ts, so the suite follows catalog changes automatically.
test.describe('Course Sales Page UI', () => {

  for (const course of activeCourses) {
    test(`${course.slug}: renders hero and the correct cohort state`, async ({ page }) => {
      await page.goto(`/courses/${course.slug}`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('heading', { level: 1 })).toContainText(course.vsl.headlineHighlight);

      if (course.enrollmentClosed) {
        await expect(page.getByRole('heading', { name: 'Enrollment Closed' })).toBeVisible();
        await expect(page.getByRole('button', { name: /Buy Now/i })).toHaveCount(0);
        return;
      }

      // Open cohort: default INR pricing, then switch to USD.
      await expect(page.getByRole('button', { name: '🇮🇳 India' })).toBeVisible();
      await expect(page.getByText(formatPrice(parsePrice(course.pricing.inr.currentPrice), 'INR'), { exact: true })).toBeVisible();
      await expect(page.getByText(course.pricing.inr.originalPrice, { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: /Buy Now \(INR\)/i })).toBeVisible();

      const usdButton = page.getByRole('button', { name: 'International' });
      await usdButton.scrollIntoViewIfNeeded();
      await usdButton.click();

      await expect(page.getByText(formatPrice(parsePrice(course.pricing.usd.currentPrice), 'USD'), { exact: true })).toBeVisible();
      await expect(page.getByText(course.pricing.usd.originalPrice, { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: /Buy Now \(USD\)/i })).toBeVisible();
    });
  }

  test('unknown course slug renders the not-found page', async ({ page }) => {
    // Assert on the rendered page: with a Clerk dev instance the first response can be a 401 interstitial.
    await page.goto('/courses/course-that-does-not-exist');
    await expect(page.getByText('This page could not be found.')).toBeVisible();
  });
});
