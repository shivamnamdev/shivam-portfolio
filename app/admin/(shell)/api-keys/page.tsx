'use client';
import { useState } from 'react';
import { adminFetch, useAdminGet } from '@/components/admin/useAdminApi';
import { ConfirmDialog, DataTable, ErrorNote, PageHeader, Spinner, StatusBadge, buttonClass, ghostButtonClass, inputClass } from '@/components/admin/ui';
import { timeAgo, type Failure } from '@/lib/adminUi/client';

type Key = { id: string; name: string; level: 'admin' | 'staff'; createdBy: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null };
type Created = Key & { token: string };

// Owner only (the API refuses keys here). The token is shown once, in this page's memory only, and is gone as soon as it is dismissed.
export default function ApiKeysPage() {
  const keys = useAdminGet<{ items: Key[] }>('/api-keys');
  const [name, setName] = useState('');
  const [level, setLevel] = useState<'admin' | 'staff'>('staff');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);
  const [toRevoke, setToRevoke] = useState<Key | null>(null);
  const now = new Date();

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setFailure(null);
    const r = await adminFetch<Created>('/api-keys', { method: 'POST', body: { name: name.trim(), level } });
    setBusy(false);
    if (!r.ok) { setFailure(r.failure); return; }
    setCreated(r.data); setCopied(false); setName('');
    void keys.reload();
  }
  async function revoke() {
    if (!toRevoke) return;
    setBusy(true); setFailure(null);
    const r = await adminFetch(`/api-keys/${encodeURIComponent(toRevoke.id)}`, { method: 'DELETE' });
    setBusy(false); setToRevoke(null);
    if (!r.ok) { setFailure(r.failure); return; }
    void keys.reload();
  }
  async function copy() {
    if (!created) return;
    try { await navigator.clipboard.writeText(created.token); setCopied(true); } catch { setCopied(false); }
  }

  return (
    <div>
      <PageHeader title="API keys" subtitle="Keys let scripts call the admin API. An admin key can change content; a staff key can only read. A key can never manage keys or send e-mail." />
      {created && (
        <div role="status" className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-sm font-bold text-amber-300">Copy the token for “{created.name}” now. It is not shown again.</p>
          <code data-testid="new-token" className="mt-2 block break-all rounded-lg bg-black/60 p-3 text-xs text-white">{created.token}</code>
          <div className="mt-3 flex gap-2">
            <button type="button" className={buttonClass} onClick={copy}>{copied ? 'Copied' : 'Copy token'}</button>
            <button type="button" className={ghostButtonClass} onClick={() => setCreated(null)}>I have saved it</button>
          </div>
        </div>
      )}
      <form onSubmit={create} className="mb-6 grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-[1fr_160px_auto]">
        <label className="text-xs font-semibold text-stone-400">Name
          <input required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nightly report script" className={`${inputClass} mt-1 font-normal`} />
        </label>
        <label className="text-xs font-semibold text-stone-400">Level
          <select value={level} onChange={(e) => setLevel(e.target.value as 'admin' | 'staff')} className={`${inputClass} mt-1 font-normal`}><option value="staff">staff (read only)</option><option value="admin">admin (can change)</option></select>
        </label>
        <div className="flex items-end"><button type="submit" disabled={busy || !name.trim()} className={buttonClass}>Create key</button></div>
      </form>
      <div className="mb-4 space-y-2"><ErrorNote failure={failure} /><ErrorNote failure={keys.failure} /></div>
      {keys.loading && !keys.data ? <Spinner /> : (
        <DataTable rows={keys.data?.items ?? []} rowKey={(k) => k.id} empty="No API keys yet."
          columns={[
            { header: 'Name', cell: (k) => <span className="font-semibold text-white">{k.name}</span> },
            { header: 'Level', cell: (k) => <StatusBadge value={k.level} /> },
            { header: 'State', cell: (k) => <StatusBadge value={k.revokedAt ? 'revoked' : 'active'} /> },
            { header: 'Created', cell: (k) => <span title={k.createdAt}>{timeAgo(k.createdAt, now)}</span> },
            { header: 'Last used', cell: (k) => (k.lastUsedAt ? <span title={k.lastUsedAt}>{timeAgo(k.lastUsedAt, now)}</span> : 'never') },
            { header: 'Actions', cell: (k) => (k.revokedAt ? null : <button type="button" className="text-xs font-semibold text-red-400 hover:text-red-300" onClick={() => setToRevoke(k)}>Revoke</button>) },
          ]} />
      )}
      {toRevoke && <ConfirmDialog title={`Revoke “${toRevoke.name}”?`} danger busy={busy} confirmLabel="Revoke key" onCancel={() => setToRevoke(null)} onConfirm={revoke}
        body={<p>Anything using this key stops working immediately. This cannot be undone; create a new key if you need one again.</p>} />}
    </div>
  );
}
