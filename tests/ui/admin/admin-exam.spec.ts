import { test, expect, type Page } from '@playwright/test';
import { EMAIL } from '../../support/personas';
import { requireSeed } from '../../support/guards';
import { signInAs } from '../../support/clerk';
import { adminDb } from '../../support/db';
import { BASE, clearWriteLimits } from '../../support/adminApi';
import { sessionFor, type Session } from '../../support/api';

// The exam switch in the curriculum editor (docs/architecture/exam-switch.md) on the real python-beginners curriculum on QA (the only course with a grader in code).
// The exam is moved, shown, switched off and then put back in afterAll.
const SLUG = 'python-beginners';
const REAL_EXAM = 'WhP2F-xk3Kk';
const FIRST = 'OkK3E7ApZ4Q';           // the first lesson, with an assignment, in an open module
const RAW = 'https://raw.githubusercontent.com/shivamnamdev/qa-exam';
const card = (page: Page) => page.getByRole('region', { name: 'Final exam' });
const modules = async () => ((await adminDb().from('content_docs').select('doc').eq('kind', 'curriculum').eq('key', SLUG).single()).data!.doc as { modules: Array<{ lessons: Array<{ id: string; assignment?: Record<string, unknown> }> }> }).modules;
const exams = async () => (await modules()).flatMap((m) => m.lessons).filter((l) => l.assignment?.isExam).map((l) => l.id);
const openLesson = async (page: Page, id: string) => { await page.getByRole('button', { name: `Edit lesson Video ${id}` }).click(); return page.getByRole('form', { name: `Edit lesson Video ${id}` }); };

