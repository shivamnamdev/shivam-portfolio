import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { EMAIL } from '../support/personas';
import { requireSeed } from '../support/guards';
import { API_UA, sessionFor, type Session } from '../support/api';
import { BASE, cleanupAdminApi } from '../support/adminApi';
import { adminDb } from '../support/db';
import { OPERATIONS } from '../../lib/adminApi/openapi';

// PRD 17 · admin API access, envelope, API keys and the OpenAPI document. Visitor = no session, learner = mavish, admin = the admin account.
const H = { 'User-Agent': API_UA };
const routes = (): Array<{ method: string; path: string }> => {
  const root = path.join(process.cwd(), 'app', 'api', 'admin', 'v1');
  const out: Array<{ method: string; path: string }> = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (e.name !== 'route.ts') continue;
      const rel = '/' + path.relative(root, dir).split(path.sep).join('/').replace(/\[(\w+)\]/g, '{$1}');
      const src = fs.readFileSync(p, 'utf8');
      for (const m of src.matchAll(/export async function (GET|POST|PATCH|DELETE|PUT)\b/g)) out.push({ method: m[1].toLowerCase(), path: rel === '/' ? '' : rel });
    }
  };
  walk(root);
  return out;
};

test.describe('AAPI access @regression', () => {
  test.describe.configure({ mode: 'default' });
  test.beforeEach(() => requireSeed());
  let admin: Session, learner: Session;
  test.beforeAll(async ({ browser }) => { admin = await sessionFor(browser, EMAIL.admin); learner = await sessionFor(browser, EMAIL.mavish); });
  test.afterAll(async () => { await cleanupAdminApi(); await admin?.close(); await learner?.close(); });

  const concrete = (p: string) => p.replace('{slug}', 'qa-aapi-none').replace('{cohort}', 'qa-aapi-none').replace('{moduleId}', 'm-aaaaaaaa').replace('{lessonId}', 'abcdefghijk').replace('{code}', 'QAAPI-NONE').replace('{id}', 'aaaaaaaaaaaa');

  test('[AAPI-AUTH-001] a visitor is refused on every admin route (401)', async ({ request }) => {
    for (const r of routes()) {
      const res = await request.fetch(BASE + concrete(r.path), { method: r.method.toUpperCase(), headers: H, data: r.method === 'get' ? undefined : {}, maxRedirects: 0 });
      expect(res.status(), `${r.method} ${r.path}`).toBe(401);
    }
  });

  test('[AAPI-AUTH-002] a signed-in learner who is not the admin is refused on every admin route (403)', async () => {
    for (const r of routes()) {
      const res = await learner.request.fetch(BASE + concrete(r.path), { method: r.method.toUpperCase(), data: r.method === 'get' ? undefined : {} });
      expect(res.status(), `${r.method} ${r.path}`).toBe(403);
      expect(JSON.stringify(await res.json())).not.toMatch(/stack|node_modules|\/Users\//);
    }
  });

  test('[AAPI-AUTH-003] the admin session can read the list routes and gets the envelope', async () => {
    for (const p of ['/courses', '/cohorts', '/coupons', '/audit', '/api-keys', '/learners?limit=3']) {
      const res = await admin.request.get(BASE + p);
      expect(res.status(), p).toBe(200);
      const body = await res.json();
      expect(body.success, p).toBe(true);
      expect(Array.isArray(body.data.items), p).toBe(true);
    }
  });

  test('[AAPI-AUTH-004][AAPI-AUTH-006] an API key works, its secret is shown once, only its hash is stored, and revoking stops it', async ({ request }) => {
    const created = await (await admin.request.post(`${BASE}/api-keys`, { data: { name: 'QA-AAPI key', level: 'admin' } })).json();
    expect(created.success).toBe(true);
    const token: string = created.data.token;
    expect(token).toMatch(/^tmk_[a-z0-9]{12}_[A-Za-z0-9_-]{43}$/);
    const auth = { ...H, Authorization: `Bearer ${token}` };
    expect((await request.get(`${BASE}/courses`, { headers: auth })).status()).toBe(200);
    // an admin key cannot list or create keys
    expect((await request.get(`${BASE}/api-keys`, { headers: auth })).status()).toBe(403);
    expect((await request.post(`${BASE}/api-keys`, { headers: auth, data: { name: 'QA-AAPI x', level: 'admin' } })).status()).toBe(403);
    // the list never shows the secret; the table holds only the hash
    const list = JSON.stringify(await (await admin.request.get(`${BASE}/api-keys`)).json());
    expect(list).not.toContain(token.slice(token.indexOf('_', 4) + 1));
    const row = (await adminDb().from('api_keys').select('hash').eq('id', created.data.id).single()).data!;
    expect(row.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(row)).not.toContain(token.slice(token.indexOf('_', 4) + 1));
    // bad keys all look the same
    for (const bad of [`${token}x`, 'Bearer tmk_aaaaaaaaaaaa_' + 'A'.repeat(43), 'Bearer nonsense', 'Bearer ']) {
      const res = await request.get(`${BASE}/courses`, { headers: { ...H, Authorization: bad.startsWith('Bearer') ? bad : `Bearer ${bad}` } });
      expect(res.status(), bad.slice(0, 20)).toBe(401);
    }
    // revoke
    expect((await admin.request.delete(`${BASE}/api-keys/${created.data.id}`)).status()).toBe(200);
    expect((await admin.request.delete(`${BASE}/api-keys/${created.data.id}`)).status()).toBe(200);   // twice is fine
    expect((await request.get(`${BASE}/courses`, { headers: auth })).status()).toBe(401);
  });

  test('[AAPI-AUTH-005] a staff key can read but not write', async ({ request }) => {
    const created = await (await admin.request.post(`${BASE}/api-keys`, { data: { name: 'QA-AAPI staff', level: 'staff' } })).json();
    const auth = { ...H, Authorization: `Bearer ${created.data.token}` };
    expect((await request.get(`${BASE}/courses`, { headers: auth })).status()).toBe(200);
    expect((await request.post(`${BASE}/courses`, { headers: auth, data: { slug: 'qa-aapi-staff', title: 'x' } })).status()).toBe(403);
    await admin.request.delete(`${BASE}/api-keys/${created.data.id}`);
  });

  test('[AAPI-ENV-001] errors use the envelope with a short message and no stack trace', async () => {
    const bad = await admin.request.post(`${BASE}/courses`, { data: '{not json', headers: { 'content-type': 'application/json' } });
    expect(bad.status()).toBe(400);
    const body = await bad.json();
    expect(body).toMatchObject({ success: false, error: { code: 'validation_failed' } });
    const missing = await admin.request.get(`${BASE}/courses/qa-aapi-does-not-exist`);
    expect(missing.status()).toBe(404);
    for (const res of [bad, missing]) expect(await res.text()).not.toMatch(/\n\s+at |node_modules|\/Users\/|webpack/);
  });

  test('[AAPI-OAS-001] the spec is served to the admin only', async ({ request }) => {
    expect((await request.get(`${BASE}/openapi.json`, { headers: H })).status()).toBe(401);
    expect((await learner.request.get(`${BASE}/openapi.json`)).status()).toBe(403);
    const res = await admin.request.get(`${BASE}/openapi.json`);
    expect(res.status()).toBe(200);
    const spec = await res.json();
    expect(spec.openapi).toMatch(/^3\./);
    expect(Object.keys(spec.paths).length).toBeGreaterThan(15);
  });

  test('[AAPI-OAS-002] every route is in the spec and every spec path has a route (contract)', async () => {
    const real = new Set(routes().map((r) => `${r.method} ${r.path}`));
    const documented = new Set(OPERATIONS.map((o) => `${o.method} ${o.path}`));
    expect([...real].filter((x) => !documented.has(x)), 'routes missing from the spec').toEqual([]);
    expect([...documented].filter((x) => !real.has(x)), 'spec paths without a route').toEqual([]);
  });

  test('[AAPI-OAS-004] the docs page is for the admin only', async ({ browser }) => {
    const away = async (page: import('@playwright/test').Page) => {
      await expect.poll(() => new URL(page.url()).pathname, { timeout: 30000 }).not.toBe('/admin/api-docs');
      await expect(page.getByRole('heading', { name: 'Admin API v1' })).toHaveCount(0);
    };
    const visitor = await browser.newContext({ userAgent: API_UA.replace(/^.*$/, 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36') });
    const vp = await visitor.newPage();
    await vp.goto('/admin/api-docs', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await away(vp);
    await visitor.close();
    const lp = await learner.context.newPage();
    await lp.goto('/admin/api-docs', { waitUntil: 'domcontentloaded' });
    await away(lp);
    await lp.close();
    const ap = await admin.context.newPage();
    await ap.goto('/admin/api-docs');
    await expect(ap.getByRole('heading', { name: 'Admin API v1' })).toBeVisible({ timeout: 60000 });
    await ap.close();
  });
});
