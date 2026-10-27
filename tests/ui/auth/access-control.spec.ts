import { test, expect } from '@playwright/test';
import { signInAs, signInThroughHostedRedirect, signOutViaClerk } from '../../support/clerk';
import { grantTestEnrolment, revokeTestEnrolment } from '../../support/db';
import { requireSeed, requireSignIn } from '../../support/guards';
import { AUTH, COURSE, EMAIL } from '../../support/personas';
import {
  expectAdminDenied, expectAdminPage, expectCourseAccessible, expectCourseDenied, expectDeniedForVisitor,
  expectEmptyDashboard, expectLearningDashboard, expectLiveDenied, expectLiveLobby, expectNoAdminLink, expectOnPath,
  signOutThroughUi,
} from '../../support/assertions';

// PRD 01 · enrolment, course-level, admin, role matrix, negative scenarios and journeys.
// Needs the seeded QA personas (E2E_SEED_PERSONAS=1): U1 edu = no courses, S1 mavish = Course A, S2 bazar = Course B.
// Sequential because the "enrolment changes" cases temporarily grant/revoke Course C for U1.
test.describe.configure({ mode: 'default' }); // sequential in one worker, but a failure does not skip the rest
test.beforeEach(() => requireSeed());

test.describe('PRD01 Authenticated, not enrolled @regression', () => {
  test('[AUTH-ENR-001][AUTH-ENR-002][AUTH-ENR-006][AUTH-MATRIX-006][AUTH-NEG-018][AUTH-BYPASS-003] a signed-in user without enrolment gets an empty dashboard, not course content', async ({ page }) => {
    await signInAs(page, AUTH.U1);
    await expectEmptyDashboard(page);
    await page.goto('/learning?enrolled=true');
    await expectEmptyDashboard(page);
  });

  test('[AUTH-ENR-003][AUTH-ENR-005][AUTH-ENR-008][AUTH-COURSE-004][AUTH-DEEP-004][AUTH-NEG-004][AUTH-NEG-016] a non-enrolled user opening Course A directly sees Access Denied', async ({ page }) => {
    await signInAs(page, AUTH.U1);
    await expectCourseDenied(page, COURSE.A);
    await expect(page.getByRole('link', { name: 'Enroll In Course' })).toBeVisible();
  });

  test('[AUTH-COURSE-005] a non-enrolled user opening Course B sees Access Denied', async ({ page }) => {
    await signInAs(page, AUTH.U1);
    await expectCourseDenied(page, COURSE.B);
  });

  test('[AUTH-ENR-004][AUTH-MATRIX-010] a non-enrolled user is denied the live lobby', async ({ page }) => {
    await signInAs(page, AUTH.U1);
    await expectLiveDenied(page, COURSE.A);
  });

  test('[AUTH-ENR-007][AUTH-NEG-013] a refresh keeps a non-enrolled user out', async ({ page }) => {
    await signInAs(page, AUTH.U1);
    await expectCourseDenied(page, COURSE.A);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible({ timeout: 30000 });
  });
});

test.describe('PRD01 Enrolled student @regression', () => {
  test('[AUTH-STU-001][AUTH-STU-006][AUTH-MATRIX-007] an enrolled student sees their course on the dashboard', async ({ page }) => {
    await signInAs(page, AUTH.S1);
    await page.goto('/learning');
    await expectLearningDashboard(page);
    await expect(page.getByText('Python Live Session (Batch 2)').first()).toBeVisible();
    await expect(page.getByText('No courses yet!')).toHaveCount(0);
  });

  test('[AUTH-STU-002][AUTH-COURSE-001][AUTH-COURSE-006][AUTH-DEEP-005] an enrolled student can open their course', async ({ page }) => {
    await signInAs(page, AUTH.S1);
    await expectCourseAccessible(page, COURSE.A);
  });

  test('[AUTH-STU-003][AUTH-MATRIX-011] an enrolled student can open the live lobby', async ({ page }) => {
    await signInAs(page, AUTH.S1);
    await expectLiveLobby(page, COURSE.A);
  });

  test('[AUTH-STU-004][AUTH-STU-009][AUTH-E2E-008] enrolment is still recognised after a refresh', async ({ page }) => {
    await signInAs(page, AUTH.S1);
    await page.goto('/learning');
    await expectLearningDashboard(page);
    await page.reload();
    await expectLearningDashboard(page);
    await expect(page.getByText('Python Live Session (Batch 2)').first()).toBeVisible();
  });

  test('[AUTH-STU-005] the Dashboard link opens the learning area', async ({ page }) => {
    await signInAs(page, AUTH.S1);
    await page.getByRole('link', { name: 'Dashboard' }).first().click();
    await expectOnPath(page, '/learning');
    await expectLearningDashboard(page);
  });

  test('[AUTH-STU-007] an enrolled student opens their course in a new tab', async ({ context }) => {
    const first = await context.newPage();
    await signInAs(first, AUTH.S1);
    const tab = await context.newPage();
    await expectCourseAccessible(tab, COURSE.A);
  });
});

