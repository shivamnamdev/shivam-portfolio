import { test, expect } from '@playwright/test';
import { signInAs, signInThroughHostedRedirect, signOutViaClerk } from '../../support/clerk';
import { requireSeed, requireSignIn } from '../../support/guards';
import { AUTH, COURSE, EMAIL } from '../../support/personas';
import {
  expectDeniedForVisitor, expectLearningDashboard, expectOnPath, openUserMenu, signOutThroughUi, submitUnknownAccount,
} from '../../support/assertions';

// PRD 01 · sheets "Clerk Sign-In", "Post-Login Redirect", "Sign-Out", "Session Persistence".
// Authentication uses a Clerk sign-in token because the personas are Google accounts (see TEST_DATA.md).

test.describe('PRD01 Clerk sign-in UI @regression', () => {
  test('[AUTH-LOGIN-001] Log In opens the Clerk sign-in UI', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Log In' }).first().click();
    await expect(page.locator('.cl-modalContent, .cl-rootBox').first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator('input[name="identifier"]')).toBeVisible();
  });

  test('[AUTH-LOGIN-008][AUTH-LOGIN-011] an unknown account is rejected with a clear message', async ({ page }) => {
    await submitUnknownAccount(page);
  });

  test('[AUTH-LOGIN-009] a failed login creates no session', async ({ page }) => {
    await submitUnknownAccount(page);
    await expectDeniedForVisitor(page, '/learning');
  });

  test('[AUTH-LOGIN-010] closing the sign-in UI leaves the visitor signed out', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Log In' }).first().click();
    await expect(page.locator('input[name="identifier"]')).toBeVisible({ timeout: 20000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('input[name="identifier"]')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Log In' }).first()).toBeVisible();
  });
});

test.describe('PRD01 Signed-in behaviour @regression', () => {
  test.beforeEach(() => requireSignIn());

  test('[AUTH-LOGIN-002][AUTH-LOGIN-003] a valid sign-in shows the signed-in navigation', async ({ page }) => {
    await signInAs(page, AUTH.U1);
    await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log In' })).toHaveCount(0);
  });

  test('[AUTH-LOGIN-004] the account menu shows the signed-in user', async ({ page }) => {
    await signInAs(page, AUTH.U1);
    await openUserMenu(page);
    await expect(page.getByText(EMAIL.edu).first()).toBeVisible();
  });

  test('[AUTH-LOGIN-005][AUTH-REDIR-001][AUTH-REDIR-004] sign-in from /learning returns to /learning without a loop', async ({ page }) => {
    const hops: string[] = [];
    page.on('framenavigated', f => { if (f === page.mainFrame()) hops.push(new URL(f.url()).pathname); });
    await signInThroughHostedRedirect(page, '/learning', AUTH.U1);
    await expectOnPath(page, '/learning');
    await expectLearningDashboard(page);
    expect(hops.length, `login must settle without a redirect loop (saw ${hops.join(' > ')})`).toBeLessThan(15);
  });

  test('[AUTH-LOGIN-006][AUTH-REDIR-002] sign-in from a live route follows the configured flow', async ({ page }) => {
    requireSeed();
    await signInThroughHostedRedirect(page, `/live/${COURSE.A}`, AUTH.S1);
    await expectOnPath(page, `/live/${COURSE.A}`);
    await expect(page.getByText('Access Denied')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 25000 });
  });

  test('[AUTH-LOGIN-007][AUTH-REDIR-003] a non-admin who signs in at /admin lands on the dashboard, not admin', async ({ page }) => {
    await signInThroughHostedRedirect(page, '/admin', AUTH.U1);
    await expectOnPath(page, '/learning');
    await expect(page.getByText('Admin Command Center')).toHaveCount(0);
  });

  test('[AUTH-LOGIN-012] a failed attempt does not stop a later valid sign-in', async ({ page }) => {
    await submitUnknownAccount(page);
    await signInAs(page, AUTH.U1);
    await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible();
  });

  test('[AUTH-REDIR-005] cancelling authentication from a protected route keeps the visitor out', async ({ page }) => {
    await expectDeniedForVisitor(page, '/learning');
    await expect(page.getByText('My Enrolled Courses')).toHaveCount(0);
  });
});

