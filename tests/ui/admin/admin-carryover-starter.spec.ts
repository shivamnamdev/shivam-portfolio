import { test, expect, type Page } from '@playwright/test';
import { EMAIL } from '../../support/personas';
import { requireSeed } from '../../support/guards';
import { signInAs } from '../../support/clerk';
import { sessionFor, type Session } from '../../support/api';
import { BASE, clearWriteLimits, cleanupAdminApi, cohort, course } from '../../support/adminApi';
import { mockExternals, tab, labReady, getCode } from '../../support/learning';

// Carry-over labs (SCP-124, docs/architecture/lab-starter-carryover.md): one starter file serves every step of a lesson. A blank section or "# @carry" keeps
// the learner's code, "# @clear" resets the editor, any other text is added under the learner's code once. The test types with the real keyboard and checks
// that the text is on screen. The GitHub files are answered locally so the starter file is exact. PAUSE_MS (default 0) holds the screen for a headed run.
const COURSE = 'qa-admui-cos-course';
const COHORT = 'qa-admui-cos-batch';
const ADD = 'qacos000001';    // steps: code, blank, code
const CLEAR = 'qacos000002';  // steps: code, @clear, code
const RAW = 'https://raw.githubusercontent.com/qa/carry-lab/main';
const SEP = '# ----------';
const STARTERS: Record<string, string> = {
  'starter-add': `base = 10\n${SEP}\n\n${SEP}\ndouble = base * 2`,
  'starter-clear': `base = 10\n${SEP}\n# @clear\n${SEP}\nfresh = 3`,
};
const count = (text: string, part: string) => text.split(part).length - 1;

const fulfil = (page: Page) =>
  page.route(`${RAW}/**`, (route) => {
    const url = route.request().url();
    const key = Object.keys(STARTERS).find((k) => url.includes(`/${k}`));
    if (key) return route.fulfill({ status: 200, contentType: 'text/plain', body: STARTERS[key] });
    return route.fulfill({ status: 200, contentType: 'text/plain', body: 'Step one.\n---\nStep two.\n---\nStep three.' });
  });

const openLab = async (page: Page, lesson: string) => {
  await page.goto(`/learning/${COHORT}?preview=draft`);
  await expect(page.getByText('Course Content')).toBeVisible({ timeout: 40000 });
  await page.locator('aside').getByRole('button', { name: `QA Lesson ${lesson}` }).click();
  await tab(page, /Practice/).click();
  await labReady(page);
};
const screen = (page: Page) => page.locator('.monaco-editor .view-lines').first();
const next = (page: Page) => page.getByRole('button', { name: 'Next', exact: true }).click();
const prev = (page: Page) => page.getByRole('button', { name: 'Prev', exact: true }).click();
const hold = (page: Page) => page.waitForTimeout(Number(process.env.PAUSE_MS ?? 0));
const typeLine = async (page: Page, line: string) => {   // real keystrokes at the end of the file
  await screen(page).click();
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type(line);
};

test.describe('ADMUI carry-over lab: starter code per step @regression', () => {
  test.describe.configure({ mode: 'serial' });
  let admin: Session;
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000); requireSeed(); await clearWriteLimits();
    admin = await sessionFor(browser, EMAIL.admin);
    await admin.request.post(`${BASE}/courses`, { data: course(COURSE) });
    await admin.request.post(`${BASE}/cohorts`, { data: cohort(COHORT, COURSE) });
    const existing = await admin.request.get(`${BASE}/curriculum/${COHORT}`);
    const version = existing.ok() ? (await existing.json()).data?.version : undefined;
    const lab = (id: string, starter: string) => ({ id, assignment: { labType: 'python', title: id, carryOverCode: true, rawUrl: `${RAW}/assignment.txt`, starterCodeUrl: `${RAW}/${starter}.py` } });
    const put = await admin.request.put(`${BASE}/curriculum/${COHORT}`, {
      data: { modules: [{ title: 'Draft module', lessons: [lab(ADD, 'starter-add'), lab(CLEAR, 'starter-clear')] }] },
      headers: version ? { 'If-Match': String(version) } : {},
    });
    expect([200, 201], await put.text()).toContain(put.status());
  });
  test.afterAll(async () => { await cleanupAdminApi(); await clearWriteLimits(); await admin?.close(); });
  test.beforeEach(async () => { test.setTimeout(180_000); });

  test('[ADMUI-COS-001] a blank step keeps the typed code, the next step adds its starter under it once, and going back and forth never adds it twice', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await mockExternals(page);
    await fulfil(page);
    await openLab(page, ADD);
    await expect(screen(page)).toContainText('base = 10', { timeout: 20000 });
    await typeLine(page, 'mine = 1');
    await expect(screen(page)).toContainText('mine = 1');
    await hold(page);

    await next(page);                                  // step 2 is blank: nothing changes
    await expect(screen(page)).toContainText('mine = 1');
    expect(await getCode(page)).not.toContain('double = base * 2');
    await hold(page);

    await next(page);                                  // step 3 brings its starter under the typed code
    await expect(screen(page)).toContainText('double = base * 2');
    await expect(screen(page)).toContainText('mine = 1');
    const atThree = await getCode(page);
    expect(atThree.indexOf('mine = 1')).toBeGreaterThan(-1);
    expect(atThree.indexOf('double = base * 2')).toBeGreaterThan(atThree.indexOf('mine = 1'));
    await hold(page);

    await prev(page); await prev(page); await next(page); await next(page);   // back to step 1 and forward again
    expect(count(await getCode(page), 'double = base * 2')).toBe(1);
    expect(await getCode(page)).toContain('mine = 1');
  });

  test('[ADMUI-COS-002] the carried code and the added starter are still there, once, after the page is reloaded', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await mockExternals(page);
    await fulfil(page);
    await openLab(page, ADD);
    await expect(screen(page)).toContainText('base = 10', { timeout: 20000 });
    await typeLine(page, 'mine = 2');
    await next(page); await next(page);
    await expect(screen(page)).toContainText('double = base * 2');
    await page.waitForTimeout(1500);                   // the autosave runs
    await openLab(page, ADD);                          // opens the lab again from the saved draft
    await expect(screen(page)).toContainText('double = base * 2', { timeout: 20000 });
    await expect(screen(page)).toContainText('mine = 2');
    await prev(page); await next(page);
    expect(count(await getCode(page), 'double = base * 2')).toBe(1);
  });

  test('[ADMUI-COS-003] a "# @clear" step empties the editor to the plain template and the step after it adds its starter', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await mockExternals(page);
    await fulfil(page);
    await openLab(page, CLEAR);
    await expect(screen(page)).toContainText('base = 10', { timeout: 20000 });
    await typeLine(page, 'mine = 3');
    await expect(screen(page)).toContainText('mine = 3');
    await hold(page);
    await next(page);                                  // step 2 is "# @clear"
    await expect(screen(page)).toContainText('Write your Python code below');
    const cleared = await getCode(page);
    expect(cleared).not.toContain('mine = 3');
    expect(cleared).not.toContain('base = 10');
    await hold(page);
    await next(page);                                  // step 3 starter on the clean editor
    await expect(screen(page)).toContainText('fresh = 3');
    expect(await getCode(page)).not.toContain('Write your Python code below');
  });
});
