'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { adminFetch, useAdminGet } from '@/components/admin/useAdminApi';
import LifecycleBar from '@/components/admin/LifecycleBar';
import { BannerFields, BannerPreview } from '@/components/admin/engagement/BannerFields';
import { ConfirmDialog, ErrorNote, PageHeader, Spinner, buttonClass, ghostButtonClass, inputClass } from '@/components/admin/ui';
import { bannerChanges, bannerProblems, bannerToForm, bannerVisibility, type BannerForm, type BannerView, type PreviewViewer } from '@/lib/adminUi/engagement';
import { ifMatchHeader, type Failure } from '@/lib/adminUi/client';

const VIEWERS: Array<{ id: string; label: string }> = [{ id: 'visitor', label: 'A visitor (not signed in)' }, { id: 'learner', label: 'A signed-in learner' }, { id: 'cohort', label: 'A learner of this banner\'s cohort' }, { id: 'plan', label: 'A learner on this banner\'s plan' }];

export default function BannerDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const loaded = useAdminGet<BannerView>(`/banners/${encodeURIComponent(slug)}`);
  const cohorts = useAdminGet<{ items: Array<{ slug: string; title: string }> }>('/cohorts?limit=100');
  const [banner, setBanner] = useState<BannerView | null>(null);
  const [form, setForm] = useState<BannerForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [viewerId, setViewerId] = useState('visitor');

  const adopt = (b: BannerView) => { setBanner(b); setForm(bannerToForm(b)); };
  useEffect(() => { if (loaded.data) adopt(loaded.data); }, [loaded.data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!banner || !form) return;
    const body = bannerChanges(banner, form);
    if (!Object.keys(body).length) { setFailure({ status: 400, code: 'nothing', message: 'Nothing has changed' }); return; }
    setBusy(true); setFailure(null); setSaved(false);
    const r = await adminFetch<BannerView>(`/banners/${encodeURIComponent(slug)}`, { method: 'PATCH', body, headers: ifMatchHeader(banner.version) });
    setBusy(false);
    if (r.ok) { adopt(r.data); setSaved(true); } else setFailure(r.failure);
  }
  async function remove() {
    setBusy(true);
    const r = await adminFetch(`/banners/${encodeURIComponent(slug)}`, { method: 'DELETE' });
    setBusy(false); setConfirmDelete(false);
    if (r.ok) router.push('/admin/banners'); else setFailure(r.failure);
  }

  if (loaded.loading && !banner) return <Spinner />;
  if (!banner || !form) return <div><ErrorNote failure={loaded.failure} /><Link href="/admin/banners" className="text-sm text-amber-400">Back to banners</Link></div>;
  const problems = bannerProblems(form, false);
  const now = new Date();
  const a = banner.audience;
  const viewer: PreviewViewer = viewerId === 'visitor' ? { kind: 'visitor' } : viewerId === 'cohort' ? { kind: 'learner', cohortSlugs: a.kind === 'cohort' ? [a.cohortSlug] : [] } : viewerId === 'plan' ? { kind: 'learner', planIds: a.kind === 'plan' ? [a.planId] : [] } : { kind: 'learner' };
  const visibility = bannerVisibility(banner, viewer, now);
  return (
    <div>
      <p className="mb-2 text-sm"><Link href="/admin/banners" className="text-amber-400 hover:text-amber-300">Banners</Link> / <span className="font-mono text-stone-400">{banner.slug}</span></p>
      <PageHeader title={banner.slug} subtitle={`Version ${banner.version}`} />
      <div className="mb-6"><LifecycleBar<BannerView> kind="banners" slug={banner.slug} status={banner.status} onChanged={adopt} /></div>

      <section aria-label="Preview" className="mb-6 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-sm font-bold text-white">Preview of what you are editing</h2>
        <BannerPreview form={form} now={now} />
        <label className="block max-w-sm text-xs font-semibold text-stone-400">Check what this viewer sees (the saved banner)
          <select value={viewerId} onChange={(e) => setViewerId(e.target.value)} className={`${inputClass} mt-1 font-normal`}>{VIEWERS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</select></label>
        <p data-testid="visibility" className={`text-sm ${visibility.visible ? 'text-emerald-300' : 'text-stone-400'}`}>{visibility.reason}</p>
      </section>

      <form onSubmit={save} aria-label="Edit banner" className="space-y-4">
        <BannerFields form={form} onChange={(f) => { setForm(f); setSaved(false); }} creating={false} cohorts={cohorts.data?.items ?? []} />
        {problems.length > 0 && <ul role="alert" className="list-disc rounded-lg bg-amber-500/10 p-3 pl-7 text-xs text-amber-200">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
        <ErrorNote failure={failure} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy || problems.length > 0} className={buttonClass}>{busy ? 'Saving…' : 'Save changes'}</button>
          <button type="button" disabled={busy || banner.status === 'published'} title={banner.status === 'published' ? 'Move it back to draft or archive it first' : undefined} className={ghostButtonClass} onClick={() => setConfirmDelete(true)}>Delete</button>
          {saved && <span role="status" className="text-sm text-emerald-300">Saved</span>}
        </div>
      </form>
      {confirmDelete && <ConfirmDialog title={`Delete ${banner.slug}?`} danger busy={busy} confirmLabel="Delete" onCancel={() => setConfirmDelete(false)} onConfirm={remove} body={<p>The banner is removed for good. Archive it instead if you may want it again.</p>} />}
    </div>
  );
}
