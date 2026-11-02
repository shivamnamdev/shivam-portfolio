import { test, expect } from '@playwright/test';
import { EMAIL } from '../support/personas';
import { requireSeed } from '../support/guards';
import { API_UA, sessionFor } from '../support/api';
import { clerkUserId } from '../support/clerk';

// SCP-75 · GET /api/learning/enrollments: a learner's own course slugs. It replaces the browser's direct read of
// user_enrollments, which the database step locks for the public key.
test.describe('ENRL own enrolments @regression', () => {
  test.beforeEach(() => requireSeed());

  test('[LRNA-ENR-001] a visitor is refused with 401', async ({ request }) => {
    const res = await request.get('/api/learning/enrollments', { headers: { 'User-Agent': API_UA } });
    expect(res.status()).toBe(401);
  });

  test('[LRNA-ENR-002] a learner gets exactly the slugs of their own enrolments', async ({ browser }) => {
    const admin = await sessionFor(browser, EMAIL.admin);
    const learner = await sessionFor(browser, EMAIL.edu);
    const userId = await clerkUserId(EMAIL.edu);
    try {
      const all = (await (await admin.request.get('/api/admin/dashboard-data')).json()).enrollments as { user_id: string; course_slug: string }[];
      const mine = all.filter(e => e.user_id === userId).map(e => e.course_slug);
      const body = await (await learner.request.get('/api/learning/enrollments')).json();
      expect(body.success).toBe(true);
      expect([...body.slugs].sort()).toEqual([...new Set(mine)].sort());
    } finally { await admin.close(); await learner.close(); }
  });
});
