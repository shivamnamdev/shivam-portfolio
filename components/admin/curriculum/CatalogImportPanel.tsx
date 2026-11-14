'use client';
import { useState } from 'react';
import { adminFetch } from '../useAdminApi';
import { ConfirmDialog, DataTable, ErrorNote, buttonClass, ghostButtonClass } from '../ui';
import { catalogActionText, catalogWouldChange, type CatalogAction } from '@/lib/adminUi/curriculum';
import type { Failure } from '@/lib/adminUi/client';

type Item = { slug: string; course: CatalogAction; cohort: CatalogAction; applied: boolean; notes: string[] };
type Result = { dryRun: boolean; results: Item[] };

// Owner only (the API refuses keys). A check changes nothing; applying asks first. Never shows a private link, only whether one is set.
export default function CatalogImportPanel({ onApplied }: { onApplied: () => void }) {
  const [overwrite, setOverwrite] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function run(apply: boolean) {
    setBusy(true); setFailure(null);
    const r = await adminFetch<Result>('/import/catalog', { method: 'POST', body: { apply, overwrite } });
    setBusy(false); setConfirm(false);
    if (r.ok) { setResult(r.data); if (apply) onApplied(); } else setFailure(r.failure);
  }
  const wouldChange = result ? catalogWouldChange(result.results) : false;
  return (
    <section aria-labelledby="catalog-import-title" className="mt-10 rounded-xl border border-white/10 p-4">
      <h2 id="catalog-import-title" className="text-lg font-bold text-white">Courses and cohorts from the data files</h2>
      <p className="mt-1 text-sm text-stone-400">One-off helper that creates a published course and cohort for each course sold in <span className="font-mono">data/courses.ts</span>, so they can be managed here. Run it before “Copy from the data files”. Always check first: a check writes nothing.</p>
      <label className="mt-3 flex items-center gap-2 text-sm text-stone-300"><input type="checkbox" checked={overwrite} onChange={(e) => { setOverwrite(e.target.checked); setResult(null); }} />Also replace a course or cohort that was edited here</label>
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={busy} className={ghostButtonClass} onClick={() => void run(false)}>{busy && !confirm ? 'Checking…' : 'Check courses (changes nothing)'}</button>
        <button type="button" disabled={busy || !result?.dryRun || !wouldChange} className={buttonClass} onClick={() => setConfirm(true)}>Apply what the course check showed</button>
      </div>
      <div className="mt-3"><ErrorNote failure={failure} /></div>
      {result && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-white">{result.dryRun ? 'Course check result (nothing was written)' : 'Courses applied'}</p>
          <DataTable rows={result.results} rowKey={(i) => i.slug} empty="Nothing to import."
            columns={[
              { header: 'Course', cell: (i) => <span className="font-mono text-xs">{i.slug}</span> },
              { header: 'Course page', cell: (i) => catalogActionText(i.course, result.dryRun, i.applied) },
              { header: 'Cohort', cell: (i) => catalogActionText(i.cohort, result.dryRun, i.applied) },
              { header: 'Notes', cell: (i) => (i.notes.length ? <ul className="list-disc pl-4 text-xs text-amber-200">{i.notes.map((n) => <li key={n}>{n}</li>)}</ul> : '—') },
            ]} />
        </div>
      )}
      {confirm && <ConfirmDialog busy={busy} danger={overwrite} title={overwrite ? 'Apply and replace edited courses?' : 'Create the courses and cohorts?'} confirmLabel="Apply" onCancel={() => setConfirm(false)} onConfirm={() => void run(true)}
        body={<p>{overwrite ? 'Courses and cohorts that were edited here will be REPLACED by the data files (the history stays in the audit log). ' : 'Missing courses and cohorts are created and published; existing ones are left alone. '}They become visible to learners only when PORTAL_CATALOG is set to database.</p>} />}
    </section>
  );
}
