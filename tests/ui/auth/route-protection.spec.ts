import { test, expect } from '@playwright/test';
import { activeCourses } from '../../../data/courses';
import { signInAs, signOutViaClerk } from '../../support/clerk';
import { requireSignIn } from '../../support/guards';
import { AUTH, COURSE } from '../../support/personas';
import { expectDeniedForVisitor, expectOnPath, expectServerDeniesVisitor, PROTECTED_MARKERS } from '../../support/assertions';

// PRD 01 · Authentication & Access Control. Cases from the workbook sheets
// "Public Route Access", "Unauthenticated Access to Protected", "Middleware Protection".
// No account needed unless stated; ids in brackets map to the workbook and CASE_INVENTORY.md.
const PUBLIC_ROUTES = ['/', '/courses', '/about', '/contact', '/mentorship', '/privacy', '/terms', '/refund'];
const firstCourse = activeCourses[0].slug;

test.describe('PRD01 Public Route Access @regression', () => {
  test('[AUTH-PUB-001] public page loads without sign-in', async ({ page }) => {
    await page.goto('/about');
    await expectOnPath(page, '/about');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });

  test('[AUTH-PUB-002] course sales page loads without sign-in', async ({ page }) => {
    await page.goto(`/courses/${firstCourse}`);
    await expectOnPath(page, `/courses/${firstCourse}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('[AUTH-PUB-003] visitor can move across several public pages', async ({ page }) => {
    for (const path of ['/', '/courses', '/about', '/contact', '/courses']) {
      await page.goto(path);
      await expectOnPath(page, path);
    }
  });

  test('[AUTH-PUB-005] refreshing a public page keeps it accessible', async ({ page }) => {
    await page.goto('/about');
    await page.reload();
    await expectOnPath(page, '/about');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });

  test('[AUTH-PUB-006] no configured public route redirects to login', async ({ request }) => {
    for (const path of PUBLIC_ROUTES) {
      const res = await request.get(path, { maxRedirects: 0, headers: { 'User-Agent': 'shivam-academy-api-tests' } });
      expect(res.status(), `${path} must answer 200, not a sign-in redirect`).toBe(200);
    }
  });

  test('[AUTH-PUB-007] public route with query parameters stays accessible', async ({ page }) => {
    await page.goto('/about?utm_source=qa&ref=test');
    await expectOnPath(page, '/about');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });

  test('[AUTH-PUB-008] public URL opens in a new tab', async ({ context }) => {
    const tab = await context.newPage();
    await tab.goto('/privacy');
    await expectOnPath(tab, '/privacy');
    await expect(tab.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('[AUTH-MW-004] middleware lets a public route through without authentication', async ({ request }) => {
    const res = await request.get('/courses', { maxRedirects: 0, headers: { 'User-Agent': 'shivam-academy-api-tests' } });
    expect(res.status()).toBe(200);
  });

  test('[AUTH-MW-011] middleware does not protect any public route by accident', async ({ request }) => {
    for (const path of [...PUBLIC_ROUTES, `/courses/${firstCourse}`, '/share/OkK3E7ApZ4Q']) {
      const res = await request.get(path, { maxRedirects: 0, headers: { 'User-Agent': 'shivam-academy-api-tests' } });
      expect(res.status(), path).toBe(200);
    }
  });
});

test.describe('PRD01 Visitor blocked from protected routes @regression', () => {
  for (const [id, path] of [['AUTH-PROT-001][AUTH-NEG-001', '/learning'], ['AUTH-PROT-002][AUTH-NEG-002', '/live'], ['AUTH-PROT-003][AUTH-ADMIN-001][AUTH-NEG-003', '/admin']] as const) {
    test(`[${id}] visitor opening ${path} directly is denied`, async ({ page }) => {
      await expectDeniedForVisitor(page, path);
    });
  }

  for (const [id, path] of [['AUTH-MW-001', '/learning'], ['AUTH-MW-002', '/live'], ['AUTH-MW-003', '/admin'],
                           ['AUTH-DEEP-001', '/learning'], ['AUTH-DEEP-002', '/live'], ['AUTH-DEEP-003', '/admin']] as const) {
    test(`[${id}] middleware denies ${path} before any page renders`, async ({ request }) => {
      await expectServerDeniesVisitor(request, path);
    });
  }

  test.fixme('[AUTH-PROT-004] visitor reaches a protected route through a UI link',
    // Not automatable today: no public page links to /learning, /live or /admin for a signed-out visitor
    // (the Dashboard link only renders when signed in). Revisit if a public link is added.
    async () => {});

  test('[AUTH-PROT-008][AUTH-NEG-012] protected route opened in a new tab stays protected', async ({ context }) => {
    const tab = await context.newPage();
    await expectDeniedForVisitor(tab, '/learning');
  });

  test('[AUTH-PROT-009][AUTH-MW-008][AUTH-DEEP-010] protection survives a refresh', async ({ page }) => {
    await expectDeniedForVisitor(page, '/learning');
    await page.goto('/learning', { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 20000 }).not.toBe('/learning');
  });

  const queryUrls: [string, string][] = [
    ['AUTH-PROT-010', '/learning/python-beginners?v=OkK3E7ApZ4Q'],
    ['AUTH-PROT-010', '/learning/python-beginners-batch-2?v=a9nrrH5XkG0'],
    ['AUTH-PROT-010', '/learning/python-beginners-batch-2?v=doc-thinking-pattern'],
    ['AUTH-PROT-011][AUTH-NEG-011', '/learning/python-beginners-batch-2?v=OkK3E7ApZ4Q'],
    ['AUTH-BYPASS-001', '/learning/python-beginners-batch-2?v=doc-thinking-pattern'],
    ['AUTH-BYPASS-005', '/live?user=admin'],
    ['AUTH-BYPASS-006', '/admin?role=admin&enrolled=true&authenticated=true&user=admin'],
    ['AUTH-MW-009', '/learning?authenticated=true'],
  ];
  for (const [id, url] of queryUrls) {
    test(`[${id}] query parameters do not bypass protection: ${url}`, async ({ request }) => {
      await expectServerDeniesVisitor(request, url);
    });
  }

  for (const url of ['/share/a9nrrH5XkG0?t=1788926719351', '/share/OkK3E7ApZ4Q']) {
    test(`[AUTH-PROT-010] share link ${url} sends a visitor to the course page`, async ({ page }) => {
      await page.goto(url);
      await expect.poll(() => new URL(page.url()).pathname, { timeout: 20000 }).toMatch(/^\/courses\/[a-z0-9-]+$/);
    });
  }

  test('[AUTH-PROT-012] trailing slash gets the same protection', async ({ request }) => {
    await expectServerDeniesVisitor(request, '/learning/');
  });

  test('[AUTH-PROT-013] URL variations do not bypass authorization', async ({ request }) => {
    for (const variant of ['/LEARNING', '/Learning', '/learning//', '/%6Cearning', '/learning%2F', '/learning/.', '/ADMIN', '/%61dmin']) {
      await expectServerDeniesVisitor(request, variant);
    }
  });

  test('[AUTH-PROT-014] protected content is never delivered to a visitor before the redirect', async ({ request }) => {
    for (const path of ['/learning', '/admin', '/learning/python-beginners-batch-2']) {
      const res = await request.get(path, { maxRedirects: 0, headers: { 'User-Agent': 'shivam-academy-api-tests' } });
      expect([307, 401], `${path} first response`).toContain(res.status());
      const body = await res.text();
      for (const marker of PROTECTED_MARKERS) expect(body).not.toContain(marker);
    }
  });

  test('[AUTH-MW-010][AUTH-DEEP-009] pasting a protected URL into a clean browser is denied', async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: `http://localhost:${process.env.PORT ?? '3000'}` });
    const page = await ctx.newPage();
    await expectDeniedForVisitor(page, '/learning/python-beginners-batch-2');
    await ctx.close();
  });

  test('[AUTH-MW-012] a route that is not whitelisted is denied by default', async ({ request }) => {
    // /api/get-all-users is intentionally not in publicRoutes: the default-deny model must apply.
    const res = await request.get('/api/get-all-users', { maxRedirects: 0, headers: { 'User-Agent': 'shivam-academy-api-tests' } });
    expect([307, 401, 403]).toContain(res.status());
  });
});

test.describe('PRD01 Signed-in session cases (token sign-in)', () => {
  test.beforeEach(() => requireSignIn());

  test('[AUTH-PUB-004] public pages load normally after sign-in and sign-out', async ({ page }) => {
    await signInAs(page, AUTH.U1);
    await signOutViaClerk(page);
    await page.goto('/about');
    await expectOnPath(page, '/about');
    await expect(page.getByRole('button', { name: 'Log In' }).first()).toBeVisible();
  });

  for (const [id, path] of [['AUTH-PROT-005', '/learning'], ['AUTH-PROT-006', '/live'], ['AUTH-PROT-007', '/admin'],
                           ['AUTH-LOGOUT-004', '/learning'], ['AUTH-LOGOUT-005', '/live'], ['AUTH-LOGOUT-006', '/admin']] as const) {
    test(`[${id}] ${path} is denied after sign-out`, async ({ page }) => {
      await signInAs(page, id.includes('007') || id.includes('006') ? AUTH.A1 : AUTH.S1);
      await signOutViaClerk(page);
      await expectDeniedForVisitor(page, path);
    });
  }

  test('[AUTH-MW-005] middleware recognises a valid signed-in session', async ({ page }) => {
    await signInAs(page, AUTH.U1);
    await page.goto('/learning');
    await expect(page.getByText('My Enrolled Courses')).toBeVisible({ timeout: 20000 });
    await expectOnPath(page, '/learning');
  });

  test('[AUTH-MW-007][AUTH-SESS-009][AUTH-NEG-010] a forged session cookie is rejected', async ({ page, context }) => {
    await page.goto('/');
    await context.addCookies([
      { name: '__session', value: 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyX2ZvcmdlZCJ9.invalid', url: page.url() },
      { name: '__client_uat', value: String(Math.floor(Date.now() / 1000)), url: page.url() },
    ]);
    await expectDeniedForVisitor(page, '/learning');
    await expectDeniedForVisitor(page, '/admin');
  });

  test('[AUTH-INVALID-004][AUTH-INVALID-005] a forged session never shows the signed-in UI, also after a refresh', async ({ page, context }) => {
    await page.goto('/');
    await context.addCookies([
      { name: '__session', value: 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyX2ZvcmdlZCJ9.invalid', url: page.url() },
      { name: '__client_uat', value: String(Math.floor(Date.now() / 1000)), url: page.url() },
    ]);
    for (const reload of [false, true]) {
      if (reload) await page.reload();
      else await page.goto('/');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('button', { name: 'Log In' }).first()).toBeVisible({ timeout: 20000 });
      await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);
    }
  });

  test('[AUTH-INVALID-006] a visitor with a forged session can recover by signing in properly', async ({ page, context }) => {
    await page.goto('/');
    await context.addCookies([
      { name: '__session', value: 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyX2ZvcmdlZCJ9.invalid', url: page.url() },
      { name: '__client_uat', value: String(Math.floor(Date.now() / 1000)), url: page.url() },
    ]);
    await signInAs(page, AUTH.U1);
    await page.goto('/learning');
    await expect(page.getByText('My Enrolled Courses')).toBeVisible({ timeout: 25000 });
  });

  test('[AUTH-MW-006][AUTH-SESS-008][AUTH-NEG-009][AUTH-INVALID-001][AUTH-INVALID-002][AUTH-INVALID-003][AUTH-INVALID-007] a revoked session is rejected on every protected route once its token expires', async ({ page }) => {
    test.slow(); // Clerk session tokens live 60s: revoke the session, then wait for the cached token to lapse.
    await signInAs(page, AUTH.E1);
    await page.goto('/learning');
    await expect(page.getByText('My Enrolled Courses')).toBeVisible({ timeout: 25000 });
    const sessionId = await page.evaluate(() => (window as any).Clerk.session.id as string);
    const res = await fetch(`https://api.clerk.com/v1/sessions/${sessionId}/revoke`, {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    });
    expect(res.ok, 'session revoke must succeed').toBe(true);
    await page.waitForTimeout(70_000);
    await page.reload({ waitUntil: 'domcontentloaded' }); // the page that was already open
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 25000 }).not.toBe('/learning');
    for (const path of ['/learning', `/live/${COURSE.A}`, '/admin']) await expectDeniedForVisitor(page, path);
  });
});

// keep a reference so a future course rename shows up here
void COURSE;
