'use client';
import { useState } from 'react';
import { useAdminList } from '@/components/admin/useAdminApi';
import { DataTable, ErrorNote, PageHeader, Spinner, ghostButtonClass, inputClass } from '@/components/admin/ui';
import { formatDuration, streakText, type EngagementItem } from '@/lib/adminUi/progressView';
import { queryString } from '@/lib/adminUi/client';

export default function EngagementPage() {
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const list = useAdminList<EngagementItem>(`/engagement${queryString({ limit: 25, q: appliedQ })}`);
  return (
    <div>
      <PageHeader title="Engagement" subtitle="Time learners have spent on the site, their current streak and the last day they were active. Most time first." />
      <form className="mb-4 flex flex-wrap items-end gap-3" aria-label="Filter engagement" onSubmit={(e) => { e.preventDefault(); setAppliedQ(q); }}>
        <label className="text-xs font-semibold text-stone-400">Search by name or e-mail<input value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
        <button type="submit" className={ghostButtonClass}>Search</button>
      </form>
      <ErrorNote failure={list.failure} />
      {list.loading && !list.items.length ? <Spinner /> : (
        <DataTable rows={list.items} rowKey={(r) => r.userId} empty="No engagement data found."
          columns={[
            { header: 'Learner', cell: (r) => <span>{r.name}<span className="block text-xs text-stone-500">{r.email ?? r.userId}</span></span> },
            { header: 'Time spent', cell: (r) => <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold">{formatDuration(r.totalTimeSeconds)}</span> },
            { header: 'Streak', cell: (r) => streakText(r.currentStreak) },
            { header: 'Last active', cell: (r) => r.lastActiveDate ?? '—' },
          ]} />
      )}
      {list.hasMore && <div className="mt-4 text-center"><button type="button" disabled={list.loading} className={ghostButtonClass} onClick={() => void list.loadMore()}>{list.loading ? 'Loading…' : 'Load more'}</button></div>}
    </div>
  );
}
