'use client';
import { useState } from 'react';
import { useAdminList } from '@/components/admin/useAdminApi';
import { useCohortSlugs } from '@/components/admin/useCohortSlugs';
import { DataTable, ErrorNote, PageHeader, Spinner, ghostButtonClass, inputClass } from '@/components/admin/ui';
import { barPercent, countText, lastActivityText, percentText, type ProgressItem } from '@/lib/adminUi/progressView';
import { queryString } from '@/lib/adminUi/client';

const label = 'text-xs font-semibold text-stone-400';

export default function ProgressPage() {
  const { slugs: cohortSlugs } = useCohortSlugs();
  const [cohort, setCohort] = useState('');
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const list = useAdminList<ProgressItem>(`/progress${queryString({ limit: 25, cohortSlug: cohort, q: appliedQ })}`);
  const now = new Date();
  return (
    <div>
      <PageHeader title="Student progress" subtitle="One row per enrolment: videos and assignments finished out of the course total. A dash means the course's lessons are not known, so no percentage is shown." />
      <form className="mb-4 flex flex-wrap items-end gap-3" aria-label="Filter progress" onSubmit={(e) => { e.preventDefault(); setAppliedQ(q); }}>
        <label className={label}>Search by name or e-mail<input value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
        <label className={label}>Cohort<select value={cohort} onChange={(e) => setCohort(e.target.value)} className={`${inputClass} mt-1 font-normal`}><option value="">All</option>{cohortSlugs.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
        <button type="submit" className={ghostButtonClass}>Search</button>
      </form>
      <ErrorNote failure={list.failure} />
      {list.loading && !list.items.length ? <Spinner /> : (
        <DataTable rows={list.items} rowKey={(r) => `${r.userId}:${r.cohortSlug}`} empty="No enrolments match."
          columns={[
            { header: 'Learner', cell: (r) => <span>{r.name}<span className="block text-xs text-stone-500">{r.email ?? r.userId}</span></span> },
            { header: 'Cohort', cell: (r) => <span className="font-mono text-xs">{r.cohortSlug}</span> },
            { header: 'Videos', cell: (r) => countText(r.videosDone, r.totalVideos) },
            { header: 'Assignments', cell: (r) => countText(r.assignmentsDone, r.totalAssignments) },
            { header: 'Progress', cell: (r) => (
              <div className="flex items-center gap-3"><div className="h-2 w-24 rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={r.percent ?? undefined} aria-label={`Progress of ${r.name} in ${r.cohortSlug}`}><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${barPercent(r.percent)}%` }} /></div><span className="text-xs font-bold">{percentText(r.percent)}</span></div>
            ) },
            { header: 'Last activity', cell: (r) => <span title={r.lastActivityAt ?? undefined}>{lastActivityText(r.lastActivityAt, now)}</span> },
          ]} />
      )}
      {list.hasMore && <div className="mt-4 text-center"><button type="button" disabled={list.loading} className={ghostButtonClass} onClick={() => void list.loadMore()}>{list.loading ? 'Loading…' : 'Load more'}</button></div>}
    </div>
  );
}
