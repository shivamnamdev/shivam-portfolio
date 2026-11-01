import { test, expect } from '@playwright/test';
import { EMAIL } from '../support/personas';
import { requireSeed } from '../support/guards';
import { API_UA, sessionFor } from '../support/api';

// SCP-74 to SCP-76 · GET /api/admin/dashboard-data: the admin portal's read of enrolments, submissions, progress and stats.
// It replaces the browser's direct reads (the progress and stats tables are locked for anon in the database step).
test.describe('ADMD admin dashboard data @regression', () => {
  test.beforeEach(() => requireSeed());

  test('[ADMD-DATA-001] a visitor is refused with 401', async ({ request }) => {
    const res = await request.get('/api/admin/dashboard-data', { headers: { 'User-Agent': API_UA } });
    expect(res.status()).toBe(401);
  });

  test('[ADMD-DATA-002] a signed-in learner is refused with 403 and gets no data', async ({ browser }) => {
    const learner = await sessionFor(browser, EMAIL.mavish);
    try {
      const res = await learner.request.get('/api/admin/dashboard-data');
      expect(res.status()).toBe(403);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.enrollments).toBeUndefined();
    } finally { await learner.close(); }
  });

  test('[ADMD-DATA-003] the admin gets the four lists', async ({ browser }) => {
    const admin = await sessionFor(browser, EMAIL.admin);
    try {
      const res = await admin.request.get('/api/admin/dashboard-data');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      for (const key of ['enrollments', 'submissions', 'videoProgress', 'userStats']) expect(Array.isArray(body[key]), key).toBe(true);
      expect(body.enrollments.length).toBeGreaterThan(0);
    } finally { await admin.close(); }
  });
});
