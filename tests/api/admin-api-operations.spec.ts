import { test, expect } from '@playwright/test';
import { EMAIL } from '../support/personas';
import { requireSeed } from '../support/guards';
import { API_UA, sessionFor, type Session } from '../support/api';
import { BASE, clearWriteLimits, cleanupAdminApi, cohort, course, plansPricing } from '../support/adminApi';
import { adminDb } from '../support/db';
import { clerkUserId } from '../support/clerk';

// PRD 19 · slice 3c: enrolments, reports and CSV exports. The learner used is the "edu" persona (enrolled in nothing); every row made here is removed afterwards.
const COURSE = 'qa-aapi-op-course';
const SINGLE = 'qa-aapi-op-single';
const PLANS = 'qa-aapi-op-plans';
const LEARNER = EMAIL.edu;

test.describe('AAPI operations @regression', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async () => { test.setTimeout(90_000); requireSeed(); await clearWriteLimits(); });
  let admin: Session; let startedAt = ''; let learnerId = ''; let planColumn = true;
  test.beforeAll(async ({ browser }) => {
    startedAt = new Date().toISOString();
    learnerId = await clerkUserId(LEARNER);
    planColumn = !(await adminDb().from('user_enrollments').select('plan_id').limit(1)).error;
    admin = await sessionFor(browser, EMAIL.admin);
    await admin.request.post(`${BASE}/courses`, { data: course(COURSE) });
    await admin.request.post(`${BASE}/cohorts`, { data: cohort(SINGLE, COURSE) });
    await admin.request.post(`${BASE}/cohorts`, { data: cohort(PLANS, COURSE, { pricing: plansPricing() }) });
  });
  const wipe = async () => { await adminDb().from('user_enrollments').delete().in('course_slug', [SINGLE, PLANS]); };
  test.afterAll(async () => {
    await wipe();
    await adminDb().from('admin_audit').delete().in('resource', ['enrolment', 'export']).gte('at', startedAt);
    await cleanupAdminApi(); await clearWriteLimits(); await admin?.close();
  });
  test.beforeEach(wipe);

  const grant = (data: object) => admin.request.post(`${BASE}/enrolments`, { data });
  const keyHeaders = async (level: 'admin' | 'staff') => {
    const r = await admin.request.post(`${BASE}/api-keys`, { data: { name: `QA-AAPI operations ${level}`, level } });
    return { 'User-Agent': API_UA, Authorization: `Bearer ${(await r.json()).data.token}` };
  };

  test('[AAPI-ENR-001] granting by e-mail enrols the learner once; a second grant is 409; the grant is audited and listed', async () => {
    const r = await grant({ cohortSlug: SINGLE, email: LEARNER });
    const body = await r.json();
    expect(r.status(), JSON.stringify(body)).toBe(201);
    const e = body.data;
    expect(e).toMatchObject({ userId: learnerId, cohortSlug: SINGLE, email: LEARNER, planId: null });
    expect(e.id).toMatch(/^[0-9a-f-]{36}$/);
    expect((await grant({ cohortSlug: SINGLE, userId: learnerId })).status()).toBe(409);
    const list = (await (await admin.request.get(`${BASE}/enrolments?cohortSlug=${SINGLE}`)).json()).data;
    expect(list.items.map((i: { id: string }) => i.id)).toEqual([e.id]);
    expect((await (await admin.request.get(`${BASE}/enrolments?userId=${learnerId}&cohortSlug=${SINGLE}`)).json()).data.items).toHaveLength(1);
    const audit = await adminDb().from('admin_audit').select('action, resource_id').eq('resource', 'enrolment').eq('resource_id', `${learnerId}:${SINGLE}`).gte('at', startedAt);
    expect(audit.data?.map((a) => a.action)).toContain('grant');
  });

  test('[AAPI-ENR-002] granting: bad input is 400, an unknown learner 404, an unknown cohort 422, an unknown plan 400; nothing is stored', async () => {
    const status = async (data: object) => (await grant(data)).status();
    expect(await status({ cohortSlug: SINGLE })).toBe(400);
    expect(await status({ cohortSlug: SINGLE, userId: learnerId, email: LEARNER })).toBe(400);
    expect(await status({ cohortSlug: SINGLE, userId: 'not-an-id' })).toBe(400);
    expect(await status({ cohortSlug: SINGLE, userId: learnerId, extra: true })).toBe(400);
    expect(await status({ cohortSlug: SINGLE, userId: 'user_doesnotexist123' })).toBe(404);
    expect(await status({ cohortSlug: SINGLE, email: 'nobody-qa-aapi@example.com' })).toBe(400);
    expect(await status({ cohortSlug: 'qa-aapi-op-missing', userId: learnerId })).toBe(422);
    expect(await status({ cohortSlug: SINGLE, userId: learnerId, planId: 'community' })).toBe(400);   // a single-price cohort has no plans
    expect(await status({ cohortSlug: PLANS, userId: learnerId, planId: 'gold' })).toBe(400);
    expect((await admin.request.post(`${BASE}/enrolments`, { data: '{bad', headers: { 'Content-Type': 'application/json' } })).status()).toBe(400);
    expect((await adminDb().from('user_enrollments').select('id').eq('user_id', learnerId).in('course_slug', [SINGLE, PLANS])).data).toHaveLength(0);
  });

  test('[AAPI-ENR-003] a plan of the cohort is recorded when the database has the plan column, and is a clear 422 when it has not', async () => {
    const r = await grant({ cohortSlug: PLANS, userId: learnerId, planId: 'personal' });
    if (planColumn) {
      const body = await r.json();
      expect(r.status(), JSON.stringify(body)).toBe(201);
      expect(body.data.planId).toBe('personal');
    } else {
      expect(r.status()).toBe(422);
      expect((await adminDb().from('user_enrollments').select('id').eq('user_id', learnerId).eq('course_slug', PLANS)).data).toHaveLength(0);
    }
    expect((await grant({ cohortSlug: PLANS, userId: learnerId })).status()).toBe(planColumn ? 409 : 201);   // without a plan it is a plain enrolment
  });

  test('[AAPI-ENR-004] revoking: an enrolment the API granted goes freely; any other needs the owner and force; the learner row is gone and the change audited', async () => {
    const t0 = new Date(Date.now() - 2000).toISOString();   // earlier tests wrote audit rows for the same learner and cohort
    const mine = (await (await grant({ cohortSlug: SINGLE, userId: learnerId })).json()).data;
    expect((await admin.request.delete(`${BASE}/enrolments/${mine.id}`)).status()).toBe(200);
    expect((await adminDb().from('user_enrollments').select('id').eq('id', mine.id)).data).toHaveLength(0);
    expect((await admin.request.delete(`${BASE}/enrolments/${mine.id}`)).status()).toBe(404);

    // a row made behind the API's back (what a payment or coupon enrolment looks like)
    const { data: paid } = await adminDb().from('user_enrollments').insert([{ user_id: learnerId, course_slug: SINGLE, user_email: LEARNER, user_name: 'QA', coupon_used: 'QAAPIPAID' }]).select('id').single();
    const id = paid!.id as string;
    expect((await admin.request.delete(`${BASE}/enrolments/${id}`)).status()).toBe(409);
    expect((await admin.request.delete(`${BASE}/enrolments/${id}?force=maybe`)).status()).toBe(400);
    const adminKey = await keyHeaders('admin');
    expect((await admin.request.fetch(`${BASE}/enrolments/${id}?force=true`, { method: 'DELETE', headers: adminKey })).status()).toBe(403);
    expect((await adminDb().from('user_enrollments').select('id').eq('id', id)).data).toHaveLength(1);   // still there after every refusal
    expect((await admin.request.delete(`${BASE}/enrolments/${id}?force=true`)).status()).toBe(200);
    expect((await adminDb().from('user_enrollments').select('id').eq('id', id)).data).toHaveLength(0);

    expect((await admin.request.delete(`${BASE}/enrolments/not-a-uuid`)).status()).toBe(404);
    const audit = (await adminDb().from('admin_audit').select('action, after').eq('resource', 'enrolment').eq('resource_id', `${learnerId}:${SINGLE}`).gte('at', t0).order('id')).data ?? [];
    expect(audit.map((a) => a.action)).toEqual(['grant', 'revoke', 'revoke']);
    expect(audit[1].after).toMatchObject({ forced: false });
    expect(audit[2].after).toMatchObject({ forced: true });
  });

  test('[AAPI-RPT-001] reports are counts only; unknown names are 404 and a bad days window is 400', async () => {
    await grant({ cohortSlug: SINGLE, userId: learnerId });
    const read = async (p: string) => admin.request.get(`${BASE}/reports/${p}`);
    const per = (await (await read('enrolments-per-cohort')).json()).data;
    expect(per.report).toBe('enrolments-per-cohort');
    expect(per.rows.find((r: { cohortSlug: string }) => r.cohortSlug === SINGLE)).toEqual({ cohortSlug: SINGLE, enrolments: 1 });
    const days = (await (await read('signups-per-day?days=7')).json()).data;
    expect(days.rows).toHaveLength(7);
    expect(days.rows[6].date).toBe(new Date().toISOString().slice(0, 10));
    expect(days.total).toBe(days.rows.reduce((n: number, r: { count: number }) => n + r.count, 0));
    const coupons = (await (await read('coupon-usage')).json()).data;
    expect(Array.isArray(coupons.rows)).toBe(true);
    for (const body of [per, days, coupons]) expect(JSON.stringify(body)).not.toContain(LEARNER);
    expect((await read('learners')).status()).toBe(404);
    expect((await read('signups-per-day?days=0')).status()).toBe(400);
    expect((await read('signups-per-day?days=91')).status()).toBe(400);
  });

  test('[AAPI-CSV-001] the enrolments export is a CSV attachment, neutralises a hostile name, is audited, and is refused to a staff key', async ({ request }) => {
    await adminDb().from('user_enrollments').insert([{ user_id: learnerId, course_slug: SINGLE, user_email: LEARNER, user_name: '=HYPERLINK("http://evil.example","x")', coupon_used: null }]);
    const res = await admin.request.get(`${BASE}/exports/enrolments.csv`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/csv');
    expect(res.headers()['content-disposition']).toContain('attachment; filename="enrolments.csv"');
    expect(res.headers()['cache-control']).toContain('no-store');
    const text = await res.text();
    expect(text.startsWith('"userId","email","name","cohortSlug","planId","couponUsed","enrolledAt"\r\n')).toBe(true);
    const line = text.split('\r\n').find((l) => l.includes(SINGLE))!;
    expect(line).toContain(`"'=HYPERLINK(""http://evil.example"",""x"")"`);
    expect(text.split('\r\n').some((l) => /^"?=/.test(l.split('","')[2] ?? ''))).toBe(false);
    const audit = (await adminDb().from('admin_audit').select('action').eq('resource', 'export').eq('resource_id', 'enrolments.csv').gte('at', startedAt)).data ?? [];
    expect(audit.length).toBeGreaterThan(0);

    const staff = await keyHeaders('staff');
    expect((await request.get(`${BASE}/exports/enrolments.csv`, { headers: staff })).status()).toBe(403);
    expect((await request.get(`${BASE}/enrolments`, { headers: staff })).status()).toBe(200);
    expect((await request.post(`${BASE}/enrolments`, { headers: staff, data: { cohortSlug: SINGLE, userId: learnerId } })).status()).toBe(403);
    expect((await request.get(`${BASE}/exports/enrolments.csv`, { headers: await keyHeaders('admin') })).status()).toBe(200);
    expect((await admin.request.get(`${BASE}/exports/payments.csv`)).status()).toBe(404);
  });

  test('[AAPI-CSV-002] the learners export has one row per learner', async () => {
    await grant({ cohortSlug: SINGLE, userId: learnerId });
    const res = await admin.request.get(`${BASE}/exports/learners.csv`);
    expect(res.status()).toBe(200);
    const lines = (await res.text()).trim().split('\r\n');
    expect(lines[0]).toBe('"userId","email","name","enrolments","firstEnrolledAt"');
    const mine = lines.filter((l) => l.startsWith(`"${learnerId}"`));
    expect(mine).toHaveLength(1);
    const ids = lines.slice(1).map((l) => l.split(',')[0]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
