import { test, expect } from '@playwright/test';
import { activeCourses, isQaFixture } from '../../../data/courses';
import { courseCurriculumMap } from '../../../data/learning-content';
import { signInAs } from '../../support/clerk';
import { requireSeed, requireSignIn } from '../../support/guards';
import { COURSE, PUB } from '../../support/personas';
import { expectDeniedForVisitor, expectLearningDashboard, expectOnPath, PROTECTED_MARKERS } from '../../support/assertions';

// PRD 02 · Public Pages & Navigation, sheets: Public Landing Experience, Primary Navigation,
// Legal & Informational Pages, Public Security Boundary. Titles carry the workbook case ids.
const realCourses = activeCourses.filter(c => !isQaFixture(c.slug));
const NAV: [string, string][] = [['Home', '/'], ['Courses', '/courses'], ['About', '/about'], ['Contact', '/contact']];
const LEGAL: [string, string, RegExp, number][] = [ // id, path, heading, minimum words of real content
  ['PUB-INFO-001', '/privacy', /privacy/i, 30], ['PUB-INFO-002', '/terms', /terms/i, 30], ['PUB-INFO-003', '/refund', /refund/i, 30],
  ['PUB-INFO-004', '/contact', /connect|contact/i, 15], ['PUB-INFO-005', '/mentorship', /mentorship/i, 15],
];

test.describe('PRD02 Public landing experience @regression', () => {
  test('[PUB-LAND-001][PUB-LAND-010][PUB-LAND-011] the homepage loads and browses without sign-in', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Tech Mastery');
    await page.mouse.wheel(0, 2500);
    await expect(page.locator('.cl-modalContent')).toHaveCount(0);
    await expectOnPath(page, '/');
  });

  test('[PUB-LAND-003][PUB-LAND-007] the primary CTAs are visible and usable without login', async ({ page }) => {
    await page.goto('/');
    const explore = page.getByRole('link', { name: 'Explore Courses' });
    await expect(explore).toBeVisible();
    await expect(explore).toBeEnabled();
    await expect(page.getByRole('link', { name: /Apply Now/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Try it out/i })).toBeVisible();
  });

  test('[PUB-LAND-004][PUB-LAND-012] benefits and the value proposition are stated', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Python Engineering/i).first()).toBeVisible();
    await expect(page.getByText(/live cohorts/i).first()).toBeVisible();
    await expect(page.getByText(/practice labs/i).first()).toBeVisible();
  });

  test('[PUB-LAND-005] a course overview is available from the homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Shivam Academy' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Explore Courses' })).toHaveAttribute('href', '/courses');
  });

  test('[PUB-LAND-006] testimonials / social proof are shown on the homepage', async ({ page }) => {
    // The workbook marks this passed; the homepage has no testimonials section (they live on course pages,
    // and components/Testimonials.tsx is not used anywhere: PRD section 13 E5). Kept as written so it shows in Allure.
    await page.goto('/');
    await expect(page.getByText(/testimonial|what our learners say|learners say|reviews/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('[PUB-LAND-008] the homepage leads to course discovery', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Explore Courses' }).click();
    await expectOnPath(page, '/courses');
    await expect(page.getByRole('heading', { name: 'Course Catalog' })).toBeVisible();
    await expect(page.getByRole('link', { name: /View Details/i }).first()).toBeVisible();
  });

  test('[PUB-LAND-009] a course page supports the enrollment journey', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Explore Courses' }).click();
    await page.getByRole('link', { name: /View Details/i }).first().click();
    await expect(page).toHaveURL(/\/courses\/[a-z0-9-]+$/);
    await expect(page.getByRole('button', { name: /View Open Cohorts|Buy Now|Enroll for Free|Go to Dashboard/i }).first()).toBeVisible();
  });
});

