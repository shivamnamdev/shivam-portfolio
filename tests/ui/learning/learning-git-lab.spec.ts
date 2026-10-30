import { test, expect } from '@playwright/test';
import { expectOnPath } from '../../support/assertions';
import { EMAIL, COURSE } from '../../support/personas';
import { requireSeed } from '../../support/guards';
import { seedEnabled } from '../../support/db';
import { signInAs } from '../../support/clerk';
import {
  clearProgress, firstVideoId, lessonButton, lessonIds, mockExternals, openCourse, progressRows, restoreProgress, snapshotProgress, tab, type ProgressSnapshot,
} from '../../support/learning';

// PRD 07 Git lab (simulator) cases for S1 = bazar (Course B). The simulator runs entirely in the page; only the
// instructions text is fetched (answered by the mock). Submit writes assignment_progress, which is snapshotted and restored.
const S1 = EMAIL.bazar;
const SLUG = COURSE.B;
const FIRST = firstVideoId(SLUG);

test.describe('PRD07 Git lab simulator', () => {
  test.describe.configure({ mode: 'default' });
  let snap: ProgressSnapshot;
  test.describe('@regression', () => {
    test.beforeAll(async () => { if (!seedEnabled()) return; snap = await snapshotProgress(S1, SLUG); await clearProgress(S1, SLUG); });
    test.afterAll(async () => { if (seedEnabled() && snap) await restoreProgress(S1, SLUG, snap); });
    test.beforeEach(() => requireSeed());
    test.afterEach(async () => { await clearProgress(S1, SLUG); });

    const toLab = async (page: any) => {
      await openCourse(page, S1, SLUG);
      await tab(page, /Practice/).click();
      await expect(page.getByPlaceholder('git status')).toBeVisible({ timeout: 30000 });
    };
    const cmd = async (page: any, text: string) => {
      await page.getByPlaceholder('git status').fill(text);
      await page.getByPlaceholder('git status').press('Enter');
    };
    const out = (page: any) => page.locator('pre.font-mono').first();

    test('[LRN-GIT-001][LRN-GIT-002] instructions and terminal load and git status answers', async ({ page }) => {
      await toLab(page);
      await expect(page.getByText('QA assignment text')).toBeVisible();
      await cmd(page, 'git init');
      await expect(out(page)).toContainText('Initialized empty Git repository');
      await cmd(page, 'git status');
      await expect(out(page)).toContainText(/branch|nothing|On branch/i);
    });

    test('[LRN-GIT-003][LRN-GIT-004][LRN-GIT-009] add, commit and log; the Git Graph shows the commit', async ({ page }) => {
      await toLab(page);
      await cmd(page, 'git init');
      await cmd(page, 'touch a.txt');
      await cmd(page, 'git add a.txt');
      await expect(out(page)).toContainText('staged: a.txt');
      await cmd(page, 'git commit -m "first commit"');
      await expect(out(page)).toContainText('first commit');
      await cmd(page, 'git log --oneline');
      await expect(out(page)).toContainText('first commit');
      await expect(page.getByText(/1 commits?/)).toBeVisible();
      await tab(page, /Git Graph/).click();
      await expect(page.getByText('first commit').first()).toBeVisible();
    });

    test('[LRN-GIT-005] checkout -b creates a branch and the branch label changes', async ({ page }) => {
      await toLab(page);
      await cmd(page, 'git init');
      await cmd(page, 'git checkout -b feature');
      await expect(out(page)).toContainText("Switched to a new branch 'feature'");
      await expect(page.getByText('feature', { exact: true }).first()).toBeVisible();
    });

    test('[LRN-GIT-006][LRN-GIT-007][LRN-GIT-008] unsupported command, nothing to commit and an empty command are handled', async ({ page }) => {
      await toLab(page);
      await cmd(page, 'git init');
      await cmd(page, 'git frobnicate');
      await expect(out(page)).toContainText('command not found');
      await cmd(page, 'git commit -m "x"');
      await expect(out(page)).toContainText('nothing to commit');
      const before = await out(page).innerText();
      await cmd(page, '');
      expect(await out(page).innerText()).toBe(before);
    });

    test('[LRN-GIT-011][LRN-E2E-003] Submit saves the lab history and marks the lesson', async ({ page }) => {
      await toLab(page);
      await cmd(page, 'git init');
      await cmd(page, 'touch a.txt');
      await cmd(page, 'git add a.txt');
      await cmd(page, 'git commit -m "saved"');
      await page.getByRole('button', { name: /^Submit$/ }).click();
      await expect(page.getByText('Your Git lab state has been saved.')).toBeVisible({ timeout: 20000 });
      await expect(page.locator('aside').getByText('Assignment Submitted').first()).toBeVisible();
      const rows = await progressRows(S1, SLUG, 'assignment_progress');
      expect(rows).toHaveLength(1);
      expect(rows[0].video_id).toBe(FIRST);
      expect(rows[0].submitted_code).toContain('saved');
    });

    test('[LRN-AI-004] the AI tutor request for a Git lab carries the lab type and command history', async ({ page }) => {
      await toLab(page);
      const bodies: any[] = [];
      await page.route('**/api/ai-tutor', route => { bodies.push(route.request().postDataJSON()); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'QA git hint' }) }); });
      await cmd(page, 'git init');
      await cmd(page, 'git commit -m "x"');
      await page.getByRole('button', { name: /Ask AI/ }).click();
      await expect(page.getByText('QA git hint')).toBeVisible({ timeout: 15000 });
      expect(bodies[0].labType).toBe('git');
      expect(JSON.stringify(bodies[0].gitContext.commandHistory)).toContain('nothing to commit');
    });

    const SECOND_LESSON = lessonIds(SLUG).filter(id => !id.startsWith('doc-'))[1];

    test('[LRN-TAB-005][LRN-TAB-006] the Materials tab exists only on a lesson with attachments, and its link opens in a new tab', async ({ page }) => {
      await openCourse(page, S1, SLUG);
      await expect(tab(page, /Materials/)).toHaveCount(0);        // first lesson has no attachments
      await lessonButton(page, SECOND_LESSON).click();
      await expect(tab(page, /Materials/)).toBeVisible();
      await tab(page, /Materials/).click();
      const link = page.getByRole('link', { name: /Git Day 01 Cheatsheet/ });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noreferrer/);
      await expect(link).toHaveAttribute('href', /git_cheatsheet_part1\.pdf$/);
    });

    test('[LRN-AI-006] the AI reply is cleared when another lesson is opened', async ({ page }) => {
      await toLab(page);
      await page.route('**/api/ai-tutor', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'QA git hint' }) }));
      await cmd(page, 'git init');
      await page.getByRole('button', { name: /Ask AI/ }).click();
      await expect(page.getByText('QA git hint')).toBeVisible({ timeout: 15000 });
      await lessonButton(page, SECOND_LESSON).click();
      await expect(page.getByText('QA git hint')).toHaveCount(0);
    });

    test('[LRN-GIT-012] switching lessons and coming back gives a fresh simulator', async ({ page }) => {
      await toLab(page);
      await cmd(page, 'git init');
      await expect(out(page)).toContainText('Initialized empty Git repository');
      await lessonButton(page, SECOND_LESSON).click();
      await lessonButton(page, FIRST).click();
      await tab(page, /Practice/).click();
      await expect(page.getByPlaceholder('git status')).toBeVisible({ timeout: 30000 });
      await expect(out(page)).not.toContainText('Initialized empty Git repository');
    });

    // The Git lab has no Reset button (the simulator can only be cleared by changing lesson, see LRN-GIT-012).
    test.fixme('[LRN-GIT-010] Reset clears the Git lab (no Reset control exists: SCP-55)', async () => {});

    test('[LRN-MOB-006][LRN-MOB-007] smoke for Firefox and WebKit: lesson list, lesson switch and a Git command (run with --project=firefox / webkit)', async ({ page }) => {
      await openCourse(page, S1, SLUG);
      await expect(page.getByText('Course Content')).toBeVisible();
      await lessonButton(page, SECOND_LESSON).click();
      await expect(page.getByRole('heading', { name: `QA Lesson ${SECOND_LESSON}` })).toBeVisible();
      await lessonButton(page, FIRST).click();
      await tab(page, /Practice/).click();
      await expect(page.getByPlaceholder('git status')).toBeVisible({ timeout: 30000 });
      await cmd(page, 'git init');
      await expect(out(page)).toContainText('Initialized empty Git repository');
    });

    test('[LRN-E2E-007] with YouTube and GitHub both unreachable the failures stay local and Back still returns to the dashboard', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', e => errors.push(e.message));
      await signInAs(page, S1);
      await mockExternals(page);
      await page.route('https://www.googleapis.com/youtube/v3/**', r => r.abort('failed'));
      await page.route('https://www.youtube.com/**', r => r.abort('failed'));
      await page.route('https://raw.githubusercontent.com/**', r => r.abort('failed'));
      await page.goto(`/learning/${SLUG}`);
      await expect(page.getByText('Course Content')).toBeVisible({ timeout: 40000 });
      await page.getByRole('link', { name: /Back/ }).click();
      await expectOnPath(page, '/learning');
      expect(errors, 'uncaught page errors').toEqual([]);
    });
  });
});
