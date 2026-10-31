import { test, expect } from '@playwright/test';
import { Webhook } from 'svix';
import { EMAIL } from '../support/personas';
import { clerkUserId } from '../support/clerk';
import { adminDb } from '../support/db';
import { requireSeed } from '../support/guards';
import { API_UA, sessionFor, type Session } from '../support/api';

// PRD 11 · Clerk, webhook and user-lookup APIs: POST /api/webhooks/clerk, GET /api/get-all-users, POST /api/get-clerk-users.
// Webhook calls are signed here with CLERK_WEBHOOK_SECRET exactly as Clerk (svix) signs them. Only events that cannot send an
// e-mail are used: a user.created without an address logs the signup and sends nothing. Rows written here are removed after each test.
const secret = process.env.CLERK_WEBHOOK_SECRET;
const TAG = 'QA-WEBHOOK';
const signed = (payload: object, opts: { id?: string; at?: Date; secretOverride?: string } = {}) => {
  const id = opts.id ?? `msg_qa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const at = opts.at ?? new Date();
  const body = JSON.stringify(payload);
  const signature = new Webhook(opts.secretOverride ?? secret!).sign(id, at, body);
  return { body, headers: { 'content-type': 'application/json', 'svix-id': id, 'svix-timestamp': String(Math.floor(at.getTime() / 1000)), 'svix-signature': signature, 'User-Agent': API_UA } };
};
const created = (name = TAG, extra: object = {}) => ({ type: 'user.created', data: { id: 'user_qa_webhook', first_name: name, last_name: 'Test', email_addresses: [], ...extra } });
const signupLogs = async () => (await adminDb().from('admin_activity_log').select('id').like('message', `%New Account Created: ${TAG}%`)).data ?? [];

test.describe('PRD11 Clerk webhook and user lookup @regression', () => {
  test.describe.configure({ mode: 'default' });

  test.describe('POST /api/webhooks/clerk', () => {
    test.beforeEach(() => { test.skip(!secret, 'needs CLERK_WEBHOOK_SECRET'); requireSeed(); });
    test.afterEach(async () => { await adminDb().from('admin_activity_log').delete().like('message', `%New Account Created: ${TAG}%`); });
    const post = (request: any, s: ReturnType<typeof signed>) => request.post('/api/webhooks/clerk', { data: s.body, headers: s.headers });

    test('[CLKA-WHK-001][CLKA-WHK-002] no svix headers and a forged signature are refused with 400', async ({ request }) => {
      expect((await request.post('/api/webhooks/clerk', { data: created(), headers: { 'User-Agent': API_UA } })).status()).toBe(400);
      const res = await request.post('/api/webhooks/clerk', { data: created(), headers: { 'svix-id': 'msg_fake', 'svix-timestamp': String(Math.floor(Date.now() / 1000)), 'svix-signature': 'v1,Zm9yZ2Vk', 'User-Agent': API_UA } });
      expect(res.status()).toBe(400);
      expect(await signupLogs()).toHaveLength(0);
    });

    test('[CLKA-WHK-003] a correctly signed message that is older than five minutes is refused', async ({ request }) => {
      const res = await post(request, signed(created(), { at: new Date(Date.now() - 20 * 60 * 1000) }));
      expect(res.status()).toBe(400);
      expect(await signupLogs()).toHaveLength(0);
    });

    test('[CLKA-WHK-004] a signature made with another secret is refused', async ({ request }) => {
      const res = await post(request, signed(created(), { secretOverride: 'whsec_' + Buffer.from('another-secret-value').toString('base64') }));
      expect(res.status()).toBe(400);
    });

    test('[CLKA-WHK-005] a body changed after signing is refused', async ({ request }) => {
      const s = signed(created());
      const res = await request.post('/api/webhooks/clerk', { data: JSON.stringify(created('QA-WEBHOOK-TAMPERED')), headers: s.headers });
      expect(res.status()).toBe(400);
    });

    test('[CLKA-WHK-006] a signed user.created logs the signup and answers 200 { success: true }', async ({ request }) => {
      const res = await post(request, signed(created()));
      expect(res.status()).toBe(200);
      expect(await res.json()).toEqual({ success: true });
      const { data } = await adminDb().from('admin_activity_log').select('type, user_email, message').like('message', `%New Account Created: ${TAG}%`);
      expect(data).toHaveLength(1);
      expect(data![0]).toMatchObject({ type: 'signup', user_email: 'No email' });
    });

    test('[CLKA-WHK-007] other event types are accepted and change nothing', async ({ request }) => {
      const res = await post(request, signed({ type: 'user.updated', data: { id: 'user_qa_webhook', first_name: TAG } }));
      expect(res.status()).toBe(200);
      expect(await signupLogs()).toHaveLength(0);
    });

    test('[CLKA-WHK-008] (SCP-67) the same message delivered twice (a Clerk retry) logs the signup once', async ({ request }) => {
      const s = signed(created());
      await post(request, s);
      await post(request, s);
      expect(await signupLogs()).toHaveLength(1);
    });

    test('[CLKA-WHK-009] (SCP-68) a user.created without the e-mail list is handled, not a server error', async ({ request }) => {
      const res = await post(request, signed({ type: 'user.created', data: { id: 'user_qa_webhook', first_name: TAG } }));
      expect(res.status()).toBeLessThan(500);
    });

    test('[CLKA-WHK-010] GET is not allowed', async ({ request }) => {
      expect((await request.get('/api/webhooks/clerk', { headers: { 'User-Agent': API_UA } })).status()).toBe(405);
    });
  });

  test.fixme('[CLKA-WHK-011] a real signup sends one welcome e-mail and one owner notice (needs a real signup and mailbox access: manual)', async () => {});

  test.describe('GET /api/get-all-users and POST /api/get-clerk-users', () => {
    test.beforeEach(() => requireSeed());
    let admin: Session, learner: Session;
    test.beforeAll(async ({ browser }) => { admin = await sessionFor(browser, EMAIL.admin); learner = await sessionFor(browser, EMAIL.mavish); });
    test.afterAll(async () => { await admin?.close(); await learner?.close(); });

    test('[CLKA-USR-001][CLKA-USR-002][CLKA-LKP-001][CLKA-LKP-002] a visitor gets 401 and a learner 403 on both user routes', async ({ request }) => {
      expect((await request.get('/api/get-all-users', { headers: { 'User-Agent': API_UA } })).status()).toBe(401);
      expect((await request.post('/api/get-clerk-users', { data: { userIds: [] }, headers: { 'User-Agent': API_UA } })).status()).toBe(401);
      const a = await learner.request.get('/api/get-all-users');
      const b = await learner.request.post('/api/get-clerk-users', { data: { userIds: [await clerkUserId(EMAIL.edu)] } });
      expect([a.status(), b.status()]).toEqual([403, 403]);
      expect(JSON.stringify(await a.json())).not.toContain('@');
      expect(JSON.stringify(await b.json())).not.toContain('@');
    });

    test('[CLKA-USR-003][CLKA-USR-004][CLKA-USR-005] the admin gets the directory: exact fields, the four personas, newest first, not cacheable', async () => {
      const res = await admin.request.get('/api/get-all-users');
      expect(res.status()).toBe(200);
      const { success, users } = await res.json();
      expect(success).toBe(true);
      for (const u of users) expect(Object.keys(u).sort()).toEqual(['email', 'id', 'image', 'joinedAt', 'name']);
      for (const email of Object.values(EMAIL)) {
        const u = users.find((x: any) => x.email === email);
        expect(u, email).toBeTruthy();
        expect(u.id).toBe(await clerkUserId(email));
      }
      const times = users.map((u: any) => u.joinedAt);
      expect([...times].sort((a: number, b: number) => b - a)).toEqual(times);
      expect(res.headers()['cache-control'] ?? '').not.toMatch(/public|max-age=[1-9]/);
    });

    test('[CLKA-USR-006] the user list refuses other methods', async () => {
      expect((await admin.request.post('/api/get-all-users', { data: {} })).status()).toBe(405);
    });

    test('[CLKA-LKP-003] a missing, empty or non-array userIds gives an empty map', async () => {
      for (const body of [{}, { userIds: [] }, { userIds: 'user_x' }, { userIds: null }]) {
        const res = await admin.request.post('/api/get-clerk-users', { data: body });
        expect(res.status()).toBe(200);
        expect(await res.json()).toEqual({ success: true, users: {} });
      }
    });

    test('[CLKA-LKP-004][CLKA-LKP-005][CLKA-LKP-006] known ids come back as name, e-mail and image; unknown ids are left out', async () => {
      const edu = await clerkUserId(EMAIL.edu), mav = await clerkUserId(EMAIL.mavish);
      const res = await admin.request.post('/api/get-clerk-users', { data: { userIds: [edu, mav, 'user_does_not_exist_000'] } });
      expect(res.status()).toBe(200);
      const { users } = await res.json();
      expect(Object.keys(users).sort()).toEqual([edu, mav].sort());
      expect(users[edu]).toMatchObject({ email: EMAIL.edu });
      expect(Object.keys(users[edu]).sort()).toEqual(['email', 'image', 'name']);
      const none = await admin.request.post('/api/get-clerk-users', { data: { userIds: ['user_does_not_exist_000'] } });
      expect(await none.json()).toEqual({ success: true, users: {} });
    });

    test('[CLKA-LKP-007] ids that are not text are a client error, not a server error', async () => {
      const res = await admin.request.post('/api/get-clerk-users', { data: { userIds: [123, { a: 1 }] } });
      expect(res.status()).toBeLessThan(500);
    });

    test('[CLKA-LKP-008] a very long list of ids is a client error, not a server error', async () => {
      const res = await admin.request.post('/api/get-clerk-users', { data: { userIds: Array.from({ length: 600 }, (_, i) => `user_qa_${i}`) } });
      expect(res.status()).toBeLessThan(500);
    });

    test('[CLKA-LKP-009] GET is not allowed', async () => {
      expect((await admin.request.get('/api/get-clerk-users')).status()).toBe(405);
    });
  });
});
