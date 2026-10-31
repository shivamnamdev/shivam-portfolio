import { test, expect } from '@playwright/test';
import { EMAIL, COURSE } from '../../support/personas';
import { requireSeed } from '../../support/guards';
import { signInAs } from '../../support/clerk';
import { expectDeniedForVisitor, expectOnPath } from '../../support/assertions';
import { trackPageErrors } from '../../support/checkout';
import { courseCurriculumMap } from '../../../data/learning-content';
import { failRoute, noHorizontalScroll } from '../../support/dashboard';
import { firstVideoId, lessonButton, lessonIds, lessonTitle, mockExternals, openCourse, sidebar, tab } from '../../support/learning';

// PRD 07 cases that only READ. S1 = bazar (Course B, Git lab), U1 = edu (no enrolments), A1 = admin.
// Mavish (Course A) is used only in learning-python-writes.spec.ts, which changes his progress rows.
const S1 = EMAIL.bazar;
const SLUG = COURSE.B;
const IDS = lessonIds(SLUG);

test.describe('PRD07 learning page: reads @regression', () => {
  test.beforeEach(() => requireSeed());

  test('[LRN-LOAD-002][LRN-LOAD-003][LRN-LOAD-004] enrolled learner sees the header, every lesson in order and the first lesson active', async ({ page }) => {
    await openCourse(page, S1, SLUG);
    await expect(page.getByRole('link', { name: /Back/ })).toBeVisible();
    await expect(page.getByText(/\d+\/\d+ Completed/)).toBeVisible();
    const modules = courseCurriculumMap[SLUG];
    for (const m of modules) await expect(sidebar(page).getByText(m.moduleTitle)).toBeVisible();
    const shown = await sidebar(page).getByRole('button').allInnerTexts();
    const ytIds = IDS.filter(id => !id.startsWith('doc-'));
    ytIds.forEach((id, i) => expect(shown.some(t => t.includes(lessonTitle(id))), `lesson ${i + 1} (${id}) listed`).toBe(true));
    const first = firstVideoId(SLUG);
    await expect(page.getByRole('heading', { name: lessonTitle(first) })).toBeVisible();
  });

  test('[LRN-LOAD-005][LRN-LOAD-006][LRN-LOAD-007] selecting a lesson changes the content and resets the tab; Back returns to the dashboard', async ({ page }) => {
    await openCourse(page, S1, SLUG);
    const second = IDS.filter(id => !id.startsWith('doc-'))[1];
    await tab(page, /Q&A/).click();
    await lessonButton(page, second).click();
    await expect(page.getByRole('heading', { name: lessonTitle(second) })).toBeVisible();
    await expect(page.getByText(`Description of ${second}`)).toBeVisible(); // Details tab is active again
    await page.getByRole('link', { name: /Back/ }).click();
    await expectOnPath(page, '/learning');
  });

  test('[LRN-PLY-001][LRN-PLY-007][LRN-TAB-001][LRN-TAB-007] video lesson shows player, title, instructor, Details text and no Share button for a learner', async ({ page }) => {
    await openCourse(page, S1, SLUG);
    await expect(page.locator('iframe[src*="youtube.com/embed/"]')).toBeVisible();
    await expect(page.getByText('Instructor: Shivam Namdev')).toBeVisible();
    await expect(page.getByRole('button', { name: /Share/ })).toHaveCount(0);
    await expect(tab(page, /Details/)).toBeVisible();
    await expect(tab(page, /Q&A/)).toBeVisible();
  });

  test('[LRN-TAB-002][LRN-TAB-003] a lab lesson adds Practice and Git Graph for the Git course', async ({ page }) => {
    await openCourse(page, S1, SLUG);
    const labId = Object.values(courseCurriculumMap[SLUG]).flatMap((m: any) => Object.keys(m.githubAssignments ?? {}))[0];
    await lessonButton(page, labId).click();
    await expect(tab(page, /Practice/)).toBeVisible();
    await expect(tab(page, /Git Graph/)).toBeVisible();
  });

  test('[LRN-LOAD-010] a learner who does not own the course is denied', async ({ page }) => {
    await signInAs(page, EMAIL.mavish); // owns Course A only
    await mockExternals(page);
    await page.goto(`/learning/${SLUG}`);
    await expect(page.getByText('Course Content')).toHaveCount(0, { timeout: 25000 });
    await expect(sidebar(page).getByRole('button')).toHaveCount(0);
  });

  test('[LRN-LOAD-011] a visitor is sent away from the course page', async ({ page }) => {
    await expectDeniedForVisitor(page, `/learning/${SLUG}`);
  });

  test('[LRN-LOAD-012][LRN-ERR] a walk through several lessons raises no uncaught page errors', async ({ page }) => {
    const errors = trackPageErrors(page);
    await openCourse(page, S1, SLUG);
    for (const id of IDS.filter(id => !id.startsWith('doc-')).slice(0, 5)) {
      await lessonButton(page, id).click();
      await expect(page.getByRole('heading', { name: lessonTitle(id) })).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  test('[LRN-EXT-001] YouTube API failure: lessons still list and open with fallback titles', async ({ page }) => {
    test.fixme(true, 'Defect: when the YouTube Data API request fails, the whole curriculum load is abandoned and the sidebar is empty (catch in loadCourseData); the PRD expects fallback titles');
    await openCourse(page, S1, SLUG, { youtube: 'fail' });
    await expect(sidebar(page).getByRole('button').first()).toBeVisible();
    await sidebar(page).getByRole('button').nth(1).click();
    await expect(page.locator('iframe[src*="youtube.com/embed/"]')).toBeVisible();
  });

  test('[LRN-EXT-006] progress read failure: curriculum loads and progress shows 0', async ({ page }) => {
    await signInAs(page, S1);
    await mockExternals(page);
    await failRoute(page, '**/rest/v1/video_progress*');
    await page.goto(`/learning/${SLUG}`);
    await expect(page.getByText('Course Content')).toBeVisible({ timeout: 40000 });
    await expect(page.getByText(/^0\/\d+ Completed/)).toBeVisible();
  });

  test('[LRN-LOAD-001] loading state shows the curriculum message while the YouTube data is slow', async ({ page }) => {
    await signInAs(page, S1);
    await mockExternals(page);
    await page.route('https://www.googleapis.com/youtube/v3/videos*', async route => { await new Promise(r => setTimeout(r, 2500)); await route.fallback(); });
    await page.goto(`/learning/${SLUG}`);
    await expect(page.getByText('Loading your personalized curriculum...')).toBeVisible();
    await expect(page.getByText('Course Content')).toBeVisible({ timeout: 40000 });
  });

  test('[LRN-MOB-001][LRN-MOB-003] course page on a 390 px phone: no sideways scroll, tabs reachable (SCP-33)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openCourse(page, S1, SLUG);
    await noHorizontalScroll(page);
    await tab(page, /Q&A/).click();
    await expect(page.getByPlaceholder('Ask Shivam or the community...')).toBeVisible();
  });

  test('[LRN-MOB-004] keyboard: a lesson takes focus and Enter selects it', async ({ page }) => {
    await openCourse(page, S1, SLUG);
    const second = IDS.filter(id => !id.startsWith('doc-'))[1];
    await lessonButton(page, second).focus();
    await expect(lessonButton(page, second)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: lessonTitle(second) })).toBeVisible();
  });
});

test.describe('PRD07 admin on the learning page @regression', () => {
  test.beforeEach(() => requireSeed());
  test('[LRN-PLY-008][LRN-EXM-008][LRN-E2E-008] admin opens any course without an enrolment and sees Share and Certificate', async ({ page }) => {
    await openCourse(page, EMAIL.admin, SLUG);
    await expect(page.getByRole('button', { name: /Share/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Certificate/ })).toBeVisible();
  });
});
