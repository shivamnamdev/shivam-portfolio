import { test, expect } from '@playwright/test';
import { API_UA } from '../support/api';

// PRD 12 · Email API (POST /api/send-email, the contact form). Every valid request sends a real e-mail to the owner's Gmail, so
// only requests that cannot send are made by default (honeypot, invalid address, wrong method, unreadable body, burst of refusals).
// The one real send is opt-in: E2E_SEND_REAL_EMAIL=1 (one e-mail with the subject prefix [QA-AUTOMATION], see D4 in docs/testing/README.md).
test.use({ userAgent: API_UA });
const send = (request: any, data: object) => request.post('/api/send-email', { data });
const valid = { name: 'QA Tester', email: 'qa.tester@example.test', message: 'automated check', subject: '[QA-AUTOMATION] contact form' };

test.describe('PRD12 send-email @regression', () => {
  test('[EMLA-ACC-001][EMLA-HNY-001] a visitor can call it, and a filled honeypot field is accepted without sending', async ({ request }) => {
    const res = await send(request, { ...valid, website: 'https://spam.example' });
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ success: true, message: 'Email sent successfully!' });
  });

  test('[EMLA-VAL-001][EMLA-VAL-002] a missing, blank or malformed address is refused with 400 and the message', async ({ request }) => {
    for (const email of [undefined, '', '   ', 'not-an-email', 'a@b', '@example.com', 'a b@example.com', 123, null]) {
      const res = await send(request, { ...valid, email });
      expect(res.status(), String(email)).toBe(400);
      expect((await res.json()).error).toBe('Please provide a valid email address.');
    }
  });

  test('[EMLA-VAL-003] a line break in the address cannot add a header: the request is refused', async ({ request }) => {
    for (const email of ['a@example.test\r\nBcc: victim@example.test', 'a@example.test\nSubject: x']) {
      const res = await send(request, { ...valid, email });
      expect(res.status()).toBe(400);
    }
  });

  test('[EMLA-VAL-004] an address of more than 254 characters is cut and refused, not a server error', async ({ request }) => {
    const res = await send(request, { ...valid, email: 'a'.repeat(300) + '@example.test' });
    expect(res.status()).toBe(400);
  });

  test('[EMLA-VAL-005] an unreadable body is a client error, not a server error', async ({ request }) => {
    const res = await request.post('/api/send-email', { data: '{not json', headers: { 'content-type': 'application/json' } });
    expect(res.status()).toBeLessThan(500);
  });

  test('[EMLA-VAL-006] GET is not allowed', async ({ request }) => {
    expect((await request.get('/api/send-email')).status()).toBe(405);
  });

  test('[EMLA-ABU-001] (SCP-69) a burst of 30 refused requests is rate limited (429) at some point', async ({ request }) => {
    const statuses: number[] = [];
    for (let i = 0; i < 30; i++) statuses.push((await send(request, { ...valid, email: 'bad' })).status());
    expect(statuses, 'a public mail endpoint needs a rate limit').toContain(429);
  });

  test.fixme('[EMLA-CNT-001] message content is escaped in the e-mail (needs mailbox access: manual)', async () => {});
  test.fixme('[EMLA-CNT-002] the subject loses line breaks, is cut at 200 characters and defaults to New Website Inquiry (needs mailbox access: manual)', async () => {});
  test.fixme('[EMLA-CNT-003] the sender is Shivam Academy and a reply goes to the visitor (needs mailbox access: manual)', async () => {});

  test('[EMLA-REAL-001] one real contact message is sent to the owner (opt-in: E2E_SEND_REAL_EMAIL=1)', async ({ request }) => {
    test.skip(process.env.E2E_SEND_REAL_EMAIL !== '1', 'sends one real e-mail to the owner: set E2E_SEND_REAL_EMAIL=1');
    const res = await send(request, { ...valid, message: 'Automated PRD 12 check. Safe to delete.' });
    expect(res.status()).toBe(200);
    expect((await res.json()).success).toBe(true);
  });
});
