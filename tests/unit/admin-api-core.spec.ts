import { test, expect } from '@playwright/test';
import { arrayOf, bool, futureDate, httpsUrl, int, isoDate, num, oneOf, optional, parseObject, slug, str } from '../../lib/adminApi/validate';
import { amountIsAllowed } from '../../lib/adminApi/payMinimum';
import { hashSecret, newApiKey, parseApiKey, secretMatches } from '../../lib/adminApi/apiKeys';
import { PERMISSIONS, roleCan } from '../../lib/adminApi/permissions';
import { redact } from '../../lib/adminApi/audit';
import { ApiError } from '../../lib/adminApi/envelope';

// Admin API v1 core (phase 1, PRD 17): validators, key handling, permissions, payment minimum and audit redaction. No server or database needed.
test.describe('AAPI core @regression', () => {
  test('[AAPI-VAL-001] validators refuse wrong types, missing, long and unknown fields and report every field', () => {
    const shape = { title: str({ max: 10 }), count: int({ min: 1, max: 5 }), open: bool, kind: oneOf('a', 'b') };
    let err: ApiError | undefined;
    try { parseObject({ title: 'x'.repeat(11), count: 1.5, open: 'yes', kind: 'z', extra: 1 }, shape); } catch (e) { err = e as ApiError; }
    expect(err?.status).toBe(400);
    expect(Object.keys(err!.fields!).sort()).toEqual(['count', 'extra', 'kind', 'open', 'title']);
    expect(parseObject({ title: ' ok ', count: 2, open: true, kind: 'a' }, shape)).toEqual({ title: 'ok', count: 2, open: true, kind: 'a' });
    for (const hostile of [null, [], 'text', 5]) expect(() => parseObject(hostile, shape)).toThrow(ApiError);
  });

  test('[AAPI-VAL-002] links must be https without credentials', () => {
    for (const bad of ['http://example.com', 'javascript:alert(1)', 'data:text/html,x', '//example.com', '/relative', 'https://user:pw@example.com', 'https://localhost', 'ftp://x.com/a', 42, null, 'https://' + 'a'.repeat(2100) + '.com'])
      expect(httpsUrl(bad).ok, String(bad).slice(0, 30)).toBe(false);
    expect(httpsUrl('https://chat.whatsapp.com/abc').ok).toBe(true);
  });

  test('[AAPI-VAL-003] text is kept as text (no HTML interpretation in validation) and slugs are strict', () => {
    expect(str({ max: 50 })('<script>alert(1)</script>')).toEqual({ ok: true, value: '<script>alert(1)</script>' });
    for (const bad of ['Bad Slug', '-start', 'UPPER', 'a/b', '', 'x'.repeat(101)]) expect(slug(bad).ok, bad).toBe(false);
    expect(slug('python-beginners-batch-2').ok).toBe(true);
  });

  test('[AAPI-CPN-001] dates: expiry must be a real future ISO date', () => {
    expect(isoDate('2026-13-45').ok).toBe(false);
    expect(isoDate('tomorrow').ok).toBe(false);
    expect(futureDate('2020-01-01').ok).toBe(false);
    expect(futureDate(undefined).ok).toBe(false);
    expect(futureDate(new Date(Date.now() + 86400000).toISOString()).ok).toBe(true);
  });

  test('[AAPI-CPN-002][AAPI-CPN-003] discount numbers must be positive and bounded', () => {
    expect(num({ gt: 0, max: 100 })(0).ok).toBe(false);
    expect(num({ gt: 0, max: 100 })(100.5).ok).toBe(false);
    expect(num({ gt: 0, max: 100 })(20).ok).toBe(true);
    expect(arrayOf(slug, { min: 1, max: 2 })(['a-1', 'b-2', 'c-3']).ok).toBe(false);
    expect(optional(int({ min: 1 }))(undefined)).toEqual({ ok: true, value: undefined });
  });

  test('[AAPI-COH-004] an amount above zero and below the payment minimum is refused; zero and the minimum are allowed', () => {
    expect(amountIsAllowed(0.4, 'INR')).toBe(false);
    expect(amountIsAllowed(0.99, 'USD')).toBe(false);
    expect(amountIsAllowed(-1, 'INR')).toBe(false);
    expect(amountIsAllowed(Number.NaN, 'INR')).toBe(false);
    for (const [amount, cur] of [[0, 'INR'], [1, 'INR'], [1999, 'INR'], [1, 'USD'], [25, 'USD']] as const) expect(amountIsAllowed(amount, cur), `${amount} ${cur}`).toBe(true);
  });

  test('[AAPI-AUTH-004][AAPI-AUTH-006] a key is shown once, only its hash is stored, and parsing and matching are strict', () => {
    const key = newApiKey();
    const parsed = parseApiKey(key.token)!;
    expect(parsed.id).toBe(key.id);
    expect(key.hash).not.toContain(parsed.secret);
    expect(key.hash).toBe(hashSecret(parsed.secret));
    expect(secretMatches(parsed.secret, key.hash)).toBe(true);
    expect(secretMatches(parsed.secret + 'x', key.hash)).toBe(false);
    expect(secretMatches('a'.repeat(43), key.hash)).toBe(false);
    for (const bad of ['', 'tmk_', 'tmk_abc_def', `tmk_${key.id}_short`, key.token.replace('tmk_', 'xyz_'), `${key.token} extra`, null, undefined]) expect(parseApiKey(bad as string), String(bad)).toBeNull();
    expect(newApiKey().token).not.toBe(key.token);
  });

  test('[AAPI-AUTH-005] the owner holds every permission; keys never manage keys; staff keys are read only', () => {
    for (const p of PERMISSIONS) expect(roleCan('owner', p), p).toBe(true);
    expect(roleCan('key-admin', 'courses:write')).toBe(true);
    expect(roleCan('key-admin', 'keys:write')).toBe(false);
    expect(roleCan('key-staff', 'courses:read')).toBe(true);
    expect(roleCan('key-staff', 'courses:write')).toBe(false);
    expect(roleCan('key-staff', 'keys:read')).toBe(false);
  });

  test('[AAPI-AUD-001] secrets never reach the audit log', () => {
    const out = redact({ name: 'k', hash: 'abc', nested: { token: 'tmk_x', ok: 1, list: [{ secret: 's', keep: true }] } });
    expect(JSON.stringify(out)).not.toMatch(/abc|tmk_x|"s"/);
    expect(out).toEqual({ name: 'k', nested: { ok: 1, list: [{ keep: true }] } });
  });
});
