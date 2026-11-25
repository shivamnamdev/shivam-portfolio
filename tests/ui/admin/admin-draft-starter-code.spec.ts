import { test, expect, type Page } from '@playwright/test';
import { EMAIL } from '../../support/personas';
import { requireSeed } from '../../support/guards';
import { signInAs } from '../../support/clerk';
import { sessionFor, type Session } from '../../support/api';
import { BASE, clearWriteLimits, cleanupAdminApi, cohort, course } from '../../support/adminApi';
import { mockExternals, tab, labReady, getCode } from '../../support/learning';

// A draft course with a Python lab whose "starter code" is a login program, opened with "Preview as learner" (localhost). The GitHub files are answered
// locally so the starter code is exact: the test shows what the lab opens with for a good starter file and for the ways it can go wrong.
const COURSE = 'qa-admui-stc-course';
const COHORT = 'qa-admui-stc-batch';
const LESSON = 'qastc000001';
const RAW = 'https://raw.githubusercontent.com/qa/login-lab/main';
const STARTER = 'def login(username, password):\n    # TODO: return True only for admin / secret\n    pass';
const FALLBACK = '# Write your Python code below:';

const fulfil = (page: Page, starter: { status: number; body: string; type?: string }) =>
  page.route(`${RAW}/**`, (route) => {
    const url = route.request().url();
    if (url.includes('/starter')) return route.fulfill({ status: starter.status, contentType: starter.type ?? 'text/plain', body: starter.body });
    return route.fulfill({ status: 200, contentType: 'text/plain', body: 'Write a login(username, password) function.\n---\nNow add a lockout after three failures.' });
  });

const openLab = async (page: Page) => {
  await page.goto(`/learning/${COHORT}?preview=draft`);
  await expect(page.getByText('Course Content')).toBeVisible({ timeout: 40000 });
  await page.locator('aside').getByRole('button', { name: `QA Lesson ${LESSON}` }).click();
  await tab(page, /Practice/).click();
  await labReady(page);
};

test.describe('ADMUI draft course: starter code of a Python lab @regression', () => {
  test.describe.configure({ mode: 'serial' });
  let admin: Session;
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000); requireSeed(); await clearWriteLimits();
    admin = await sessionFor(browser, EMAIL.admin);
    await admin.request.post(`${BASE}/courses`, { data: course(COURSE) });
    await admin.request.post(`${BASE}/cohorts`, { data: cohort(COHORT, COURSE) });
    // A curriculum left by an earlier run (the shared cleanup only removes `qa-aapi` keys) must be replaced with its version in If-Match.
    const existing = await admin.request.get(`${BASE}/curriculum/${COHORT}`);
    const version = existing.ok() ? (await existing.json()).data?.version : undefined;
    const put = await admin.request.put(`${BASE}/curriculum/${COHORT}`, {
      data: { modules: [{ title: 'Draft module', lessons: [{ id: LESSON, assignment: { labType: 'python', title: 'Login', rawUrl: `${RAW}/assignment.txt`, starterCodeUrl: `${RAW}/starter.py` } }] }] },
      headers: version ? { 'If-Match': String(version) } : {},
    });
    expect([200, 201], await put.text()).toContain(put.status());
  });
  test.afterAll(async () => { await cleanupAdminApi(); await clearWriteLimits(); await admin?.close(); });
  test.beforeEach(async () => { test.setTimeout(150_000); });

  test('[ADMUI-STC-001] a draft lab opens with its starter code (the login program), in the editor, from the preview', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await mockExternals(page);
    await fulfil(page, { status: 200, body: STARTER });
    await openLab(page);
    await expect(page.locator('.monaco-editor .view-lines').first()).toContainText('def login(username, password)', { timeout: 20000 });
    expect(await getCode(page)).toContain('return True only for admin / secret');
  });

  test('[ADMUI-STC-002] when the starter file cannot be read (404) the lab opens with the plain template and the page does not break', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await mockExternals(page);
    await fulfil(page, { status: 404, body: 'Not Found' });
    await openLab(page);
    expect(await getCode(page)).toContain(FALLBACK);
    await expect(page.getByText(/something went wrong|application error/i)).toHaveCount(0);
  });

  test('[ADMUI-STC-003] a starter file that is a Word document (.docx) does not open as readable code', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await mockExternals(page);
    await fulfil(page, { status: 200, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', body: 'PK\u0003\u0004binary-garbage\u0000\u0001' });
    await openLab(page);
    const code = await getCode(page);
    console.log('STC-003 editor starts with:', JSON.stringify(code.slice(0, 60)));
    expect(code).not.toContain('def login');
  });
  test('[ADMUI-STC-004] a lab first opened while its starter was missing shows the starter once the starter is added', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await mockExternals(page);
    await fulfil(page, { status: 404, body: 'Not Found' });
    const hold = () => page.waitForTimeout(Number(process.env.PAUSE_MS ?? 0));   // PAUSE_MS (default 0) holds the screen for a person watching a headed run
    await openLab(page);
    expect(await getCode(page)).toContain(FALLBACK);   // the lab opened with the plain template (the starter link was not set or not readable yet)
    await hold();                                       // step 1 on screen: the plain template
    await page.waitForTimeout(1500);                    // the autosave runs
    await page.unroute(`${RAW}/**`);
    await fulfil(page, { status: 200, body: STARTER });   // the starter file is now in place
    await openLab(page);
    await expect(page.locator('.monaco-editor .view-lines').first()).toContainText('def login(username, password)', { timeout: 20000 });
    expect(await getCode(page)).toContain('return True only for admin / secret');
    await hold();                                       // step 2 on screen: the starter code
  });
});
