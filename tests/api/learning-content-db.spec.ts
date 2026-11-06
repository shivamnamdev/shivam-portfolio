import { test, expect } from '@playwright/test';
import { EMAIL } from '../support/personas';
import { requireSeed } from '../support/guards';
import { sessionFor, type Session } from '../support/api';
import { BASE, clearWriteLimits, cohort, course, singlePricing } from '../support/adminApi';
import { adminDb } from '../support/db';

// Phase 5, slice 5b with PORTAL_LEARNING=database: lessons, title, links and the share page come from the portal's published curriculum and cohort.
// Start the server and the run with the flag: PORT=3100 PORTAL_LEARNING=database E2E_SEED_PERSONAS=1 npx playwright test tests/api/learning-content-db.spec.ts
// The learner is the edu persona (enrolled in nothing else); everything is made under qa-lrn-* and removed afterwards.
const COURSE = 'qa-lrn-course';
const COHORT = 'qa-lrn-batch';
const LIVE = 'https://meet.google.com/qa-lrn-secret-live';
const CHAT = 'https://chat.whatsapp.com/qa-lrn-secret-chat';
const V = (n: number) => `qalrnvid${String(n).padStart(3, '0')}`;   // 11 characters
const hdr = (v: number) => ({ 'If-Match': String(v) });