test.describe('PRD01 Course-level authorisation @regression', () => {
  test('[AUTH-COURSE-002][AUTH-COURSE-007][AUTH-DEEP-006][AUTH-NEG-007][AUTH-NEG-019][AUTH-E2E-010] a Course A student is denied Course B', async ({ page }) => {
    await signInAs(page, AUTH.S1);
    await expectCourseDenied(page, COURSE.B);
  });

  test('[AUTH-STU-008][AUTH-COURSE-003] a Course B student is denied Course A', async ({ page }) => {
    await signInAs(page, AUTH.S2);
    await expectCourseDenied(page, COURSE.A);
  });

  test('[AUTH-COURSE-008][AUTH-BYPASS-004] query parameters do not unlock another course', async ({ page }) => {
    await signInAs(page, AUTH.S1);
    await expectCourseDenied(page, COURSE.B, `?v=doc-thinking-pattern&course=${COURSE.A}&enrolled=true`);
  });

  test('[AUTH-COURSE-009][AUTH-COURSE-010][AUTH-STU-010] access follows an enrolment that is added and then removed', async ({ page }) => {
    await signInAs(page, AUTH.U1);
    await expectCourseDenied(page, COURSE.C);
    try {
      await grantTestEnrolment(EMAIL.edu, COURSE.C);
      await expectCourseAccessible(page, COURSE.C);
    } finally {
      await revokeTestEnrolment(EMAIL.edu, COURSE.C);
    }
    await expectCourseDenied(page, COURSE.C);
  });
});

