import { test, expect } from '@playwright/test';

// Recorded-courses blueprint: python-foundation is upcoming (enrolment closed), recorded, and shows no live-class wording.
test.describe('Recorded course page @regression', () => {
  test('[REC-UI-001] the catalog shows the Python Foundation tile as coming soon', async ({ page }) => {
    await page.goto('/courses');
    const tile = page.getByRole('heading', { name: 'Python Foundation' }).locator('xpath=ancestor::*[.//a[@href="/courses/python-foundation"]][1]');
    await expect(tile).toBeVisible();
    await expect(tile).toContainText('Python Foundation');
    await expect(tile).toContainText('Coming Soon');
    await expect(tile).toContainText('Soon');
    await expect(tile).not.toContainText('Closed');
  });

  test('[REC-UI-002] the sales page opens for a visitor, nothing can be bought, and no live wording shows', async ({ page }) => {
    const response = await page.goto('/courses/python-foundation');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.getByText('Enrollment Opens Soon').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Opens Soon/ }).first()).toBeDisabled();
    const text = (await page.locator('main').innerText()).toLowerCase();
    for (const live of ['sat & sun', 'max 20', 'live class', 'live mentorship', 'cohort has started']) expect(text, live).not.toContain(live);
  });

  test('[REC-UI-003] the plans show today\'s prices', async ({ page }) => {
    await page.goto('/courses/python-foundation');
    await expect(page.getByText(/₹\s?1,?999/).first()).toBeVisible();
    await expect(page.getByText(/₹\s?2,?999/).first()).toBeVisible();
  });

  test('[REC-UI-004] the old Python cohorts stay out of the catalog; Git stays listed', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.locator('a[href="/courses/python-beginners-batch-2"]')).toHaveCount(0);
    await expect(page.locator('a[href="/courses/python-beginners"]')).toHaveCount(0);
    await expect(page.locator('a[href="/courses/git-beginner-batch-1"]')).toBeVisible();
  });
});
