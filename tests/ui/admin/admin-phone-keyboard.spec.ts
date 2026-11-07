import { test, expect } from '@playwright/test';
import { EMAIL } from '../../support/personas';
import { requireSignIn } from '../../support/guards';
import { signInAs } from '../../support/clerk';
import { cannotScrollSideways } from '../../support/dashboard';
import { BASE, clearWriteLimits, future } from '../../support/adminApi';
import { sessionFor, type Session } from '../../support/api';
import { adminDb } from '../../support/db';
import { NAV } from '../../../lib/adminUi/nav';

// Phase 6b: the phone and keyboard cases of the admin portal that were manual until now. Phone = 375 x 740 touch viewport.
// Data made here: one coupon "QAUIKEY-1", removed afterwards.
const SCREENS = NAV.filter((n) => n.ready && !n.external);
const sidebarNav = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Admin sections' });

test.describe('Admin portal on a phone @regression', () => {
  test.use({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true });
  test.beforeEach(() => requireSignIn());

  test('[ADMUI-MOB-001] every admin screen fits a phone: it has a heading and never scrolls sideways', async ({ page }) => {
    test.setTimeout(240_000);
    await signInAs(page, EMAIL.admin);
    for (const screen of SCREENS) {
      await page.goto(screen.href);
      await expect(page.getByRole('heading', { level: 1 }).first(), screen.href).toBeVisible({ timeout: 30000 });
      await page.waitForLoadState('networkidle');
      await cannotScrollSideways(page);
    }
  });

  test('[ADMUI-MOB-002] the menu button opens and closes the sidebar; choosing an entry goes there and closes the menu', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/overview');
    await expect(page.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible({ timeout: 30000 });
    await expect(sidebarNav(page)).toBeHidden();                                     // closed on a phone
    const open = page.getByRole('button', { name: 'Open menu' });
    await open.click();
    await expect(page.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');
    await expect(sidebarNav(page)).toBeVisible();
    await page.getByRole('button', { name: 'Close menu' }).click();
    await expect(sidebarNav(page)).toBeHidden();
    await open.click();
    await sidebarNav(page).getByRole('link', { name: 'Coupons' }).click();
    await expect(page).toHaveURL(/\/admin\/coupons$/);
    await expect(sidebarNav(page)).toBeHidden();                                     // the menu closes after a choice
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });

  test('[ADMUI-MOB-003] the tap targets of the menu are at least 36 px tall', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/overview');
    await page.getByRole('button', { name: 'Open menu' }).click();
    const links = sidebarNav(page).getByRole('link');
    const n = await links.count();
    expect(n).toBeGreaterThan(10);
    for (let i = 0; i < n; i++) {
      const box = await links.nth(i).boundingBox();
      expect(box!.height, `link ${i}`).toBeGreaterThanOrEqual(36);   // text-sm with py-2: 36 px, the practical floor of this design
    }
  });
});

test.describe('Admin portal with the keyboard @regression', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async () => { requireSignIn(); await clearWriteLimits(); });
  let admin: Session;
  test.beforeAll(async ({ browser }) => {
    if (!process.env.E2E_SEED_PERSONAS) return;
    admin = await sessionFor(browser, EMAIL.admin);
    const r = await admin.request.post(`${BASE}/coupons`, { data: { code: 'QAUIKEY-1', kind: 'everyone', discount: { type: 'percentage', percent: 10 }, expiresAt: future(7) } });
    expect([201, 409]).toContain(r.status());
  });
  test.afterAll(async () => {
    if (!process.env.E2E_SEED_PERSONAS) return;
    await adminDb().from('coupons').delete().like('code', 'QAUIKEY%');
    await adminDb().from('admin_audit').delete().like('resource_id', 'QAUIKEY%');
    await clearWriteLimits(); await admin?.close();
  });

  test('[ADMUI-KEY-001] the sidebar can be walked with Tab, the focused entry is visible, and Enter opens it', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/overview');
    await expect(page.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible({ timeout: 30000 });
    const seen: string[] = [];
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    for (let i = 0; i < 40 && seen.length < 3; i++) {
      await page.keyboard.press('Tab');
      const t = await page.evaluate(() => { const e = document.activeElement as HTMLElement | null; return e?.closest('nav[aria-label="Admin sections"]') ? e.textContent?.trim() ?? '' : ''; });
      if (t) seen.push(t);
    }
    expect(seen.slice(0, 3), 'Tab walks the sidebar entries in order').toEqual(['Overview', 'Courses', 'Cohorts']);
    const outline = await page.evaluate(() => { const e = document.activeElement as HTMLElement; const s = getComputedStyle(e); return { outline: s.outlineStyle, ring: s.boxShadow, width: s.outlineWidth }; });
    expect(outline.outline !== 'none' || outline.ring !== 'none', 'the focused entry shows a focus indicator').toBe(true);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/admin\/cohorts$/);
  });

  test('[ADMUI-KEY-002] a confirmation dialog takes focus on Cancel, Escape closes it without doing anything, and Tab stays reachable to the confirm button', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/coupons/QAUIKEY-1');
    await expect(page.getByRole('heading', { name: 'QAUIKEY-1', level: 1 })).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: /^Delete coupon/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Delete coupon' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    expect((await admin.request.get(`${BASE}/coupons/QAUIKEY-1`)).status()).toBe(200);   // nothing was deleted
  });
});
