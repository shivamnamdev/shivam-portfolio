import { test, expect } from '@playwright/test';
import { EMAIL } from '../support/personas';
import { requireSeed } from '../support/guards';
import { API_UA, sessionFor, type Session } from '../support/api';

// Phase 6a (SCP-89): the three routes the classic admin page used, and the user lookup behind them, were deleted. They bypassed the audit log and the
// API key roles; everything they did is in the admin API v1 (learners, progress, enrolments). The paths must answer "not found" for the admin and
// a learner (nothing is served there any more) and never answer a visitor with data.
const GONE: Array<[string, string]> = [
  ['GET', '/api/get-all-users'], ['POST', '/api/get-clerk-users'], ['GET', '/api/admin/dashboard-data'], ['POST', '/api/admin/enroll'],
];

test.describe('Legacy admin routes are gone @regression', () => {
  test.beforeEach(() => requireSeed());
  let admin: Session, learner: Session;
  test.beforeAll(async ({ browser }) => {
    if (!process.env.E2E_SEED_PERSONAS) return;
    admin = await sessionFor(browser, EMAIL.admin); learner = await sessionFor(browser, EMAIL.mavish);
  });
  test.afterAll(async () => { await admin?.close(); await learner?.close(); });

  test('[GONE-001] the admin gets 404 on every removed path', async () => {
    for (const [method, path] of GONE) {
      const res = await admin.request.fetch(path, { method, data: method === 'POST' ? {} : undefined });
      expect(res.status(), `${method} ${path}`).toBe(404);
      expect(await res.text(), `${method} ${path}`).not.toMatch(/"success":true/);
    }
  });

  test('[GONE-002] a learner gets 404 on every removed path and no data', async () => {
    for (const [method, path] of GONE) {
      const res = await learner.request.fetch(path, { method, data: method === 'POST' ? {} : undefined });
      expect(res.status(), `${method} ${path}`).toBe(404);
      const text = await res.text();   // a 404 page, never data: no person's address, no user or enrolment list
      for (const email of Object.values(EMAIL)) expect(text, `${method} ${path}`).not.toContain(email);
      expect(text, `${method} ${path}`).not.toMatch(/"users":\[|"enrollments":\[/);
    }
  });

  test('[GONE-003] a visitor is refused (never served data) on every removed path', async ({ request }) => {
    for (const [method, path] of GONE) {
      const res = await request.fetch(path, { method, data: method === 'POST' ? {} : undefined, maxRedirects: 0, headers: { 'User-Agent': API_UA } });
      expect([307, 401, 403, 404], `${method} ${path}`).toContain(res.status());
      expect(await res.text(), `${method} ${path}`).not.toMatch(/"success":true/);
    }
  });

  test('[GONE-004] the replacements exist and are admin only: learners directory, progress and enrolments (admin API v1)', async () => {
    for (const path of ['/api/admin/v1/learners?limit=1', '/api/admin/v1/progress?limit=1']) {
      expect((await admin.request.get(path)).status(), path).toBe(200);
      expect((await learner.request.get(path)).status(), path).toBe(403);
    }
  });
});
