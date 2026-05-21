import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('API Business Logic Tests', () => {

  test('POST /api/create-order should reject invalid coupons', async ({ request }) => {
    const response = await request.post('/api/create-order', {
      headers: {
        'x-api-key': 'shivam_secure_api_key_2026', 
      },
      data: {
        courseId: "python-beginners-live-01",
        currency: "INR",
        couponCode: "FAKE_COUPON_123",
        userId: "test_user_123"
      }
    });

    // 🚨 QA DEBUGGING: Print the exact response body so we know WHO rejected it!
    const responseText = await response.text();
    console.log("🚨 ACTUAL API RESPONSE:", responseText);

    expect(response.status()).toBe(400);
    
    const responseBody = JSON.parse(responseText);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBe('Invalid coupon code');
  });

});