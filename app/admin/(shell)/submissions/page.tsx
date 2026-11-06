'use client';
import { useCallback, useState } from 'react';
import CodeDialog from '@/components/admin/progress/CodeDialog';
import { useAdminList } from '@/components/admin/useAdminApi';
import { useCohortSlugs } from '@/components/admin/useCohortSlugs';
import { DataTable, ErrorNote, PageHeader, Spinner, ghostButtonClass, inputClass } from '@/components/admin/ui';
import { codeSizeText, submittedText, type SubmissionItem } from '@/lib/adminUi/progressView';
import { queryString } from '@/lib/adminUi/client';

const label = 'text-xs font-semibold text-stone-400';

export default function SubmissionsPage() {
  const { slugs: cohortSlugs } = useCohortSlugs();
  const [cohort, setCohort] = useState('');
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const list = useAdminList<SubmissionItem>(`/submissions${queryString({ limit: 25, cohortSlug: cohort, q: appliedQ })}`);
  const [open, setOpen] = useState<SubmissionItem | null>(null);
  const close = useCallback(() => setOpen(null), []);
  return (
    <div>
      <PageHeader title="Code submissions" subtitle="Assignments learners have submitted, newest first. The code is not in this list; open one to read it." />
      <form className="mb-4 flex flex-wrap items-end gap-3" aria-label="Filter submissions" onSubmit={(e) => { e.preventDefault(); setAppliedQ(q); }}>
        <label className={label}>Search by name or e-mail<input value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
        <label className={label}>Cohort<select value={cohort} onChange={(e) => setCohort(e.target.value)} className={`${inputClass} mt-1 font-normal`}><option value="">All</option>{cohortSlugs.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
        <button type="submit" className={ghostButtonClass}>Search</button>
      </form>
      <ErrorNote failure={list.failure} />
      {list.loading && !list.items.length ? <Spinner /> : (
        <DataTable rows={list.items} rowKey={(s) => s.id} empty="No submissions match."
          columns={[
            { header: 'Learner', cell: (s) => <span>{s.name}<span className="block text-xs text-stone-500">{s.email ?? s.userId}</span></span> },
            { header: 'Lesson', cell: (s) => <span className="line-clamp-2 max-w-xs">{s.lessonTitle}</span> },
            { header: 'Cohort', cell: (s) => <span className="font-mono text-xs">{s.cohortSlug}</span> },
            { header: 'Submitted', cell: (s) => submittedText(s.completedAt) },
            { header: 'Size', cell: (s) => codeSizeText(s.codeLength) },
            { header: '', cell: (s) => <button type="button" className="text-xs font-semibold text-amber-400 hover:text-amber-300" aria-label={`View code: ${s.lessonTitle} by ${s.name}`} onClick={() => setOpen(s)}>View code</button> },
          ]} />
      )}
      {list.hasMore && <div className="mt-4 text-center"><button type="button" disabled={list.loading} className={ghostButtonClass} onClick={() => void list.loadMore()}>{list.loading ? 'Loading…' : 'Load more'}</button></div>}
      {open && <CodeDialog submission={open} onClose={close} />}
    </div>
  );
}
