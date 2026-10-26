import { test, expect } from '@playwright/test';

// A non-browser User-Agent avoids the Clerk dev-instance interstitial (see crm.spec.ts).
test.use({ userAgent: 'shivam-academy-api-tests' });

test.describe('POST /api/webhooks/clerk @smoke', () => {

  test('rejects requests without svix headers', async ({ request }) => {
    const res = await request.post('/api/webhooks/clerk', { data: { type: 'user.created', data: {} } });
    // 400 (no svix headers) when CLERK_WEBHOOK_SECRET is set; 500 when it is missing.
    expect([400, 500]).toContain(res.status());
  });

  test('rejects a forged signature', async ({ request }) => {
    const res = await request.post('/api/webhooks/clerk', {
      headers: { 'svix-id': 'msg_fake', 'svix-timestamp': String(Math.floor(Date.now() / 1000)), 'svix-signature': 'v1,Zm9yZ2Vk' },
      data: { type: 'user.created', data: {} },
    });
    expect([400, 500]).toContain(res.status());
  });
});
