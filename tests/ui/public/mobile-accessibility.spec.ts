import { test, expect, type Page } from '@playwright/test';
import { activeCourses, isQaFixture, QA_FIXTURE_SLUG } from '../../../data/courses';
import { signInAs } from '../../support/clerk';
import { requireFixture, requireSeed, requireSignIn } from '../../support/guards';
import { PUB } from '../../support/personas';
import { expectLearningDashboard, expectOnPath } from '../../support/assertions';

// PRD 02 · Mobile Navigation and Accessibility / Keyboard Navigation sheets.
// PUB-A11Y-010 (Python lab: close button reachable by keyboard) belongs to the Learning Lab PRD (SCP-32).
const first = activeCourses.filter(c => !isQaFixture(c.slug))[0];
const FIXTURE = `/courses/${QA_FIXTURE_SLUG}`;

// The menu toggle is an icon-only button (no accessible name), so it is found structurally.
const menuToggle = (page: Page) => page.locator('nav button.md\\:hidden');
async function openMenu(page: Page) {
  await page.waitForLoadState('networkidle');
  await menuToggle(page).click();
}
const menuLink = (page: Page, name: string) => page.getByRole('link', { name, exact: true }).last();

test.describe('PRD02 Mobile navigation @regression', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('[PUB-MOB-001] the homepage renders and is usable on a phone viewport', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'no horizontal scrolling').toBeLessThanOrEqual(1);
  });

  test('[PUB-MOB-002][PUB-MOB-003] the mobile menu opens and closes', async ({ page }) => {
    await page.goto('/');
    await openMenu(page);
    await expect(menuLink(page, 'Courses')).toBeVisible();
    await menuToggle(page).click();
    await expect(menuLink(page, 'Courses')).toBeHidden();
  });

  const mobileNav = (label: string, path: string) => async ({ page }: { page: Page }) => {
    await page.goto(path === '/' ? '/about' : '/');
    await openMenu(page);
    await menuLink(page, label).click();
    await expectOnPath(page, path);
  };
  test('[PUB-MOB-004] Home in the mobile menu opens /', mobileNav('Home', '/'));
  test('[PUB-MOB-005] Courses in the mobile menu opens /courses', mobileNav('Courses', '/courses'));
  test('[PUB-MOB-006] About in the mobile menu opens /about', mobileNav('About', '/about'));
  test('[PUB-MOB-007] Contact in the mobile menu opens /contact', mobileNav('Contact', '/contact'));

  test('[PUB-MOB-008] Log In is reachable and opens the login flow on mobile', async ({ page }) => {
    await page.goto('/');
    await openMenu(page);
    await page.getByRole('button', { name: 'Log In' }).first().click();
    await expect(page.locator('input[name="identifier"]')).toBeVisible({ timeout: 20000 });
  });

  test('[PUB-MOB-009][PUB-MOB-010] Dashboard in the mobile menu opens the learning destination', async ({ page }) => {
    requireSeed();
    await signInAs(page, PUB.S1);
    await openMenu(page);
    await page.locator('a[href="/learning"]').last().click(); // the mobile menu's Dashboard entry
    await expectOnPath(page, '/learning');
    await expectLearningDashboard(page);
  });

  test('[PUB-MOB-011][PUB-MOB-012] the course CTA is visible and responds on mobile (closed cohort)', async ({ page }) => {
    await page.goto(`/courses/${first.slug}`);
    await page.waitForLoadState('networkidle');
    const cta = page.getByRole('button', { name: 'View Open Cohorts' });
    await cta.scrollIntoViewIfNeeded();
    await expect(cta).toBeInViewport();
    await cta.click();
    await expectOnPath(page, '/courses');
  });

  test('[PUB-MOB-013] mobile discovery path: homepage, courses, a course', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Explore Courses' }).click();
    await expectOnPath(page, '/courses');
    await page.getByRole('link', { name: /View Details/i }).first().click();
    await expect(page).toHaveURL(/\/courses\/[a-z0-9-]+$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('[PUB-MOB-014] mobile conversion: pricing and Buy Now lead a visitor to sign in', async ({ page }) => {
    requireFixture();
    await page.goto(FIXTURE);
    await page.waitForLoadState('networkidle');
    const messages: string[] = [];
    page.on('dialog', d => { messages.push(d.message()); void d.accept(); });
    await expect(page.getByText('₹10', { exact: true })).toBeVisible();
    const buy = page.getByRole('button', { name: /Buy Now \(INR\)/i });
    await buy.scrollIntoViewIfNeeded();
    await buy.click();
    await expect.poll(() => messages.length).toBe(1);
    await expect(page.locator('input[name="identifier"]')).toBeVisible({ timeout: 20000 });
  });

  test('[PUB-MOB-015] (SCP-36) legal pages are reachable on mobile', async ({ page }) => {
    for (const [name, path] of [['Privacy Policy', '/privacy'], ['Terms of Service', '/terms'], ['Refund Policy', '/refund']] as const) {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const link = page.getByRole('link', { name });
      await link.scrollIntoViewIfNeeded();
      const box = (await link.boundingBox())!;
      const covered = await link.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return hit && !(el === hit || el.contains(hit)) ? `${hit.tagName.toLowerCase()} ${(hit.getAttribute('class') || hit.getAttribute('href') || '').slice(0, 60)}` : null;
      });
      expect(covered, `${name} is covered by another element on a phone`).toBeNull();
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); // a real finger tap; the page keeps animating so the 'stable' check never settles
      await expectOnPath(page, path);
    }
  });

  test('[PUB-MOB-016] the sticky navigation does not cover the key CTA', async ({ page }) => {
    for (const [path, cta] of [['/', () => page.getByRole('link', { name: 'Explore Courses' })], [`/courses/${first.slug}`, () => page.getByRole('button', { name: 'View Open Cohorts' })]] as const) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const target = cta();
      await target.scrollIntoViewIfNeeded();
      const box = await target.boundingBox();
      expect(box).not.toBeNull();
      const topElementIsCta = await target.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!hit && (el === hit || el.contains(hit));
      });
      expect(topElementIsCta, `${path}: something overlaps the CTA`).toBe(true);
    }
  });
});