test.describe('PRD01 Admin access control @regression', () => {
  test('[AUTH-ADMIN-002][AUTH-DEEP-007][AUTH-NEG-005][AUTH-NEG-015][AUTH-MATRIX-014][AUTH-ADMIN-011][AUTH-BYPASS-002][AUTH-NEG-020] a signed-in non-admin is sent to the dashboard, also with role=admin', async ({ page }) => {
    await signInAs(page, AUTH.U1);
    await expectAdminDenied(page);
    await expectAdminDenied(page, '?role=admin');
  });

  test('[AUTH-ADMIN-003][AUTH-ADMIN-010][AUTH-NEG-006][AUTH-NEG-017][AUTH-MATRIX-015][AUTH-E2E-005] an enrolled student typing /admin is sent to the dashboard', async ({ page }) => {
    await signInAs(page, AUTH.S1);
    await expectAdminDenied(page);
  });

  test('[AUTH-ADMIN-012] a non-admin refresh of /admin stays denied', async ({ page }) => {
    await signInAs(page, AUTH.U1);
    await expectAdminDenied(page);
    await page.goto('/admin');
    await page.reload();
    await expectOnPath(page, '/learning', 25000);
  });

  test('[AUTH-ADMIN-013] /admin in a new tab stays denied for a student', async ({ context }) => {
    const first = await context.newPage();
    await signInAs(first, AUTH.S1);
    const tab = await context.newPage();
    await expectAdminDenied(tab);
  });

  test('[AUTH-ADMIN-004][AUTH-ADMIN-005][AUTH-DEEP-008][AUTH-MATRIX-016][AUTH-E2E-006] the admin opens /admin', async ({ page }) => {
    await signInAs(page, AUTH.A1);
    await expectAdminPage(page);
  });

  test('[AUTH-ADMIN-006][AUTH-MATRIX-020] admin controls are available to the admin', async ({ page }) => {
    await signInAs(page, AUTH.A1);
    await expectAdminPage(page);
    await expect(page.getByRole('button', { name: 'Grant Access' })).toBeVisible();
    await page.getByRole('button', { name: 'Grant Access' }).click();
    await expect(page.getByText('Manual Enrollment / Backdoor')).toBeVisible();
  });

  test('[AUTH-ADMIN-007][AUTH-ADMIN-008][AUTH-ADMIN-009][AUTH-UI-005][AUTH-UI-006][AUTH-UI-007][AUTH-MATRIX-017][AUTH-MATRIX-018][AUTH-MATRIX-019] no admin link is exposed to visitors, users or students', async ({ page, browser }) => {
    const visitor = await browser.newContext({ baseURL: `http://localhost:${process.env.PORT ?? '3000'}` });
    const vp = await visitor.newPage();
    await vp.goto('/');
    await expectNoAdminLink(vp);
    await visitor.close();
    for (const persona of [AUTH.U1, AUTH.S1]) {
      await signInAs(page, persona);
      await expectNoAdminLink(page);
      await signOutViaClerk(page);
    }
  });

  test('[AUTH-ADMIN-015][AUTH-E2E-007] /admin is denied after the admin signs out', async ({ page }) => {
    await signInAs(page, AUTH.A1);
    await expectAdminPage(page);
    await signOutViaClerk(page);
    await expectDeniedForVisitor(page, '/admin');
  });

  test('[AUTH-ADMIN-016][AUTH-CACHE-003] Back after admin sign-out does not reveal admin content as authorised', async ({ page }) => {
    await signInAs(page, AUTH.A1);
    await expectAdminPage(page);
    await signOutThroughUi(page);
    await page.goBack();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Admin Command Center')).toHaveCount(0);
  });
});

test.describe('PRD01 Navigation by role and cache behaviour @regression', () => {
  test('[AUTH-UI-001] a visitor sees Log In', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Log In' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);
  });

  test('[AUTH-UI-002][AUTH-UI-003][AUTH-UI-009] signed-in users see Dashboard instead of Log In', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Log In' }).first()).toBeVisible();
    await signInAs(page, AUTH.S1);
    await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log In' })).toHaveCount(0);
  });

  test('[AUTH-UI-004][AUTH-UI-008] the admin sees the same navigation, and the admin controls only on /admin', async ({ page }) => {
    await signInAs(page, AUTH.A1);
    await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible();
    await expectNoAdminLink(page); // finding: there is no admin link in the navigation, even for the admin
    await expectAdminPage(page);
  });

  test('[AUTH-UI-010] signing out switches the navigation back to the visitor state', async ({ page }) => {
    await signInAs(page, AUTH.S1);
    await signOutViaClerk(page);
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Log In' }).first()).toBeVisible();
  });

  test('[AUTH-CACHE-001][AUTH-CACHE-002][AUTH-CACHE-004][AUTH-CACHE-005][AUTH-CACHE-006][AUTH-NEG-014][AUTH-NEG-008][AUTH-E2E-009] Back, Forward and refresh after sign-out never restore authorised content', async ({ page }) => {
    await signInAs(page, AUTH.S1);
    await page.goto('/learning');
    await expectLearningDashboard(page);
    await signOutThroughUi(page);
    await page.goBack();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 20000 }).not.toBe('/learning');
    await page.goForward().catch(() => undefined);
    await expect(page.getByText('My Enrolled Courses')).toHaveCount(0);
    await expectDeniedForVisitor(page, '/learning');
  });
});

