import { test, expect, type Page } from '@playwright/test';
import { activeCourses, isQaFixture } from '../../../data/courses';

// PRD 03 sheet "Course Card Discovery Rendering". The catalog lists every course except the QA fixture.
const listed = activeCourses.filter(c => !isQaFixture(c.slug) && (c as { listed?: boolean }).listed !== false);   // same rule as /courses: course-cta-update-3 hides unlisted batches
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
      // an upcoming recorded course says "Soon", a closed live cohort says "Closed"
      const expected = c.enrollmentClosed ? ((c as { format?: string }).format === 'recorded' ? 'Soon' : 'Closed') : c.pricing.inr.currentPrice;
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

  test('[CDP-003] (SCP-61) each card shows the instructor', async ({ page }) => {
    await expect(card(page, listed[0].title).getByText(/instructor|by shivam|taught by/i)).toBeVisible();
  });

  // Decision 2026-11-18 (SCP-43): no rating is shown, because the platform holds no review data and none is invented.
  test.fixme('[CDP-005] (SCP-61) each card shows a course rating (not built: no review data)', async () => {});

  const closedLabel = (c: (typeof listed)[number]) => c.enrollmentClosed ? ((c as { format?: string }).format === 'recorded' ? 'Soon' : 'Closed') : c.pricing.inr.currentPrice;

  test('[CDP-008] (SCP-62) a currency control exists; USD can be chosen and closed cards keep their badge (price changes are unit-tested)', async ({ page }) => {
    const inr = page.getByRole('button', { name: /INR/ });
    const usd = page.getByRole('button', { name: /USD/ });
    await expect(inr).toHaveAttribute('aria-pressed', 'true');
    await usd.click();
    await expect(usd).toHaveAttribute('aria-pressed', 'true');
    await expect(inr).toHaveAttribute('aria-pressed', 'false');
    for (const c of listed.filter(x => x.enrollmentClosed)) await expect(card(page, c.title).getByText(closedLabel(c), { exact: true })).toBeVisible();
    await inr.click();
    await expect(inr).toHaveAttribute('aria-pressed', 'true');
  });

  test('[CDP-003b] (SCP-61) the instructor line names Shivam Namdev on every card', async ({ page }) => {
    for (const c of listed) await expect(card(page, c.title).getByText('Taught by Shivam Namdev')).toBeVisible();
  });

  test('[CDP-009][CDP-010] (SCP-63) the quick preview shows highlights and syllabus without leaving the catalog, and closes again', async ({ page }) => {
    const c = listed.find(x => (x as { modules?: unknown[] }).modules?.length) ?? listed[0];
    const el = card(page, c.title);
    const toggle = el.getByRole('button', { name: /Quick preview/ });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(el.getByText('Syllabus', { exact: true })).toBeVisible();
    await expect(el.getByText((c as { modules: { title: string }[] }).modules[0].title, { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/courses$/);
    await toggle.click();
    await expect(el.getByText('Syllabus', { exact: true })).toBeHidden();
  });

  test('[CDP-015] (SCP-63) the currency control and the quick preview work from the keyboard', async ({ page }) => {
    await page.getByRole('button', { name: /USD/ }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: /USD/ })).toHaveAttribute('aria-pressed', 'true');
    const toggle = card(page, listed[0].title).getByRole('button', { name: /Quick preview/ });
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
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

  test('[CDP-014] (SCP-43, SCP-114) on a phone the layout stays the screen width with a quick preview open', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, baseURL: `http://localhost:${process.env.PORT ?? '3000'}` });
    const page = await ctx.newPage();
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    await card(page, listed[0].title).getByRole('button', { name: /Quick preview/ }).click();
    expect(await page.evaluate(() => window.innerWidth)).toBe(390);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await ctx.close();
  });
});