test.describe('PRD02 Keyboard accessibility @regression', () => {
  test('[PUB-A11Y-001][PUB-A11Y-009] Tab reaches the primary navigation and shows a visible focus indicator', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const seen: string[] = [];
    let indicator = false;
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const hasOutline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
        const hasShadow = cs.boxShadow !== 'none';
        return { text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30), indicator: hasOutline || hasShadow };
      });
      if (info) { seen.push(info.text); if (info.indicator) indicator = true; }
    }
    for (const label of ['Home', 'Courses', 'About', 'Contact']) expect(seen, `Tab should reach ${label}`).toContain(label);
    expect(indicator, 'focused controls need a visible outline or ring').toBe(true);
  });

  test('[PUB-A11Y-002] a navigation link is activated with Enter', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('navigation').getByRole('link', { name: 'About', exact: true }).first().focus();
    await page.keyboard.press('Enter');
    await expectOnPath(page, '/about');
  });

  test('[PUB-A11Y-003] the primary CTA works from the keyboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: 'Explore Courses' }).focus();
    await page.keyboard.press('Enter');
    await expectOnPath(page, '/courses');
  });

  test('[PUB-A11Y-004] course links are reachable and activated from the keyboard', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: /View Details/i }).first().focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/courses\/[a-z0-9-]+$/);
  });

  test('[PUB-A11Y-005] Log In opens from the keyboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Log In' }).first().focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('input[name="identifier"]')).toBeVisible({ timeout: 20000 });
  });

  test('[PUB-A11Y-006][PUB-A11Y-007] the currency control and coupon input work from the keyboard', async ({ page }) => {
    requireFixture();
    await page.goto(FIXTURE);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'International' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: /Buy Now \(USD\)/i })).toBeVisible();
    await page.getByPlaceholder('Enter code').focus();
    await page.keyboard.type('qa test');
    await expect(page.getByPlaceholder('Enter code')).toHaveValue('QA TEST');
  });

  test('[PUB-A11Y-008] the mobile menu can be operated from the keyboard', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, baseURL: `http://localhost:${process.env.PORT ?? '3000'}` });
    const page = await ctx.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await menuToggle(page).focus();
    await page.keyboard.press('Enter');
    await expect(menuLink(page, 'Courses')).toBeVisible();
    await ctx.close();
  });

  // Failed in the manual run (Python lab solution dialog: the close button is not reachable by keyboard). Tracked as SCP-32;
  // the automated check belongs with the Python lab cases of PRD 07.
  test.fixme('[PUB-A11Y-010] the Python lab solution dialog can be closed from the keyboard (SCP-32)', async () => {});

  test('[PUB-A11Y-011] (SCP-58) every visible link and button on public pages has readable text or an accessible name', async ({ page }) => {
    const unnamed: string[] = [];
    for (const path of ['/', '/courses', '/about', '/contact', `/courses/${first.slug}`]) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const bad = await page.evaluate(() => [...document.querySelectorAll('a, button')]
        .filter(el => (el as HTMLElement).offsetParent !== null)
        .filter(el => !(el.textContent || '').trim() && !el.getAttribute('aria-label') && !el.getAttribute('title') && !el.querySelector('img[alt]:not([alt=""])'))
        .map(el => `${el.tagName.toLowerCase()}.${(el.getAttribute('class') || '').split(' ').slice(0, 2).join('.')}`));
      unnamed.push(...bad.map(b => `${path}: ${b}`));
    }
    expect(unnamed, 'controls without a name').toEqual([]);
  });
});

void requireSignIn;
