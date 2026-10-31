import { expect, type APIRequestContext, type Page } from '@playwright/test';

// Strings that only appear when protected UI is actually rendered.
export const PROTECTED_MARKERS = ['My Enrolled Courses', 'Admin Command Center', 'Welcome back,'];

export async function expectNoProtectedContent(page: Page) {
  for (const text of PROTECTED_MARKERS) await expect(page.getByText(text, { exact: false })).toHaveCount(0);
}

// A visitor must not stay on the protected URL: Clerk middleware sends them to sign-in, or the page sends them home.
export async function expectDeniedForVisitor(page: Page, pathWithQuery: string) {
  const wanted = new URL(pathWithQuery, 'http://x').pathname.replace(/\/$/, '') || '/';
  await page.goto(pathWithQuery, { waitUntil: 'domcontentloaded' });
  const baseOrigin = `http://localhost:${process.env.PORT ?? '3000'}`;
  await expect.poll(() => {
    const u = new URL(page.url());
    const here = u.pathname.replace(/\/$/, '') || '/';
    return u.origin === baseOrigin && here === wanted ? 'stayed' : 'left';
  }, { timeout: 25000, message: `${wanted} must not stay open for a visitor` }).toBe('left');
  await expectNoProtectedContent(page);
}

// Server-side check, no browser: follow redirects by hand (max 4 hops) and require that a protected path
// ends in Clerk sign-in / 401 / 404 and never returns protected markup.
export async function expectServerDeniesVisitor(request: APIRequestContext, path: string) {
  let url = path;
  for (let hop = 0; hop < 4; hop++) {
    const res = await request.get(url, { maxRedirects: 0, headers: { 'User-Agent': 'shivam-academy-api-tests' } });
    const body = await res.text();
    for (const marker of PROTECTED_MARKERS) expect(body, `${url} must not expose "${marker}"`).not.toContain(marker);
    const location = res.headers()['location'];
    if (res.status() === 307 || res.status() === 302) {
      expect(location, `${url} should redirect to sign-in`).toMatch(/sign-in/);
      return;
    }
    if (res.status() === 308 && location) { url = location; continue; } // trailing-slash normalisation
    expect([401, 403, 404], `${url} returned ${res.status()}`).toContain(res.status());
    return;
  }
  throw new Error(`${path}: too many redirects`);
}

export async function expectOnPath(page: Page, pathname: string, timeout = 20000) {
  await expect.poll(() => new URL(page.url()).pathname.replace(/\/$/, '') || '/', { timeout }).toBe(pathname);
}

export async function openUserMenu(page: Page) {
  await page.locator('.cl-userButtonTrigger').first().click();
}

export async function signOutThroughUi(page: Page) {
  await openUserMenu(page);
  await page.getByRole('menuitem', { name: 'Sign out' }).first().click();
  await expect(page.getByRole('button', { name: 'Log In' }).first()).toBeVisible({ timeout: 20000 });
}

export async function expectLearningDashboard(page: Page) {
  await expect(page.getByText('My Enrolled Courses')).toBeVisible({ timeout: 25000 });
}

// Opens the Clerk modal and submits an email that has no account; resolves once Clerk shows its error.
export async function submitUnknownAccount(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Log In' }).first().click();
  await page.locator('input[name="identifier"]').fill('no-such-user-qa@example.com');
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Couldn.t find your account/i)).toBeVisible({ timeout: 20000 });
}

// ---- signed-in access markers (what the app really renders) ----
export async function expectCourseAccessible(page: Page, slug: string, query = '') {
  await page.goto(`/learning/${slug}${query}`);
  await expect(page.getByText('Verifying your course access')).toBeHidden({ timeout: 30000 });
  await expect(page.getByText('Access Denied')).toHaveCount(0);
  await expect(page.getByText('Course Content').first()).toBeVisible({ timeout: 20000 });
}

export async function expectCourseDenied(page: Page, slug: string, query = '') {
  await page.goto(`/learning/${slug}${query}`);
  await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('Course Content')).toHaveCount(0);
}

export async function expectLiveLobby(page: Page, slug: string) {
  await page.goto(`/live/${slug}`);
  await expect(page.getByRole('heading', { name: 'Ready to join the class?' })).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('Access Denied')).toHaveCount(0);
}

export async function expectLiveDenied(page: Page, slug: string) {
  await page.goto(`/live/${slug}`);
  await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible({ timeout: 30000 });
}

export async function expectEmptyDashboard(page: Page) {
  if (new URL(page.url()).pathname !== '/learning') await page.goto('/learning');
  await expectLearningDashboard(page);
  await expect(page.getByText('No courses yet!')).toBeVisible();
}

export async function expectAdminDenied(page: Page, query = '') {
  await page.goto(`/admin${query}`);
  await expectOnPath(page, '/learning', 25000);
  await expect(page.getByText('Admin Command Center')).toHaveCount(0);
}

export async function expectAdminPage(page: Page) {
  await page.goto('/admin');
  await expect(page.getByText('Admin Command Center')).toBeVisible({ timeout: 25000 });
}

export async function expectNoAdminLink(page: Page) {
  await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);
}
