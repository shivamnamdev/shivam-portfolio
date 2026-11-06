import { test, expect } from '@playwright/test';
import { EMAIL } from '../support/personas';
import { requireSeed } from '../support/guards';
import { API_UA, sessionFor, type Session } from '../support/api';
import { BASE, clearWriteLimits, cohort, course, singlePricing } from '../support/adminApi';
import { adminDb } from '../support/db';
import { clerkUserId } from '../support/clerk';

// Phase 5, slice 5c with PORTAL_ENGAGEMENT=database: banners (who sees what, when) and the learner's notification bell (what shows, read state).
// Start the server and the run with the flag: PORT=3100 PORTAL_ENGAGEMENT=database E2E_SEED_PERSONAS=1 npx playwright test tests/api/portal-engagement-db.spec.ts
// The learner is the edu persona (enrolled here in qa-eng-batch only); everything is made under qa-eng-* / "QA-ENG" and removed afterwards.
const COURSE = 'qa-eng-course';
const COHORT = 'qa-eng-batch';
const day = (n: number) => new Date(Date.now() + n * 86400_000).toISOString();
const hdr = (v: number) => ({ 'If-Match': String(v) });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mine = (items: any[]): any[] => items.filter((i) => String(i.slug ?? '').startsWith('qa-eng'));

