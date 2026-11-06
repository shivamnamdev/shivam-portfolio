'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { adminFetch, useAdminList } from '@/components/admin/useAdminApi';
import { DataTable, ErrorNote, PageHeader, Spinner, StatusBadge, buttonClass, ghostButtonClass, inputClass } from '@/components/admin/ui';
import { queryString, timeAgo, type Failure } from '@/lib/adminUi/client';
import { isSlug, slugify } from '@/lib/adminUi/forms';

type Course = { slug: string; title: string; summary?: string; status: string; version: number; updatedAt: string };

export default function CoursesPage() {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const list = useAdminList<Course>(`/courses${queryString({ limit: 25, status, q: appliedQ })}`);
  const [form, setForm] = useState({ title: '', slug: '', summary: '' });
  const [slugEdited, setSlugEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const now = new Date();

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setFailure(null);
    const r = await adminFetch<Course>('/courses', { method: 'POST', body: { slug: form.slug, title: form.title.trim(), ...(form.summary.trim() ? { summary: form.summary.trim() } : {}) } });
    setBusy(false);
    if (r.ok) router.push(`/admin/courses/${r.data.slug}`); else setFailure(r.failure);
  }
  return (
    <div>
      <PageHeader title="Courses" subtitle="A course holds the content shared by every batch. Cohorts (batches) hold dates and prices." />
      <form onSubmit={create} className="mb-6 grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[1fr_1fr_auto]" aria-label="New course">
        <label className="text-xs font-semibold text-stone-400">Title
          <input required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: slugEdited ? form.slug : slugify(e.target.value) })} placeholder="Python for Beginners" className={`${inputClass} mt-1 font-normal`} /></label>
        <label className="text-xs font-semibold text-stone-400">Slug (the web address part, cannot change later)
          <input required value={form.slug} onChange={(e) => { setSlugEdited(true); setForm({ ...form, slug: e.target.value }); }} aria-invalid={!!form.slug && !isSlug(form.slug)} className={`${inputClass} mt-1 font-mono font-normal`} /></label>
        <div className="flex items-end"><button type="submit" disabled={busy || !form.title.trim() || !isSlug(form.slug)} className={buttonClass}>Create course</button></div>
        <label className="text-xs font-semibold text-stone-400 md:col-span-3">Summary (optional, up to 500 characters)
          <input maxLength={500} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className={`${inputClass} mt-1 font-normal`} /></label>
      </form>
      <div className="mb-4 space-y-2"><ErrorNote failure={failure} /></div>
      <form className="mb-4 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); setAppliedQ(q); }} aria-label="Filter courses">
        <label className="text-xs font-semibold text-stone-400">Search<input value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
        <label className="text-xs font-semibold text-stone-400">Status
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputClass} mt-1 font-normal`}><option value="">All</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
        <button type="submit" className={ghostButtonClass}>Search</button>
      </form>
      <ErrorNote failure={list.failure} />
      {list.loading && !list.items.length ? <Spinner /> : (
        <DataTable rows={list.items} rowKey={(c) => c.slug} empty="No courses match."
          columns={[
            { header: 'Title', cell: (c) => <Link href={`/admin/courses/${c.slug}`} className="font-semibold text-amber-400 hover:text-amber-300">{c.title}</Link> },
            { header: 'Slug', cell: (c) => <span className="font-mono text-xs">{c.slug}</span> },
            { header: 'Status', cell: (c) => <StatusBadge value={c.status} /> },
            { header: 'Updated', cell: (c) => <span title={c.updatedAt}>{timeAgo(c.updatedAt, now)}</span> },
          ]} />
      )}
      {list.hasMore && <div className="mt-4 text-center"><button type="button" disabled={list.loading} className={ghostButtonClass} onClick={() => void list.loadMore()}>{list.loading ? 'Loading…' : 'Load more'}</button></div>}
    </div>
  );
}