test.describe('Learner content from the portal, PORTAL_LEARNING=database @regression', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async () => {
    test.setTimeout(120_000);
    requireSeed();
    test.skip(process.env.PORTAL_LEARNING !== 'database', 'needs the server and the test process started with PORTAL_LEARNING=database');
    await clearWriteLimits();
  });
  let admin: Session; let learner: Session; let startedAt = ''; let version = 0;
  test.beforeAll(async ({ browser }) => {
    startedAt = new Date().toISOString();
    if (!process.env.E2E_SEED_PERSONAS || process.env.PORTAL_LEARNING !== 'database') return;
    admin = await sessionFor(browser, EMAIL.admin);
    learner = await sessionFor(browser, EMAIL.edu);
  });
  test.afterAll(async () => {
    const db = adminDb();
    await db.from('user_enrollments').delete().eq('course_slug', COHORT);
    await db.from('content_docs').delete().like('key', 'qa-lrn%');
    await db.from('admin_audit').delete().or('resource_id.like.qa-lrn%,resource_id.like.%:qa-lrn%').gte('at', startedAt);
    await clearWriteLimits(); await admin?.close(); await learner?.close();
  });
  const content = async () => (await learner.request.get(`/api/learning/content/${COHORT}`));
  const ids = (body: { modules: Array<{ videoIds: string[] }> }) => body.modules.flatMap((m) => m.videoIds);
  const putPublish = async (modules: object[]) => {
    const put = await admin.request.put(`${BASE}/curriculum/${COHORT}`, { data: { modules }, headers: version ? hdr(version) : {} });
    expect([200, 201], await put.text()).toContain(put.status());   // 201 for the first write (creates the curriculum)
    version = (await put.json()).data.version;
    const pub = await admin.request.post(`${BASE}/curriculum/${COHORT}/publish`, { headers: hdr(version) });
    expect(pub.status(), await pub.text()).toBe(200);
    version = (await pub.json()).data.version;
  };

  test('[LRN5B-DB-001] a portal cohort with a published curriculum serves its own lessons, title and live flag to its enrolled learner, with no link in the lessons', async () => {
    expect((await admin.request.post(`${BASE}/courses`, { data: course(COURSE) })).status()).toBe(201);
    expect((await admin.request.post(`${BASE}/cohorts`, { data: cohort(COHORT, COURSE, { pricing: singlePricing(999), liveLink: LIVE, whatsappLink: CHAT }) })).status()).toBe(201);
    const grant = await admin.request.post(`${BASE}/enrolments`, { data: { cohortSlug: COHORT, email: EMAIL.edu } });
    expect(grant.status(), await grant.text()).toBe(201);
    await putPublish([{ title: 'Portal module', lessons: [{ id: V(1) }, { id: V(2), assignment: { title: 'Portal assignment' } }] }]);
    const r = await content();
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(ids(body)).toEqual([V(1), V(2)]);
    expect(body.modules[0].moduleTitle).toBe('Portal module');
    expect(body.modules[0].githubAssignments[V(2)].title).toBe('Portal assignment');
    expect(body).toMatchObject({ success: true, title: `QA cohort ${COHORT}`, hasLiveLink: true });
    expect(JSON.stringify(body)).not.toMatch(/qa-lrn-secret|liveLink|whatsappLink/);
  });

  test('[LRN5B-DB-002] the links route gives the portal cohort\'s private links to its learner and to nobody else; the dashboard card lists the cohort without them', async ({ browser }) => {
    const r = await learner.request.get(`/api/learning/links/${COHORT}`);
    expect(r.status()).toBe(200);
    expect(await r.json()).toMatchObject({ success: true, title: `QA cohort ${COHORT}`, liveLink: LIVE, whatsappLink: CHAT });
    const stranger = await sessionFor(browser, EMAIL.mavish);   // enrolled in another course only
    try {
      expect((await stranger.request.get(`/api/learning/links/${COHORT}`)).status()).toBe(403);
      expect((await stranger.request.get(`/api/learning/content/${COHORT}`)).status()).toBe(403);
    } finally { await stranger.close(); }
    const mine = await (await learner.request.get('/api/learning/my-courses')).json();
    const card = mine.courses.find((c: { slug: string }) => c.slug === COHORT);
    expect(card).toMatchObject({ slug: COHORT, title: `QA cohort ${COHORT}` });
    expect(JSON.stringify(mine)).not.toMatch(/qa-lrn-secret/);
  });

  test('[LRN5B-DB-003] a published change reaches the learner at once; an unpublished edit does not show; a link change shows at once', async () => {
    const draftOnly = await admin.request.put(`${BASE}/curriculum/${COHORT}`, { data: { modules: [{ title: 'Draft only', lessons: [{ id: V(7) }] }] }, headers: hdr(version) });
    expect(draftOnly.status()).toBe(200);
    version = (await draftOnly.json()).data.version;
    expect(ids(await (await content()).json())).toEqual([V(1), V(2)]);   // the draft is not published
    await putPublish([{ title: 'Portal module', lessons: [{ id: V(1) }, { id: V(2) }, { id: V(3) }] }]);
    await expect.poll(async () => ids(await (await content()).json()), { timeout: 20000, intervals: [500, 1000] }).toEqual([V(1), V(2), V(3)]);
    const cohortNow = (await (await admin.request.get(`${BASE}/cohorts/${COHORT}`)).json()).data;
    expect((await admin.request.patch(`${BASE}/cohorts/${COHORT}`, { data: { liveLink: '' }, headers: hdr(cohortNow.version) })).status()).toBe(200);
    await expect.poll(async () => (await (await content()).json()).hasLiveLink, { timeout: 20000, intervals: [500, 1000] }).toBe(false);
    expect((await (await learner.request.get(`/api/learning/links/${COHORT}`)).json()).liveLink).toBe('');
  });

  test('[LRN5B-DB-004] the public share page names a portal lesson and its course (the assignment title, or "Lesson n"), and an unknown video id gets the generic title', async ({ request }) => {
    const known = await request.get(`/share/${V(2)}`, { headers: { 'User-Agent': 'shivam-academy-api-tests' } });
    expect(known.status()).toBe(200);
    expect(await known.text()).toContain(`Lesson 2 | QA cohort ${COHORT}`);
    const unknown = await request.get('/share/zzzzzzzzzzz', { headers: { 'User-Agent': 'shivam-academy-api-tests' } });
    expect(await unknown.text()).toContain('Exclusive Lesson | Shivam Academy');
  });
});