test.describe('PRD01 Role access matrix @regression', () => {
  test('[AUTH-MATRIX-001][AUTH-MATRIX-005][AUTH-MATRIX-009][AUTH-MATRIX-013] visitor: public yes, learning / live / admin no', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    for (const path of ['/learning', '/live', '/admin']) await expectDeniedForVisitor(page, path);
  });

  test('[AUTH-MATRIX-002][AUTH-MATRIX-006][AUTH-MATRIX-010][AUTH-MATRIX-014] signed-in user without enrolment: public and dashboard yes, live and admin no', async ({ page }) => {
    await signInAs(page, AUTH.U1);
    await page.goto('/courses');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectEmptyDashboard(page);
    await expectLiveDenied(page, COURSE.A);
    await expectAdminDenied(page);
  });

  test('[AUTH-MATRIX-003][AUTH-MATRIX-007][AUTH-MATRIX-011][AUTH-MATRIX-015] enrolled student: public, dashboard and live yes, admin no', async ({ page }) => {
    await signInAs(page, AUTH.S1);
    await page.goto('/courses');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.goto('/learning');
    await expectLearningDashboard(page);
    await expectLiveLobby(page, COURSE.A);
    await expectAdminDenied(page);
  });

  test('[AUTH-MATRIX-004][AUTH-MATRIX-008][AUTH-MATRIX-012][AUTH-MATRIX-016] admin: public, dashboard, any live lobby and admin all yes', async ({ page }) => {
    await signInAs(page, AUTH.A1);
    await page.goto('/courses');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.goto('/learning');
    await expectLearningDashboard(page);
    await expectLiveLobby(page, COURSE.B);
    await expectAdminPage(page);
  });
});

test.describe('PRD01 End-to-end journeys @regression', () => {
  test('[AUTH-E2E-001] public page, then login, then the authenticated UI', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await signInAs(page, AUTH.U1);
    await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible();
  });

  test('[AUTH-E2E-002] visitor opens /learning, signs in as a student and lands on the learning area', async ({ page }) => {
    await signInThroughHostedRedirect(page, '/learning', AUTH.S1);
    await expectOnPath(page, '/learning');
    await expect(page.getByText('Python Live Session (Batch 2)').first()).toBeVisible({ timeout: 25000 });
  });

  test('[AUTH-E2E-003] visitor opens /learning, signs in without enrolment: signed in, nothing to learn yet', async ({ page }) => {
    await signInThroughHostedRedirect(page, '/learning', AUTH.U1);
    await expectOnPath(page, '/learning');
    await expectEmptyDashboard(page);
  });

  test('[AUTH-E2E-004] student: learning, sign out, learning again is denied', async ({ page }) => {
    await signInAs(page, AUTH.S1);
    await page.goto('/learning');
    await expectLearningDashboard(page);
    await signOutThroughUi(page);
    await expectDeniedForVisitor(page, '/learning');
  });
});

void requireSignIn;

// SCP-29: the internal API spec is admin-only and decided on the server.
test.describe('PRD01 API docs are admin-only (SCP-29) @regression', () => {
  test('[SCP-29] a visitor is turned away from /api-docs', async ({ page }) => {
    await page.goto('/api-docs', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 25000 }).not.toBe('/api-docs');
    await expect(page.getByText('Internal API Spec')).toHaveCount(0);
  });

  test('[SCP-29] a signed-in non-admin is sent to the dashboard and never receives the spec', async ({ page }) => {
    await signInAs(page, AUTH.S1);
    const response = await page.goto('/api-docs', { waitUntil: 'domcontentloaded' });
    await expectOnPath(page, '/learning', 25000);
    await expect(page.getByText('Internal API Spec')).toHaveCount(0);
    // The spec text must not be in what the server sent.
    const raw = await page.request.get('/api-docs', { maxRedirects: 0 });
    expect(await raw.text()).not.toContain('/api/get-clerk-users');
    void response;
  });

  test('[SCP-29] the admin can open /api-docs', async ({ page }) => {
    await signInAs(page, AUTH.A1);
    await page.goto('/api-docs');
    await expect(page.getByText('Internal API Spec')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(EMAIL.admin).first()).toBeVisible();
  });

  test('[SCP-29] the other former testers are no longer allowed', async ({ page }) => {
    await signInAs(page, AUTH.U1); // shivamnamdev.edu@gmail.com was on the old allowlist
    await page.goto('/api-docs', { waitUntil: 'domcontentloaded' });
    await expectOnPath(page, '/learning', 25000);
    await expect(page.getByText('Internal API Spec')).toHaveCount(0);
  });
});
