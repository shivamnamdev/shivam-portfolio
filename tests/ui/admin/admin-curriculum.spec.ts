import { test, expect, type Page } from '@playwright/test';
import { EMAIL } from '../../support/personas';
import { requireSeed } from '../../support/guards';
import { signInAs, clerkUserId } from '../../support/clerk';
import { adminDb } from '../../support/db';
import { BASE, clearWriteLimits, cleanupAdminApi, cohort, course } from '../../support/adminApi';
import { sessionFor, type Session } from '../../support/api';
import { LOCKED_LABEL } from '../../../lib/adminUi/curriculum';
import { lessonTitle, mockExternals } from '../../support/learning';

// Phase 4c: the curriculum editor against the QA project. Course and cohort are made through the API; everything is named "qa-admui-cur..." and removed afterwards.
const COURSE = 'qa-admui-cur-course';
const COHORT = 'qa-admui-cur-batch';
const V1 = 'a9nrrH5XkG0'; const V2 = 'b9nrrH5XkG1'; const V3 = 'c9nrrH5XkG2';
const RAW = 'https://raw.githubusercontent.com/o/g';
const dialog = (page: Page) => page.getByRole('dialog');
const alertBox = (page: Page) => page.locator('[role=alert]:not(#__next-route-announcer__)');
const modules = async () => ((await adminDb().from('content_docs').select('doc').eq('kind', 'curriculum').eq('key', COHORT).single()).data!.doc as { modules: Array<{ id: string; title: string; advanced: boolean; lessons: Array<Record<string, any>> }>; published: unknown });
const shape = async () => (await modules()).modules.map((m) => [m.title, m.lessons.map((l) => l.id)]);
const module = (page: Page, title: string) => page.getByRole('region', { name: `Module ${title}` });

