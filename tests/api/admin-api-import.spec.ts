import { test, expect } from '@playwright/test';
import { EMAIL } from '../support/personas';
import { requireSeed } from '../support/guards';
import { API_UA, sessionFor, type Session } from '../support/api';
import { BASE, clearWriteLimits } from '../support/adminApi';
import { adminDb } from '../support/db';

// PRD 18 · the one-off import of data/learning-content.ts. Uses git-beginner-batch-1 (the smallest course). If QA already holds an imported copy, the apply steps skip
// (the test never deletes data it did not create).
const COHORT = 'git-beginner-batch-1';
const URL = `${BASE}/import/curriculum`;

test.describe('AAPI import @regression', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async () => { test.setTimeout(90_000); requireSeed(); await clearWriteLimits(); });
  let admin: Session; let created = false;
  test.beforeAll(async ({ browser }) => { admin = await sessionFor(browser, EMAIL.admin); });
  test.afterAll(async () => {
    if (created) {
      await adminDb().from('content_docs').delete().eq('kind', 'curriculum').eq('key', COHORT);
      await adminDb().from('admin_audit').delete().eq('resource', 'curriculum').eq('resource_id', COHORT);
    }
    await clearWriteLimits(); await admin?.close();
  });
  const rows = async () => (await adminDb().from('content_docs').select('key').eq('kind', 'curriculum').eq('key', COHORT)).data ?? [];
  const run = async (data: object) => (await admin.request.post(URL, { data })).json();

  test('[AAPI-IMP-001] a dry run (the default) reports every course and writes nothing', async () => {
    const before = (await rows()).length;
    const res = await admin.request.post(URL, { data: {} });
    expect(res.status()).toBe(200);
    const body = (await res.json()).data;
    expect(body.dryRun).toBe(true);
    expect(body.results.map((r: { cohort: string }) => r.cohort).sort()).toEqual(['git-beginner-batch-1', 'python-beginners', 'python-beginners-batch-2']);
    for (const r of body.results) { expect(r.applied).toBe(false); expect(r.counts.lessons).toBeGreaterThan(0); }
    const dropped = body.results.flatMap((r: { dropped: string[] }) => r.dropped);
    expect(dropped.length).toBeGreaterThanOrEqual(2);              // the known junk is listed, not copied
    expect((await rows()).length).toBe(before);
    expect((await admin.request.post(URL, { data: { cohorts: ['not-in-files'] } })).status()).toBe(400);
    expect((await admin.request.post(URL, { data: { apply: 'yes' } })).status()).toBe(400);
  });

  test('[AAPI-IMP-002] only the owner can run it: an admin key is refused', async ({ request }) => {
    const key = await admin.request.post(`${BASE}/api-keys`, { data: { name: 'QA-AAPI import key', level: 'admin' } });
    const token = (await key.json()).data.token as string;
    expect((await request.post(URL, { headers: { 'User-Agent': API_UA, Authorization: `Bearer ${token}` }, data: {} })).status()).toBe(403);
  });

  test('[AAPI-IMP-003] apply creates the curriculum as published; a second run is unchanged; an edited one is protected until overwrite is asked for', async () => {
    test.skip((await rows()).length > 0, 'QA already holds an imported copy of git-beginner-batch-1');
    const applied = (await run({ cohorts: [COHORT], apply: true })).data;
    created = true;
    expect(applied).toMatchObject({ dryRun: false, results: [{ cohort: COHORT, action: 'create', applied: true }] });
    const read = (await (await admin.request.get(`${BASE}/curriculum/${COHORT}`)).json()).data;
    expect(read).toMatchObject({ status: 'published', hasUnpublishedChanges: false, counts: applied.results[0].counts });
    // repeatable: nothing to do the second time
    expect((await run({ cohorts: [COHORT] })).data.results[0]).toMatchObject({ action: 'unchanged', applied: false });
    expect((await run({ cohorts: [COHORT], apply: true })).data.results[0]).toMatchObject({ action: 'unchanged', applied: false });
    // an admin edits it through the API: the import must not overwrite that
    const edit = await admin.request.patch(`${BASE}/curriculum/${COHORT}/modules/${read.modules[0].id}`, { data: { title: 'Edited in the admin API' }, headers: { 'If-Match': String(read.version) } });
    expect(edit.status()).toBe(200);
    expect((await run({ cohorts: [COHORT], apply: true })).data.results[0]).toMatchObject({ action: 'differs', applied: false });
    expect((await (await admin.request.get(`${BASE}/curriculum/${COHORT}`)).json()).data.modules[0].title).toBe('Edited in the admin API');
    // overwrite on request brings the files back
    expect((await run({ cohorts: [COHORT], apply: true, overwrite: true })).data.results[0]).toMatchObject({ action: 'overwrite', applied: true });
    expect((await run({ cohorts: [COHORT] })).data.results[0].action).toBe('unchanged');
    // audited with counts only
    const audit = (await (await admin.request.get(`${BASE}/audit?resource=curriculum&resourceId=${COHORT}&action=import`)).json()).data.items;
    expect(audit.length).toBe(2);
    expect(audit[0].after).toMatchObject({ modules: expect.any(Number), lessons: expect.any(Number), dropped: expect.any(Number) });
  });
});

