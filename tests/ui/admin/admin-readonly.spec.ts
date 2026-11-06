import { test, expect } from '@playwright/test';
import { QA_FIXTURE_SLUG } from '../../../data/courses';
import { EMAIL, COURSE } from '../../support/personas';
import { requireFixture, requireSeed, requireSignIn } from '../../support/guards';
import { adminDb } from '../../support/db';
import { clerkUserId, signInAs } from '../../support/clerk';
import { expectDeniedForVisitor, expectOnPath, expectServerDeniesVisitor } from '../../support/assertions';

// PRD 08, what is left after the classic "Admin Command Center" was retired (SCP-89, phase 4f): the ACCESS checks. /admin is now a redirect to
// the admin portal, and the three routes the classic page used (get-all-users, dashboard-data, admin/enroll) stay admin-only and are still
// tested here. Every other case of this file (tabs, KPI cards, tables, the code modal, the enrolment form, phone and keyboard) drove the old page and
// is retired; docs/testing/prd/08-ui-admin-portal.md section 12 maps each of them to the screen and test that replaced it (ADMUI-*, AAPI-*).
test.describe('PRD08 admin portal: access @regression', () => {
  test.beforeEach(() => requireSignIn());

  test('[ADM-GATE-002][ADM-E2E-005] a learner is sent to the dashboard without seeing admin text, and the admin APIs refuse them', async ({ page }) => {
    requireSeed();
    await signInAs(page, EMAIL.mavish);
    await page.goto('/admin');
    await expectOnPath(page, '/learning');
    await expect(page.getByText('Admin Command Center')).toHaveCount(0);
    expect((await page.request.get('/api/get-all-users')).status()).toBe(403);
    expect((await page.request.get('/api/admin/dashboard-data')).status()).toBe(403);
    expect((await page.request.post('/api/admin/enroll', { data: { userId: 'user_x', courseSlug: COURSE.A } })).status()).toBe(403);
  });

  test('[ADM-GATE-003] a visitor is turned away from /admin', async ({ page }) => {
    await expectDeniedForVisitor(page, '/admin');
    await expect(page.getByText('Admin Command Center')).toHaveCount(0);
  });

  test('[ADM-GATE-001] the admin who opens /admin lands on the admin portal overview (the classic page is gone)', async ({ page }) => {
    requireSeed();
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin');
    await expectOnPath(page, '/admin/overview');
    await expect(page.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Admin Command Center')).toHaveCount(0);
  });

  test('[ADM-GATE-006][ADM-GATE-007] get-all-users refuses a learner (403) and a visitor (401)', async ({ page, request }) => {
    requireSeed();
    await expectServerDeniesVisitor(request, '/api/get-all-users');
    const visitor = await request.get('/api/get-all-users', { maxRedirects: 0, headers: { 'User-Agent': 'shivam-academy-api-tests' } });
    expect(visitor.status()).toBe(401);
    await signInAs(page, EMAIL.bazar);
    const res = await page.request.get('/api/get-all-users');
    expect(res.status()).toBe(403);
    expect(JSON.stringify(await res.json().catch(() => ({})))).not.toContain('@');
  });

  test('[ADM-GATE-008][ADM-GATE-009][ADM-GATE-010] admin/enroll refuses a visitor (401) and a learner (403), including a self-grant, and creates no row', async ({ page, request }) => {
    requireSeed();
    requireFixture();
    const visitor = await request.post('/api/admin/enroll', { data: { userId: 'user_x', courseSlug: QA_FIXTURE_SLUG }, headers: { 'User-Agent': 'shivam-academy-api-tests' }, maxRedirects: 0 });
    expect(visitor.status()).toBe(401);
    await signInAs(page, EMAIL.bazar);
    const self = await clerkUserId(EMAIL.bazar);
    const res = await page.request.post('/api/admin/enroll', { data: { userId: self, courseSlug: QA_FIXTURE_SLUG } });
    expect(res.status()).toBe(403);
    const { data } = await adminDb().from('user_enrollments').select('id').eq('user_id', self).eq('course_slug', QA_FIXTURE_SLUG);
    expect(data).toHaveLength(0);
  });

  test.fixme('[ADM-GATE-011] a mixed-case admin email opens the portal (needs an admin account with a mixed-case email; the check is case-sensitive, R-AD-6, SCP-59)', async () => {});
  // The public key can still read the progress tables (known gap R-AD-1, SCP-39); not a page behaviour, so it stays open here.
  test.fixme('[ADM-RSL-007] a learner cannot read user_enrollments, assignment_progress and user_stats with the public key (known gap R-AD-1, SCP-39)', async () => {});
});