test.describe('Portal engagement, PORTAL_ENGAGEMENT=database @regression', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async () => {
    test.setTimeout(120_000);
    requireSeed();
    test.skip(process.env.PORTAL_ENGAGEMENT !== 'database', 'needs the server and the test process started with PORTAL_ENGAGEMENT=database');
    await clearWriteLimits();
  });
  let admin: Session; let learner: Session; let other: Session; let startedAt = ''; let eduId = ''; let otherId = '';
  const ids: Record<string, string> = {};
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(150_000);   // three persona sign-ins in a row
    startedAt = new Date().toISOString();
    if (!process.env.E2E_SEED_PERSONAS || process.env.PORTAL_ENGAGEMENT !== 'database') return;
    admin = await sessionFor(browser, EMAIL.admin);
    learner = await sessionFor(browser, EMAIL.edu);
    other = await sessionFor(browser, EMAIL.mavish);
    eduId = await clerkUserId(EMAIL.edu); otherId = await clerkUserId(EMAIL.mavish);
  });
  test.afterAll(async () => {
    const db = adminDb();
    await db.from('user_enrollments').delete().eq('course_slug', COHORT);
    await db.from('notifications').delete().like('title', 'QA-ENG%');
    await db.from('content_docs').delete().like('key', 'qa-eng%');
    await db.from('admin_audit').delete().or('resource_id.like.qa-eng%,resource_id.like.%:qa-eng%,resource.eq.notification').gte('at', startedAt);
    await clearWriteLimits(); await admin?.close(); await learner?.close(); await other?.close();
  });
  const banners = async (who: Session | null, request: import('@playwright/test').APIRequestContext, placement = 'courses') => {
    const r = who ? await who.request.get(`/api/banners?placement=${placement}`) : await request.get(`/api/banners?placement=${placement}`, { headers: { 'User-Agent': API_UA } });
    return { status: r.status(), body: await r.json(), headers: r.headers() };
  };
  const feed = async (who: Session) => (await (await who.request.get('/api/learning/notifications')).json());
  const mkBanner = async (slug: string, extra: object = {}) => {
    const r = await admin.request.post(`${BASE}/banners`, { data: { slug, purpose: 'announcement', message: `Message ${slug}`, placement: 'courses', allowMultiple: true, ...extra } });
    expect(r.status(), `${slug} ${await r.text()}`).toBe(201);
    return (await r.json()).data;
  };
  const publish = async (slug: string) => expect((await admin.request.post(`${BASE}/banners/${slug}/publish`)).status(), slug).toBe(200);
  const mkNote = async (key: string, data: object) => {
    const r = await admin.request.post(`${BASE}/notifications`, { data: { type: 'announcement', title: `QA-ENG ${key}`, body: `Body of ${key}`, target: { kind: 'all' }, ...data } });
    expect(r.status(), `${key} ${await r.text()}`).toBe(201);
    ids[key] = (await r.json()).data.id;
  };

  test('[ENG-DB-001] a banner reaches the audience it names: visitors, signed-in learners, a cohort; drafts, ended windows and other placements show to nobody', async ({ request }) => {
    expect((await admin.request.post(`${BASE}/courses`, { data: course(COURSE) })).status()).toBe(201);
    expect((await admin.request.post(`${BASE}/cohorts`, { data: cohort(COHORT, COURSE, { pricing: singlePricing(999) }) })).status()).toBe(201);
    expect((await admin.request.post(`${BASE}/enrolments`, { data: { cohortSlug: COHORT, email: EMAIL.edu } })).status()).toBe(201);
    await mkBanner('qa-eng-all', { priority: 5 });
    await mkBanner('qa-eng-visitors', { audience: { kind: 'visitors' }, priority: 4 });
    await mkBanner('qa-eng-learners', { audience: { kind: 'learners' }, priority: 3 });
    await mkBanner('qa-eng-cohort', { audience: { kind: 'cohort', cohortSlug: COHORT }, priority: 2 });
    await mkBanner('qa-eng-othercohort', { audience: { kind: 'cohort', cohortSlug: 'qa-eng-nobody' }, priority: 1 }).catch(() => undefined);   // a cohort that does not exist is refused by the API: fine
    await mkBanner('qa-eng-draft');   // never published
    await mkBanner('qa-eng-ended', { startsAt: day(-3), endsAt: day(-1) });
    await mkBanner('qa-eng-elsewhere', { placement: 'dashboard' });
    for (const s of ['qa-eng-all', 'qa-eng-visitors', 'qa-eng-learners', 'qa-eng-cohort', 'qa-eng-ended', 'qa-eng-elsewhere']) await publish(s);
    await expect.poll(async () => mine((await banners(null, request)).body.banners).length, { timeout: 20000, intervals: [500, 1000] }).toBeGreaterThan(0);
    const visitor = await banners(null, request);
    expect(visitor.status).toBe(200);
    expect(mine(visitor.body.banners).map((b: { slug: string }) => b.slug)).toEqual(['qa-eng-all', 'qa-eng-visitors']);
    expect((await banners(learner, request)).body.banners.filter((b: { slug: string }) => b.slug.startsWith('qa-eng')).map((b: { slug: string }) => b.slug)).toEqual(['qa-eng-all', 'qa-eng-learners', 'qa-eng-cohort']);
    expect(mine((await banners(other, request)).body.banners).map((b: { slug: string }) => b.slug)).toEqual(['qa-eng-all', 'qa-eng-learners']);   // enrolled elsewhere: not the cohort's banner
    expect(mine((await banners(learner, request, 'dashboard')).body.banners).map((b: { slug: string }) => b.slug)).toEqual(['qa-eng-elsewhere']);
    expect(visitor.headers['cache-control']).toMatch(/no-store/);
    expect(visitor.body.banners[0]).toMatchObject({ slug: expect.any(String), version: expect.any(Number), message: expect.any(String), style: 'info', dismissible: true, countdownSeconds: null });
    expect(Object.keys(visitor.body.banners[0])).not.toContain('audience');   // who a banner is for is not sent to the browser
  });

  test('[ENG-DB-002] a countdown is seconds left; a change or an unpublish reaches the page at once; a bad placement is a 400', async ({ request }) => {
    await mkBanner('qa-eng-count', { placement: 'site-top', countdownTo: day(2) });
    await publish('qa-eng-count');
    await expect.poll(async () => mine((await banners(null, request, 'site-top')).body.banners).length, { timeout: 20000, intervals: [500, 1000] }).toBe(1);
    const c = mine((await banners(null, request, 'site-top')).body.banners)[0] as { countdownSeconds: number; version: number };
    expect(c.countdownSeconds).toBeGreaterThan(2 * 86400 - 120);
    expect(c.countdownSeconds).toBeLessThanOrEqual(2 * 86400);
    const edited = await admin.request.patch(`${BASE}/banners/qa-eng-all`, { data: { message: 'Message changed' }, headers: hdr((await (await admin.request.get(`${BASE}/banners/qa-eng-all`)).json()).data.version) });
    expect(edited.status()).toBe(200);
    await expect.poll(async () => (await banners(null, request)).body.banners.find((b: { slug: string }) => b.slug === 'qa-eng-all')?.message, { timeout: 20000, intervals: [500, 1000] }).toBe('Message changed');
    expect((await admin.request.post(`${BASE}/banners/qa-eng-visitors/unpublish`)).status()).toBe(200);
    await expect.poll(async () => mine((await banners(null, request)).body.banners).map((b: { slug: string }) => b.slug), { timeout: 20000, intervals: [500, 1000] }).toEqual(['qa-eng-all']);
    for (const bad of ['', 'footer', 'COURSES', '../x']) expect((await banners(null, request, bad)).status, bad).toBe(400);
    expect((await request.get('/api/banners', { headers: { 'User-Agent': API_UA } })).status()).toBe(400);
  });

  test('[ENG-DB-003] the bell shows what is aimed at the learner (everyone, their cohort, themselves) and nothing else: no admin alert, no scheduled, no expired, nothing for another person', async () => {
    await mkNote('all', {});
    await mkNote('cohort', { target: { kind: 'cohort', cohortSlug: COHORT } });
    await mkNote('me', { target: { kind: 'user', userId: eduId } });
    await mkNote('someone-else', { target: { kind: 'user', userId: otherId } });
    await mkNote('alert', { type: 'admin-alert', target: { kind: 'admins' } });
    await mkNote('later', { publishAt: day(2) });
    await mkNote('expired', { publishAt: day(-3), expiresAt: day(-1) });
    const f = await feed(learner);
    expect(f.success).toBe(true);
    expect(f.source).toBe('database');
    const titles = (f.items as Array<{ title: string }>).map((i) => i.title).filter((t) => t.startsWith('QA-ENG'));
    expect(titles.sort()).toEqual(['QA-ENG all', 'QA-ENG cohort', 'QA-ENG me']);
    expect((f.items as Array<{ read: boolean; title: string }>).filter((i) => i.title.startsWith('QA-ENG')).every((i) => i.read === false)).toBe(true);
    expect(f.unread).toBeGreaterThanOrEqual(3);
    expect(Object.keys(f.items[0]).sort()).toEqual(['body', 'id', 'link', 'publishAt', 'read', 'title', 'type']);
    const theirs = (await feed(other)).items.map((i: { title: string }) => i.title).filter((t: string) => t.startsWith('QA-ENG'));
    expect(theirs.sort()).toEqual(['QA-ENG all', 'QA-ENG someone-else']);   // enrolled elsewhere: no cohort item; their own item only
  });

  test('[ENG-DB-004] reading is per learner: marking one, then all; a stranger\'s or unknown id changes nothing; bad ids are 400; a visitor is 401', async ({ request }) => {
    const before = (await feed(learner)).unread as number;
    const one = await learner.request.post('/api/learning/notifications/read', { data: { ids: [ids.all] } });
    expect(one.status()).toBe(200);
    expect((await one.json()).unread).toBe(before - 1);
    expect((await feed(learner)).items.find((i: { id: string }) => i.id === ids.all).read).toBe(true);
    expect((await learner.request.post('/api/learning/notifications/read', { data: { ids: [ids.all] } })).status()).toBe(200);   // a repeat is fine
    expect((await feed(learner)).unread).toBe(before - 1);
    const strangerId = await learner.request.post('/api/learning/notifications/read', { data: { ids: [ids['someone-else'], ids.alert, ids.later, '00000000-0000-0000-0000-000000000000'] } });
    expect(strangerId.status()).toBe(200);
    expect((await strangerId.json()).unread).toBe(before - 1);   // none of them is in this learner's bell
    const reads = (await adminDb().from('notification_reads').select('notification_id, user_id').in('notification_id', [ids['someone-else'], ids.alert, ids.later])).data ?? [];
    expect(reads.filter((r) => r.user_id === eduId)).toEqual([]);   // nothing was written for them
    expect((await (await other.request.get('/api/learning/notifications')).json()).items.find((i: { id: string }) => i.id === ids.all).read).toBe(false);   // another learner's read state is their own
    for (const bad of [{ ids: 'x' }, { ids: ['nope'] }, { ids: [1] }, { ids: Array.from({ length: 101 }, () => '00000000-0000-0000-0000-000000000000') }]) {
      expect((await learner.request.post('/api/learning/notifications/read', { data: bad })).status(), JSON.stringify(bad).slice(0, 40)).toBe(400);
    }
    const all = await learner.request.post('/api/learning/notifications/read', { data: {} });
    expect((await all.json()).unread).toBe(0);
    expect((await feed(learner)).unread).toBe(0);
    expect((await request.get('/api/learning/notifications', { headers: { 'User-Agent': API_UA } })).status()).toBe(401);
    expect((await request.post('/api/learning/notifications/read', { data: {}, headers: { 'User-Agent': API_UA } })).status()).toBe(401);
  });

  test('[ENG-DB-005] deleting a notification removes it from the bell at once', async () => {
    expect((await admin.request.delete(`${BASE}/notifications/${ids.cohort}`)).status()).toBe(200);
    const titles = (await feed(learner)).items.map((i: { title: string }) => i.title).filter((t: string) => t.startsWith('QA-ENG'));
    expect(titles.sort()).toEqual(['QA-ENG all', 'QA-ENG me']);
  });
});
