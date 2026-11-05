'use client';
import { useState } from 'react';
import { adminFetch } from './useAdminApi';
import { ConfirmDialog, ErrorNote, StatusBadge, buttonClass, ghostButtonClass } from './ui';
import { LIFECYCLE, availableActions } from '@/lib/adminUi/forms';
import type { Failure } from '@/lib/adminUi/client';

// The status badge and the life-cycle buttons of a course or cohort. Which buttons show is the server's transition table (checked by a unit test);
// the server still refuses a bad transition. Every action asks first and names the item.
export default function LifecycleBar<T>({ kind, slug, status, onChanged }: { kind: 'courses' | 'cohorts'; slug: string; status: string; onChanged: (updated: T) => void }) {
  const [pending, setPending] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  async function run() {
    if (!pending) return;
    setBusy(true); setFailure(null);
    const r = await adminFetch<T>(`/${kind}/${encodeURIComponent(slug)}/${pending}`, { method: 'POST' });
    setBusy(false); setPending(null);
    if (r.ok) onChanged(r.data); else setFailure(r.failure);
  }
  const rule = pending ? LIFECYCLE[pending] : null;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge value={status} />
        {availableActions(status).map((a) => <button key={a} type="button" className={LIFECYCLE[a].danger ? ghostButtonClass : a === 'publish' ? buttonClass : ghostButtonClass} onClick={() => setPending(a)}>{LIFECYCLE[a].label}</button>)}
      </div>
      <div className="mt-2"><ErrorNote failure={failure} /></div>
      {pending && rule && <ConfirmDialog title={`${rule.label}: ${slug}?`} danger={rule.danger} busy={busy} confirmLabel={rule.label} onCancel={() => setPending(null)} onConfirm={run} body={<p>{rule.confirm}</p>} />}
    </div>
  );
}
