'use client';
import { useState } from 'react';
import { useAdminList } from '@/components/admin/useAdminApi';
import { DataTable, ErrorNote, PageHeader, Spinner, StatusBadge, ghostButtonClass, inputClass } from '@/components/admin/ui';
import { joinedText, statusText, type DirectoryItem } from '@/lib/adminUi/progressView';
import { queryString } from '@/lib/adminUi/client';

export default function LearnersPage() {
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const list = useAdminList<DirectoryItem>(`/learners${queryString({ limit: 50, q: appliedQ })}`);
  return (
    <div>
      <PageHeader title="Learners" subtitle="Everyone who has signed up, newest first. A lead has not enrolled in any cohort yet. To give or remove access, use Enrolments." />
      <form className="mb-4 flex flex-wrap items-end gap-3" aria-label="Filter learners" onSubmit={(e) => { e.preventDefault(); setAppliedQ(q); }}>
        <label className="text-xs font-semibold text-stone-400">Search by name or e-mail<input value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
        <button type="submit" className={ghostButtonClass}>Search</button>
      </form>
      <ErrorNote failure={list.failure} />
      {list.loading && !list.items.length ? <Spinner /> : (
        <DataTable rows={list.items} rowKey={(l) => l.id} empty="Nobody matches."
          columns={[
            { header: 'Learner', cell: (l) => <span>{l.name}<span className="block text-xs text-stone-500">{l.email ?? 'No e-mail'}</span></span> },
            { header: 'User id', cell: (l) => <span className="font-mono text-xs">{l.id}</span> },
            { header: 'Joined', cell: (l) => joinedText(l.joinedAt) },
            { header: 'Status', cell: (l) => <span className="flex items-center gap-2"><StatusBadge value={l.status === 'lead' ? 'draft' : 'published'} /><span className="text-xs">{statusText(l)}</span></span> },
          ]} />
      )}
      {list.hasMore && <div className="mt-4 text-center"><button type="button" disabled={list.loading} className={ghostButtonClass} onClick={() => void list.loadMore()}>{list.loading ? 'Loading…' : 'Load more'}</button></div>}
    </div>
  );
}
