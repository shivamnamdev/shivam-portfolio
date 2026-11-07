import type { APIRequestContext } from '@playwright/test';
import { adminDb } from './db';

// Helpers for the admin API specs (PRD 17). Test data uses the prefix qa-aapi / QAAPI so it is easy to find and remove.
export const BASE = '/api/admin/v1';
export const PREFIX = 'qa-aapi';
export const future = (days = 30) => new Date(Date.now() + days * 86400_000).toISOString();

export async function cleanupAdminApi(): Promise<void> {
  const db = adminDb();
  await db.from('content_docs').delete().like('key', `${PREFIX}%`);
  await db.from('coupons').delete().or('code.like.QAAPI%,batch_id.like.idem-qaaapi%');
  await db.from('api_keys').delete().like('name', 'QA-AAPI%');
  await db.from('admin_audit').delete().or(`resource_id.like.${PREFIX}%,resource_id.like.QAAPI%,resource_id.like.idem-qaaapi%`);
}

// The write limit is 120 a minute per actor; the specs clear the counter so a long run never trips it by accident.
export async function clearWriteLimits(): Promise<void> { await adminDb().from('rate_limits').delete().like('key', 'admin-write:%'); }

export async function json(res: Awaited<ReturnType<APIRequestContext['get']>>) { return res.json(); }

// Specs that publish portal rows delete them straight in the database afterwards, which does not clear the server's 60 s catalog cache: the next spec
// on the same server would still see the deleted cohort. Any admin write refreshes that cache, so this makes (and removes) a throw-away draft course.
export async function flushCatalogCache(admin: { request: APIRequestContext }): Promise<void> {
  const slug = 'qa-flush-cache';
  await admin.request.post(`${BASE}/courses`, { data: { slug, title: 'QA cache flush' } }).catch(() => {});
  await admin.request.delete(`${BASE}/courses/${slug}`).catch(() => {});
  await adminDb().from('content_docs').delete().eq('key', slug);
  await adminDb().from('admin_audit').delete().like('resource_id', `%${slug}%`);
}

export const course = (slug: string, extra: object = {}) => ({ slug, title: `QA course ${slug}`, summary: 'created by the admin API tests', pitch: { vsl: { headline: 'QA' } }, ...extra });
export const singlePricing = (inr = 1999, usd?: number) => ({ kind: 'single', inr: { amount: inr, original: inr + 500 }, ...(usd ? { usd: { amount: usd } } : {}) });
export const plansPricing = () => ({ kind: 'plans', currency: 'INR', plans: [
  { id: 'community', name: 'Community', price: { amount: 1999, original: 2499 }, features: ['Live classes', 'Certificate'] },
  { id: 'personal', name: 'Personal', price: { amount: 2999, original: 4999 }, popular: true, features: ['Everything in Community', '1-on-1 calls'] },
] });
export const cohort = (slug: string, courseSlug: string, extra: object = {}) => ({ slug, courseSlug, title: `QA cohort ${slug}`, pricing: singlePricing(), ...extra });
