import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';

// SCP-119 (SCP-33, SCP-34) · read-only phone checks against the live site. Run: PROD_URL=https://shivamnamdev.com npx playwright test
// Needs the saved session: PROD_URL=... npm run prod:session. Nothing is written: no lesson is completed, nothing is submitted, no exam
// is graded; the lab only runs print() in the browser. The course is the first dashboard card whose title contains PROD_COURSE (default "Python").
const COURSE = new RegExp(process.env.PROD_COURSE ?? 'Python', 'i');
const SESSION = '.tmp/prod-session.json';
const sidebarLessons = (page: Page) => page.locator('aside').getByRole('button');

async function noSidewaysScroll(page: Page) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(over, 'the page must not scroll sideways').toBeLessThanOrEqual(1);
}

async function openCourseFromDashboard(page: Page) {
  await page.goto('/learning');
  const card = page.locator('h3', { hasText: COURSE }).first().locator('xpath=ancestor::div[.//button[contains(., "View Recordings")]][1]');
  await expect(card, `no dashboard card matching ${COURSE}`).toBeVisible({ timeout: 45000 });
  await card.getByRole('button', { name: /View Recordings/ }).click();
  await expect(page.getByText('Course Content')).toBeVisible({ timeout: 60000 });
}

test.describe('PROD phone: learning page and Python lab (SCP-33, SCP-34)', () => {
  test.beforeAll(() => { if (!fs.existsSync(SESSION)) throw new Error('No saved session: run PROD_URL=... npm run prod:session first'); });
  test.setTimeout(180_000);

  test('[PRD-MOB-001] the course page fits the phone, a video lesson opens, a document lesson opens, the page scrolls (SCP-33)', async ({ page }) => {
    await openCourseFromDashboard(page);
    await noSidewaysScroll(page);

    // video lesson: its player frame is on screen
    const lessons = sidebarLessons(page);
    await expect(lessons.first()).toBeVisible({ timeout: 30000 });
    await expect(page.locator('iframe[src*="youtube"]').first()).toBeVisible({ timeout: 30000 });

    // the page scrolls: a wheel/touch scroll moves the page or an inner scroller
    const before = await page.evaluate(() => window.scrollY + Array.from(document.querySelectorAll('*')).reduce((n, e) => n + e.scrollTop, 0));
    await page.mouse.move(200, 400);
    await page.mouse.wheel(0, 700);
    await expect.poll(() => page.evaluate(() => window.scrollY + Array.from(document.querySelectorAll('*')).reduce((n, e) => n + e.scrollTop, 0)), { timeout: 10000 }).toBeGreaterThan(before);
    await noSidewaysScroll(page);

    // a document lesson (if the course has one) opens without an error and without sideways scroll
    const doc = page.locator('aside').getByRole('button', { name: /doc|document|notes|pdf|read/i }).first();
    if (await doc.count()) {
      await doc.click();
      await expect(page.getByText(/something went wrong|application error/i)).toHaveCount(0);
      await noSidewaysScroll(page);
    }
  });

  test('[PRD-MOB-002] the Python lab loads and runs print() on the phone (SCP-34)', async ({ page }) => {
    await openCourseFromDashboard(page);
    await page.getByRole('button', { name: 'Practice', exact: true }).click();
    await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 60000 });
    const run = page.getByRole('button', { name: /^Run$/ }).first();
    await expect(run).toBeEnabled({ timeout: 90000 });     // disabled while Pyodide loads
    await page.evaluate(() => { (window as any).monaco.editor.getEditors()[0].setValue("print('phone ok')"); });
    await run.click();
    await expect(page.locator('pre.font-mono').first()).toContainText('phone ok', { timeout: 45000 });
    await noSidewaysScroll(page);
  });

  // Real input, not the editor's API: tap the editor, type with the keyboard, paste text, and check the text is on screen.
  // PAUSE_MS (default 0) holds the screen after each step so a person watching a headed run can see it.
  test('[PRD-MOB-003] tapping the Python lab editor and typing or pasting really puts text in it, and it runs (SCP-34)', async ({ page, context }) => {
    const pause = Number(process.env.PAUSE_MS ?? 0);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    await openCourseFromDashboard(page);
    await page.getByRole('button', { name: 'Practice', exact: true }).click();
    const editor = page.locator('.monaco-editor').first();
    await expect(editor).toBeVisible({ timeout: 60000 });
    const run = page.getByRole('button', { name: /^Run$/ }).first();
    await expect(run).toBeEnabled({ timeout: 90000 });
    const shown = () => page.locator('.monaco-editor .view-lines').first();
    const content = () => page.evaluate(() => (window as any).monaco.editor.getEditors()[0].getValue() as string);

    await page.evaluate(() => { (window as any).monaco.editor.getEditors()[0].setValue(''); });
    await editor.scrollIntoViewIfNeeded();
    await editor.tap();                                           // a finger, not a mouse click
    await page.keyboard.type("print('typed on phone')", { delay: 80 });
    await expect(shown()).toContainText('typed on phone');        // visible on screen, not only in the model
    expect(await content()).toContain("print('typed on phone')");
    await page.waitForTimeout(pause);

    await page.keyboard.press('Enter');
    await page.evaluate(() => navigator.clipboard.writeText("print('pasted on phone')"));
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+V' : 'Control+V');
    await expect(shown()).toContainText('pasted on phone');
    expect(await content()).toContain("print('pasted on phone')");
    await page.waitForTimeout(pause);

    await run.tap();
    const out = page.locator('pre.font-mono').first();
    await expect(out).toContainText('typed on phone', { timeout: 45000 });
    await expect(out).toContainText('pasted on phone');
    await page.waitForTimeout(pause);
  });
});
