import { test, expect } from '@playwright/test';
import { EMAIL } from '../../support/personas';
import { requireSeed, requireSignIn } from '../../support/guards';
import { signInAs } from '../../support/clerk';
import { adminDb } from '../../support/db';
import { expectDeniedForVisitor, expectOnPath } from '../../support/assertions';
import { cannotScrollSideways } from '../../support/dashboard';
import { clearWriteLimits } from '../../support/adminApi';

// Phase 4a: the admin shell, the portal toggle and the Overview, Audit log and API keys screens. The shell is guarded on the server;
// the screens only call /api/admin/v1. Keys made here are named "QA-ADMUI ..." and removed afterwards.
const KEY = 'QA-ADMUI';
const sidebar = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Admin sections' });

test.describe('ADMUI shell @regression', () => {
  test.beforeEach(() => requireSignIn());

  test('[ADMUI-GATE-001] a visitor cannot open any admin screen and gets no admin content', async ({ page }) => {
    for (const path of ['/admin/overview', '/admin/audit', '/admin/api-keys']) await expectDeniedForVisitor(page, path);
  });

  test('[ADMUI-GATE-002] a signed-in student is sent to the learning area and never sees the shell', async ({ page }) => {
    await signInAs(page, EMAIL.mavish);
    for (const path of ['/admin/overview', '/admin/audit', '/admin/api-keys']) {
      await page.goto(path);
      await expectOnPath(page, '/learning');
      await expect(page.getByRole('navigation', { name: 'Admin sections' })).toHaveCount(0);
    }
  });

  test('[ADMUI-SHELL-001] the admin sees the sidebar, later screens are disabled with their slice, and can switch to the learner portal', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/overview');
    await expect(page.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible({ timeout: 30000 });
    const nav = sidebar(page);
    for (const label of ['Overview', 'Learner CRM (classic)', 'Audit log', 'API keys', 'API docs']) await expect(nav.getByRole('link', { name: label })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    for (const label of ['Enrolments', 'Student progress', 'Code submissions']) {
      await expect(nav.getByText(label, { exact: false }).first()).toHaveAttribute('aria-disabled', 'true');
      await expect(nav.getByRole('link', { name: label })).toHaveCount(0);
    }
    await expect(page.getByText(`Signed in as ${EMAIL.admin}`)).toBeVisible();
    await page.getByRole('link', { name: 'Switch to learner portal' }).click();
    await expectOnPath(page, '/learning');
  });

  test('[ADMUI-SHELL-002] the learner navigation offers "Switch to admin portal" to the admin only', async ({ page, browser }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/');
    const toggle = page.getByRole('link', { name: 'Switch to admin portal' });
    await expect(toggle.first()).toBeVisible({ timeout: 30000 });
    await toggle.first().click();
    await expectOnPath(page, '/admin/overview');

    const student = await browser.newPage();
    await signInAs(student, EMAIL.mavish);
    await student.goto('/');
    await expect(student.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible({ timeout: 30000 });
    await expect(student.getByRole('link', { name: 'Switch to admin portal' })).toHaveCount(0);
    await student.close();
  });

  test('[ADMUI-OVR-001] the overview shows counts and the latest changes, no learner e-mail anywhere', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/overview');
    for (const label of ['Enrolments', 'Cohorts with learners', 'New sign-ups, 7 days', 'Coupon redemptions']) {
      const value = page.getByText(label, { exact: true }).locator('xpath=following-sibling::p[1]');
      await expect(value).toHaveText(/^\d+$/, { timeout: 30000 });
    }
    await expect(page.getByRole('heading', { name: 'Enrolments per cohort' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Latest changes' })).toBeVisible();
    for (const email of [EMAIL.mavish, EMAIL.edu, EMAIL.bazar]) await expect(page.getByText(email)).toHaveCount(0);
  });

  test('[ADMUI-AUD-001] the audit log filters on the server and shows before and after only on request', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/audit');
    await expect(page.getByRole('heading', { name: 'Audit log', level: 1 })).toBeVisible({ timeout: 30000 });
    await expect(page.locator('tbody tr, p:has-text("No entries match.")').first()).toBeVisible({ timeout: 30000 });
    await page.getByLabel('Resource').fill('qa-admui-no-such-resource');
    await page.getByRole('button', { name: 'Filter' }).click();
    await expect(page.getByText('No entries match.')).toBeVisible();
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 30000 });
    const first = page.locator('tbody tr').first();
    await first.getByRole('button', { name: 'Show' }).click();
    await expect(first.locator('pre')).toBeVisible();
    await first.getByRole('button', { name: 'Hide' }).click();
    await expect(first.locator('pre')).toHaveCount(0);
  });

  test('[ADMUI-KEY-001] a key is created, its token is shown once, then it is revoked after a confirmation', async ({ page }) => {
    requireSeed(); await clearWriteLimits();
    const name = `${KEY} ${Date.now()}`;
    try {
      await signInAs(page, EMAIL.admin);
      await page.goto('/admin/api-keys');
      await expect(page.getByRole('heading', { name: 'API keys', level: 1 })).toBeVisible({ timeout: 30000 });
      await page.getByLabel('Name').fill(name);
      await page.getByLabel('Level').selectOption('staff');
      await page.getByRole('button', { name: 'Create key' }).click();
      const token = page.getByTestId('new-token');
      await expect(token).toHaveText(/^tmk_[a-z0-9]{12}_[A-Za-z0-9_-]{43}$/);
      await page.getByRole('button', { name: 'I have saved it' }).click();
      await expect(token).toHaveCount(0);
      await page.reload();
      await expect(page.getByText(name)).toBeVisible({ timeout: 30000 });
      await expect(page.locator('body')).not.toContainText('tmk_');   // the token is never shown again
      const row = page.locator('tbody tr', { hasText: name });
      await row.getByRole('button', { name: 'Revoke' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toContainText(name);
      await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(row.getByText('active')).toBeVisible();
      await row.getByRole('button', { name: 'Revoke' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Revoke key' }).click();
      await expect(row.getByText('revoked')).toBeVisible({ timeout: 15000 });
      await expect(row.getByRole('button', { name: 'Revoke' })).toHaveCount(0);
    } finally {
      const db = adminDb();
      const { data } = await db.from('api_keys').select('id').like('name', `${KEY}%`);
      await db.from('api_keys').delete().like('name', `${KEY}%`);
      if (data?.length) await db.from('admin_audit').delete().in('resource_id', data.map((k) => k.id as string));
    }
  });

  test('[ADMUI-KEY-002] a server refusal is shown inline with its field, and nothing is created', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.route('**/api/admin/v1/api-keys', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'validation_failed', message: 'Some fields are not valid', fields: { name: 'is required' } } }) });
    });
    await page.goto('/admin/api-keys');
    await page.getByLabel('Name').fill('QA-ADMUI refused');
    await page.getByRole('button', { name: 'Create key' }).click();
    const alert = page.locator('[role=alert]:not(#__next-route-announcer__)');
    await expect(alert).toContainText('Some fields are not valid');
    await expect(alert).toContainText('name: is required');
    await expect(page.getByTestId('new-token')).toHaveCount(0);
  });

  test('[ADMUI-SHELL-003] on a phone the menu opens and closes and the page does not scroll sideways', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/audit');
    await expect(page.getByRole('heading', { name: 'Audit log', level: 1 })).toBeVisible({ timeout: 30000 });
    await cannotScrollSideways(page);
    await expect(page.getByRole('navigation', { name: 'Admin sections' })).toBeHidden();
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('navigation', { name: 'Admin sections' })).toBeVisible();
    await page.getByRole('link', { name: 'API keys' }).click();
    await expectOnPath(page, '/admin/api-keys');
  });
});
