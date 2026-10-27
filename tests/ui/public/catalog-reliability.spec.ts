import { test, expect } from '@playwright/test';
import { activeCourses, isQaFixture, QA_FIXTURE_SLUG } from '../../../data/courses';
import { signInAs } from '../../support/clerk';
import { requireFixture, requireSignIn } from '../../support/guards';
import { PUB } from '../../support/personas';
import { expectOnPath } from '../../support/assertions';

// PRD 02 · Course Catalog & Discovery, Reliability / Navigation Consistency, Performance-oriented UI checks.
// C1 / C2 (representative paid / free course) = the QA fixture course when it is enabled; otherwise the real
// (closed) courses are used for everything that does not need an open cohort.
const realCourses = activeCourses.filter(c => !isQaFixture(c.slug));
const first = realCourses[0];
const FIXTURE = `/courses/${QA_FIXTURE_SLUG}`;

test.describe('PRD02 Course catalog and discovery @regression', () => {
  test('[PUB-CAT-001][PUB-CAT-002] the catalog loads without login and lists every public course', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.getByRole('heading', { name: 'Course Catalog' })).toBeVisible();
    await expect(page.getByRole('link', { name: /View Details/i })).toHaveCount(realCourses.length);
    await expect(page.getByText('QA Checkout Sandbox')).toHaveCount(0);
  });

  test('[PUB-CAT-003] each course card is easy to scan: title, status and duration', async ({ page }) => {
    await page.goto('/courses');
    for (const course of realCourses) {
      await expect(page.getByRole('heading', { name: course.title })).toBeVisible();
      await expect(page.getByText(course.statusText).first()).toBeVisible();
      await expect(page.getByText(course.duration).first()).toBeVisible();
    }
  });

  test('[PUB-CAT-004][PUB-CAT-005][PUB-CAT-013] a course opens from the catalog and from a direct URL', async ({ page }) => {
    await page.goto('/courses');
    await page.getByRole('link', { name: /View Details/i }).first().click();
    await expect(page).toHaveURL(/\/courses\/[a-z0-9-]+$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.goto(`/courses/${first.slug}`);
    await expectOnPath(page, `/courses/${first.slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('[PUB-CAT-007] learning outcomes are displayed', async ({ page }) => {
    await page.goto(`/courses/${first.slug}`);
    await expect(page.getByText('What You Will Achieve:')).toBeVisible();
    await expect(page.getByText(first.outcomes[0]).first()).toBeVisible();
  });

  test('[PUB-CAT-008] the module summary is displayed', async ({ page }) => {
    await page.goto(`/courses/${first.slug}`);
    await expect(page.getByText('Program Curriculum')).toBeVisible();
    await expect(page.getByText(first.modules[0].title).first()).toBeVisible();
  });

  test('[PUB-CAT-009][PUB-CAT-010][PUB-CAT-015] the CTA matches the cohort state and the discovery flow completes (closed cohort)', async ({ page }) => {
    await page.goto('/courses');
    await page.getByRole('link', { name: /View Details/i }).first().click();
    await page.waitForLoadState('networkidle');
    const cta = page.getByRole('button', { name: 'View Open Cohorts' });
    await expect(cta).toBeVisible();
    await cta.click();
    await expectOnPath(page, '/courses');
  });

  test('[PUB-CAT-014] course information stays the same when leaving and coming back', async ({ page }) => {
    await page.goto(`/courses/${first.slug}`);
    const title = await page.getByRole('heading', { level: 1 }).innerText();
    await page.goto('/courses');
    await page.goto(`/courses/${first.slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  });

  test.describe('open cohort (QA fixture)', () => {
    test.beforeEach(() => requireFixture());

    test('[PUB-CAT-006][PUB-CAT-009][PUB-CAT-015] pricing and the Buy Now CTA are displayed for an open course', async ({ page }) => {
      await page.goto(FIXTURE);
      await expect(page.getByText('₹10', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: /Buy Now \(INR\)/i })).toBeVisible();
    });

    test('[PUB-CAT-011][PUB-REL-008] a visitor starting a purchase is guided to sign in, every time', async ({ page }) => {
      await page.goto(FIXTURE);
      await page.waitForLoadState('networkidle');
      const messages: string[] = [];
      page.on('dialog', d => { messages.push(d.message()); void d.accept(); }); // alert() blocks the click until handled
      for (let attempt = 1; attempt <= 3; attempt++) {
        await page.getByRole('button', { name: /Buy Now \(INR\)/i }).click();
        await expect.poll(() => messages.length, { timeout: 10000 }).toBe(attempt);
        expect(messages[attempt - 1]).toMatch(/log in/i);
        await expect(page.locator('input[name="identifier"]')).toBeVisible({ timeout: 20000 });
        await page.keyboard.press('Escape');
        await expect(page.locator('input[name="identifier"]')).toBeHidden();
      }
    });

    test('[PUB-CAT-012] a zero-cost coupon turns the CTA into Enroll for Free', async ({ page }) => {
      test.skip(!process.env.NEXT_PUBLIC_QA_FREE_COUPON_USERS, 'needs NEXT_PUBLIC_QA_FREE_COUPON_USERS (Clerk ids allowed to use QA100)');
      requireSignIn();
      await signInAs(page, PUB.U1);
      await page.goto(FIXTURE);
      await page.waitForLoadState('networkidle');
      await page.getByPlaceholder('Enter code').fill('QA100');
      await page.getByRole('button', { name: 'Apply', exact: true }).click();
      await expect(page.getByText('Coupon applied successfully!')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Enroll for Free' })).toBeVisible();
    });
  });
});

test.describe('PRD02 Reliability and navigation consistency @regression', () => {
  test('[PUB-REL-001] repeated navigation between public pages keeps working', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      for (const path of ['/', '/courses', '/about', '/contact']) {
        await page.goto(path);
        await expectOnPath(page, path);
        await expect(page.getByRole('heading').first()).toBeVisible();
      }
    }
  });

  test('[PUB-REL-002][PUB-REL-003] a refresh keeps public and course pages functional', async ({ page }) => {
    for (const path of ['/about', `/courses/${first.slug}`]) {
      await page.goto(path);
      await page.reload();
      await expectOnPath(page, path);
      await expect(page.getByRole('heading').first()).toBeVisible();
    }
  });

  test('[PUB-REL-004] Back during discovery returns to the previous page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Explore Courses' }).click();
    await page.getByRole('link', { name: /View Details/i }).first().click();
    await expect(page).toHaveURL(/\/courses\/[a-z0-9-]+$/);
    await page.goBack();
    await expectOnPath(page, '/courses');
  });

  test('[PUB-REL-005] Back after a legal page returns to the course', async ({ page }) => {
    await page.goto(`/courses/${first.slug}`);
    await page.getByRole('link', { name: 'Privacy Policy' }).click();
    await expectOnPath(page, '/privacy');
    await page.goBack();
    await expectOnPath(page, `/courses/${first.slug}`);
  });

  test('[PUB-REL-006] the CTA still works after a refresh (closed cohort)', async ({ page }) => {
    await page.goto(`/courses/${first.slug}`);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'View Open Cohorts' }).click();
    await expectOnPath(page, '/courses');
  });

  test('[PUB-REL-007] the currency choice resets to India after leaving and returning', async ({ page }) => {
    requireFixture();
    await page.goto(FIXTURE);
    await page.waitForLoadState('networkidle');
    const usd = page.getByRole('button', { name: 'International' });
    await usd.scrollIntoViewIfNeeded();
    await usd.click();
    await expect(page.getByRole('button', { name: /Buy Now \(USD\)/i })).toBeVisible();
    await page.goto('/about');
    await page.goBack();
    await expect(page.getByRole('button', { name: /Buy Now \(INR\)/i })).toBeVisible();
  });
});