// ---- courses and cohorts (data/courses.ts) --------------------------------------------------------------------------------------------------
test.describe('AAPI catalog import @regression', () => {
  test.describe.configure({ mode: 'serial' });
  const SLUG = 'python-foundation';
  const CAT = `${BASE}/import/catalog`;
  test.beforeEach(async () => { test.setTimeout(90_000); requireSeed(); await clearWriteLimits(); });
  let admin: Session; let created = false;
  test.beforeAll(async ({ browser }) => { admin = await sessionFor(browser, EMAIL.admin); });
  test.afterAll(async () => {
    if (created) {
      await adminDb().from('content_docs').delete().in('kind', ['course', 'cohort']).eq('key', SLUG);
      await adminDb().from('admin_audit').delete().in('resource', ['course', 'cohort']).eq('resource_id', SLUG);
    }
    await clearWriteLimits(); await admin?.close();
  });
  const rows = async () => (await adminDb().from('content_docs').select('kind').in('kind', ['course', 'cohort']).eq('key', SLUG)).data ?? [];
  const run = async (data: object) => (await admin.request.post(CAT, { data })).json();

  test('[AAPI-IMP-004] a catalog dry run reports the four cohorts, writes nothing and never shows a link', async () => {
    const before = (await rows()).length;
    const res = await admin.request.post(CAT, { data: {} });
    expect(res.status()).toBe(200);
    const body = (await res.json()).data;
    expect(body.dryRun).toBe(true);
    expect(body.results.map((r: { slug: string }) => r.slug).sort()).toEqual(['git-beginner-batch-1', 'python-beginners', 'python-beginners-batch-2', 'python-foundation']);
    for (const r of body.results) expect(r.applied).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(/https?:|whatsapp\.com|meet\.google/);
    expect((await rows()).length).toBe(before);
    expect((await admin.request.post(CAT, { data: { slugs: ['not-in-files'] } })).status()).toBe(400);
    expect((await admin.request.post(CAT, { data: { apply: 'yes' } })).status()).toBe(400);
  });

  test('[AAPI-IMP-005] only the owner can run the catalog import: an admin key is refused', async ({ request }) => {
    const key = await admin.request.post(`${BASE}/api-keys`, { data: { name: 'QA-AAPI catalog import key', level: 'admin' } });
    const token = (await key.json()).data.token as string;
    expect((await request.post(CAT, { headers: { 'User-Agent': API_UA, Authorization: `Bearer ${token}` }, data: {} })).status()).toBe(403);
  });

  test('[AAPI-IMP-006] apply creates a published course and cohort (recorded, closed, no link in a normal read); a second run is unchanged; an edit is protected until overwrite', async () => {
    test.skip((await rows()).length > 0, `QA already holds an imported ${SLUG}`);
    const applied = (await run({ slugs: [SLUG], apply: true })).data;
    created = true;
    expect(applied).toMatchObject({ dryRun: false, results: [{ slug: SLUG, course: 'create', cohort: 'create', applied: true }] });
    const cohort = (await (await admin.request.get(`${BASE}/cohorts/${SLUG}`)).json()).data;
    expect(cohort).toMatchObject({ status: 'published', courseSlug: SLUG, format: 'recorded', enrollmentClosed: true, listed: true });
    expect(cohort.pricing.plans.map((p: { id: string; price: { amount: number } }) => [p.id, p.price.amount])).toEqual([['community', 1999], ['personal', 2999]]);
    expect(JSON.stringify(cohort)).not.toMatch(/liveLink|whatsappLink/);
    expect((await (await admin.request.get(`${BASE}/courses/${SLUG}`)).json()).data.status).toBe('published');
    expect((await run({ slugs: [SLUG] })).data.results[0]).toMatchObject({ course: 'unchanged', cohort: 'unchanged', applied: false });
    // an admin edits the cohort: the import must not overwrite that
    const edit = await admin.request.patch(`${BASE}/cohorts/${SLUG}`, { data: { title: 'Edited in the admin API' }, headers: { 'If-Match': String(cohort.version) } });
    expect(edit.status()).toBe(200);
    expect((await run({ slugs: [SLUG], apply: true })).data.results[0]).toMatchObject({ cohort: 'differs', course: 'unchanged', applied: false });
    expect((await (await admin.request.get(`${BASE}/cohorts/${SLUG}`)).json()).data.title).toBe('Edited in the admin API');
    expect((await run({ slugs: [SLUG], apply: true, overwrite: true })).data.results[0]).toMatchObject({ cohort: 'overwrite', applied: true });
    expect((await run({ slugs: [SLUG] })).data.results[0]).toMatchObject({ course: 'unchanged', cohort: 'unchanged' });
  });

  test('[AAPI-IMP-007] format can be changed through the cohort API and a bad value is refused', async () => {
    test.skip(!created, 'the catalog import did not create the cohort in this run');
    const cohort = (await (await admin.request.get(`${BASE}/cohorts/${SLUG}`)).json()).data;
    expect((await admin.request.patch(`${BASE}/cohorts/${SLUG}`, { data: { format: 'hybrid' }, headers: { 'If-Match': String(cohort.version) } })).status()).toBe(400);
    const ok = await admin.request.patch(`${BASE}/cohorts/${SLUG}`, { data: { format: 'live' }, headers: { 'If-Match': String(cohort.version) } });
    expect(ok.status()).toBe(200);
    expect((await ok.json()).data.format).toBe('live');
  });
});
