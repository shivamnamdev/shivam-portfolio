import { expect, type Page, type Route } from '@playwright/test';
import { EMAIL } from './personas';
import { signInAs } from './clerk';

// Helpers for the PRD 08 (Admin Portal UI) automation. Tables are read by the page straight from Supabase (anonymous key)
// and the CRM from /api/get-all-users, so both can be answered locally to make rows, order and failures deterministic.

export const TAB = {
  directory: 'User Directory (CRM)', enrollments: 'Enrollments', progress: 'Student Progress', assignments: 'Code Submissions', engagement: 'Engagement',
} as const;
export type TabKey = keyof typeof TAB;

export async function openAdmin(page: Page, email: string = EMAIL.admin): Promise<void> {
  await signInAs(page, email);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Admin Command Center' })).toBeVisible({ timeout: 30000 });
  await expect(tableSpinner(page)).toHaveCount(0, { timeout: 30000 });
}
export const tableSpinner = (page: Page) => page.locator('div.overflow-x-auto svg.animate-spin');
export const tab = (page: Page, key: TabKey) => page.getByRole('button', { name: TAB[key] });
export const goTab = async (page: Page, key: TabKey) => { await tab(page, key).click(); };
export const rows = (page: Page) => page.locator('tbody tr');
export const headers = (page: Page) => page.locator('thead th');
export const kpi = (page: Page, label: 'Total Leads (CRM)' | 'Enrollments' | 'Coupons Used') =>
  kpiLabel(page, label).locator('xpath=..').locator('h3');
export const kpiLabel = (page: Page, label: string) => page.locator('p', { hasText: new RegExp(`^${label.replace(/[()]/g, '\\$&')}$`) });
export const idInput = (page: Page) => page.getByPlaceholder('user_2aBcD...');
export const courseSelect = (page: Page) => page.locator('select');
export const grantButton = (page: Page) => page.getByRole('button', { name: 'Grant Access' });
export const formMessage = (page: Page, text: string | RegExp) => page.getByText(text);

export const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
export async function mockTable(page: Page, table: 'user_enrollments' | 'assignment_progress' | 'video_progress' | 'user_stats', data: unknown[] | number): Promise<void> {
  await page.route(`**/rest/v1/${table}*`, route => typeof data === 'number' ? json(route, data, { message: 'mock failure' }) : json(route, 200, data));
}
export async function mockUsers(page: Page, users: unknown[] | number): Promise<void> {
  await page.route('**/api/get-all-users', route => typeof users === 'number' ? json(route, users, { success: false }) : json(route, 200, { success: true, users }));
}

export const crmUser = (n: number, over: object = {}) =>
  ({ id: `user_qa_adm_${n}`, name: `QA Person ${n}`, email: `qa.person${n}@example.test`, joinedAt: '2026-01-1' + n + 'T10:00:00.000Z', image: `data:image/gif;base64,R0lGODlhAQABAAAAACw=`, ...over });
export const enrolRow = (n: number, over: object = {}) =>
  ({ id: n, user_id: `user_qa_adm_${n}`, course_slug: 'python-beginners-batch-2', user_email: `stored${n}@example.test`, user_name: `Stored Name ${n}`, coupon_used: null, enrolled_at: `2026-02-0${n}T10:00:00.000Z`, ...over });
export const localDate = (page: Page, iso: string) => page.evaluate((d: string) => new Date(d).toLocaleDateString(), iso);
export const localDateTime = (page: Page, iso: string) => page.evaluate((d: string) => new Date(d).toLocaleString(), iso);
