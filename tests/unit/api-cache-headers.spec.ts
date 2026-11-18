import { test, expect } from '@playwright/test';
import nextConfig from '../../next.config.mjs';

// SCP-81 · every API answer is sent with Cache-Control: no-store (they hold e-mails, code, enrolments and exam results); pages keep their own rules.
test.describe('API cache headers @unit', () => {
  test('[ACH-UNIT-001] the /api rule sets Cache-Control: no-store, and the security headers still apply to every path', async () => {
    const rules = await nextConfig.headers!();
    const api = rules.find(r => r.source === '/api/:path*');
    expect(api?.headers).toEqual([{ key: 'Cache-Control', value: 'no-store' }]);
    const all = rules.find(r => r.source === '/:path*');
    expect(all?.headers.map(h => h.key)).toEqual(expect.arrayContaining(['Permissions-Policy', 'Content-Security-Policy-Report-Only']));
    expect(all?.headers.map(h => h.key)).not.toContain('Cache-Control');   // pages are not forced to no-store
  });
});
