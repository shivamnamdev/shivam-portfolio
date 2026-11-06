'use client';
import Link from 'next/link';
import { useState } from 'react';
import { adminFetch, useAdminGet, useAdminList } from '@/components/admin/useAdminApi';
import { DiscountFields, LearnerPicker, ScopeFields } from '@/components/admin/coupons/fields';
import { DataTable, ErrorNote, PageHeader, Spinner, StatusBadge, buttonClass, ghostButtonClass, inputClass } from '@/components/admin/ui';
import { addEmail, codesText, createBody, createProblems, discountText, emptyCreateForm, emptyGenerateForm, generateBody, generateProblems, newIdempotencyKey, parseEmails, type CreateForm, type Discount, type GenerateForm } from '@/lib/adminUi/coupons';
import { queryString, type Failure } from '@/lib/adminUi/client';

type Coupon = { code: string; kind: 'everyone' | 'selected' | 'single-use'; state: string; discount: Discount; expiresAt: string; redemptions: number; maxRedemptions?: number; batchId?: string };
type Batch = { batchId: string; count: number; codes: Coupon[]; repeated?: boolean };

export default function CouponsPage() {
  const cohorts = useAdminGet<{ items: Array<{ slug: string; title: string }> }>('/cohorts?limit=100');
  const [state, setState] = useState('');
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const list = useAdminList<Coupon>(`/coupons${queryString({ limit: 25, state, q: appliedQ })}`);
  const [panel, setPanel] = useState<'create' | 'generate' | null>(null);
  const [form, setForm] = useState<CreateForm>(() => emptyCreateForm(new Date()));
  const [gen, setGen] = useState<GenerateForm>(() => emptyGenerateForm(new Date()));
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [copied, setCopied] = useState(false);
  const [genKey, setGenKey] = useState(() => newIdempotencyKey(() => crypto.randomUUID()));

  const cProblems = createProblems(form, new Date());
  const gProblems = generateProblems(gen, new Date());
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setFailure(null); setCreated(null);
    const r = await adminFetch<Coupon>('/coupons', { method: 'POST', body: createBody(form) });
    setBusy(false);
    if (r.ok) { setCreated(r.data.code); setForm(emptyCreateForm(new Date())); void list.reload(); } else setFailure(r.failure);
  }
  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setFailure(null); setBatch(null);
    const r = await adminFetch<Batch>('/coupons/generate', { method: 'POST', body: generateBody(gen), headers: { 'Idempotency-Key': genKey } });
    setBusy(false);
    if (r.ok) { setBatch(r.data); setCopied(false); setGenKey(newIdempotencyKey(() => crypto.randomUUID())); void list.reload(); } else setFailure(r.failure);
  }
  async function copyCodes() { if (!batch) return; try { await navigator.clipboard.writeText(codesText(batch.codes)); setCopied(true); } catch { setCopied(false); } }
  const toggle = (p: 'create' | 'generate') => { setPanel(panel === p ? null : p); setFailure(null); setCreated(null); setBatch(null); };

  return (
    <div>
      <PageHeader title="Coupons" subtitle="Every coupon expires. Open codes work for everyone, selected-student codes only for the people you pick, one-time codes once." actions={<>
        <button type="button" className={panel === 'create' ? buttonClass : ghostButtonClass} aria-expanded={panel === 'create'} onClick={() => toggle('create')}>New coupon</button>
        <button type="button" className={panel === 'generate' ? buttonClass : ghostButtonClass} aria-expanded={panel === 'generate'} onClick={() => toggle('generate')}>Generate one-time codes</button>
      </>} />
      {created && <p role="status" className="mb-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">Created <Link href={`/admin/coupons/${created}`} className="font-mono font-bold underline">{created}</Link>.</p>}

      {panel === 'create' && (
        <form onSubmit={create} aria-label="New coupon" className="mb-6 space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs font-semibold text-stone-400">Code (4 to 40 letters, numbers, - or _)<input value={form.code} maxLength={40} onChange={(e) => setForm({ ...form, code: e.target.value })} className={`${inputClass} mt-1 font-mono font-normal uppercase`} /></label>
            <label className="text-xs font-semibold text-stone-400">Who can use it
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as CreateForm['kind'] })} className={`${inputClass} mt-1 font-normal`}><option value="everyone">Everyone</option><option value="selected">Selected students</option></select></label>
            <label className="text-xs font-semibold text-stone-400">Expires (required)<input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className={`${inputClass} mt-1 font-normal`} /></label>
          </div>
          <DiscountFields value={form.discount} onChange={(discount) => setForm({ ...form, discount })} />
          {form.kind === 'selected' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-stone-400">Student e-mails (one per line; they must have signed up)<textarea rows={4} value={form.usersText} onChange={(e) => setForm({ ...form, usersText: e.target.value })} className={`${inputClass} mt-1 font-mono text-xs font-normal`} /></label>
              <p className="text-xs text-stone-500">{parseEmails(form.usersText).emails.length} student(s) listed.</p>
              <LearnerPicker onPick={(email) => setForm((f) => ({ ...f, usersText: addEmail(f.usersText, email) }))} />
            </div>
          )}
          {form.kind === 'everyone' && <label className="block max-w-xs text-xs font-semibold text-stone-400">Most uses in total (optional)<input inputMode="numeric" value={form.maxRedemptions} onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })} className={`${inputClass} mt-1 font-normal`} /></label>}
          <ScopeFields cohorts={cohorts.data?.items ?? []} selected={form.cohortSlugs} onSelected={(cohortSlugs) => setForm({ ...form, cohortSlugs })} planIds={form.planIds} onPlanIds={(planIds) => setForm({ ...form, planIds })} />
          {cProblems.length > 0 && form.code && <ul role="alert" className="list-disc rounded-lg bg-amber-500/10 p-3 pl-7 text-xs text-amber-200">{cProblems.map((p) => <li key={p}>{p}</li>)}</ul>}
          <ErrorNote failure={failure} />
          <button type="submit" disabled={busy || cProblems.length > 0} className={buttonClass}>{busy ? 'Creating…' : 'Create coupon'}</button>
        </form>
      )}

      {panel === 'generate' && (
        <form onSubmit={generate} aria-label="Generate one-time codes" className="mb-6 space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs font-semibold text-stone-400">How many codes (1 to 200)<input inputMode="numeric" value={gen.count} onChange={(e) => setGen({ ...gen, count: e.target.value })} className={`${inputClass} mt-1 font-normal`} /></label>
            <label className="text-xs font-semibold text-stone-400">Expires (required)<input type="datetime-local" value={gen.expiresAt} onChange={(e) => setGen({ ...gen, expiresAt: e.target.value })} className={`${inputClass} mt-1 font-normal`} /></label>
          </div>
          <DiscountFields value={gen.discount} onChange={(discount) => setGen({ ...gen, discount })} />
          <ScopeFields cohorts={cohorts.data?.items ?? []} selected={gen.cohortSlugs} onSelected={(cohortSlugs) => setGen({ ...gen, cohortSlugs })} planIds={gen.planIds} onPlanIds={(planIds) => setGen({ ...gen, planIds })} />
          {gProblems.length > 0 && gen.discount.percent + gen.discount.inr + gen.discount.usd !== '' && <ul role="alert" className="list-disc rounded-lg bg-amber-500/10 p-3 pl-7 text-xs text-amber-200">{gProblems.map((p) => <li key={p}>{p}</li>)}</ul>}
          <ErrorNote failure={failure} />
          <button type="submit" disabled={busy || gProblems.length > 0} className={buttonClass}>{busy ? 'Generating…' : 'Generate codes'}</button>
          {batch && (
            <div role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
              <p className="text-sm font-semibold text-emerald-300">{batch.repeated ? 'Same batch returned (a repeat of the last request)' : `Generated ${batch.count} codes`}. Copy them now; each works once.</p>
              <pre data-testid="generated-codes" className="mt-2 max-h-48 overflow-auto rounded bg-black/50 p-2 font-mono text-xs text-white">{codesText(batch.codes)}</pre>
              <button type="button" className={`${ghostButtonClass} mt-2`} onClick={() => void copyCodes()}>{copied ? 'Copied' : 'Copy all codes'}</button>
            </div>
          )}
        </form>
      )}

      <form className="mb-4 flex flex-wrap items-end gap-3" aria-label="Filter coupons" onSubmit={(e) => { e.preventDefault(); setAppliedQ(q); }}>
        <label className="text-xs font-semibold text-stone-400">Search by code<input value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
        <label className="text-xs font-semibold text-stone-400">State
          <select value={state} onChange={(e) => setState(e.target.value)} className={`${inputClass} mt-1 font-normal`}><option value="">All</option>{['active', 'inactive', 'expired', 'unused', 'reserved', 'redeemed', 'voided'].map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
        <button type="submit" className={ghostButtonClass}>Search</button>
      </form>
      <ErrorNote failure={list.failure} />
      {list.loading && !list.items.length ? <Spinner /> : (
        <DataTable rows={list.items} rowKey={(c) => c.code} empty="No coupons match."
          columns={[
            { header: 'Code', cell: (c) => <Link href={`/admin/coupons/${c.code}`} className="font-mono font-semibold text-amber-400 hover:text-amber-300">{c.code}</Link> },
            { header: 'Kind', cell: (c) => <StatusBadge value={c.kind} /> },
            { header: 'State', cell: (c) => <StatusBadge value={c.state} /> },
            { header: 'Discount', cell: (c) => discountText(c.discount) },
            { header: 'Expires', cell: (c) => <span title={c.expiresAt}>{c.expiresAt.slice(0, 10)}</span> },
            { header: 'Used', cell: (c) => (c.maxRedemptions ? `${c.redemptions} of ${c.maxRedemptions}` : String(c.redemptions)) },
          ]} />
      )}
      {list.hasMore && <div className="mt-4 text-center"><button type="button" disabled={list.loading} className={ghostButtonClass} onClick={() => void list.loadMore()}>{list.loading ? 'Loading…' : 'Load more'}</button></div>}
      <p className="mt-6 text-xs text-stone-500">The four older codes in the data files are not shown here; they keep working in the learner portal until phase 5 switches it to these coupons.</p>
    </div>
  );
}