test.describe('PRD01 Sign-out @regression', () => {
  test.beforeEach(() => requireSignIn());

  test('[AUTH-LOGOUT-001][AUTH-LOGOUT-002] signing out through the account menu returns to the signed-out navigation', async ({ page }) => {
    await signInAs(page, AUTH.U1);
    await signOutThroughUi(page);
    await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);
  });

  test('[AUTH-LOGOUT-003][AUTH-SESS-007][AUTH-LOGOUT-008] sign-out invalidates the session, also after a refresh', async ({ page }) => {
    await signInAs(page, AUTH.U1);
    await signOutThroughUi(page);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Log In' }).first()).toBeVisible();
    await expectDeniedForVisitor(page, '/learning');
  });

  test('[AUTH-LOGOUT-007] browser Back after sign-out does not reveal authorised content', async ({ page }) => {
    await signInAs(page, AUTH.S1);
    await page.goto('/learning');
    await expectLearningDashboard(page);
    await signOutThroughUi(page);
    await page.goBack();
    await expect.poll(async () => (await page.getByText('My Enrolled Courses').count()) === 0 || new URL(page.url()).pathname !== '/learning',
      { timeout: 20000 }).toBe(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 20000 }).not.toBe('/learning');
  });

  test('[AUTH-LOGOUT-009] a previously opened protected URL is denied after sign-out', async ({ page }) => {
    await signInAs(page, AUTH.S1);
    await page.goto('/learning');
    await expectLearningDashboard(page);
    const url = page.url();
    await signOutViaClerk(page);
    await expectDeniedForVisitor(page, new URL(url).pathname);
  });

  test('[AUTH-LOGOUT-010] signing out in one tab denies the same URL in another tab', async ({ context }) => {
    const tabA = await context.newPage();
    await signInAs(tabA, AUTH.S1);
    await tabA.goto('/learning');
    await expectLearningDashboard(tabA);
    const tabB = await context.newPage();
    await tabB.goto('/learning');
    await expectLearningDashboard(tabB);
    await signOutViaClerk(tabA);
    await expectDeniedForVisitor(tabB, '/learning');
  });
});

test.describe('PRD01 Session persistence @regression', () => {
  test.beforeEach(() => requireSignIn());

  test('[AUTH-SESS-001][AUTH-SESS-006] the session persists while navigating', async ({ page }) => {
    await signInAs(page, AUTH.U1);
    for (const path of ['/about', '/courses', '/learning', '/contact']) {
      await page.goto(path);
      await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible();
    }
  });

  test('[AUTH-SESS-002][AUTH-SESS-004] the session and navigation state survive a refresh', async ({ page }) => {
    await signInAs(page, AUTH.U1);
    await page.reload();
    await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log In' })).toHaveCount(0);
  });

  test('[AUTH-SESS-003] /learning stays authorised after a refresh', async ({ page }) => {
    await signInAs(page, AUTH.S1);
    await page.goto('/learning');
    await expectLearningDashboard(page);
    await page.reload();
    await expectLearningDashboard(page);
  });

  test('[AUTH-SESS-005][AUTH-ADMIN-014] an admin session persists on /admin after a refresh', async ({ page }) => {
    await signInAs(page, AUTH.A1);
    await page.goto('/admin');
    await expect(page.getByText('Admin Command Center')).toBeVisible({ timeout: 25000 });
    await page.reload();
    await expect(page.getByText('Admin Command Center')).toBeVisible({ timeout: 25000 });
  });

  test('[AUTH-SESS-010] reopening a protected URL in a new tab of the same browser keeps the session', async ({ context }) => {
    const first = await context.newPage();
    await signInAs(first, AUTH.S1);
    await first.goto('/learning');
    await expectLearningDashboard(first);
    await first.close();
    const reopened = await context.newPage();
    await reopened.goto('/learning');
    await expectLearningDashboard(reopened);
  });
});
