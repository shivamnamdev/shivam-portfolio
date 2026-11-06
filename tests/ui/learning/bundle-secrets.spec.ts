import { test, expect, type Page } from '@playwright/test';
import { EMAIL, COURSE } from '../../support/personas';
import { requireSeed } from '../../support/guards';
import { signInAs } from '../../support/clerk';

// Phase 5, slice 5b exit criterion: what the browser downloads (the script files, and the HTML the server sends) for the sales page, the dashboard, the lesson page and the live lobby holds none of the
// private links, the lesson list or the lab and solution links (the old pages bundled data/courses.ts and data/learning-content.ts for everyone).
// Runs with PORTAL_LEARNING and PORTAL_CATALOG on files or database alike: the pages never carry these either way.
const MARKERS: Array<[string, string]> = [
  ['a WhatsApp group link', 'chat.whatsapp.com/EjE3pU7synO9jMFpOPuHZp'],
  ['a second WhatsApp group link', 'chat.whatsapp.com/COiL4vkIxEBAKy4WtH5Fyp'],
  ['the first lesson video id', 'a9nrrH5XkG0'],
  ['the lab and solution repository', 'raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step'],
  ['a live-class link', 'meet.google.com/qa-checkout-sandbox'],
];

async function collect(page: Page, paths: string[]) {
  const scripts = new Map<string, string>(); const documents = new Map<string, string>();
  page.on('response', async (res) => {
    const url = res.url();
    try {
      if (url.includes('/_next/static/') && /\.js(\?|$)/.test(url)) scripts.set(url, await res.text());
    } catch { /* a response that was cancelled while navigating */ }
  });
  for (const p of paths) {
    await page.goto(p, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);   // lazy chunks
    // the HTML the server sends first (with the inline payload for client components), not the page after it has loaded its own lessons
    documents.set(p, await (await page.context().request.get(p)).text());
  }
  return { scripts, documents };
}

test.describe('PRD 5b nothing private reaches the browser @regression', () => {
  test.beforeEach(() => { test.setTimeout(240_000); requireSeed(); });

  test('[LRN5B-BND-001] the JavaScript and the page payloads of the sales page, dashboard, lesson page and live lobby carry no private link, lesson list or lab link', async ({ page }) => {
    await signInAs(page, EMAIL.mavish);   // enrolled in course A, so every page renders fully
    const paths = [`/courses`, `/courses/${COURSE.A}`, `/learning`, `/learning/${COURSE.A}`, `/live/${COURSE.A}`];
    const { scripts, documents } = await collect(page, paths);
    const all = [...scripts.entries()];
    expect(all.length, 'enough JavaScript was scanned for this test to mean something').toBeGreaterThan(5);
    expect(all.reduce((n, [, t]) => n + t.length, 0)).toBeGreaterThan(200_000);
    expect(all.some(([, t]) => t.includes('Access Denied')), 'the lesson page chunk was among them').toBe(true);
    for (const [label, marker] of MARKERS) {
      const hits = all.filter(([, t]) => t.includes(marker)).map(([u]) => u.split('/_next/static/')[1]);
      expect(hits, `${label} must not be in any JavaScript file`).toEqual([]);
      for (const [path, html] of documents) expect(html, `${label} must not be in the HTML of ${path}`).not.toContain(marker);
    }
  });

  test('[LRN5B-BND-002] a visitor\'s pages carry none of it either', async ({ page }) => {
    const { scripts, documents } = await collect(page, ['/courses', `/courses/${COURSE.A}`]);
    for (const [label, marker] of MARKERS) {
      expect([...scripts.values()].some((t) => t.includes(marker)), label).toBe(false);
      for (const [path, html] of documents) expect(html, `${label} in ${path}`).not.toContain(marker);
    }
  });
});
