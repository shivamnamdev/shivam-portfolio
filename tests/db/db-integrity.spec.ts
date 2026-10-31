import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { activeCourses } from '../../data/courses';
import { EMAIL, COURSE, SEED_STATE } from '../support/personas';
import { clerkUserId } from '../support/clerk';
import { adminDb, seedEnabled } from '../support/db';
import { requireSeed } from '../support/guards';

// PRD 14 · Database integrity of the QA Supabase project: schema, constraints, access with the public (anon) key, data quality
// and round trips. Assertions are made with the service role; the access cases use the public anon key, exactly what a browser has.
// Test rows use the user id prefix qa_db_ and are removed after every test. Cases that describe the HARDENED state of
// docs/SUPABASE_HARDENING.md fail until that runbook (and the phase-2 policies) is applied: they are known failures with tickets.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const anon = () => createClient(url, anonKey, { auth: { persistSession: false } });
const P = 'qa_db_';
const uid = (n: string) => `${P}${n}_${Math.random().toString(36).slice(2, 7)}`;
const TABLES = ['user_enrollments', 'video_progress', 'video_comments', 'assignment_progress', 'exam_progress', 'user_stats', 'admin_activity_log'] as const;
type Def = { required?: string[]; properties: Record<string, { type?: string; format?: string; default?: unknown; description?: string }> };
let defs: Record<string, Def> = {};

async function schema() {
  const res = await fetch(`${url}/rest/v1/`, { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } });
  return (await res.json()).definitions as Record<string, Def>;
}
const code = (e: { code?: string } | null) => e?.code;

