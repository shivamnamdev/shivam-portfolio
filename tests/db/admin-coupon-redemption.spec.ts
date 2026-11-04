import { test, expect } from '@playwright/test';
import { adminDb } from '../support/db';
import { requireSeed } from '../support/guards';
import { consumeSingleUse, releaseSingleUse, reserveSingleUse } from '../../lib/adminApi/couponRedemption';

// PRD 17 · one-time codes: reserve when the order is created, consume when paid, release when abandoned; parallel callers cannot both win.
// Calls the library the learner routes will use (phase 5) against the QA database with the service role.
const code = (n: string) => `QAAPI-RDM-${n}`;
const make = async (n: string) => {
  const r = await adminDb().from('coupons').insert([{ code: code(n), kind: 'single-use', discount: { type: 'percentage', percent: 100 }, expires_at: new Date(Date.now() + 86400_000).toISOString(), created_by: 'qa' }]);
  expect(r.error).toBeNull();
};
const row = async (n: string) => (await adminDb().from('coupons').select('*').eq('code', code(n)).single()).data!;

test.describe('AAPI one-time code redemption @regression', () => {
  test.describe.configure({ mode: 'default' });
  test.beforeEach(() => requireSeed());
  test.afterAll(async () => { await adminDb().from('coupons').delete().like('code', 'QAAPI-RDM-%'); });

  test('[AAPI-CPN-007] the first payer reserves a code, others are refused, payment consumes it once', async () => {
    await make('A');
    expect(await reserveSingleUse(code('A'), 'user_a')).toBe(true);
    expect(await reserveSingleUse(code('A'), 'user_b')).toBe(false);          // held for A
    expect(await reserveSingleUse(code('A'), 'user_a')).toBe(true);           // A may retry their own hold
    expect(await consumeSingleUse(code('A'), 'user_b')).toBe(false);          // only the holder can spend it
    expect(await consumeSingleUse(code('A'), 'user_a')).toBe(true);
    expect(await consumeSingleUse(code('A'), 'user_a')).toBe(false);          // already spent
    expect(await reserveSingleUse(code('A'), 'user_b')).toBe(false);
    expect(await reserveSingleUse(code('A'), 'user_a')).toBe(false);
    expect(await row('A')).toMatchObject({ redeemed_by: 'user_a', redemptions: 1, reserved_by: null });
  });

  test('[AAPI-CPN-008] an abandoned or expired hold releases the code for someone else', async () => {
    await make('B');
    expect(await reserveSingleUse(code('B'), 'user_a')).toBe(true);
    await releaseSingleUse(code('B'), 'user_b');                               // someone else cannot release it
    expect(await reserveSingleUse(code('B'), 'user_b')).toBe(false);
    await releaseSingleUse(code('B'), 'user_a');
    expect(await reserveSingleUse(code('B'), 'user_b')).toBe(true);
    await adminDb().from('coupons').update({ reserved_until: new Date(Date.now() - 60_000).toISOString() }).eq('code', code('B'));   // the hold times out
    expect(await reserveSingleUse(code('B'), 'user_c')).toBe(true);
    expect((await row('B')).reserved_by).toBe('user_c');
  });

  test('[AAPI-CPN-009] five parallel reservations give exactly one winner, and an expired, voided or unknown code is never reserved', async () => {
    await make('C');
    const results = await Promise.all(['u1', 'u2', 'u3', 'u4', 'u5'].map((u) => reserveSingleUse(code('C'), u)));
    expect(results.filter(Boolean)).toHaveLength(1);
    await make('D'); await adminDb().from('coupons').update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq('code', code('D'));
    expect(await reserveSingleUse(code('D'), 'u1')).toBe(false);
    await make('E'); await adminDb().from('coupons').update({ active: false }).eq('code', code('E'));
    expect(await reserveSingleUse(code('E'), 'u1')).toBe(false);
    expect(await reserveSingleUse('QAAPI-RDM-NOPE', 'u1')).toBe(false);
    const raceWin = results.findIndex(Boolean);
    expect((await row('C')).reserved_by).toBe(`u${raceWin + 1}`);
  });
});
