import { test, expect } from '@playwright/test';
import { EMAIL, COURSE } from '../support/personas';
import { requireSeed } from '../support/guards';
import { API_UA, sessionFor, type Session } from '../support/api';

// Phase 5, slice 5b: the three learner routes that replaced bundled data: /api/learning/content/{slug}, /links/{slug} and /my-courses.
// Personas: mavish is enrolled in course A only, edu in nothing, the admin may open every course. Runs on a server with PORTAL_LEARNING either way.
const CONTENT = (s: string) => `/api/learning/content/${s}`;
const LINKS = (s: string) => `/api/learning/links/${s}`;

test.describe('PRD 5b learner content and links @regression', () => {
  test.beforeEach(() => requireSeed());
  let learner: Session; let outsider: Session; let admin: Session;
  test.beforeAll(async ({ browser }) => {
    if (!process.env.E2E_SEED_PERSONAS) return;
    learner = await sessionFor(browser, EMAIL.mavish);
    outsider = await sessionFor(browser, EMAIL.edu);
    admin = await sessionFor(browser, EMAIL.admin);
  });
  test.afterAll(async () => { await learner?.close(); await outsider?.close(); await admin?.close(); });

  test('[LRN5B-001] a visitor gets 401 from all three routes and no content', async ({ request }) => {
    for (const p of [CONTENT(COURSE.A), LINKS(COURSE.A), '/api/learning/my-courses']) {
      const r = await request.get(p, { headers: { 'User-Agent': API_UA }, maxRedirects: 0 });
      expect(r.status(), p).toBe(401);
      expect(await r.text(), p).not.toMatch(/videoIds|moduleTitle|chat\.whatsapp|meet\.google/);
    }
  });

  test('[LRN5B-002] a signed-in learner who is not enrolled gets 403 for content and links, with nothing leaked in the answer', async () => {
    for (const p of [CONTENT(COURSE.A), LINKS(COURSE.A), CONTENT(COURSE.B), LINKS(COURSE.B)]) {
      const r = await outsider.request.get(p);
      expect(r.status(), p).toBe(403);
      expect(await r.text(), p).not.toMatch(/videoIds|moduleTitle|chat\.whatsapp|meet\.google|liveLink|whatsappLink/);
    }
    // enrolled in A, not in B
    expect((await learner.request.get(CONTENT(COURSE.B))).status()).toBe(403);
    expect((await learner.request.get(LINKS(COURSE.B))).status()).toBe(403);
  });

  test('[LRN5B-003] an enrolled learner receives the lessons in the shape the lesson page reads, the title, and only a yes or no for the live class', async () => {
    const r = await learner.request.get(CONTENT(COURSE.A));
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.success).toBe(true);
    expect(body.title).toMatch(/\S/);
    expect(typeof body.hasLiveLink).toBe('boolean');
    expect(Array.isArray(body.modules)).toBe(true);
    expect(body.modules.length).toBeGreaterThan(0);
    for (const m of body.modules) { expect(typeof m.moduleTitle).toBe('string'); expect(Array.isArray(m.videoIds)).toBe(true); }
    expect(JSON.stringify(body)).not.toMatch(/liveLink|whatsappLink|chat\.whatsapp|meet\.google/);   // the lessons carry no class link
  });

  test('[LRN5B-004] the links route gives an enrolled learner the title and both links, never cached; the admin may open any course', async () => {
    const r = await learner.request.get(LINKS(COURSE.A));
    expect(r.status()).toBe(200);
    expect(r.headers()['cache-control']).toMatch(/no-store/);
    const body = await r.json();
    expect(body).toMatchObject({ success: true, liveLink: expect.any(String), whatsappLink: expect.any(String) });
    expect(body.title).toMatch(/\S/);
    for (const slug of [COURSE.A, COURSE.B, COURSE.C]) {
      expect((await admin.request.get(CONTENT(slug))).status(), slug).toBe(200);
      expect((await admin.request.get(LINKS(slug))).status(), slug).toBe(200);
    }
    const unknown = await admin.request.get(CONTENT('qa-no-such-cohort'));   // the admin may open any slug; nothing is known for it
    expect(unknown.status()).toBe(200);
    expect(await unknown.json()).toMatchObject({ success: true, title: '', hasLiveLink: false, modules: [] });
  });

  test('[LRN5B-005] a malformed course in the address is a 400, never a lookup', async () => {
    for (const bad of ['A%20B', '..%2Fx', 'x'.repeat(101), 'UPPER', '%27%3B--']) {
      expect((await learner.request.get(CONTENT(bad))).status(), bad).toBe(400);
      expect((await learner.request.get(LINKS(bad))).status(), bad).toBe(400);
    }
  });

  test('[LRN5B-006] my-courses lists only the learner\'s own course as a card with no private link; a learner with none gets an empty list', async () => {
    const mine = await (await learner.request.get('/api/learning/my-courses')).json();
    expect(mine.success).toBe(true);
    expect(mine.courses.map((c: { slug: string }) => c.slug)).toEqual([COURSE.A]);
    expect(mine.courses[0]).toMatchObject({ id: COURSE.A, slug: COURSE.A, title: expect.any(String) });
    expect(JSON.stringify(mine)).not.toMatch(/liveLink|whatsappLink|chat\.whatsapp|meet\.google/);
    const none = await (await outsider.request.get('/api/learning/my-courses')).json();
    expect(none).toEqual({ success: true, courses: [] });
  });
});
