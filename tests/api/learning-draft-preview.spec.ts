import { test, expect } from '@playwright/test';
import { EMAIL } from '../support/personas';
import { requireSeed } from '../support/guards';
import { sessionFor, type Session } from '../support/api';
import { BASE, clearWriteLimits, cleanupAdminApi, cohort, course } from '../support/adminApi';

// The admin's learner preview reads the unpublished curriculum (docs/architecture/learner-draft-preview.md). A throwaway cohort that was never published.
const COURSE = 'qa-aapi-prv-course';
const COHORT = 'qa-aapi-prv-batch';
const LESSON = 'qaprev00001';
const content = (s: Session, q = '') => s.request.get(`/api/learning/content/${COHORT}${q}`);

test.describe('Learner draft preview API @regression', () => {
  test.describe.configure({ mode: 'serial' });
  let admin: Session; let learner: Session;
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000); requireSeed(); await clearWriteLimits();
    admin = await sessionFor(browser, EMAIL.admin);
    learner = await sessionFor(browser, EMAIL.edu);
    await admin.request.post(`${BASE}/courses`, { data: course(COURSE) });
    await admin.request.post(`${BASE}/cohorts`, { data: cohort(COHORT, COURSE) });
    const put = await admin.request.put(`${BASE}/curriculum/${COHORT}`, { data: { modules: [{ title: 'Draft module', lessons: [{ id: LESSON, assignment: { title: 'Draft lab', rawUrl: 'https://raw.githubusercontent.com/o/r/main/a.docx' } }] }] } });
    expect(put.status()).toBe(201);                                   // saved as a draft, never published
  });
  test.afterAll(async () => { await cleanupAdminApi(); await clearWriteLimits(); await admin?.close(); await learner?.close(); });

  test('[LRNP-API-001] the admin reads the unpublished draft with ?draft=1: its modules, lessons and lab; without the flag the course has nothing published', async () => {
    const draft = await content(admin, '?draft=1');
    expect(draft.status()).toBe(200);
    const body = await draft.json();
    expect(body.success).toBe(true);
    expect(body.modules).toHaveLength(1);
    expect(body.modules[0]).toMatchObject({ moduleTitle: 'Draft module', videoIds: [LESSON] });
    expect(body.modules[0].githubAssignments[LESSON]).toMatchObject({ title: 'Draft lab' });
    const published = await (await content(admin)).json();
    expect(published.modules).toEqual([]);                            // learners see nothing until it is published
  });

  test('[LRNP-API-002] nobody else can read the draft: a learner gets 403 (no fallback to the published course), a visitor 401; their normal read is unchanged', async ({ request }) => {
    const learnerDraft = await content(learner, '?draft=1');
    expect(learnerDraft.status()).toBe(403);
    expect((await learnerDraft.json()).error).toMatch(/admin only/);
    expect((await request.get(`/api/learning/content/${COHORT}?draft=1`)).status()).toBe(401);
    expect((await content(learner)).status()).toBe(403);              // not enrolled: same answer as before the preview existed
    for (const odd of ['?draft=0', '?draft=true', '?draft=']) expect((await (await content(admin, odd)).json()).modules, odd).toEqual([]);   // only draft=1 asks for the draft
  });
});
