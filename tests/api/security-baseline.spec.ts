import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { API_UA } from '../support/api';

// PRD 16 · security baseline checks that need no sign-in: response headers, exposed files, error leaks, reflected input,
// and a sweep that every API route outside the public list refuses a visitor. Several cases FAIL today on purpose:
// they document defects (missing headers) and pass once the headers are added.
const H = { 'User-Agent': API_UA };

test.describe('SEC security baseline @regression', () => {
  test('[SEC-HDR-001] a Content-Security-Policy header restricts script sources', async ({ request }) => {
    const res = await request.get('/', { headers: H });
    expect(res.headers()['content-security-policy'] ?? '').toMatch(/script-src/);
  });

  test('[SEC-HDR-002] pages cannot be framed by other sites', async ({ request }) => {
    const h = (await request.get('/', { headers: H })).headers();
    const framed = /^(deny|sameorigin)$/i.test(h['x-frame-options'] ?? '') || /frame-ancestors/i.test(h['content-security-policy'] ?? '');
    expect(framed).toBe(true);
  });

  test('[SEC-HDR-003] X-Content-Type-Options nosniff on a page and on an API answer', async ({ request }) => {
    expect((await request.get('/', { headers: H })).headers()['x-content-type-options']).toBe('nosniff');
    expect((await request.get('/api/learning/leaderboard', { headers: H })).headers()['x-content-type-options']).toBe('nosniff');
  });

  test('[SEC-HDR-004] Referrer-Policy is set', async ({ request }) => {
    expect((await request.get('/', { headers: H })).headers()['referrer-policy'] ?? '').toMatch(/strict-origin|no-referrer|same-origin/);
  });

  test('[SEC-HDR-005] Permissions-Policy is set', async ({ request }) => {
    expect((await request.get('/', { headers: H })).headers()['permissions-policy'] ?? '').toMatch(/camera|microphone|geolocation/);
  });

  test('[SEC-HDR-006] the framework version is not announced', async ({ request }) => {
    expect((await request.get('/', { headers: H })).headers()['x-powered-by']).toBeUndefined();
  });

  test('[SEC-HDR-008] API answers do not allow every origin to read them', async ({ request }) => {
    const res = await request.get('/api/learning/leaderboard', { headers: { ...H, Origin: 'https://evil.example' } });
    expect(res.headers()['access-control-allow-origin']).not.toBe('*');
  });

  test('[SEC-EXP-001] secrets and source files are not served', async ({ request }) => {
    for (const p of ['/.env', '/.env.local', '/.git/config', '/package.json', '/next.config.mjs', '/.env.jira']) {
      const res = await request.get(p, { headers: H, maxRedirects: 0 });
      expect([301, 302, 307, 308, 404], p).toContain(res.status());
      expect(await res.text(), p).not.toMatch(/SECRET|SUPABASE|\[core\]|"dependencies"/);
    }
  });

  test('[SEC-EXP-002] broken input to the public routes does not leak a stack trace or file path', async ({ request }) => {
    for (const p of ['/api/create-order', '/api/verify-payment', '/api/enroll-free', '/api/send-email', '/api/ai-tutor']) {
      const res = await request.post(p, { headers: { ...H, 'Content-Type': 'application/json' }, data: '{"broken":' });
      const text = await res.text();
      expect(text, p).not.toMatch(/\n\s+at |node_modules|\/Users\/|webpack-internal|\.tsx?:\d+/);
    }
  });

  test('[SEC-EXP-003] the internal API documentation is not public', async ({ request }) => {
    const res = await request.get('/api-docs', { headers: H, maxRedirects: 0 });
    expect([301, 302, 307, 308, 401, 403, 404]).toContain(res.status());
  });

  test('[SEC-XSS-003] a crafted share link does not reflect its input', async ({ request }) => {
    const payload = '<script>alert(1)</script>';
    const res = await request.get(`/share/${encodeURIComponent(payload)}`, { headers: H });
    expect(await res.text()).not.toContain(payload);
  });

  test('[SEC-AUTH-001] every API route outside the public list refuses a visitor', async ({ request }) => {
    const publicRoutes = ['/api/create-order', '/api/verify-payment', '/api/enroll-free', '/api/send-email', '/api/ai-tutor', '/api/webhooks/clerk'];
    const root = path.join(process.cwd(), 'app', 'api');
    const routes: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name === 'route.ts') routes.push('/api/' + path.relative(root, dir).split(path.sep).join('/'));
      }
    };
    walk(root);
    const checked = routes.filter(r => !publicRoutes.includes(r) && !r.includes('['));
    expect(checked.length).toBeGreaterThan(10);
    for (const r of checked) {
      for (const method of ['GET', 'POST'] as const) {
        const res = await request.fetch(r, { method, headers: H, data: method === 'POST' ? {} : undefined, maxRedirects: 0 });
        expect([401, 403, 404, 405, 307], `${method} ${r}`).toContain(res.status());
        if (res.status() === 307) continue;
        expect(await res.text(), `${method} ${r}`).not.toMatch(/"success":true/);
      }
    }
  });
});
