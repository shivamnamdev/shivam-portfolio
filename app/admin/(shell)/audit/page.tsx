'use client';
import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '@/components/admin/useAdminApi';
import { DataTable, ErrorNote, PageHeader, Spinner, buttonClass, ghostButtonClass, inputClass } from '@/components/admin/ui';
import { queryString, timeAgo, type Failure } from '@/lib/adminUi/client';

type Entry = { id: number; at: string; actor: string; action: string; resource: string; resourceId: string; before: unknown; after: unknown };
type Page = { items: Entry[]; nextCursor: string | null };

// Read only. Filters are sent to the API (the server does the filtering); "Load more" follows the cursor. Before and after are shown as text, never as HTML.
export default function AuditPage() {
  const [filters, setFilters] = useState({ resource: '', action: '', resourceId: '' });
  const [applied, setApplied] = useState(filters);
  const [items, setItems] = useState<Entry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<number | null>(null);

  const load = useCallback(async (from: string | null, f: typeof applied) => {
    setLoading(true);
    const r = await adminFetch<Page>(`/audit${queryString({ limit: 25, cursor: from, ...f })}`);
    if (r.ok) { setItems((prev) => (from ? [...prev, ...r.data.items] : r.data.items)); setCursor(r.data.nextCursor); setFailure(null); } else setFailure(r.failure);
    setLoading(false);
  }, []);
  useEffect(() => { void load(null, applied); }, [applied, load]);
  const now = new Date();

  return (
    <div>
      <PageHeader title="Audit log" subtitle="Every change made through the admin API, newest first. Secrets are never recorded." />
      <form className="mb-4 grid gap-3 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); setApplied(filters); }}>
        {(['resource', 'action', 'resourceId'] as const).map((k) => (
          <label key={k} className="text-xs font-semibold text-stone-400">{k === 'resourceId' ? 'Item id' : k[0].toUpperCase() + k.slice(1)}
            <input className={`${inputClass} mt-1 font-normal`} value={filters[k]} maxLength={120} placeholder={k === 'resource' ? 'coupon' : k === 'action' ? 'create' : ''} onChange={(e) => setFilters({ ...filters, [k]: e.target.value })} />
          </label>
        ))}
        <div className="flex items-end gap-2">
          <button type="submit" className={buttonClass}>Filter</button>
          <button type="button" className={ghostButtonClass} onClick={() => { const empty = { resource: '', action: '', resourceId: '' }; setFilters(empty); setApplied(empty); }}>Clear</button>
        </div>
      </form>
      <ErrorNote failure={failure} />
      {loading && !items.length ? <Spinner /> : (
        <DataTable rows={items} rowKey={(r) => String(r.id)} empty="No entries match."
          columns={[
            { header: 'When', cell: (r) => <span title={r.at}>{timeAgo(r.at, now)}</span> },
            { header: 'Who', cell: (r) => <span className="break-all text-xs">{r.actor}</span> },
            { header: 'What', cell: (r) => `${r.action} ${r.resource}` },
            { header: 'Item', cell: (r) => <span className="break-all font-mono text-xs">{r.resourceId}</span> },
            { header: 'Details', cell: (r) => (
              <div>
                <button type="button" aria-expanded={open === r.id} className="text-xs font-semibold text-amber-400 hover:text-amber-300" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? 'Hide' : 'Show'}</button>
                {open === r.id && <pre className="mt-2 max-h-64 max-w-md overflow-auto whitespace-pre-wrap break-all rounded-lg bg-black/50 p-3 text-xs text-stone-300">{JSON.stringify({ before: r.before, after: r.after }, null, 2)}</pre>}
              </div>
            ) },
          ]} />
      )}
      {cursor && <div className="mt-4 text-center"><button type="button" disabled={loading} className={ghostButtonClass} onClick={() => void load(cursor, applied)}>{loading ? 'Loading…' : 'Load more'}</button></div>}
    </div>
  );
}