test.describe('PRD02 Primary navigation @regression', () => {
  for (const [label, path] of NAV) {
    const id = { Home: 'PUB-NAV-001', Courses: 'PUB-NAV-002', About: 'PUB-NAV-003', Contact: 'PUB-NAV-004' }[label]!;
    test(`[${id}] ${label} navigation opens ${path}`, async ({ page }) => {
      await page.goto(path === '/' ? '/about' : '/');
      await page.getByRole('navigation').getByRole('link', { name: label, exact: true }).first().click();
      await expectOnPath(page, path);
    });
  }

  test('[PUB-NAV-005] Log In opens the authentication flow', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Log In' }).first().click();
    await expect(page.locator('input[name="identifier"]')).toBeVisible({ timeout: 20000 });
  });

  test('[PUB-NAV-006][PUB-SEC-003] no Dashboard (or other restricted) link is exposed to a visitor', async ({ page }) => {
    for (const path of ['/', '/courses', '/about']) {
      await page.goto(path);
      await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);
      await expect(page.locator('a[href^="/learning"], a[href^="/admin"], a[href^="/live"]')).toHaveCount(0);
    }
  });

  test('[PUB-NAV-010][PUB-NAV-011][PUB-NAV-012][PUB-NAV-013] navigation stays consistent, has no dead ends and guides a visitor to discovery or login', async ({ page }) => {
    await page.goto('/');
    for (const [label, path] of [...NAV, ['Courses', '/courses'] as [string, string]]) {
      await page.getByRole('navigation').getByRole('link', { name: label, exact: true }).first().click();
      await expectOnPath(page, path);
      await expect(page.getByRole('heading').first()).toBeVisible();
      for (const [other] of NAV) await expect(page.getByRole('navigation').getByRole('link', { name: other, exact: true }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Log In' }).first()).toBeVisible();
    }
  });

  test.describe('signed in', () => {
    test.beforeEach(() => requireSignIn());

    test('[PUB-NAV-008][PUB-NAV-014] an authenticated user sees the authenticated navigation without admin destinations', async ({ page }) => {
      await signInAs(page, PUB.U1);
      await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Log In' })).toHaveCount(0);
      await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);
    });

    test('[PUB-NAV-009][PUB-NAV-014] a student gets learning destinations that open', async ({ page }) => {
      requireSeed();
      await signInAs(page, PUB.S1);
      await page.getByRole('link', { name: 'Dashboard' }).first().click();
      await expectOnPath(page, '/learning');
      await expectLearningDashboard(page);
    });
  });
});

test.describe('PRD02 Legal and informational pages @regression', () => {
  for (const [id, path, heading, minWords] of LEGAL) {
    test(`[${id}][PUB-INFO-007][PUB-INFO-008] ${path} loads publicly, is readable and does not redirect to login`, async ({ page, request }) => {
      const res = await request.get(path, { maxRedirects: 0, headers: { 'User-Agent': 'shivam-academy-api-tests' } });
      expect(res.status()).toBe(200);
      await page.goto(path);
      await expectOnPath(page, path);
      await expect(page.getByRole('heading', { level: 1 }).first()).toContainText(heading);
      const words = (await page.locator('main').innerText()).split(/\s+/).length;
      expect(words, 'page has real content').toBeGreaterThan(minWords);
    });
  }

  test('[PUB-INFO-006] legal pages can be found from the footer', async ({ page }) => {
    await page.goto('/');
    for (const name of ['Privacy Policy', 'Terms of Service', 'Refund Policy']) {
      await expect(page.getByRole('link', { name })).toBeVisible();
    }
  });

  test('[PUB-INFO-009] from a legal page the visitor can return to the shopping journey', async ({ page }) => {
    await page.goto('/privacy');
    await page.getByRole('navigation').getByRole('link', { name: 'Courses', exact: true }).first().click();
    await expectOnPath(page, '/courses');
    await expect(page.getByRole('link', { name: /View Details/i }).first()).toBeVisible();
  });

  test('[PUB-INFO-010] a student returns from a legal page to the learning area', async ({ page }) => {
    requireSeed();
    await signInAs(page, PUB.S1);
    await page.goto('/terms');
    await page.getByRole('link', { name: 'Dashboard' }).first().click();
    await expectOnPath(page, '/learning');
    await expectLearningDashboard(page);
  });
});

test.describe('PRD02 Public security boundary @regression', () => {
  test('[PUB-SEC-001] the homepage exposes no protected content', async ({ page }) => {
    await page.goto('/');
    for (const marker of PROTECTED_MARKERS) await expect(page.getByText(marker)).toHaveCount(0);
  });

  test('[PUB-SEC-002] a course page shows public information only, not learning content', async ({ page }) => {
    await page.goto(`/courses/${realCourses[0].slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    for (const text of ['Course Content', 'Access Denied', ...PROTECTED_MARKERS]) await expect(page.getByText(text)).toHaveCount(0);
  });

  test('[PUB-SEC-004] an unauthorised share link leaves protected content closed (visitor)', async ({ page }) => {
    const videoId = courseCurriculumMap[COURSE.B][0].videoIds[0];
    await page.goto(`/share/${videoId}`);
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 20000 }).toBe(`/courses/${COURSE.B}`);
    await expect(page.getByText('Course Content')).toHaveCount(0);
  });

  test('[PUB-SEC-004] an unauthorised share link leaves protected content closed (signed-in non-owner, SL2)', async ({ page }) => {
    requireSeed();
    const videoId = courseCurriculumMap[COURSE.B][0].videoIds[0];
    await signInAs(page, PUB.SL2);
    await page.goto(`/share/${videoId}`);
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 25000 }).toBe(`/courses/${COURSE.B}`);
    await expect(page.getByText('Course Content')).toHaveCount(0);
  });

  test('[PUB-SEC-005][PUB-SEC-006] public-to-learning and public-to-dashboard handoffs keep the access checks', async ({ page }) => {
    await expectDeniedForVisitor(page, '/learning');
    await expectDeniedForVisitor(page, `/learning/${COURSE.A}`);
  });
});