test.describe('PRD02 Performance-oriented UI checks @regression', () => {
  // Budgets are for a warmed dev server; they catch regressions, they are not a load test (see the Performance PRD).
  const BUDGET_MS = 4000;
  async function renderTime(page: import('@playwright/test').Page, path: string, locator: () => import('@playwright/test').Locator) {
    await page.request.get(path); // warm the route so we do not measure first compilation
    const t0 = Date.now();
    await page.goto(path, { waitUntil: 'commit' });
    await locator().waitFor({ state: 'visible', timeout: 15000 });
    return Date.now() - t0;
  }

  test('[PUB-PERF-001] homepage key content renders promptly', async ({ page }) => {
    expect(await renderTime(page, '/', () => page.getByRole('heading', { level: 1 }))).toBeLessThan(BUDGET_MS);
  });

  test('[PUB-PERF-002] the catalog renders promptly', async ({ page }) => {
    expect(await renderTime(page, '/courses', () => page.getByRole('link', { name: /View Details/i }).first())).toBeLessThan(BUDGET_MS);
  });

  test('[PUB-PERF-003] a course page renders promptly', async ({ page }) => {
    expect(await renderTime(page, `/courses/${first.slug}`, () => page.getByRole('heading', { level: 1 }))).toBeLessThan(BUDGET_MS);
  });

  test('[PUB-PERF-004][PUB-PERF-005] navigation and CTA transitions respond promptly', async ({ page }) => {
    await page.goto('/');
    await page.request.get('/courses');
    const t0 = Date.now();
    await page.getByRole('link', { name: 'Explore Courses' }).click();
    await expect(page.getByRole('heading', { name: 'Course Catalog' })).toBeVisible();
    expect(Date.now() - t0).toBeLessThan(BUDGET_MS);
  });

  test('[PUB-PERF-006] key content renders promptly on a mobile viewport', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, baseURL: `http://localhost:${process.env.PORT ?? '3000'}` });
    const page = await ctx.newPage();
    expect(await renderTime(page, '/', () => page.getByRole('heading', { level: 1 }))).toBeLessThan(BUDGET_MS);
    expect(await renderTime(page, `/courses/${first.slug}`, () => page.getByRole('heading', { level: 1 }))).toBeLessThan(BUDGET_MS);
    await ctx.close();
  });
});