test.describe('ADMUI exam switch @regression', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async () => { test.setTimeout(150_000); requireSeed(); await clearWriteLimits(); });
  let admin: Session; let origOutcome: string | undefined;
  test.beforeAll(async ({ browser }) => {
    admin = await sessionFor(browser, EMAIL.admin);
    if ((await admin.request.get(`${BASE}/curriculum/${SLUG}`)).status() === 404) await admin.request.post(`${BASE}/import/curriculum`, { data: { cohorts: [SLUG], apply: true } });
    const lesson = (await modules()).flatMap((m) => m.lessons).find((l) => l.id === REAL_EXAM)!;
    origOutcome = lesson.assignment?.expectedOutcomeUrl as string | undefined;
  });
  test.afterAll(async () => {
    const d = (await (await admin.request.get(`${BASE}/curriculum/${SLUG}`)).json()).data;
    await admin.request.put(`${BASE}/curriculum/${SLUG}/exam`, { data: { lessonId: REAL_EXAM, ...(origOutcome ? { expectedOutcomeUrl: origOutcome } : {}) }, headers: { 'If-Match': String(d.version) } });
    await adminDb().from('admin_audit').delete().in('action', ['exam.set', 'exam.clear']).eq('resource_id', SLUG);
    await clearWriteLimits(); await admin?.close();
  });

  test('[ADMUI-CUR-013] the exam is unmistakable (purple "Final exam" on the row and the card), and moving it is one switch: the old lesson becomes an ordinary assignment', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto(`/admin/curriculum/${SLUG}`);
    await expect(card(page)).toContainText(`Final exam: Video ${REAL_EXAM}`, { timeout: 30000 });
    await expect(card(page)).toContainText('Learners must pass it to get the certificate');
    const examRow = page.locator('li', { hasText: REAL_EXAM });
    await expect(examRow.getByText('🏆 Final exam')).toBeVisible();
    await expect(page.locator('li', { hasText: FIRST }).getByText('Assignment', { exact: true })).toBeVisible();

    const panel = await openLesson(page, FIRST);
    const toggle = panel.getByLabel('This lesson is the final exam');
    await expect(toggle).toBeEnabled();
    await expect(panel.getByText(/This moves the exam from/)).toBeVisible();
    await toggle.check();
    await panel.getByLabel(/^Expected result/).fill('https://evil.example/x.py');
    await expect(panel.getByText(/Expected result must be a link on raw\.githubusercontent\.com/)).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Save lesson' })).toBeDisabled();
    await panel.getByLabel(/^Expected result/).fill(`${RAW}/expected.py`);
    await panel.getByRole('button', { name: 'Save lesson' }).click();
    await expect(page.getByRole('form', { name: /Edit lesson/ })).toHaveCount(0, { timeout: 20000 });
    await expect(card(page)).toContainText(`Final exam: Video ${FIRST}`);
    await expect(page.locator('li', { hasText: FIRST }).getByText('🏆 Final exam')).toBeVisible();
    await expect(page.locator('li', { hasText: REAL_EXAM }).getByText('Assignment', { exact: true })).toBeVisible();
    expect(await exams()).toEqual([FIRST]);
    const stored = (await modules()).flatMap((m) => m.lessons).find((l) => l.id === FIRST)!.assignment!;
    expect(stored).toMatchObject({ isExam: true, serverGraded: true, expectedOutcomeUrl: `${RAW}/expected.py` });
    await page.getByRole('button', { name: 'Preview as learner' }).click();
    await expect(page.getByLabel('Learner outline preview').getByText('🏆 Final exam')).toHaveCount(1);
  });

  test('[ADMUI-CUR-014] the exam is optional: it is switched off from the lesson, the card says none and how to add one, and every assignment stays', async ({ page }) => {
    const before = (await modules()).flatMap((m) => m.lessons).filter((l) => l.assignment).length;
    await signInAs(page, EMAIL.admin);
    await page.goto(`/admin/curriculum/${SLUG}`);
    const panel = await openLesson(page, FIRST);
    await expect(panel.getByText('This lesson is the final exam. Learners must pass it to get the certificate.')).toBeVisible();
    await expect(panel.getByLabel('This lesson has an assignment')).toBeDisabled();   // the assignment stays: switch the exam off instead
    await panel.getByLabel('This lesson is the final exam').uncheck();
    await panel.getByRole('button', { name: 'Save lesson' }).click();
    await expect(page.getByRole('form', { name: /Edit lesson/ })).toHaveCount(0, { timeout: 20000 });
    await expect(card(page)).toContainText('Final exam: none');
    await expect(card(page)).toContainText('An exam is optional');
    await expect(card(page)).toContainText('turn on “This lesson is the final exam”');
    expect(await exams()).toEqual([]);
    expect((await modules()).flatMap((m) => m.lessons).filter((l) => l.assignment).length).toBe(before);
    await expect(page.getByText('🏆 Final exam')).toHaveCount(0);
  });

  test('[ADMUI-CUR-015] a course without a grader in code shows the card and the switch off with the reason (the locked-module and missing-file reasons are unit-tested, ADMUI-UNIT-CUR-013)', async ({ page }) => {
    // the portal-only cohort made through the API has no grader: use a throwaway one
    const COURSE = 'qa-admui-exm-course', COHORT = 'qa-admui-exm-batch';
    const mk = await import('../../support/adminApi');
    await admin.request.post(`${BASE}/courses`, { data: mk.course(COURSE) });
    await admin.request.post(`${BASE}/cohorts`, { data: mk.cohort(COHORT, COURSE) });
    try {
      const put = await admin.request.put(`${BASE}/curriculum/${COHORT}`, { data: { modules: [{ title: 'Open', lessons: [{ id: 'qaexmui0001', assignment: { title: 'A', rawUrl: `${RAW}/a` } }] }] } });
      expect(put.status()).toBe(201);
      await signInAs(page, EMAIL.admin);
      await page.goto(`/admin/curriculum/${COHORT}`);
      await expect(card(page)).toContainText('Final exam: none', { timeout: 30000 });
      await expect(card(page)).toContainText('a grader first has to be added in the code');
      await page.getByRole('button', { name: 'Edit lesson Video qaexmui0001' }).click();
      const panel = page.getByRole('form', { name: 'Edit lesson Video qaexmui0001' });
      await expect(panel.getByLabel('This lesson is the final exam')).toBeDisabled();
      await expect(panel.getByRole('note')).toContainText('no exam grader yet');
    } finally {
      await adminDb().from('content_docs').delete().like('key', 'qa-admui-exm%');
    }
  });
});
