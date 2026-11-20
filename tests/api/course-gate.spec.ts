import { test, expect } from '@playwright/test';
import { requireSeed } from '../support/guards';
import { AUTH, COURSE, EMAIL } from '../support/personas';
import { sessionFor, type Session } from '../support/api';

// SCP-39 · the course pages decide on the SERVER. The HTML of /learning/{slug} and /live/{slug} is fetched without running any browser code
// (a plain request with the session cookie), so what it contains is exactly what the server decided.
// Needs the seeded QA personas (E2E_SEED_PERSONAS=1): edu = no courses, mavish = Course A, admin = every course.
const html = async (s: Session, path: string) => { const r = await s.request.get(path); return { status: r.status(), body: await r.text() }; };

test.describe('Server-side course gate (SCP-39) @regression', () => {
  test.beforeEach(() => requireSeed());
  let notEnrolled: Session, enrolled: Session, admin: Session;
  test.beforeAll(async ({ browser }) => {
    [notEnrolled, enrolled, admin] = await Promise.all([sessionFor(browser, AUTH.U1), sessionFor(browser, AUTH.S1), sessionFor(browser, EMAIL.admin)]);
  });
  test.afterAll(async () => { await Promise.all([notEnrolled, enrolled, admin].map((s) => s?.close())); });

  test('[AUTH-SRV-001] a signed-in user who is not enrolled gets the Access Denied screen from the server, on both course pages', async () => {
    const learning = await html(notEnrolled, `/learning/${COURSE.A}`);
    expect(learning.status).toBe(200);
    expect(learning.body).toContain('Access Denied');
    expect(learning.body).not.toContain('Verifying your course access');     // the course page itself was not rendered
    const live = await html(notEnrolled, `/live/${COURSE.A}`);
    expect(live.body).toContain('Access Denied');
    expect(live.body).not.toContain('Verifying');
  });

  test('[AUTH-SRV-002] an enrolled learner and the admin are given the course page', async () => {
    for (const s of [enrolled, admin]) {
      const learning = await html(s, `/learning/${COURSE.A}`);
      expect(learning.body).not.toContain('Access Denied');
      expect(learning.body).toContain('Verifying your course access');
    }
  });

  test('[AUTH-SRV-003] a malformed course name is denied on the server too', async () => {
    const r = await html(enrolled, '/learning/not%20a%20slug!');
    expect(r.body).toContain('Access Denied');
  });

  test('[AUTH-SRV-004] enrolled in Course A does not open Course B (the gate is per course)', async () => {
    const r = await html(enrolled, `/learning/${COURSE.B}`);
    expect(r.body).toContain('Access Denied');
  });
});