test.describe('ADMUI curriculum editor @regression', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async () => { test.setTimeout(150_000); requireSeed(); await clearWriteLimits(); });
  let startedAt = ''; let admin: Session;
  test.beforeAll(async ({ browser }) => {
    startedAt = new Date().toISOString();
    await cleanupAdminApi();
    admin = await sessionFor(browser, EMAIL.admin);
    await admin.request.post(`${BASE}/courses`, { data: course(COURSE) });
    await admin.request.post(`${BASE}/cohorts`, { data: cohort(COHORT, COURSE) });
  });
  test.afterAll(async () => {
    await adminDb().from('video_progress').delete().eq('course_slug', COHORT);
    await adminDb().from('content_docs').delete().like('key', 'qa-admui%');
    await adminDb().from('admin_audit').delete().like('resource_id', 'qa-admui%').gte('at', startedAt);
    await clearWriteLimits(); await admin?.close();
  });

  test('[ADMUI-CUR-001] a cohort without a curriculum gets one; modules and lessons are added; bad lesson ids cannot be added', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/curriculum');
    const row = page.locator('tbody tr', { hasText: COHORT });
    await expect(row.getByText('None yet')).toBeVisible({ timeout: 30000 });
    await row.getByRole('button', { name: 'Create curriculum' }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/curriculum/${COHORT}$`));
    await expect(page.getByText('The published copy matches this one.')).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled();   // nothing to publish yet

    const add = page.getByRole('form', { name: 'Add a module' });
    await add.getByLabel('New module title').fill('Basics');
    await add.getByRole('button', { name: 'Add module' }).click();
    await expect(module(page, 'Basics')).toBeVisible();
    await add.getByLabel('New module title').fill('Loops');
    await add.getByRole('button', { name: 'Add module' }).click();
    await expect(module(page, 'Loops')).toBeVisible();
    await expect(page.getByText('Changes not published yet.')).toBeVisible();

    const lessonForm = page.getByRole('form', { name: 'Add a lesson to Basics' });
    const idBox = lessonForm.getByLabel(/^YouTube link or id/);
    await idBox.fill('not an id');
    await expect(lessonForm.getByRole('button', { name: 'Add lesson' })).toBeDisabled();
    await idBox.fill(`https://www.youtube.com/watch?v=${V1}&t=5s`);
    await lessonForm.getByLabel('Title (optional)').fill('Introduction');
    await lessonForm.getByRole('button', { name: 'Add lesson' }).click();
    await expect(module(page, 'Basics').getByText('Introduction')).toBeVisible();
    await idBox.fill(V2);
    await lessonForm.getByRole('button', { name: 'Add lesson' }).click();
    await idBox.fill('doc-notes-1');
    await lessonForm.getByRole('button', { name: 'Add lesson' }).click();
    await expect(module(page, 'Basics').getByText('Document notes-1')).toBeVisible();
    await idBox.fill(V1);   // already in the curriculum: the server refuses and says why
    await lessonForm.getByRole('button', { name: 'Add lesson' }).click();
    await expect(alertBox(page)).toBeVisible();
    expect(await shape()).toEqual([['Basics', [V1, V2, 'doc-notes-1']], ['Loops', []]]);
  });

  test('[ADMUI-CUR-002] reorder: lessons and modules move with the buttons, a lesson moves to another module, and the stored order follows', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto(`/admin/curriculum/${COHORT}`);
    await expect(module(page, 'Basics')).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('button', { name: 'Move lesson Introduction up' })).toBeDisabled();   // first lesson cannot go up
    await page.getByRole('button', { name: 'Move lesson Introduction down' }).click();
    await expect.poll(async () => (await shape())[0][1]).toEqual([V2, V1, 'doc-notes-1']);
    await page.getByRole('button', { name: 'Move lesson Introduction up' }).click();
    await expect.poll(async () => (await shape())[0][1]).toEqual([V1, V2, 'doc-notes-1']);
    await page.getByLabel(`Move lesson Video ${V2} to another module`).selectOption({ label: 'Loops' });
    await expect.poll(shape).toEqual([['Basics', [V1, 'doc-notes-1']], ['Loops', [V2]]]);
    await page.getByRole('button', { name: 'Move module Loops up' }).click();
    await expect.poll(async () => (await shape()).map((m) => m[0])).toEqual(['Loops', 'Basics']);
    await expect(page.getByRole('button', { name: 'Move module Loops up' })).toBeDisabled();
    await page.getByRole('button', { name: 'Move module Loops down' }).click();
    await expect.poll(async () => (await shape()).map((m) => m[0])).toEqual(['Basics', 'Loops']);
  });

  test('[ADMUI-CUR-003] a lesson is edited: title, description, a python assignment (bad host hinted), resources (bad link hinted); an assignment can be removed', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto(`/admin/curriculum/${COHORT}`);
    await module(page, 'Basics').getByRole('button', { name: 'Edit lesson Introduction' }).click();
    const panel = page.getByRole('form', { name: 'Edit lesson Introduction' });
    await panel.getByLabel('Title', { exact: true }).fill('Introduction to print');
    await panel.getByLabel(/^Description/).fill('Your first program');
    await panel.getByLabel('This lesson has an assignment').check();
    await panel.getByLabel('Assignment title').fill('Print your name');
    await panel.getByLabel('Assignment file').fill('https://github.com/o/r/blob/main/a.py');   // plain labels, never the field names (2026-11-14)
    await expect(panel.getByText(/Assignment file must be a link on raw\.githubusercontent\.com/)).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Save lesson' })).toBeDisabled();
    await panel.getByLabel('Assignment file').fill('https://raw.githubusercontent.com/o/r/main/a.py');
    await panel.getByRole('button', { name: 'Add a resource' }).click();
    await panel.getByLabel('Title', { exact: true }).nth(1).fill('Slides');
    await panel.getByLabel('Link', { exact: true }).fill('https://evil.example/slides.pdf');
    await expect(panel.getByText(/Resource 1 link must be a link on/)).toBeVisible();
    await panel.getByLabel('Link', { exact: true }).fill('https://drive.google.com/file/d/qa');
    await panel.getByRole('combobox').selectOption('PDF');
    await panel.getByRole('button', { name: 'Save lesson' }).click();
    await expect(page.getByRole('form', { name: /Edit lesson/ })).toHaveCount(0, { timeout: 15000 });
    const lesson = (await modules()).modules[0].lessons.find((l) => l.id === V1)!;
    expect(lesson).toMatchObject({ title: 'Introduction to print', description: 'Your first program', assignment: { title: 'Print your name', labType: 'python', rawUrl: 'https://raw.githubusercontent.com/o/r/main/a.py' }, resources: [{ title: 'Slides', type: 'PDF', url: 'https://drive.google.com/file/d/qa' }] });
    await expect(module(page, 'Basics').getByText('Assignment', { exact: true })).toBeVisible();

    await module(page, 'Basics').getByRole('button', { name: 'Edit lesson Introduction to print' }).click();
    const again = page.getByRole('form', { name: 'Edit lesson Introduction to print' });
    await again.getByLabel('This lesson has an assignment').uncheck();
    await again.getByRole('button', { name: 'Save lesson' }).click();
    await expect(page.getByRole('form', { name: /Edit lesson/ })).toHaveCount(0, { timeout: 15000 });
    expect((await modules()).modules[0].lessons.find((l) => l.id === V1)).not.toHaveProperty('assignment');
    // saving with nothing changed just closes the panel
    await module(page, 'Basics').getByRole('button', { name: 'Edit lesson Introduction to print' }).click();
    await page.getByRole('form', { name: 'Edit lesson Introduction to print' }).getByRole('button', { name: 'Save lesson' }).click();
    await expect(page.getByRole('form', { name: /Edit lesson/ })).toHaveCount(0);
  });

  test('[ADMUI-CUR-004] publish asks first and then matches; edits show as unpublished; discard goes back; the preview shows the learner outline', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto(`/admin/curriculum/${COHORT}`);
    await expect(page.getByText('Changes not published yet.')).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(dialog(page)).toContainText('2 modules');
    await dialog(page).getByRole('button', { name: 'Cancel' }).click();
    expect((await modules()).published).toBeNull();
    await page.getByRole('button', { name: 'Publish' }).click();
    await dialog(page).getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page.getByText('The published copy matches this one.')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Discard draft changes' })).toBeDisabled();

    const add = page.getByRole('form', { name: 'Add a module' });
    await add.getByLabel('New module title').fill('Extra module');
    await add.getByRole('button', { name: 'Add module' }).click();
    await expect(page.getByText('Changes not published yet.')).toBeVisible();
    await page.getByRole('button', { name: 'Preview as learner' }).click();
    const preview = page.getByLabel('Learner outline preview');
    await expect(preview.getByText('Extra module')).toBeVisible();
    await expect(preview.getByText('Lesson 1').first()).toBeVisible();
    await page.getByRole('button', { name: 'Back to editing' }).click();
    await page.getByRole('button', { name: 'Discard draft changes' }).click();
    await expect(dialog(page)).toContainText('lost');
    await dialog(page).getByRole('button', { name: 'Discard changes' }).click();
    await expect(module(page, 'Extra module')).toHaveCount(0, { timeout: 15000 });
    await expect(page.getByText('The published copy matches this one.')).toBeVisible();
  });

  test('[ADMUI-CUR-005] a lesson learners have progress on cannot be deleted: the server message is shown and the lesson stays', async ({ page }) => {
    const userId = await clerkUserId(EMAIL.edu);
    await adminDb().from('video_progress').insert([{ user_id: userId, course_slug: COHORT, video_id: V2 }]);
    await signInAs(page, EMAIL.admin);
    await page.goto(`/admin/curriculum/${COHORT}`);
    await page.getByRole('button', { name: `Delete lesson Video ${V2}` }).click();
    await expect(dialog(page)).toContainText('learners have progress');
    await dialog(page).getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(alertBox(page)).toContainText('Learners already have progress');
    expect((await shape()).flatMap((m) => m[1] as string[])).toContain(V2);
    // an unused lesson and an empty module can be deleted
    await page.getByRole('button', { name: 'Delete lesson Notes' }).or(page.getByRole('button', { name: 'Delete lesson Document notes-1' })).click();
    await dialog(page).getByRole('button', { name: 'Delete', exact: true }).click();
    await expect.poll(async () => (await shape()).flatMap((m) => m[1] as string[])).not.toContain('doc-notes-1');
  });

  test('[ADMUI-CUR-006] a stale edit is refused with the reload button, and a module is renamed and marked advanced', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto(`/admin/curriculum/${COHORT}`);
    await expect(module(page, 'Basics')).toBeVisible({ timeout: 30000 });
    await module(page, 'Basics').getByRole('button', { name: 'Rename' }).click();
    await module(page, 'Basics').getByLabel('Module title', { exact: true }).fill('Basics renamed');
    await module(page, 'Basics').getByRole('button', { name: 'Save', exact: true }).click();
    await expect(module(page, 'Basics renamed')).toBeVisible({ timeout: 15000 });
    await module(page, 'Basics renamed').getByLabel(LOCKED_LABEL).click();   // the box follows the server's answer, so it ticks a moment later
    await expect(module(page, 'Basics renamed').getByLabel(LOCKED_LABEL)).toBeChecked();
    await expect.poll(async () => (await modules()).modules.find((m) => m.title === 'Basics renamed')?.advanced).toBe(true);

    const row = (await adminDb().from('content_docs').select('version').eq('kind', 'curriculum').eq('key', COHORT).single()).data!;
    await adminDb().from('content_docs').update({ version: row.version + 5 }).eq('kind', 'curriculum').eq('key', COHORT);   // someone else saved
    const add = page.getByRole('form', { name: 'Add a module' });
    await add.getByLabel('New module title').fill('Too late');
    await add.getByRole('button', { name: 'Add module' }).click();
    await expect(alertBox(page)).toBeVisible();
    await page.getByRole('button', { name: 'Reload the latest version' }).click();
    await expect(page.getByText(`version ${row.version + 5}`)).toBeVisible();
    expect((await shape()).map((m) => m[0])).not.toContain('Too late');
  });

  test('[ADMUI-CUR-009] a document is added from a title, a link and a type (no id to invent), shows in the preview, and its file is edited as "Document file"', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto(`/admin/curriculum/${COHORT}`);
    await expect(module(page, 'Loops')).toBeVisible({ timeout: 30000 });
    await module(page, 'Loops').getByRole('radiogroup', { name: 'What to add to Loops' }).getByLabel(/^Document/).check();
    const form = page.getByRole('form', { name: 'Add a document to Loops' });
    await form.getByLabel('Document title').fill('Git Cheatsheet');
    await expect(form.getByRole('button', { name: 'Add document' })).toBeDisabled();            // no link yet
    await form.getByLabel('Document link').fill('https://evil.example/x.pdf');
    await expect(form.getByText(/The document link must be a link on/)).toBeVisible();
    await form.getByLabel('Document link').fill('https://s3.ap-south-1.amazonaws.com/git-course-content.shivamnamdev.com/Git+Cheatsheet.pdf');
    await form.getByLabel('Document type').selectOption('Document');
    await form.getByLabel(/^Short description/).fill('Git Complete Course Cheatsheet');
    await form.getByRole('button', { name: 'Add document' }).click();
    await expect(module(page, 'Loops').getByText('Git Cheatsheet')).toBeVisible({ timeout: 15000 });
    const stored = (await modules()).modules.find((m) => m.title === 'Loops')!.lessons.find((l) => l.id === 'doc-git-cheatsheet')!;
    expect(stored).toMatchObject({ kind: 'document', title: 'Git Cheatsheet', description: 'Git Complete Course Cheatsheet', resources: [{ title: 'Git Cheatsheet', type: 'Document', url: 'https://s3.ap-south-1.amazonaws.com/git-course-content.shivamnamdev.com/Git+Cheatsheet.pdf' }] });
    // the same title again gets -2, never a clash error
    await form.getByLabel('Document title').fill('Git Cheatsheet');
    await form.getByLabel('Document link').fill('https://drive.google.com/file/d/second');
    await form.getByRole('button', { name: 'Add document' }).click();
    await expect.poll(async () => (await shape()).flatMap((m) => m[1] as string[])).toContain('doc-git-cheatsheet-2');
    // editing: the document file is its own block, extra materials are separate
    await module(page, 'Loops').getByRole('button', { name: 'Edit lesson Git Cheatsheet' }).first().click();
    const panel = page.getByRole('form', { name: 'Edit lesson Git Cheatsheet' });
    await expect(panel.getByText('Shown to learners as the name of this document.')).toBeVisible();
    await expect(panel.getByLabel('Document link')).toHaveValue(/Git\+Cheatsheet\.pdf$/);
    await panel.getByLabel('Document link').fill('https://drive.google.com/file/d/moved');
    await panel.getByRole('button', { name: 'Add a resource' }).click();
    await panel.getByLabel('Title', { exact: true }).nth(1).fill('Slides');
    await panel.getByLabel('Link', { exact: true }).fill('https://github.com/o/slides');
    await panel.getByRole('button', { name: 'Save lesson' }).click();
    await expect(page.getByRole('form', { name: /Edit lesson/ })).toHaveCount(0, { timeout: 15000 });
    const edited = (await modules()).modules.find((m) => m.title === 'Loops')!.lessons.find((l) => l.id === 'doc-git-cheatsheet')!;
    expect(edited.resources).toEqual([{ title: 'Git Cheatsheet', type: 'Document', url: 'https://drive.google.com/file/d/moved' }, { title: 'Slides', type: 'Link', url: 'https://github.com/o/slides' }]);
    await page.getByRole('button', { name: 'Delete lesson Git Cheatsheet' }).last().click();   // the -2 copy
    await dialog(page).getByRole('button', { name: 'Delete', exact: true }).click();
    await expect.poll(async () => (await shape()).flatMap((m) => m[1] as string[])).not.toContain('doc-git-cheatsheet-2');
  });

  test('[ADMUI-CUR-010] a git lab keeps its solution link through the editor, and the links read as plain words with hints', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto(`/admin/curriculum/${COHORT}`);
    await module(page, 'Loops').getByRole('button', { name: `Edit lesson Video ${V2}` }).click();
    const panel = page.getByRole('form', { name: `Edit lesson Video ${V2}` });
    await panel.getByLabel('This lesson has an assignment').check();
    await panel.getByLabel('Assignment title').fill('Git Day 01: Init, Add, Commit');
    await panel.getByRole('radiogroup', { name: 'Lab type' }).getByLabel('Git lab').check();
    for (const [label, file] of [['Instructions (.md)', 'instructions.md'], ['Starter repository (.json)', 'repo-seed.json'], ['Expected state (.json)', 'expected-state.json'], ['Validator (.json)', 'validator.json'], ['Solution file', 'solution.md']] as const) {
      await panel.getByLabel(label).fill(`${RAW}/${file}`);
    }
    await expect(panel.getByText('What the learner has to do in the git lab, on raw.githubusercontent.com')).toBeVisible();   // a hint, not a field name
    await expect(panel.getByText(/rawUrl|solutionUrl|instructionsUrl/)).toHaveCount(0);
    await panel.getByLabel(/^Continue from the previous assignment/).check();
    await panel.getByRole('button', { name: 'Save lesson' }).click();
    await expect(page.getByRole('form', { name: /Edit lesson/ })).toHaveCount(0, { timeout: 15000 });
    const saved = (await modules()).modules.flatMap((m) => m.lessons).find((l) => l.id === V2)!.assignment;
    expect(saved).toEqual({ title: 'Git Day 01: Init, Add, Commit', labType: 'git', instructionsUrl: `${RAW}/instructions.md`, starterRepoUrl: `${RAW}/repo-seed.json`, expectedStateUrl: `${RAW}/expected-state.json`, validatorUrl: `${RAW}/validator.json`, solutionUrl: `${RAW}/solution.md`, carryOverCode: true });
    // reopening and saving untouched changes nothing (the solution is not lost on a second save either)
    await module(page, 'Loops').getByRole('button', { name: `Edit lesson Video ${V2}` }).click();
    await expect(page.getByRole('form', { name: `Edit lesson Video ${V2}` }).getByLabel('Solution file')).toHaveValue(`${RAW}/solution.md`);
    await page.getByRole('form', { name: `Edit lesson Video ${V2}` }).getByRole('button', { name: 'Save lesson' }).click();
    await expect(page.getByRole('form', { name: /Edit lesson/ })).toHaveCount(0);
    expect((await modules()).modules.flatMap((m) => m.lessons).find((l) => l.id === V2)!.assignment).toEqual(saved);
  });

  test('[ADMUI-CUR-011] the exam card: none for a course without an exam; names the exam lesson, its files and its module when the repository marks one; its assignment stays and only the exam is switched off', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await page.goto(`/admin/curriculum/${COHORT}`);
    const card = page.getByRole('region', { name: 'Final exam' });
    await expect(card).toContainText('Final exam: none', { timeout: 30000 });
    // the repository (never the API) marks the exam: write the flags straight into the stored document, as the import does
    const row = (await adminDb().from('content_docs').select('doc, version').eq('kind', 'curriculum').eq('key', COHORT).single()).data!;
    const doc = row.doc as { modules: Array<{ lessons: Array<Record<string, any>> }> };
    const lesson = doc.modules.flatMap((m) => m.lessons).find((l) => l.id === V2)!;
    lesson.assignment = { ...lesson.assignment, isExam: true, serverGraded: true, expectedOutcomeUrl: `${RAW}/expected.py`, rawUrl: `${RAW}/exam.docx` };
    await adminDb().from('content_docs').update({ doc, version: row.version + 1 }).eq('kind', 'curriculum').eq('key', COHORT);
    await page.reload();
    await expect(card).toContainText(`Final exam: Video ${V2}`, { timeout: 30000 });
    await expect(card).toContainText('Lesson 1 in Loops');
    await expect(card).toContainText('graded on the server');
    await expect(card.getByRole('link', { name: /Exam file/ })).toHaveAttribute('href', `${RAW}/exam.docx`);
    await expect(card.getByRole('link', { name: /Expected result/ })).toHaveAttribute('href', `${RAW}/expected.py`);
    await card.getByRole('button', { name: 'Go to the exam lesson' }).click();
    const panel = page.getByRole('form', { name: `Edit lesson Video ${V2}` });
    await expect(panel.getByText(/This lesson is the final exam\. Learners must pass it/)).toBeVisible();
    await expect(panel.getByLabel('This lesson has an assignment')).toBeDisabled();
    await expect(module(page, 'Loops').getByText('🏆 Final exam')).toBeVisible();
  });

  test('[ADMUI-CUR-012] video rows and the panel show what YouTube says (title, length, picture, description) and fall back quietly when YouTube is unreachable', async ({ page }) => {
    await signInAs(page, EMAIL.admin);
    await mockExternals(page);                      // the same stub the learner suite uses: QA Lesson <id>, 5:30
    await page.goto(`/admin/curriculum/${COHORT}`);
    const row = module(page, 'Basics').locator('li', { hasText: 'Introduction to print' });
    await expect(row).toContainText(`On YouTube: ${lessonTitle(V1)} · 5:30`, { timeout: 30000 });
    await expect(row.locator('img')).toHaveAttribute('src', `https://img.youtube.com/vi/${V1}/mqdefault.jpg`);
    await module(page, 'Basics').getByRole('button', { name: 'Edit lesson Introduction to print' }).click();
    const yt = page.getByRole('region', { name: 'On YouTube' });
    await expect(yt).toContainText(lessonTitle(V1));
    await yt.getByText('YouTube description').click();
    await expect(yt).toContainText(`Description of ${V1}`);
    await expect(page.getByRole('form', { name: /Edit lesson/ }).getByText('Names this row in the portal. Learners see the YouTube title.')).toBeVisible();
    // unreachable: the stored labels stay, one quiet line explains, nothing breaks
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await mockExternals(page, { youtube: 'fail' });
    await page.reload();
    await expect(module(page, 'Basics').getByText('Introduction to print')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('YouTube details are unavailable right now; the rows show the stored titles.')).toBeVisible();
    await expect(page.getByText(/On YouTube:/)).toHaveCount(0);
  });

  test('[ADMUI-CUR-007] the import check changes nothing and shows what it would do', async ({ page }) => {
    const before = (await adminDb().from('content_docs').select('key', { count: 'exact', head: true }).eq('kind', 'curriculum')).count;
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/curriculum');
    await expect(page.getByRole('heading', { name: 'Copy from the data files' })).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('button', { name: 'Apply what the check showed' })).toBeDisabled();   // must check first
    await page.getByRole('button', { name: 'Check (changes nothing)' }).click();
    await expect(page.getByText('Check result (nothing was written)').or(alertBox(page))).toBeVisible({ timeout: 30000 });
    expect((await adminDb().from('content_docs').select('key', { count: 'exact', head: true }).eq('kind', 'curriculum')).count).toBe(before);
  });

  test('[ADMUI-CUR-016] the courses check changes nothing, must come before apply, and lists the sold courses with a create or unchanged result', async ({ page }) => {
    const count = async () => (await adminDb().from('content_docs').select('key', { count: 'exact', head: true }).in('kind', ['course', 'cohort'])).count;
    const before = await count();
    await signInAs(page, EMAIL.admin);
    await page.goto('/admin/curriculum');
    await expect(page.getByRole('heading', { name: 'Courses and cohorts from the data files' })).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('button', { name: 'Apply what the course check showed' })).toBeDisabled();
    await page.getByRole('button', { name: 'Check courses (changes nothing)' }).click();
    await expect(page.getByText('Course check result (nothing was written)')).toBeVisible({ timeout: 30000 });
    const panel = page.getByRole('region', { name: 'Courses and cohorts from the data files' });
    await expect(panel.getByText('python-beginners', { exact: true })).toBeVisible();
    await expect(panel.getByText(/Will be created|Already the same/).first()).toBeVisible();
    expect(await count()).toBe(before);
  });

  test('[ADMUI-CUR-008] on a phone the curriculum screens do not scroll sideways', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await signInAs(page, EMAIL.admin);
    for (const path of ['/admin/curriculum', `/admin/curriculum/${COHORT}`]) {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible({ timeout: 30000 });
      const moved = await page.evaluate(() => { window.scrollTo(80, 0); const x = window.scrollX; window.scrollTo(0, 0); return x; });
      expect(moved, `${path} must not scroll sideways`).toBe(0);
    }
  });
});
