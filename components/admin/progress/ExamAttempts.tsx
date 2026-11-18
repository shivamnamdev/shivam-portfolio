'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { adminFetch, useAdminList } from '@/components/admin/useAdminApi';
import { useCohortSlugs } from '@/components/admin/useCohortSlugs';
import { DataTable, ErrorNote, Spinner, buttonClass, ghostButtonClass, inputClass } from '@/components/admin/ui';
import { attemptResultText, codeSizeText, learnerLine, mailText, submittedText, type ExamAttemptItem, type ExamAttemptNote } from '@/lib/adminUi/progressView';
import { queryString, type Failure } from '@/lib/adminUi/client';

type Detail = ExamAttemptItem & { code: string; notes: ExamAttemptNote[]; notesText: string; passMark: number };
const label = 'text-xs font-semibold text-stone-400';

// One exam attempt: the score, the improvement note and the code the learner submitted. The code and the notes are fetched only now and drawn as text.
function AttemptDialog({ attempt, onClose }: { attempt: ExamAttemptItem; onClose: () => void }) {
  const [data, setData] = useState<Detail | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [copied, setCopied] = useState(false);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let live = true;
    void adminFetch<Detail>(`/exam-attempts/${encodeURIComponent(attempt.id)}`).then((r) => { if (!live) return; if (r.ok) setData(r.data); else setFailure(r.failure); });
    return () => { live = false; };
  }, [attempt.id]);
  useEffect(() => {
    close.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  async function copy() { if (!data) return; try { await navigator.clipboard.writeText(data.code); setCopied(true); } catch { setCopied(false); } }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="attempt-title" className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-white/10 bg-[#111] p-6 shadow-2xl">
        <h2 id="attempt-title" className="text-lg font-bold text-white">Exam attempt {attempt.attemptNo}: {attempt.score}% <span className={attempt.passed ? 'text-emerald-400' : 'text-red-400'}>({attemptResultText(attempt)})</span></h2>
        <p className="mt-1 text-xs text-stone-400">{learnerLine(attempt)} · {attempt.cohortSlug} · {submittedText(attempt.createdAt)} · {codeSizeText(attempt.codeLength)}</p>
        <p className="mt-1 text-xs text-stone-500">{mailText(attempt)}</p>
        <div className="mt-4 min-h-0 flex-1 space-y-5 overflow-auto">
          {!data && !failure && <Spinner label="Loading the attempt" />}
          <ErrorNote failure={failure} />
          {data && (<>
            <section aria-labelledby="attempt-notes">
              <h3 id="attempt-notes" className="text-xs font-bold uppercase tracking-widest text-amber-400">Improvement note</h3>
              {data.notes.length === 0 ? <p className="mt-2 text-sm text-stone-400">No per-question notes were saved.</p> : (
                <ul className="mt-2 space-y-2">
                  {data.notes.map((n) => <li key={n.q} data-testid={`attempt-note-${n.q}`} className={`rounded-lg border p-3 text-sm ${n.passed ? 'border-emerald-900 text-emerald-100' : 'border-red-900 text-red-100'}`}><strong>{n.passed ? 'OK' : 'Improve'} · {n.label}</strong><span className="mt-1 block text-stone-300">{n.note}</span></li>)}
                </ul>
              )}
            </section>
            <section aria-labelledby="attempt-code">
              <h3 id="attempt-code" className="text-xs font-bold uppercase tracking-widest text-stone-400">Submitted code</h3>
              {data.code ? <pre data-testid="attempt-code" tabIndex={0} className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-black/60 p-4 font-mono text-xs text-stone-100">{data.code}</pre> : <p className="mt-2 text-sm text-stone-400">This attempt has no code.</p>}
            </section>
          </>)}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          {data?.code && <button type="button" className={ghostButtonClass} onClick={() => void copy()}>{copied ? 'Copied' : 'Copy code'}</button>}
          <button ref={close} type="button" className={buttonClass} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function ExamAttempts() {
  const { slugs: cohortSlugs } = useCohortSlugs();
  const [cohort, setCohort] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const list = useAdminList<ExamAttemptItem>(`/exam-attempts${queryString({ limit: 25, cohortSlug: cohort, status, q: appliedQ })}`);
  const [open, setOpen] = useState<ExamAttemptItem | null>(null);
  const close = useCallback(() => setOpen(null), []);
  return (
    <div>
      <p className="mb-4 text-sm text-stone-400">Every exam submission, newest first. Open one to read the improvement note and the code. The learner and you are also e-mailed after each attempt.</p>
      <form className="mb-4 flex flex-wrap items-end gap-3" aria-label="Filter exam attempts" onSubmit={(e) => { e.preventDefault(); setAppliedQ(q); }}>
        <label className={label}>Search by name or e-mail<input value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
        <label className={label}>Cohort<select value={cohort} onChange={(e) => setCohort(e.target.value)} className={`${inputClass} mt-1 font-normal`}><option value="">All</option>{cohortSlugs.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
        <label className={label}>Result<select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputClass} mt-1 font-normal`}><option value="">All</option><option value="passed">Passed</option><option value="failed">Not passed</option></select></label>
        <button type="submit" className={ghostButtonClass}>Search</button>
      </form>
      <ErrorNote failure={list.failure} />
      {list.loading && !list.items.length ? <Spinner /> : (
        <DataTable rows={list.items} rowKey={(a) => a.id} empty="No exam attempts yet."
          columns={[
            { header: 'Learner', cell: (a) => <span>{a.name}<span className="block text-xs text-stone-500">{a.email ?? a.userId}</span></span> },
            { header: 'Cohort', cell: (a) => <span className="font-mono text-xs">{a.cohortSlug}</span> },
            { header: 'Attempt', cell: (a) => `#${a.attemptNo}` },
            { header: 'Score', cell: (a) => <span className={a.passed ? 'font-bold text-emerald-400' : 'font-bold text-red-400'}>{a.score}% · {attemptResultText(a)}</span> },
            { header: 'Submitted', cell: (a) => submittedText(a.createdAt) },
            { header: 'E-mails', cell: (a) => <span className="text-xs text-stone-400">{mailText(a)}</span> },
            { header: '', cell: (a) => <button type="button" className="text-xs font-semibold text-amber-400 hover:text-amber-300" aria-label={`View attempt ${a.attemptNo} by ${a.name}`} onClick={() => setOpen(a)}>View</button> },
          ]} />
      )}
      {list.hasMore && <div className="mt-4 text-center"><button type="button" disabled={list.loading} className={ghostButtonClass} onClick={() => void list.loadMore()}>{list.loading ? 'Loading…' : 'Load more'}</button></div>}
      {open && <AttemptDialog attempt={open} onClose={close} />}
    </div>
  );
}
