'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { adminFetch, useAdminGet, useAdminList } from '@/components/admin/useAdminApi';
import PricingEditor from '@/components/admin/PricingEditor';
import { DataTable, ErrorNote, PageHeader, Spinner, StatusBadge, buttonClass, ghostButtonClass, inputClass } from '@/components/admin/ui';
import { queryString, timeAgo, type Failure } from '@/lib/adminUi/client';
import { freeNotice, isSlug, slugify, type Pricing } from '@/lib/adminUi/forms';

type Cohort = { slug: string; courseSlug: string; title: string; status: string; enrollmentClosed?: boolean; updatedAt: string };
type Course = { slug: string; title: string };

export default function CohortsPage() {
  const router = useRouter();
  const preset = useSearchParams().get('course') ?? '';
  const courses = useAdminGet<{ items: Course[] }>('/courses?limit=100');
  const [filter, setFilter] = useState({ courseSlug: '', status: '' });
  const list = useAdminList<Cohort>(`/cohorts${queryString({ limit: 25, ...filter })}`);
  const [form, setForm] = useState({ title: '', slug: '', courseSlug: preset });
  const [slugEdited, setSlugEdited] = useState(false);
  const [pricing, setPricing] = useState<Pricing>({ kind: 'single', inr: { amount: 0 } });
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const now = new Date();

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setFailure(null);
    const r = await adminFetch<Cohort>('/cohorts', { method: 'POST', body: { slug: form.slug, courseSlug: form.courseSlug, title: form.title.trim(), pricing } });
    setBusy(false);
    if (r.ok) router.push(`/admin/cohorts/${r.data.slug}`); else setFailure(r.failure);
  }
  const free = freeNotice(pricing);
  return (
    <div>
      <PageHeader title="Cohorts" subtitle="A cohort is one batch of a course: its dates, price model and private links. It starts as a draft." />
      <form onSubmit={create} className="mb-6 space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-4" aria-label="New cohort">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs font-semibold text-stone-400">Course
            <select required value={form.courseSlug} onChange={(e) => setForm({ ...form, courseSlug: e.target.value })} className={`${inputClass} mt-1 font-normal`}>
              <option value="">Choose a course</option>{courses.data?.items.map((c) => <option key={c.slug} value={c.slug}>{c.title}</option>)}</select></label>
          <label className="text-xs font-semibold text-stone-400">Title
            <input required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: slugEdited ? form.slug : slugify(e.target.value) })} placeholder="Python Batch 3" className={`${inputClass} mt-1 font-normal`} /></label>
          <label className="text-xs font-semibold text-stone-400">Slug (cannot change later)
            <input required value={form.slug} onChange={(e) => { setSlugEdited(true); setForm({ ...form, slug: e.target.value }); }} aria-invalid={!!form.slug && !isSlug(form.slug)} className={`${inputClass} mt-1 font-mono font-normal`} /></label>
        </div>
        <PricingEditor value={pricing} onChange={setPricing} />
        {free && <p role="status" className="text-sm text-amber-300">{free}</p>}
        <button type="submit" disabled={busy || !form.courseSlug || !form.title.trim() || !isSlug(form.slug)} className={buttonClass}>{busy ? 'Creating…' : 'Create cohort'}</button>
        <ErrorNote failure={failure} />
      </form>
      <form className="mb-4 flex flex-wrap items-end gap-3" aria-label="Filter cohorts" onSubmit={(e) => e.preventDefault()}>
        <label className="text-xs font-semibold text-stone-400">Course
          <select value={filter.courseSlug} onChange={(e) => setFilter({ ...filter, courseSlug: e.target.value })} className={`${inputClass} mt-1 font-normal`}><option value="">All</option>{courses.data?.items.map((c) => <option key={c.slug} value={c.slug}>{c.title}</option>)}</select></label>
        <label className="text-xs font-semibold text-stone-400">Status
          <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} className={`${inputClass} mt-1 font-normal`}><option value="">All</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
      </form>
      <ErrorNote failure={list.failure} />
      {list.loading && !list.items.length ? <Spinner /> : (
        <DataTable rows={list.items} rowKey={(c) => c.slug} empty="No cohorts match."
          columns={[
            { header: 'Title', cell: (c) => <Link href={`/admin/cohorts/${c.slug}`} className="font-semibold text-amber-400 hover:text-amber-300">{c.title}</Link> },
            { header: 'Course', cell: (c) => <Link href={`/admin/courses/${c.courseSlug}`} className="font-mono text-xs text-stone-300 hover:text-white">{c.courseSlug}</Link> },
            { header: 'Status', cell: (c) => <StatusBadge value={c.status} /> },
            { header: 'Enrolment', cell: (c) => (c.enrollmentClosed ? 'closed' : 'open') },
            { header: 'Updated', cell: (c) => <span title={c.updatedAt}>{timeAgo(c.updatedAt, now)}</span> },
          ]} />
      )}
      {list.hasMore && <div className="mt-4 text-center"><button type="button" disabled={list.loading} className={ghostButtonClass} onClick={() => void list.loadMore()}>{list.loading ? 'Loading…' : 'Load more'}</button></div>}
    </div>
  );
}
