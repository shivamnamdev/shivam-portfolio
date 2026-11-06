'use client';
import Link from 'next/link';
import { useState } from 'react';
import { adminFetch, useAdminGet, useAdminList } from '@/components/admin/useAdminApi';
import { BannerFields, BannerPreview } from '@/components/admin/engagement/BannerFields';
import { DataTable, ErrorNote, PageHeader, Spinner, StatusBadge, buttonClass, ghostButtonClass, inputClass } from '@/components/admin/ui';
import { AUDIENCE_LABEL, PLACEMENT_LABEL, bannerBody, bannerProblems, emptyBannerForm, type BannerForm, type BannerView } from '@/lib/adminUi/engagement';
import { queryString, type Failure } from '@/lib/adminUi/client';

export default function BannersPage() {
  const cohorts = useAdminGet<{ items: Array<{ slug: string; title: string }> }>('/cohorts?limit=100');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const list = useAdminList<BannerView>(`/banners${queryString({ limit: 25, status, q: appliedQ })}`);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BannerForm>(emptyBannerForm);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const problems = bannerProblems(form, true);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setFailure(null); setCreated(null);
    const r = await adminFetch<BannerView>('/banners', { method: 'POST', body: bannerBody(form) });
    setBusy(false);
    if (r.ok) { setCreated(r.data.slug); setForm(emptyBannerForm()); void list.reload(); } else setFailure(r.failure);
  }

  return (
    <div>
      <PageHeader title="Banners" subtitle="Short notices shown on the site. A new banner starts as a draft; only published banners are shown." actions={
        <button type="button" className={open ? buttonClass : ghostButtonClass} aria-expanded={open} onClick={() => { setOpen(!open); setFailure(null); setCreated(null); }}>New banner</button>} />
      {created && <p role="status" className="mb-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">Created draft <Link href={`/admin/banners/${created}`} className="font-mono font-bold underline">{created}</Link>. Open it to publish.</p>}
      {open && (
        <form onSubmit={create} aria-label="New banner" className="mb-6 space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <BannerFields form={form} onChange={setForm} creating cohorts={cohorts.data?.items ?? []} />
          <BannerPreview form={form} now={new Date()} />
          {problems.length > 0 && form.message && <ul role="alert" className="list-disc rounded-lg bg-amber-500/10 p-3 pl-7 text-xs text-amber-200">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
          <ErrorNote failure={failure} />
          <button type="submit" disabled={busy || problems.length > 0} className={buttonClass}>{busy ? 'Creating…' : 'Create draft banner'}</button>
        </form>
      )}
      <form className="mb-4 flex flex-wrap items-end gap-3" aria-label="Filter banners" onSubmit={(e) => { e.preventDefault(); setAppliedQ(q); }}>
        <label className="text-xs font-semibold text-stone-400">Search by slug<input value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
        <label className="text-xs font-semibold text-stone-400">Status
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputClass} mt-1 font-normal`}><option value="">All</option>{['draft', 'published', 'archived'].map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
        <button type="submit" className={ghostButtonClass}>Search</button>
      </form>
      <ErrorNote failure={list.failure} />
      {list.loading && !list.items.length ? <Spinner /> : (
        <DataTable rows={list.items} rowKey={(b) => b.slug} empty="No banners match."
          columns={[
            { header: 'Slug', cell: (b) => <Link href={`/admin/banners/${b.slug}`} className="font-mono font-semibold text-amber-400 hover:text-amber-300">{b.slug}</Link> },
            { header: 'Message', cell: (b) => <span className="line-clamp-2 max-w-md">{b.message}</span> },
            { header: 'Status', cell: (b) => <StatusBadge value={b.status} /> },
            { header: 'Where', cell: (b) => PLACEMENT_LABEL[b.placement] },
            { header: 'Who', cell: (b) => AUDIENCE_LABEL[b.audience.kind] },
          ]} />
      )}
      {list.hasMore && <div className="mt-4 text-center"><button type="button" disabled={list.loading} className={ghostButtonClass} onClick={() => void list.loadMore()}>{list.loading ? 'Loading…' : 'Load more'}</button></div>}
    </div>
  );
}
