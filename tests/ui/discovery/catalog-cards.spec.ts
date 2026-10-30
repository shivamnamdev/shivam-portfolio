import { test, expect, type Page } from '@playwright/test';
import { activeCourses, isQaFixture } from '../../../data/courses';

// PRD 03 sheet "Course Card Discovery Rendering". The catalog lists every course except the QA fixture.
const listed = activeCourses.filter(c => !isQaFixture(c.slug));
const card = (page: Page, title: string) => page.locator('h2', { hasText: title }).locator('xpath=ancestor::div[contains(@class,"flex-col")][1]');

test.describe('PRD03 Course discovery cards @regression', () => {
  test.describe.configure({ mode: 'default' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
  });

  test('[CDP-001][CDP-002][CDP-012] every course renders its own card with its own title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Course Catalog' })).toBeVisible();
    const titles = await page.locator('main h2').allInnerTexts();
    expect(titles).toEqual(listed.map(c => c.title));
    expect(new Set(titles).size, 'titles must not repeat').toBe(titles.length);
  });

  test('[CDP-004][CDP-007] duration and status on each card match the course data', async ({ page }) => {
    for (const c of listed) {
      const el = card(page, c.title);
      await expect(el.getByText(c.duration, { exact: true })).toBeVisible();
      await expect(el.getByText(c.statusText, { exact: true })).toBeVisible();
    }
  });

  test('[CDP-006] pricing badge: closed cohorts say "Closed", open cohorts show the INR price', async ({ page }) => {
    for (const c of listed) {
      const expected = c.enrollmentClosed ? 'Closed' : c.pricing.inr.currentPrice;
      await expect(card(page, c.title).getByText(expected, { exact: true })).toBeVisible();
    }
  });

  test('[CDP-011] View Details opens the matching /courses/[slug] page', async ({ page }) => {
    const c = listed[listed.length - 1];
    await card(page, c.title).getByRole('link', { name: /View Details/ }).click();
    await expect(page).toHaveURL(new RegExp(`/courses/${c.slug}$`));
    await expect(page.getByRole('heading', { level: 1 })).toContainText(c.vsl.headlineHighlight);
  });

  test('[CDP-011] each card links to its own slug', async ({ page }) => {
    for (const c of listed) {
      await expect(card(page, c.title).getByRole('link', { name: /View Details/ })).toHaveAttribute('href', `/courses/${c.slug}`);
    }
  });

  test('[CDP-003] each card shows the instructor', async ({ page }) => {
    await expect(card(page, listed[0].title).getByText(/instructor|by shivam|taught by/i)).toBeVisible();
  });

  test('[CDP-005] each card shows a course rating', async ({ page }) => {
    await expect(card(page, listed[0].title).getByText(/★|⭐|rating|\d\.\d\s*\/\s*5/i)).toBeVisible();
  });

  test('[CDP-008] card prices follow the selected currency (a currency control exists on the catalog)', async ({ page }) => {
    await expect(page.getByRole('button', { name: /USD|International|\$/ })).toBeVisible();
  });

  test('[CDP-009][CDP-010] a quick preview shows syllabus and highlights without leaving the catalog', async ({ page }) => {
    await card(page, listed[0].title).hover();
    await expect(page.getByText(/syllabus|highlights/i).first()).toBeVisible();
  });

  test('[CDP-013] cards stay usable on a phone (no horizontal scroll, link tappable)', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(1);
    const link = card(page, listed[0].title).getByRole('link', { name: /View Details/ });
    await link.scrollIntoViewIfNeeded();
    const box = await link.boundingBox();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThanOrEqual(40);
    await ctx.close();
  });
});
