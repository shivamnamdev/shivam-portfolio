'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { adminFetch, useAdminGet } from '@/components/admin/useAdminApi';
import ImportPanel from '@/components/admin/curriculum/ImportPanel';
import CatalogImportPanel from '@/components/admin/curriculum/CatalogImportPanel';
import { DataTable, ErrorNote, PageHeader, Spinner, StatusBadge, buttonClass, ghostButtonClass } from '@/components/admin/ui';
import { timeAgo, type Failure } from '@/lib/adminUi/client';

type Cohort = { slug: string; title: string; status: string };
type Summary = { cohort: string; status: string; hasUnpublishedChanges: boolean; counts: { modules: number; lessons: number }; updatedAt: string };

// Every cohort, with its curriculum if it has one. A cohort without a curriculum gets a "Create" button (the first write needs no version).
export default function CurriculumListPage() {
  const router = useRouter();
  const cohorts = useAdminGet<{ items: Cohort[] }>('/cohorts?limit=100');
  const sums = useAdminGet<{ items: Summary[] }>('/curriculum?limit=100');
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const now = new Date();
  const byCohort = new Map((sums.data?.items ?? []).map((s) => [s.cohort, s]));

  async function create(slug: string) {
    setBusy(slug); setFailure(null);
    const r = await adminFetch(`/curriculum/${encodeURIComponent(slug)}`, { method: 'PUT', body: { modules: [] } });
    setBusy(null);
    if (r.ok) router.push(`/admin/curriculum/${slug}`); else setFailure(r.failure);
  }
  const loading = (cohorts.loading && !cohorts.data) || (sums.loading && !sums.data);
  return (
    <div>
      <PageHeader title="Curriculum" subtitle="The modules and lessons of each cohort. Edit as a draft, preview, then publish." />
      <div className="mb-4 space-y-2"><ErrorNote failure={failure} /><ErrorNote failure={cohorts.failure} /><ErrorNote failure={sums.failure} /></div>
      {loading ? <Spinner /> : (
        <DataTable rows={cohorts.data?.items ?? []} rowKey={(c) => c.slug} empty="No cohorts yet. Create a cohort first."
          columns={[
            { header: 'Cohort', cell: (c) => <div><span className="font-semibold text-white">{c.title}</span><br /><span className="font-mono text-xs text-stone-500">{c.slug}</span></div> },
            { header: 'Curriculum', cell: (c) => { const s = byCohort.get(c.slug); return s ? `${s.counts.modules} modules, ${s.counts.lessons} lessons` : <span className="text-stone-500">None yet</span>; } },
            { header: 'State', cell: (c) => { const s = byCohort.get(c.slug); return s ? (s.hasUnpublishedChanges ? <StatusBadge value="draft" /> : <StatusBadge value="published" />) : '—'; } },
            { header: 'Updated', cell: (c) => { const s = byCohort.get(c.slug); return s ? <span title={s.updatedAt}>{timeAgo(s.updatedAt, now)}</span> : '—'; } },
            { header: 'Actions', cell: (c) => (byCohort.has(c.slug)
              ? <Link href={`/admin/curriculum/${c.slug}`} className={ghostButtonClass}>Open</Link>
              : <button type="button" disabled={busy === c.slug} className={buttonClass} onClick={() => void create(c.slug)}>{busy === c.slug ? 'Creating…' : 'Create curriculum'}</button>) },
          ]} />
      )}
      <CatalogImportPanel onApplied={() => { void cohorts.reload(); void sums.reload(); }} />
      <ImportPanel onApplied={() => { void sums.reload(); }} />
    </div>
  );
}
