'use client';
import { useState } from 'react';
import { adminFetch } from '../useAdminApi';
import { ConfirmDialog, DataTable, ErrorNote, buttonClass, ghostButtonClass } from '../ui';
import type { Failure } from '@/lib/adminUi/client';

type Item = { cohort: string; action: 'create' | 'unchanged' | 'differs' | 'overwrite'; applied: boolean; counts: { modules: number; lessons: number }; existing?: { modules: number; lessons: number }; dropped?: string[] };
type Result = { dryRun: boolean; results: Item[] };

const ACTION_TEXT: Record<Item['action'], string> = {
  create: 'Will be created', unchanged: 'Already the same', differs: 'Differs from the files (skipped unless you overwrite)', overwrite: 'Will replace the existing curriculum',
};

// Owner only (the API refuses keys). A check changes nothing; applying asks first, and replacing an existing curriculum asks with a stronger warning.
export default function ImportPanel({ onApplied }: { onApplied: () => void }) {
  const [overwrite, setOverwrite] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function run(apply: boolean) {
    setBusy(true); setFailure(null);
    const r = await adminFetch<Result>('/import/curriculum', { method: 'POST', body: { apply, overwrite } });
    setBusy(false); setConfirm(false);
    if (r.ok) { setResult(r.data); if (apply) onApplied(); } else setFailure(r.failure);
  }
  const wouldChange = result?.results.some((i) => i.action === 'create' || i.action === 'overwrite') ?? false;
  return (
    <section aria-labelledby="import-title" className="mt-10 rounded-xl border border-white/10 p-4">
      <h2 id="import-title" className="text-lg font-bold text-white">Copy from the data files</h2>
      <p className="mt-1 text-sm text-stone-400">One-off helper that copies the curricula in <span className="font-mono">data/learning-content.ts</span> into the editor. Always check first: a check writes nothing.</p>
      <label className="mt-3 flex items-center gap-2 text-sm text-stone-300"><input type="checkbox" checked={overwrite} onChange={(e) => { setOverwrite(e.target.checked); setResult(null); }} />Also replace a curriculum that already exists and differs</label>
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={busy} className={ghostButtonClass} onClick={() => void run(false)}>{busy && !confirm ? 'Checking…' : 'Check (changes nothing)'}</button>
        <button type="button" disabled={busy || !result?.dryRun || !wouldChange} className={buttonClass} onClick={() => setConfirm(true)}>Apply what the check showed</button>
      </div>
      <div className="mt-3"><ErrorNote failure={failure} /></div>
      {result && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-white">{result.dryRun ? 'Check result (nothing was written)' : 'Applied'}</p>
          <DataTable rows={result.results} rowKey={(i) => i.cohort} empty="Nothing to import."
            columns={[
              { header: 'Cohort', cell: (i) => <span className="font-mono text-xs">{i.cohort}</span> },
              { header: 'Result', cell: (i) => (result.dryRun ? ACTION_TEXT[i.action] : i.applied ? 'Written' : ACTION_TEXT[i.action]) },
              { header: 'Files', cell: (i) => `${i.counts.modules} modules, ${i.counts.lessons} lessons` },
              { header: 'Existing', cell: (i) => (i.existing ? `${i.existing.modules} modules, ${i.existing.lessons} lessons` : '—') },
              { header: 'Left out', cell: (i) => (i.dropped?.length ? <ul className="list-disc pl-4 text-xs text-amber-200">{i.dropped.map((d) => <li key={d}>{d}</li>)}</ul> : '—') },
            ]} />
        </div>
      )}
      {confirm && <ConfirmDialog busy={busy} danger={overwrite} title={overwrite ? 'Apply and replace existing curricula?' : 'Apply the import?'} confirmLabel="Apply" onCancel={() => setConfirm(false)} onConfirm={() => void run(true)}
        body={<p>{overwrite ? 'Curricula that already exist and differ will be REPLACED by the data files; edits made in the editor to those cohorts are lost (the history stays in the audit log). ' : 'Missing curricula will be created; existing ones are left alone. '}Nothing is published.</p>} />}
    </section>
  );
}
