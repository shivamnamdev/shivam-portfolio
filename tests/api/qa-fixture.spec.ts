import { test, expect } from '@playwright/test';
import { QA_FIXTURES_ENABLED, QA_FIXTURE_SLUG } from '../../data/courses';

// Uses Razorpay TEST keys: creates real test-mode orders, no money moves.
test.use({ userAgent: 'shivam-academy-api-tests' });

test.describe('POST /api/create-order for the QA fixture', () => {
  test.skip(!QA_FIXTURES_ENABLED, 'NEXT_PUBLIC_QA_FIXTURES is not set on the test process');

  const headers = () => ({ 'Content-Type': 'application/json', 'x-api-key': process.env.ADMIN_API_KEY?.trim() ?? '' });

  test('INR order is ₹10 (1000 paise) and bound to the course', async ({ request }) => {
    expect(process.env.RAZORPAY_KEY_ID, 'Razorpay must be in test mode').toMatch(/^rzp_test_/);
    const res = await request.post('/api/create-order', { headers: headers(), data: { courseId: QA_FIXTURE_SLUG, currency: 'INR' } });
    expect(res.status(), await res.text()).toBe(200);
    const { order } = await res.json();
    expect(order.amount).toBe(1000);
    expect(order.currency).toBe('INR');
    expect(order.notes).toMatchObject({ courseSlug: QA_FIXTURE_SLUG, courseId: QA_FIXTURE_SLUG });
  });

  test('USD order is $1 (100 cents)', async ({ request }) => {
    const res = await request.post('/api/create-order', { headers: headers(), data: { courseId: QA_FIXTURE_SLUG, currency: 'USD' } });
    // Razorpay accounts need international payments enabled for USD; report that clearly instead of a vague failure.
    expect(res.status(), `USD order failed (is international payments enabled on the Razorpay test account?): ${await res.text()}`).toBe(200);
    const { order } = await res.json();
    expect(order.amount).toBe(100);
    expect(order.currency).toBe('USD');
  });
});
