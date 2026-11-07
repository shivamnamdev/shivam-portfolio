import { test, expect } from '@playwright/test';
import { QA_FIXTURE_SLUG, activeCourses } from '../../data/courses';
import { EMAIL } from '../support/personas';
import { clerkUserId } from '../support/clerk';
import { adminDb, revokeTestEnrolment } from '../support/db';
import { requireFixture, requireSeed } from '../support/guards';
import { API_UA, sessionFor, type Session } from '../support/api';

// PRD 10 · Enrollment API (POST /api/enroll-free). The legacy POST /api/admin/enroll was deleted in phase 6a: its cases are retired with a mapping in docs/testing/prd/10-api-enrollment.md section 12. Real calls against the QA Supabase project.
// The learner account is edu; every row and activity entry written here is removed after each test (edu is shared: tests/README.md).
const SLUG = QA_FIXTURE_SLUG;
const U: string = EMAIL.edu;
const closedCourse = activeCourses.find(c => c.enrollmentClosed)!;
const rows = async (email = U) => (await adminDb().from('user_enrollments').select('*').eq('user_id', await clerkUserId(email)).eq('course_slug', SLUG)).data ?? [];
const logs = async (like: string, email = U) => (await adminDb().from('admin_activity_log').select('id').eq('user_email', email).like('message', `%${like}%`)).data ?? [];

test.describe('PRD10 enroll-free @regression', () => {
  test.describe.configure({ mode: 'default' });
  test.beforeEach(() => { requireFixture(); requireSeed(); });
  let learner: Session, admin: Session;
  test.beforeAll(async ({ browser }) => { learner = await sessionFor(browser, U); admin = await sessionFor(browser, EMAIL.admin); });
  test.afterAll(async () => { await learner?.close(); await admin?.close(); });
  test.afterEach(async () => {
    for (const email of [U, EMAIL.admin]) {
      await revokeTestEnrolment(email, SLUG).catch(() => {});
      for (const like of ['New Free Enrollment']) await adminDb().from('admin_activity_log').delete().eq('user_email', email).like('message', `%${like}%`);
    }
  });
  const free = (data: object, s: Session = learner) => s.request.post('/api/enroll-free', { data });

  test.describe('enroll-free', () => {
    test('[ENRA-FRE-001] a visitor is refused with 401', async ({ request }) => {
      const res = await request.post('/api/enroll-free', { data: { courseId: SLUG, couponCode: 'QA100' }, headers: { 'User-Agent': API_UA } });
      expect(res.status()).toBe(401);
      expect((await res.json()).error).toBe('Unauthorized');
    });

    test('[ENRA-FRE-002][ENRA-FRE-003] an unknown course and a closed cohort are refused with 400', async () => {
      const a = await free({ courseId: 'nope', couponCode: 'QA100' });
      expect(a.status()).toBe(400);
      expect((await a.json()).error).toBe('Course not found');
      const b = await free({ courseId: closedCourse.id, couponCode: 'QA100' });
      expect(b.status()).toBe(400);
      expect((await b.json()).error).toBe('Enrollment is closed for this course');
    });

    test('[ENRA-FRE-004][ENRA-FRE-007] without a coupon, or with a coupon that does not make it free, "Payment required." (400) and no row', async () => {
      for (const body of [{ courseId: SLUG }, { courseId: SLUG, couponCode: 'BIRTHDAY20' }, { courseId: SLUG, currency: 'USD', couponCode: 'BIRTHDAY20' }]) {
        const res = await free(body);
        expect(res.status()).toBe(400);
        expect((await res.json()).error).toBe('Payment required.');
      }
      expect(await rows()).toHaveLength(0);
    });

    test('[ENRA-FRE-005] an invalid coupon is refused with 400', async () => {
      const res = await free({ courseId: SLUG, couponCode: 'FAKE_COUPON_123' });
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toBe('Invalid coupon code');
    });

    test('[ENRA-FRE-006] the restricted coupon is refused with 403 for an account that is not on its list', async ({ browser }) => {
      const other = await sessionFor(browser, EMAIL.bazar);
      const res = await free({ courseId: SLUG, couponCode: 'QA100' }, other);
      await other.close();
      expect(res.status()).toBe(403);
      expect(await rows(EMAIL.bazar)).toHaveLength(0);
    });

    test('[ENRA-FRE-008][ENRA-FRE-009][ENRA-FRE-010] QA100 enrols once with the coupon recorded and the activity entry, ignoring a forged course slug', async () => {
      const res = await free({ courseId: SLUG, couponCode: 'QA100', courseSlug: 'git-beginner-batch-1', slug: 'git-beginner-batch-1' });
      expect(res.status()).toBe(200);
      expect(await res.json()).toEqual({ success: true, message: 'Enrolled for free successfully!', whatsappLink: 'https://chat.whatsapp.com/qa-checkout-sandbox' });   // the page shows this link after enrolling; it no longer needs it in its props
      const r = await rows();
      expect(r).toHaveLength(1);
      expect(r[0].coupon_used).toBe('QA100');
      expect((await adminDb().from('user_enrollments').select('course_slug').eq('user_id', await clerkUserId(U))).data!.map(x => x.course_slug)).toEqual([SLUG]);
      expect((await logs(`New Free Enrollment (Coupon: QA100): ${SLUG}`)).length).toBe(1);
    });

    test('[ENRA-FRE-011] a second call says the learner is already enrolled (200) and adds nothing', async () => {
      await free({ courseId: SLUG, couponCode: 'QA100' });
      const again = await free({ courseId: SLUG, couponCode: 'QA100' });
      expect(again.status()).toBe(200);
      expect((await again.json()).message).toBe('You are already enrolled in this course.');
      expect(await rows()).toHaveLength(1);
      expect((await logs('New Free Enrollment')).length).toBe(1);
    });

    test('[ENRA-FRE-012][ENRA-FRE-013] USD and a lower-case coupon code work the same way', async () => {
      const res = await free({ courseId: SLUG, currency: 'USD', couponCode: 'qa100' });
      expect(res.status()).toBe(200);
      expect(await rows()).toHaveLength(1);
    });

    test('[ENRA-FRE-014] the public coupon EXISTINGSTUDENT_BATCH03 (more than the fixture price) makes the fixture free for anyone', async () => {
      const res = await free({ courseId: SLUG, couponCode: 'EXISTINGSTUDENT_BATCH03' });
      expect(res.status()).toBe(200);
      expect((await rows())[0].coupon_used).toBe('EXISTINGSTUDENT_BATCH03');
    });

    test('[ENRA-FRE-015] five parallel calls leave one enrolment row (SCP-44)', async () => {
      const results = await Promise.all([1, 2, 3, 4, 5].map(() => free({ courseId: SLUG, couponCode: 'QA100' })));
      for (const r of results) expect(r.status()).toBe(200);
      expect(await rows()).toHaveLength(1);
    });

    test('[ENRA-FRE-016] GET is not allowed', async () => {
      expect((await learner.request.get('/api/enroll-free')).status()).toBe(405);
    });
  });
});
