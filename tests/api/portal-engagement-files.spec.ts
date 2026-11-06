import { test, expect } from '@playwright/test';
import { EMAIL } from '../support/personas';
import { requireSeed } from '../support/guards';
import { API_UA, sessionFor, type Session } from '../support/api';

// Phase 5, slice 5c with PORTAL_ENGAGEMENT unset or "files" (today's behaviour): no banner anywhere, the bell is the old hand-written list with the read
// count kept in the browser, and marking read writes nothing. Skips when the server runs with the database flag.
test.describe('Portal engagement, PORTAL_ENGAGEMENT=files @regression', () => {
  test.beforeEach(() => { requireSeed(); test.skip(process.env.PORTAL_ENGAGEMENT === 'database', 'this case is for the default (files) source'); });
  let learner: Session;
  test.beforeAll(async ({ browser }) => { if (!process.env.E2E_SEED_PERSONAS) return; learner = await sessionFor(browser, EMAIL.mavish); });
  test.afterAll(async () => { await learner?.close(); });

  test('[ENG-FILES-001] no banner is served, for a visitor or a learner, at any placement', async ({ request }) => {
    for (const placement of ['site-top', 'courses', 'course-page', 'learning', 'dashboard']) {
      expect((await (await request.get(`/api/banners?placement=${placement}`, { headers: { 'User-Agent': API_UA } })).json()).banners, placement).toEqual([]);
      expect((await (await learner.request.get(`/api/banners?placement=${placement}`)).json()).banners, placement).toEqual([]);
    }
  });

  test('[ENG-FILES-002] the bell is the old list (source "files", the browser counts what is read); marking read writes nothing', async () => {
    const f = await (await learner.request.get('/api/learning/notifications')).json();
    expect(f).toMatchObject({ success: true, source: 'files' });
    expect(f.items.length).toBeGreaterThan(0);
    expect(f.unread).toBe(f.items.length);
    expect(f.items[0]).toMatchObject({ id: expect.any(String), title: expect.any(String), body: expect.any(String), dateText: expect.any(String), read: false });
    const r = await learner.request.post('/api/learning/notifications/read', { data: {} });
    expect(await r.json()).toEqual({ success: true, unread: 0 });
  });
});
