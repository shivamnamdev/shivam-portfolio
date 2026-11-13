import { test, expect } from '@playwright/test';
import { signInAs } from '../../support/clerk';
import { requireSeed } from '../../support/guards';
import { AUTH, COURSE } from '../../support/personas';
import { expectOnPath } from '../../support/assertions';

// Recorded-courses blueprint (docs/architecture/recorded-courses.md): the old live Python cohort is hidden. S1 (mavish) is enrolled in it, U1 (edu) is not.
const OLD = COURSE.A;                    // python-beginners-batch-2
const VIDEO = 'a9nrrH5XkG0';             // first lesson of that course (data/learning-content.ts)

test.describe('Hidden course access @regression', () => {
  test.beforeEach(() => requireSeed());

  test('[CAC-UI-001] the catalog does not list the old live Python cohort', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator(`a[href="/courses/${OLD}"]`)).toHaveCount(0);
  });

  test('[CAC-UI-002] a visitor opening the old sales page gets "not found"', async ({ page }) => {
    const response = await page.goto(`/courses/${OLD}`);
    expect(response?.status()).toBe(404);
    await expect(page.getByText('Enroll Now')).toHaveCount(0);
  });

  test('[CAC-UI-003] a signed-in learner who is not enrolled gets "not found" too', async ({ page }) => {
    await signInAs(page, AUTH.U1);
    const response = await page.goto(`/courses/${OLD}`);
    expect(response?.status()).toBe(404);
  });

  test('[CAC-UI-004] the enrolled learner can open the old sales page and the course on the dashboard', async ({ page }) => {
    await signInAs(page, AUTH.S1);
    const response = await page.goto(`/courses/${OLD}`);
    expect(response?.status()).toBe(200);
    await page.goto('/learning');
    await expect(page.getByText('Python Live Session (Batch 2)').first()).toBeVisible({ timeout: 25000 });
  });

  test('[CAC-UI-005] a shared lesson link of the old course: visitor goes to the catalog, enrolled learner to the lesson', async ({ page }) => {
    await page.goto(`/share/${VIDEO}`);
    await expectOnPath(page, '/courses');
    await signInAs(page, AUTH.S1);
    await page.goto(`/share/${VIDEO}`);
    await expectOnPath(page, `/learning/${OLD}`);
  });

  test('[CAC-UI-006] the preview of an old-course share link shows no lesson title and no thumbnail', async ({ request }) => {
    const html = await (await request.get(`/share/${VIDEO}`)).text();
    expect(html).toContain('Exclusive Lesson | Shivam Academy');
    expect(html).not.toContain(`img.youtube.com/vi/${VIDEO}`);
    expect(html).not.toContain('Python Live Session');
  });
});
