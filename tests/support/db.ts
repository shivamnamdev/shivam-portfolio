import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { clerkUserId } from './clerk';
import { SEED_STATE } from './personas';

// Enrolment seeding for the QA Supabase project. Never runs unless E2E_SEED_PERSONAS=1, and always
// snapshots and restores the rows it touches (see global-setup / global-teardown).
export const seedEnabled = (): boolean =>
  process.env.E2E_SEED_PERSONAS === '1' &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY;

export function adminDb(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type EnrolmentRow = {
  id?: string; user_id: string; course_slug: string; enrolled_at?: string;
  coupon_used?: string | null; user_name?: string | null; user_email?: string | null;
};

export async function personaIds(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const email of Object.keys(SEED_STATE)) out[email] = await clerkUserId(email);
  return out;
}

export async function readRows(db: SupabaseClient, userIds: string[]): Promise<EnrolmentRow[]> {
  const { data, error } = await db.from('user_enrollments').select('*').in('user_id', userIds);
  if (error) throw error;
  return (data ?? []) as EnrolmentRow[];
}

export async function applySeedState(db: SupabaseClient, ids: Record<string, string>): Promise<void> {
  for (const [email, slugs] of Object.entries(SEED_STATE)) {
    const userId = ids[email];
    const current = await readRows(db, [userId]);
    const stale = current.filter(r => !slugs.includes(r.course_slug)).map(r => r.id!);
    if (stale.length) {
      const { error } = await db.from('user_enrollments').delete().in('id', stale);
      if (error) throw error;
    }
    for (const slug of slugs.filter(s => !current.some(r => r.course_slug === s))) {
      const { error } = await db.from('user_enrollments').insert([{
        user_id: userId, course_slug: slug, user_email: email, user_name: 'QA persona', coupon_used: null,
      }]);
      if (error) throw error;
    }
  }
}

export async function restoreRows(db: SupabaseClient, userIds: string[], original: EnrolmentRow[]): Promise<void> {
  const { error: delError } = await db.from('user_enrollments').delete().in('user_id', userIds);
  if (delError) throw delError;
  if (original.length) {
    const { error } = await db.from('user_enrollments').insert(original);
    if (error) throw error;
  }
}

// Per-test enrolment changes for the "enrolment state changes" cases. Always paired with a revoke in `finally`.
export async function grantTestEnrolment(email: string, courseSlug: string): Promise<void> {
  const userId = await clerkUserId(email);
  const db = adminDb();
  const { error } = await db.from('user_enrollments').insert([{
    user_id: userId, course_slug: courseSlug, user_email: email, user_name: 'QA persona', coupon_used: null,
  }]);
  if (error) throw error;
}

export async function revokeTestEnrolment(email: string, courseSlug: string): Promise<void> {
  const userId = await clerkUserId(email);
  const { error } = await adminDb().from('user_enrollments').delete().eq('user_id', userId).eq('course_slug', courseSlug);
  if (error) throw error;
}
