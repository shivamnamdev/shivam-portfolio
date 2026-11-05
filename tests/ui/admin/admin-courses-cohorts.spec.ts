import { test, expect, type Page } from '@playwright/test';
import { EMAIL } from '../../support/personas';
import { requireSeed } from '../../support/guards';
import { signInAs } from '../../support/clerk';
import { adminDb, grantTestEnrolment } from '../../support/db';
import { expectOnPath } from '../../support/assertions';
import { clearWriteLimits, cleanupAdminApi } from '../../support/adminApi';

// Phase 4b: the Courses and Cohorts screens, against the QA project. Everything made here is called "qa-admui-..." and removed afterwards.
const COURSE = 'qa-admui-course';
const COPY = 'qa-admui-course-copy';
const COHORT = 'qa-admui-batch';
const dialog = (page: Page) => page.getByRole('dialog');
const alertBox = (page: Page) => page.locator('[role=alert]:not(#__next-route-announcer__)');

test.describe('ADMUI courses and cohorts @regression', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async () => { test.setTimeout(120_000); requireSeed(); await clearWriteLimits(); });
  let startedAt = '';
  test.beforeAll(async () => { startedAt = new Date().toISOString(); await cleanupAdminApi(); });
  test.afterAll(async () => {
    await adminDb().from('user_enrollments').delete().eq('course_slug', COHORT);
    await adminDb().from('content_docs').delete().like('key', 'qa-admui%');
    await adminDb().from('admin_audit').delete().like('resource_id', 'qa-admui%').gte('at', startedAt);
    await clearWriteLimits();
  });

  test('[ADMUI-COURSE-001] a course is created from the form, edited (a broken pitch cannot be saved), and the change survives a reload', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/courses');
    const form = page.getByRole('form', { name: 'New course' });
    await form.getByLabel('Title').fill('QA ADMUI Course');
    await expect(form.getByLabel(/^Slug/)).toHaveValue(COURSE);   // suggested from the title
    await form.getByLabel(/^Summary/).fill('made by the UI test');
    await form.getByRole('button', { name: 'Create course' }).click();
    await expectOnPath(page, `/admin/courses/${COURSE}`);
    await expect(page.getByRole('heading', { name: 'QA ADMUI Course', level: 1 })).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('draft', { exact: true })).toBeVisible();

    const edit = page.getByRole('form', { name: 'Edit course' });
    await edit.getByLabel(/^Sales page content/).fill('{ not json');
    await expect(page.getByText(/Not valid JSON/)).toBeVisible();
    await expect(edit.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    await edit.getByLabel(/^Sales page content/).fill('[1,2]');
    await expect(page.getByText(/must be a JSON object/)).toBeVisible();
    await edit.getByLabel(/^Sales page content/).fill('{"vsl":{"headline":"Learn by doing"}}');
    await edit.getByLabel('Title').fill('QA ADMUI Course v2');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
    await expect(page.getByText('Version 2')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'QA ADMUI Course v2', level: 1 })).toBeVisible({ timeout: 30000 });
    await expect(page.getByLabel(/^Sales page content/)).toHaveValue(/Learn by doing/);
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await expect(alertBox(page)).toContainText('Nothing has changed');
    const row = (await adminDb().from('content_docs').select('doc, version').eq('kind', 'course').eq('key', COURSE).single()).data!;
    expect(row.version).toBe(2);
    expect(row.doc).toMatchObject({ title: 'QA ADMUI Course v2' });
  });

  test('[ADMUI-COURSE-002] a stale save is refused with a reload button; the server message is shown', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto(`/admin/courses/${COURSE}`);
    await expect(page.getByRole('heading', { name: 'QA ADMUI Course v2', level: 1 })).toBeVisible({ timeout: 30000 });
    await adminDb().from('content_docs').update({ version: 7 }).eq('kind', 'course').eq('key', COURSE);   // someone else saved in the meantime
    const edit = page.getByRole('form', { name: 'Edit course' });
    await edit.getByLabel('Title').fill('QA ADMUI Course v3');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await expect(alertBox(page)).toBeVisible();
    await page.getByRole('button', { name: 'Reload the latest version' }).click();
    await expect(page.getByText('Version 7')).toBeVisible();
    await expect(edit.getByLabel('Title')).toHaveValue('QA ADMUI Course v2');
  });

  test('[ADMUI-COURSE-003] life cycle asks first: publish, back to draft, archive, restore; Cancel changes nothing', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto(`/admin/courses/${COURSE}`);
    await expect(page.getByText('draft', { exact: true })).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(dialog(page)).toContainText(COURSE);
    await dialog(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('draft', { exact: true })).toBeVisible();
    const step = async (button: string, confirm: string, badge: string) => {
      await page.getByRole('button', { name: button, exact: true }).click();
      await dialog(page).getByRole('button', { name: confirm, exact: true }).click();
      await expect(page.getByText(badge, { exact: true })).toBeVisible({ timeout: 15000 });
    };
    await step('Publish', 'Publish', 'published');
    await expect(page.getByRole('button', { name: 'Publish', exact: true })).toHaveCount(0);   // only the transitions the server allows are offered
    await step('Move back to draft', 'Move back to draft', 'draft');
    await step('Archive', 'Archive', 'archived');
    await expect(page.getByRole('button', { name: 'Archive', exact: true })).toHaveCount(0);
    await step('Restore as draft', 'Restore as draft', 'draft');
  });

  test('[ADMUI-COURSE-004] duplicate makes a new draft; delete asks first and removes it; a duplicate slug is refused inline', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto(`/admin/courses/${COURSE}`);
    await page.getByRole('button', { name: 'Duplicate as a new draft' }).click();
    await dialog(page).getByLabel('New slug').fill(COURSE);   // already taken
    await dialog(page).getByRole('button', { name: 'Create copy' }).click();
    await expect(alertBox(page)).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Duplicate as a new draft' }).click();
    await dialog(page).getByLabel('New slug').fill(COPY);
    await dialog(page).getByRole('button', { name: 'Create copy' }).click();
    await expectOnPath(page, `/admin/courses/${COPY}`);
    await expect(page.getByText('draft', { exact: true })).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Delete course' }).click();
    await expect(dialog(page)).toContainText('QA ADMUI Course v2 (copy)');
    await dialog(page).getByRole('button', { name: 'Delete course' }).click();
    await expectOnPath(page, '/admin/courses');
    expect((await adminDb().from('content_docs').select('key').eq('kind', 'course').eq('key', COPY)).data).toHaveLength(0);
  });

  test('[ADMUI-COHORT-001] a cohort with plans is created; price hints and the free notice show before saving', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto(`/admin/cohorts?course=${COURSE}`);
    const form = page.getByRole('form', { name: 'New cohort' });
    await expect(form.getByLabel('Course')).toHaveValue(COURSE, { timeout: 30000 });
    await form.getByLabel('Title').fill('QA ADMUI Batch');
    await expect(form.getByLabel(/^Slug/)).toHaveValue(COHORT);
    await expect(form.getByText('A price of 0 makes this cohort free to join.')).toBeVisible();
    await form.getByLabel('Plans').check();
    await form.getByLabel('Plan id').fill('community');
    await form.getByLabel('Name', { exact: true }).fill('Community');
    await form.getByLabel('Price (INR)', { exact: true }).fill('0.5');
    await expect(form.getByText(/at least 1 INR/)).toBeVisible();
    await form.getByLabel('Price (INR)', { exact: true }).fill('abc');
    await expect(form.getByText('Use a number such as 1999 or 19.99')).toBeVisible();
    await form.getByLabel('Price (INR)', { exact: true }).fill('1999');
    await form.getByLabel('Original (INR)', { exact: true }).fill('2499');
    await expect(form.getByText(/at least 1 INR/)).toHaveCount(0);
    await form.getByRole('button', { name: 'Add a plan' }).click();
    await expect(form.getByText('Plan personal needs a name')).toHaveCount(0);
    await expect(form.getByText('Plan plan-2 needs a name')).toBeVisible();
    await expect(form.getByRole('button', { name: 'Create cohort' })).toBeEnabled();   // hints inform; the server decides
    await form.getByLabel('Plan id').nth(1).fill('personal');
    await form.getByLabel('Name', { exact: true }).nth(1).fill('Personal');
    await form.getByLabel('Price (INR)', { exact: true }).nth(1).fill('2999');
    await form.getByRole('button', { name: 'Create cohort' }).click();
    await expectOnPath(page, `/admin/cohorts/${COHORT}`);
    await expect(page.getByRole('heading', { name: 'QA ADMUI Batch', level: 1 })).toBeVisible({ timeout: 30000 });
    const doc = (await adminDb().from('content_docs').select('doc, status').eq('kind', 'cohort').eq('key', COHORT).single()).data!;
    expect(doc.status).toBe('draft');
    expect(doc.doc.pricing).toMatchObject({ kind: 'plans', plans: [{ id: 'community', price: { amount: 1999, original: 2499 } }, { id: 'personal', price: { amount: 2999 } }] });
  });

  test('[ADMUI-COHORT-002] a cohort is edited: only changed fields are sent, the price can change, enrolment closes and reopens, the server refuses a bad link inline', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto(`/admin/cohorts/${COHORT}`);
    await expect(page.getByRole('heading', { name: 'QA ADMUI Batch', level: 1 })).toBeVisible({ timeout: 30000 });
    const edit = page.getByRole('form', { name: 'Edit cohort' });
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await expect(alertBox(page)).toContainText('Nothing has changed');
    await edit.getByLabel('Duration (for example “8 weeks”)').fill('8 weeks');
    await edit.getByLabel('Price (INR)', { exact: true }).nth(1).fill('3499');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
    const doc = (await adminDb().from('content_docs').select('doc').eq('kind', 'cohort').eq('key', COHORT).single()).data!.doc;
    expect(doc).toMatchObject({ duration: '8 weeks', pricing: { plans: [{ price: { amount: 1999 } }, { price: { amount: 3499 } }] } });

    await expect(page.getByText('Enrolment is open')).toBeVisible();
    await page.getByRole('button', { name: 'Close enrolment' }).click();
    await expect(page.getByText('Enrolment is closed')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Open enrolment' }).click();
    await expect(page.getByText('Enrolment is open')).toBeVisible({ timeout: 15000 });

    const links = page.getByRole('form', { name: 'Private links' });
    await links.getByLabel('WhatsApp group link').fill('http://not-secure.example');
    await links.getByRole('button', { name: 'Save links' }).click();
    await expect(alertBox(page)).toBeVisible();
    await links.getByLabel('WhatsApp group link').fill('https://chat.whatsapp.com/qa-admui');
    await links.getByRole('button', { name: 'Save links' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Links saved' })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('WhatsApp group link')).toHaveValue('https://chat.whatsapp.com/qa-admui', { timeout: 30000 });
  });

  test('[ADMUI-COHORT-003] a cohort with learners cannot be deleted: the server message is shown and the cohort stays', async ({ page }) => {
    await grantTestEnrolment(EMAIL.edu, COHORT);
    await signInAs(page, EMAIL.admin);
    await page.goto(`/admin/cohorts/${COHORT}`);
    await expect(page.getByRole('heading', { name: 'QA ADMUI Batch', level: 1 })).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Delete cohort' }).click();
    await dialog(page).getByRole('button', { name: 'Delete cohort' }).click();
    await expect(alertBox(page)).toContainText('Learners are enrolled');
    expect((await adminDb().from('content_docs').select('key').eq('kind', 'cohort').eq('key', COHORT)).data).toHaveLength(1);
  });

  test('[ADMUI-COHORT-004] the lists show what was made, filter by course, and the course page links to its cohorts', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/cohorts');
    await page.getByRole('form', { name: 'Filter cohorts' }).getByLabel('Course').selectOption(COURSE);
    await expect(page.getByRole('link', { name: 'QA ADMUI Batch' })).toBeVisible({ timeout: 30000 });
    await page.getByRole('form', { name: 'Filter cohorts' }).getByLabel('Status').selectOption('published');
    await expect(page.getByText('No cohorts match.')).toBeVisible();
    await page.goto(`/admin/courses/${COURSE}`);
    await page.getByRole('link', { name: 'QA ADMUI Batch' }).click();
    await expectOnPath(page, `/admin/cohorts/${COHORT}`);
    await page.goto('/admin/courses');
    await page.getByRole('form', { name: 'Filter courses' }).getByLabel('Search').fill('qa admui');
    await page.getByRole('form', { name: 'Filter courses' }).getByRole('button', { name: 'Search' }).click();
    await expect(page.getByRole('link', { name: 'QA ADMUI Course v2' })).toBeVisible({ timeout: 30000 });
  });

  test('[ADMUI-COURSE-005] on a phone the course and cohort screens do not scroll sideways', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await signInAs(page, EMAIL.admin);
    for (const path of ['/admin/courses', `/admin/courses/${COURSE}`, '/admin/cohorts', `/admin/cohorts/${COHORT}`]) {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible({ timeout: 30000 });
      const moved = await page.evaluate(() => { window.scrollTo(80, 0); const x = window.scrollX; window.scrollTo(0, 0); return x; });
      expect(moved, `${path} must not scroll sideways`).toBe(0);
    }
  });
});