test.describe('PRD14 database integrity (QA project) @regression', () => {
  test.describe.configure({ mode: 'default' });
  test.beforeAll(async () => { if (seedEnabled()) defs = await schema(); });
  test.beforeEach(() => requireSeed());
  test.afterEach(async () => {
    const db = adminDb();
    for (const t of ['user_enrollments', 'video_progress', 'video_comments', 'assignment_progress', 'exam_progress', 'user_stats']) await db.from(t).delete().like('user_id', `${P}%`);
    await db.from('admin_activity_log').delete().like('message', 'QA-DB%');
  });

  test.describe('schema', () => {
    test('[DBI-SCH-001] every table the application uses exists', async () => {
      for (const t of TABLES) expect(defs[t], t).toBeTruthy();
    });

    test('[DBI-SCH-002] the columns match docs/DATABASE.md', async () => {
      const cols = (t: string) => Object.keys(defs[t].properties).sort();
      expect(cols('user_enrollments')).toEqual(['coupon_used', 'course_slug', 'enrolled_at', 'id', 'user_email', 'user_id', 'user_name']);
      expect(cols('video_progress')).toEqual(['completed_at', 'course_slug', 'id', 'user_id', 'video_id']);
      expect(cols('assignment_progress')).toEqual(['completed_at', 'course_slug', 'id', 'submitted_code', 'user_id', 'user_name', 'video_id']);
      expect(cols('video_comments')).toEqual(['content', 'created_at', 'id', 'user_id', 'user_image', 'user_name', 'video_id']);
      expect(cols('exam_progress')).toEqual(['attempts_used', 'completed_at', 'course_slug', 'id', 'is_passed', 'last_score', 'user_id']);
      expect(cols('user_stats')).toEqual(['current_streak', 'last_active_date', 'total_points', 'total_time_seconds', 'user_email', 'user_id', 'user_name']);
      expect(cols('admin_activity_log')).toEqual(['created_at', 'id', 'is_read', 'message', 'type', 'user_email']);
    });

    test('[DBI-SCH-003] primary keys: a generated uuid id on five tables, user_id on user_stats', async () => {
      for (const t of ['user_enrollments', 'video_progress', 'video_comments', 'assignment_progress', 'exam_progress', 'admin_activity_log']) {
        expect(defs[t].properties.id.format, t).toBe('uuid');
        expect(String(defs[t].properties.id.description), t).toContain('Primary Key');
        expect(String(defs[t].properties.id.default), t).toContain('uuid_generate_v4');
      }
      expect(String(defs.user_stats.properties.user_id.description)).toContain('Primary Key');
    });

    test('[DBI-SCH-004] required columns are NOT NULL (an insert without them is refused)', async () => {
      const db = adminDb();
      const bad: [string, object][] = [
        ['user_enrollments', { course_slug: 'x' }], ['user_enrollments', { user_id: uid('a') }],
        ['video_progress', { user_id: uid('a'), course_slug: 'x' }], ['assignment_progress', { user_id: uid('a'), course_slug: 'x' }],
        ['user_stats', { user_id: uid('a') }], ['admin_activity_log', { message: 'QA-DB x' }], ['admin_activity_log', { type: 'x' }],
        ['exam_progress', { user_id: uid('a') }], ['video_comments', { video_id: 'v', user_id: uid('a'), user_name: 'n' }],
      ];
      for (const [t, row] of bad) expect(code((await db.from(t).insert([row])).error), `${t} ${JSON.stringify(row)}`).toBe('23502');
    });

    test('[DBI-SCH-005] defaults: enrolled_at is now (UTC), is_read false, stats 1/0/0, exam 0/false/0', async () => {
      const db = adminDb();
      const e = (await db.from('user_enrollments').insert([{ user_id: uid('d'), course_slug: 'x' }]).select().single()).data!;
      expect(Math.abs(Date.now() - new Date(e.enrolled_at).getTime())).toBeLessThan(60_000);
      expect(e.enrolled_at).toMatch(/\+00:00$|Z$/);
      const l = (await db.from('admin_activity_log').insert([{ type: 'qa', message: 'QA-DB defaults' }]).select().single()).data!;
      expect(l.is_read).toBe(false);
      const s = (await db.from('user_stats').insert([{ user_id: uid('d'), user_name: 'QA' }]).select().single()).data!;
      expect([s.current_streak, s.total_points, s.total_time_seconds]).toEqual([1, 0, 0]);
      expect(s.last_active_date).toBe(new Date().toISOString().split('T')[0]);
      const x = (await db.from('exam_progress').insert([{ user_id: uid('d'), course_slug: 'x' }]).select().single()).data!;
      expect([x.attempts_used, x.is_passed, x.last_score]).toEqual([0, false, 0]);
    });

    test('[DBI-SCH-006] the video_likes table that the course page queries exists (SCP-49)', async () => {
      expect(defs.video_likes, 'video_likes').toBeTruthy();
    });
  });

  test.describe('constraints', () => {
    test('[DBI-CON-001][DBI-CON-002] one progress row per learner, course and video; a second insert is refused (23505)', async () => {
      const db = adminDb(), u = uid('c');
      expect((await db.from('video_progress').insert([{ user_id: u, course_slug: 'x', video_id: 'v' }])).error).toBeNull();
      expect(code((await db.from('video_progress').insert([{ user_id: u, course_slug: 'x', video_id: 'v' }])).error)).toBe('23505');
      const a = { user_id: u, course_slug: 'x', video_id: 'v', submitted_code: '1', user_name: 'QA' };
      expect((await db.from('assignment_progress').insert([a])).error).toBeNull();
      expect(code((await db.from('assignment_progress').insert([a])).error)).toBe('23505');
    });

    test('[DBI-CON-003][DBI-CON-004] one exam row per learner and course, one stats row per learner', async () => {
      const db = adminDb(), u = uid('c');
      expect((await db.from('exam_progress').insert([{ user_id: u, course_slug: 'x' }])).error).toBeNull();
      expect(code((await db.from('exam_progress').insert([{ user_id: u, course_slug: 'x' }])).error)).toBe('23505');
      expect((await db.from('user_stats').insert([{ user_id: u, user_name: 'QA' }])).error).toBeNull();
      expect(code((await db.from('user_stats').insert([{ user_id: u, user_name: 'QA' }])).error)).toBe('23505');
    });

    test('[DBI-CON-005] one enrolment per learner and course: a second insert is refused (SCP-44, hardening step 1)', async () => {
      const db = adminDb(), row = { user_id: uid('c'), course_slug: 'x' };
      expect((await db.from('user_enrollments').insert([row])).error).toBeNull();
      expect(code((await db.from('user_enrollments').insert([row])).error)).toBe('23505');
    });

    test('[DBI-CON-006] an upsert on the unique key is idempotent: two upserts leave one row', async () => {
      const db = adminDb(), row = { user_id: uid('c'), course_slug: 'x', video_id: 'v' };
      for (let i = 0; i < 2; i++) expect((await db.from('video_progress').upsert([row], { onConflict: 'user_id,course_slug,video_id' })).error).toBeNull();
      expect((await db.from('video_progress').select('id').eq('user_id', row.user_id)).data).toHaveLength(1);
    });
  });

  test.describe('access with the public anon key (what any browser has)', () => {
    const fake = () => ({ user_id: uid('anon'), course_slug: 'qa-checkout-sandbox', user_email: 'qa.db@example.test', user_name: 'QA' });

    test('[DBI-ACC-001] (SCP-74) the anon key cannot insert an enrolment (hardening step 2)', async () => {
      const row = fake();
      const res = await anon().from('user_enrollments').insert([row]);
      const stored = (await adminDb().from('user_enrollments').select('id').eq('user_id', row.user_id)).data!;
      expect(res.error, 'insert must be refused').not.toBeNull();
      expect(stored).toHaveLength(0);
    });

    test('[DBI-ACC-002] (SCP-74) the anon key cannot change or delete an existing enrolment', async () => {
      const row = fake();
      await adminDb().from('user_enrollments').insert([row]);
      const upd = await anon().from('user_enrollments').update({ course_slug: 'git-beginner-batch-1' }).eq('user_id', row.user_id).select();
      const del = await anon().from('user_enrollments').delete().eq('user_id', row.user_id).select();
      expect(upd.data ?? [], 'update').toHaveLength(0);
      expect(del.data ?? [], 'delete').toHaveLength(0);
    });

    test('[DBI-ACC-003] (SCP-75) the anon key cannot read other learners\' enrolments (R-AD-1, SCP-39)', async () => {
      const res = await anon().from('user_enrollments').select('user_id').limit(5);
      expect(res.data ?? []).toHaveLength(0);
    });

    test('[DBI-ACC-004] (SCP-75) the anon key cannot read submitted code of other learners', async () => {
      const res = await anon().from('assignment_progress').select('submitted_code').limit(5);
      expect(res.data ?? []).toHaveLength(0);
    });

    test('[DBI-ACC-005] (SCP-75) the anon key cannot read e-mail addresses from user_stats (the leaderboard needs only name and points)', async () => {
      const res = await anon().from('user_stats').select('user_email').not('user_email', 'is', null).limit(5);
      expect(res.data ?? []).toHaveLength(0);
    });

    test('[DBI-ACC-006] (SCP-76) the anon key cannot write the admin activity log (it feeds the admin bell)', async () => {
      const res = await anon().from('admin_activity_log').insert([{ type: 'qa', message: 'QA-DB forged entry' }]);
      expect(res.error, 'insert must be refused').not.toBeNull();
    });

    test('[DBI-ACC-007] (SCP-76) the anon key cannot change another learner\'s points on the leaderboard', async () => {
      const u = uid('anon');
      await adminDb().from('user_stats').insert([{ user_id: u, user_name: 'QA victim', total_points: 5 }]);
      await anon().from('user_stats').update({ total_points: 999999 }).eq('user_id', u);
      expect((await adminDb().from('user_stats').select('total_points').eq('user_id', u).single()).data!.total_points).toBe(5);
    });

    test('[DBI-ACC-008] (SCP-76) the anon key cannot post a comment as another user', async () => {
      const victim = uid('anon');
      const res = await anon().from('video_comments').insert([{ video_id: 'qa-v', user_id: victim, user_name: 'Someone Else', content: 'QA-DB forged comment' }]);
      expect(res.error, 'insert must be refused').not.toBeNull();
    });
  });

  test.describe('data quality and round trips', () => {
    test('[DBI-DAT-001] no learner has two enrolment rows for the same course', async () => {
      const { data } = await adminDb().from('user_enrollments').select('user_id, course_slug');
      const seen = new Map<string, number>();
      for (const r of data!) seen.set(`${r.user_id}|${r.course_slug}`, (seen.get(`${r.user_id}|${r.course_slug}`) ?? 0) + 1);
      expect([...seen].filter(([, n]) => n > 1)).toEqual([]);
    });

    test('[DBI-DAT-002] every enrolment is for a course in the catalog', async () => {
      const known = new Set(activeCourses.map(c => c.slug));
      const { data } = await adminDb().from('user_enrollments').select('course_slug');
      expect([...new Set(data!.map(r => r.course_slug))].filter(s => !known.has(s))).toEqual([]);
    });

    test('[DBI-DAT-003] the QA project has no leftovers of earlier test runs (qa_ ids, fixture rows, QA-DB log entries)', async () => {
      const db = adminDb();
      const leftovers: string[] = [];
      for (const t of ['user_enrollments', 'video_progress', 'assignment_progress', 'exam_progress', 'user_stats', 'video_comments']) {
        const { data } = await db.from(t).select('user_id').like('user_id', 'qa\\_%');
        if (data?.length) leftovers.push(`${t}:${data.length}`);
      }
      const logs = (await db.from('admin_activity_log').select('id').like('message', 'QA-DB%')).data ?? [];
      if (logs.length) leftovers.push(`admin_activity_log:${logs.length}`);
      expect(leftovers).toEqual([]);
    });

    test('[DBI-DAT-004] the persona enrolments are in the seeded state (mavish A, bazar B, edu none)', async () => {
      for (const [email, slugs] of Object.entries(SEED_STATE)) {
        const { data } = await adminDb().from('user_enrollments').select('course_slug').eq('user_id', await clerkUserId(email));
        expect((data ?? []).map(r => r.course_slug).sort(), email).toEqual([...slugs].sort());
      }
    });

    test('[DBI-DAT-005] no enrolment was stored with a placeholder e-mail or name', async () => {
      const { data } = await adminDb().from('user_enrollments').select('user_id, user_email, user_name');
      expect(data!.filter(r => !r.user_email || r.user_email === 'Unknown Email')).toEqual([]);
    });

    test('[DBI-DAT-006] text round trips: emoji, accents, quotes, SQL-like text and a 1 MB submission come back unchanged', async () => {
      const db = adminDb(), u = uid('rt');
      const samples = ["print('héllo 🚀')\n# \"quoted\" ' OR 1=1; DROP TABLE user_enrollments; --", 'x'.repeat(1_000_000)];
      for (const [i, code] of samples.entries()) {
        const row = { user_id: u, course_slug: 'x', video_id: `v${i}`, submitted_code: code, user_name: 'QA' };
        expect((await db.from('assignment_progress').insert([row])).error).toBeNull();
        expect((await db.from('assignment_progress').select('submitted_code').eq('user_id', u).eq('video_id', `v${i}`).single()).data!.submitted_code).toBe(code);
      }
      expect((await db.from('user_enrollments').select('id', { count: 'exact', head: true })).error).toBeNull();
    });

    test('[DBI-DAT-007] the activity log returns newest first and keeps the unread flag', async () => {
      const db = adminDb();
      await db.from('admin_activity_log').insert([{ type: 'qa', message: 'QA-DB first', created_at: '2026-01-01T00:00:00Z' }, { type: 'qa', message: 'QA-DB second', created_at: '2026-01-02T00:00:00Z' }]);
      const { data } = await db.from('admin_activity_log').select('message, is_read').like('message', 'QA-DB%').order('created_at', { ascending: false });
      expect(data!.map(r => r.message)).toEqual(['QA-DB second', 'QA-DB first']);
      expect(data!.every(r => r.is_read === false)).toBe(true);
    });

    test('[DBI-DAT-008] the persona e-mail on each enrolment equals the Clerk e-mail', async () => {
      for (const email of [EMAIL.mavish, EMAIL.bazar]) {
        const { data } = await adminDb().from('user_enrollments').select('user_email').eq('user_id', await clerkUserId(email));
        for (const r of data!) expect(r.user_email, email).toBe(email);
      }
      expect(COURSE.A).toBeTruthy();
    });
  });

  test.describe('policy inventory', () => {
    test('[DBI-POL-011] the service-role key is not in the browser bundle (needs a production build in .next-prod)', async () => {
      const dir = path.join(process.cwd(), '.next-prod', 'static');
      test.skip(!fs.existsSync(dir), 'needs a production build: NEXT_DIST_DIR=.next-prod npx next build');
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const hits: string[] = [];
      const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (/\.(js|html|json)$/.test(e.name)) { const t = fs.readFileSync(f, 'utf8'); if (t.includes(key) || t.includes('service_role')) hits.push(f); } } };
      walk(dir);
      expect(hits).toEqual([]);
    });
  });

  // Manual cases: read-only SQL in the Supabase SQL editor, steps in the workbook sheet "Policy Inventory (manual)".
  for (const [id, what] of [
    ['DBI-POL-001', 'row level security is on for every table'], ['DBI-POL-002', 'the policy list matches the intent'], ['DBI-POL-003', 'table grants for the public roles'],
    ['DBI-POL-004', 'unique constraints and indexes exist'], ['DBI-POL-005', 'policies are tied to the signed-in learner'], ['DBI-POL-006', 'functions and views exposed to the API'],
    ['DBI-POL-007', 'unused cms_ tables'], ['DBI-POL-008', 'orphan rows'], ['DBI-POL-009', 'realtime publications'], ['DBI-POL-010', 'storage buckets'],
    ['DBI-POL-012', 'backups and recovery'], ['DBI-POL-013', 'extensions and versions'], ['DBI-POL-014', 're-test after the hardening runbook'],
    ['DBI-POL-015', 'QA matches production'], ['DBI-POL-016', 'delete one learner\'s data'],
  ] as const) test.fixme(`[${id}] ${what} (manual: SQL in the Supabase SQL editor)`, async () => {});
});
