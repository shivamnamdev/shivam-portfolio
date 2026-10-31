import { expect, type Page, type Route } from '@playwright/test';
import { signInAs, clerkUserId } from './clerk';
import { adminDb } from './db';
import { courseCurriculumMap } from '../../data/learning-content';

// Helpers for the PRD 07 (Learning Experience) automation. External services (YouTube Data API, YouTube embed,
// GitHub raw files) are answered locally so lesson titles and lab text are deterministic and nothing depends on them.

export const lessonIds = (slug: string): string[] =>
  courseCurriculumMap[slug].flatMap((m: any) => m.videoIds as string[]);
export const firstVideoId = (slug: string): string => lessonIds(slug).find(id => !id.startsWith('doc-'))!;
export const lessonTitle = (id: string) => `QA Lesson ${id}`;

export const sidebar = (page: Page) => page.locator('aside');
export const lessonButton = (page: Page, id: string) => sidebar(page).getByRole('button', { name: lessonTitle(id) });
export const tab = (page: Page, name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' });

export type ExternalOpts = { youtube?: 'ok' | 'fail'; github?: string | 'fail' };
export async function mockExternals(page: Page, opts: ExternalOpts = {}): Promise<void> {
  await page.route('https://www.googleapis.com/youtube/v3/videos*', (route: Route) => {
    if (opts.youtube === 'fail') return route.abort('failed');
    const ids = (new URL(route.request().url()).searchParams.get('id') ?? '').split(',').filter(Boolean);
    const items = ids.map(id => ({
      id,
      snippet: { title: lessonTitle(id), description: `Description of ${id}` },
      contentDetails: { duration: 'PT5M30S' },
    }));
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items }) });
  });
  await page.route('https://www.youtube.com/iframe_api', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.route('https://www.youtube.com/embed/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>QA video stub</body></html>' }));
  await page.route('https://raw.githubusercontent.com/**', route =>
    opts.github === 'fail' ? route.abort('failed')
      : route.fulfill({ status: 200, contentType: 'text/plain', body: opts.github ?? 'QA assignment text\nprint("hello")' }));
}

export async function openCourse(page: Page, email: string, slug: string, opts: ExternalOpts = {}): Promise<void> {
  await signInAs(page, email);
  await mockExternals(page, opts);
  await page.goto(`/learning/${slug}`);
  await expect(page.getByText('Course Content')).toBeVisible({ timeout: 40000 });
}

// Progress rows written by the learner pages. Snapshot before a describe, restore after (same idea as the enrolment snapshot).
const TABLES = ['video_progress', 'assignment_progress', 'exam_progress'] as const;
export type ProgressSnapshot = Record<(typeof TABLES)[number], any[]>;

export async function snapshotProgress(email: string, slug: string): Promise<ProgressSnapshot> {
  const uid = await clerkUserId(email);
  const out: any = {};
  for (const t of TABLES) {
    const { data, error } = await adminDb().from(t).select('*').eq('user_id', uid).eq('course_slug', slug);
    if (error) throw error;
    out[t] = data ?? [];
  }
  return out;
}
export async function clearProgress(email: string, slug: string): Promise<void> {
  const uid = await clerkUserId(email);
  for (const t of TABLES) {
    const { error } = await adminDb().from(t).delete().eq('user_id', uid).eq('course_slug', slug);
    if (error) throw error;
  }
}
export async function restoreProgress(email: string, slug: string, snap: ProgressSnapshot): Promise<void> {
  await clearProgress(email, slug);
  for (const t of TABLES) {
    if (snap[t].length) {
      const { error } = await adminDb().from(t).insert(snap[t]);
      if (error) throw error;
    }
  }
}
export async function progressRows(email: string, slug: string, table: (typeof TABLES)[number] = 'video_progress'): Promise<any[]> {
  const { data, error } = await adminDb().from(table).select('*').eq('user_id', await clerkUserId(email)).eq('course_slug', slug);
  if (error) throw error;
  return data ?? [];
}
export async function deleteComments(email: string, prefix: string): Promise<void> {
  const { error } = await adminDb().from('video_comments').delete().eq('user_id', await clerkUserId(email)).like('content', `${prefix}%`);
  if (error) throw error;
}

// Lab helpers. Monaco is driven through its own API (typing would fight auto-closing brackets and quotes).
export const setCode = (page: Page, code: string) =>
  page.evaluate((c: string) => { (window as any).monaco.editor.getEditors()[0].setValue(c); }, code);
export const getCode = (page: Page) =>
  page.evaluate(() => (window as any).monaco.editor.getEditors()[0].getValue() as string);
export const terminal = (page: Page) => page.locator('pre.font-mono').first();
export const runButton = (page: Page) => page.getByRole('button', { name: /^Run$/ }).first();
export const labReady = async (page: Page) => {
  await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 60000 });
  await expect(runButton(page)).toBeEnabled({ timeout: 90000 });   // disabled while Pyodide loads
};
