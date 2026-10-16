import { test, expect } from '@playwright/test';
import { activeCourses } from '../../data/courses';

// Fixtures are derived from data/courses.ts so the suite follows catalog changes automatically.
// Clerk development instances answer browser-like requests without a Clerk cookie with a
// 401 "interstitial" page. A non-browser User-Agent makes these tests reach the real handlers.
test.use({ userAgent: 'shivam-academy-api-tests' });

const closedCourse = activeCourses.find(c => c.enrollmentClosed);
const openCourse = activeCourses.find(c => !c.enrollmentClosed);

function apiKeyHeaders() {
  const adminApiKey = process.env.ADMIN_API_KEY?.trim();
  expect(adminApiKey, 'ADMIN_API_KEY must be set for API tests').toBeTruthy();
  return { 'Content-Type': 'application/json', 'x-api-key': adminApiKey as string };
}

test.describe('POST /api/create-order', () => {

  test('rejects requests with no session and no API key', async ({ request }) => {
    const response = await request.post('/api/create-order', {
      data: { courseId: activeCourses[0].id, currency: 'INR' },
    });
    expect(response.status()).toBe(401);
  });

  test('rejects unknown courses', async ({ request }) => {
    const response = await request.post('/api/create-order', {
      headers: apiKeyHeaders(),
      data: { courseId: 'course-that-does-not-exist', currency: 'INR' },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBe('Course not found');
  });

  test('rejects purchases for closed cohorts', async ({ request }) => {
    test.skip(!closedCourse, 'No closed cohort in data/courses.ts');
    const response = await request.post('/api/create-order', {
      headers: apiKeyHeaders(),
      data: { courseId: closedCourse!.id, currency: 'INR' },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBe('Enrollment is closed for this course');
  });

  test('rejects invalid coupons', async ({ request }) => {
    test.skip(!openCourse, 'No open cohort in data/courses.ts');
    const response = await request.post('/api/create-order', {
      headers: apiKeyHeaders(),
      data: { courseId: openCourse!.id, currency: 'INR', couponCode: 'FAKE_COUPON_123' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Invalid coupon code');
  });
});

test.describe('Protected endpoints reject anonymous callers', () => {

  for (const [method, path] of [
    ['GET', '/api/get-all-users'],
    ['POST', '/api/get-clerk-users'],
    ['POST', '/api/admin/enroll'],
    ['POST', '/api/enroll-free'],
    ['POST', '/api/verify-payment'],
    ['POST', '/api/xp/sync'],
    ['POST', '/api/track-time'],
  ] as const) {
    test(`${method} ${path}`, async ({ request }) => {
      const response = await request.fetch(path, { method, data: {}, maxRedirects: 0 });
      expect(response.status(), await response.text()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });
  }
});

test.describe('POST /api/send-email', () => {

  test('rejects an invalid email address', async ({ request }) => {
    const response = await request.post('/api/send-email', {
      data: { name: 'QA', email: 'not-an-email', message: 'hi', subject: 'QA' },
    });
    expect(response.status()).toBe(400);
  });

  test('silently accepts honeypot submissions without sending', async ({ request }) => {
    const response = await request.post('/api/send-email', {
      data: { name: 'Bot', email: 'bot@example.com', message: 'spam', website: 'https://spam.example' },
    });
    expect(response.status()).toBe(200);
    expect((await response.json()).success).toBe(true);
  });
});
