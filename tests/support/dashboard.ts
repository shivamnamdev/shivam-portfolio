import { expect, type Page, type Route } from '@playwright/test';
import { signInAs } from './clerk';
import { expectLearningDashboard } from './assertions';

// Helpers for the PRD 06 (Student Dashboard & Course Access) automation.
export const DASH_TITLE = {
  A: 'Python Live Session (Batch 2)',
  B: 'Git Beginner Live Session',
} as const;

export async function openDashboard(page: Page, email: string): Promise<void> {
  await signInAs(page, email);
  await page.goto('/learning').catch(async () => { await page.waitForLoadState('load'); await page.goto('/learning'); }); // WebKit: Clerk's own navigation can interrupt the first goto
  await expectLearningDashboard(page);
}

export const cards = (page: Page) => page.getByRole('button', { name: 'Join Live Class' });
export const emptyState = (page: Page) => page.getByRole('heading', { name: 'No courses yet!' });
export const denied = (page: Page) => page.getByRole('heading', { name: 'Access Denied' });
export const lobby = (page: Page) => page.getByText('Secure Lobby');

// Forces a Supabase REST table (or any URL glob) to answer with an error or a delay.
export async function failRoute(page: Page, glob: string, status = 500): Promise<void> {
  await page.route(glob, (route: Route) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ message: 'mock failure' }) }));
}
export async function slowRoute(page: Page, glob: string, ms: number): Promise<void> {
  await page.route(glob, async (route: Route) => { await new Promise(r => setTimeout(r, ms)); await route.continue(); });
}
export async function noHorizontalScroll(page: Page): Promise<void> {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(over, 'page must not scroll sideways').toBeLessThanOrEqual(1);
}

// Stricter than noHorizontalScroll: some pages have decorative fixed glows that widen scrollWidth by a few px without
// letting the user scroll. This checks that the page really cannot be dragged sideways.
export async function cannotScrollSideways(page: Page): Promise<void> {
  const moved = await page.evaluate(() => { window.scrollTo(80, 0); const x = window.scrollX; window.scrollTo(0, 0); return x; });
  expect(moved, 'page must not scroll sideways').toBe(0);
}
