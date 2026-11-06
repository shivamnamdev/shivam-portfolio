'use client';
import { useState } from 'react';
import { adminDownload, adminFetch, useAdminGet, useAdminList } from '@/components/admin/useAdminApi';
import { useCohortSlugs } from '@/components/admin/useCohortSlugs';
import { LearnerPicker } from '@/components/admin/coupons/fields';
import { ConfirmDialog, DataTable, ErrorNote, PageHeader, Spinner, buttonClass, ghostButtonClass, inputClass } from '@/components/admin/ui';
import { emptyGrantForm, exportFilename, grantBody, grantProblems, needsForce, revokePath, type ExportFile, type GrantForm, type PlanLite } from '@/lib/adminUi/people';
import { queryString, type Failure } from '@/lib/adminUi/client';
import type { Pricing } from '@/lib/adminUi/forms';

type Enrolment = { id: string; userId: string; email: string | null; name: string; cohortSlug: string; planId: string | null; couponUsed: string | null; enrolledAt: string };
type CohortLite = { slug: string; title: string; pricing?: Pricing };
const label = 'text-xs font-semibold text-stone-400';

export default function EnrolmentsPage() {
  const cohorts = useAdminGet<{ items: CohortLite[] }>('/cohorts?limit=100');
  const { slugs: cohortSlugs, reload: reloadSlugs } = useCohortSlugs();
  const [cohort, setCohort] = useState('');
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const list = useAdminList<Enrolment>(`/enrolments${queryString({ limit: 25, cohortSlug: cohort, q: appliedQ })}`);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<GrantForm>(emptyGrantForm);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [granted, setGranted] = useState<Enrolment | null>(null);
  const [target, setTarget] = useState<Enrolment | null>(null);       // step 1 of a removal
  const [forceFor, setForceFor] = useState<Enrolment | null>(null);   // step 2: not granted here, owner may force
  const [understood, setUnderstood] = useState(false);
  const [removeFailure, setRemoveFailure] = useState<Failure | null>(null);
  const [removed, setRemoved] = useState<string | null>(null);
  const [exporting, setExporting] = useState<ExportFile | null>(null);
  const [exportNote, setExportNote] = useState<{ text: string; failure: Failure | null } | null>(null);

  const chosen = cohorts.data?.items.find((c) => c.slug === form.cohortSlug);
  const plans: PlanLite[] | undefined = chosen?.pricing?.kind === 'plans' ? chosen.pricing.plans.map((p) => ({ id: p.id, name: p.name })) : undefined;
  const problems = grantProblems(form, plans);

  async function grant(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setFailure(null); setGranted(null);
    const r = await adminFetch<Enrolment>('/enrolments', { method: 'POST', body: grantBody(form) });
    setBusy(false);
    if (r.ok) { setGranted(r.data); setForm({ ...emptyGrantForm(), cohortSlug: form.cohortSlug }); void list.reload(); void reloadSlugs(); } else setFailure(r.failure);
  }
  async function doRemove(en: Enrolment, force: boolean) {
    setBusy(true); setRemoveFailure(null);
    const r = await adminFetch(revokePath(en.id, force), { method: 'DELETE' });
    setBusy(false);
    if (r.ok) { setTarget(null); setForceFor(null); setUnderstood(false); setRemoved(`${en.name || en.email || en.userId} was removed from ${en.cohortSlug}`); void list.reload(); void reloadSlugs(); return; }
    if (!force && needsForce(r.failure)) { setTarget(null); setForceFor(en); setUnderstood(false); return; }   // paid, coupon or older: the owner decides
    setRemoveFailure(r.failure);
  }
  async function download(file: ExportFile) {
    setExporting(file); setExportNote(null);
    const r = await adminDownload(`/exports/${file}`);
    setExporting(null);
    if (!r.ok) { setExportNote({ text: '', failure: r.failure }); return; }
    const url = URL.createObjectURL(r.blob);
    const a = document.createElement('a');
    a.href = url; a.download = exportFilename(file, new Date());
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    setExportNote({ text: `Downloaded ${a.download}${r.truncated ? ' (cut at 20,000 rows)' : ''}. The download is written to the audit log.`, failure: null });
  }
  const who = (en: Enrolment) => en.name || en.email || en.userId;

  return (
    <div>
      <PageHeader title="Enrolments" subtitle="Who has access to which cohort. Granting here is for offline payments and scholarships." actions={
        <button type="button" className={open ? buttonClass : ghostButtonClass} aria-expanded={open} onClick={() => { setOpen(!open); setFailure(null); setGranted(null); }}>Grant access</button>} />
      {granted && <p role="status" className="mb-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">{who(granted)} now has access to {granted.cohortSlug}.</p>}
      {removed && <p role="status" className="mb-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">{removed}. Their progress is kept.</p>}
      {open && (
        <form onSubmit={grant} aria-label="Grant access" className="mb-6 space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className={label}>Cohort<select value={form.cohortSlug} onChange={(e) => setForm({ ...form, cohortSlug: e.target.value, planId: '' })} className={`${inputClass} mt-1 font-normal`}>
              <option value="">Choose a cohort</option>{(cohorts.data?.items ?? []).map((c) => <option key={c.slug} value={c.slug}>{c.title} ({c.slug})</option>)}</select></label>
            <label className={label}>Learner's e-mail (they must have signed up)<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`${inputClass} mt-1 font-normal`} /></label>
          </div>
          <LearnerPicker actionLabel="Use" onPick={(email) => setForm((f) => ({ ...f, email }))} />
          {plans && <label className={`block max-w-xs ${label}`}>Plan (optional)<select value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })} className={`${inputClass} mt-1 font-normal`}><option value="">No plan recorded</option>{plans.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}</select></label>}
          {problems.length > 0 && (form.email || form.cohortSlug) && <ul role="alert" className="list-disc rounded-lg bg-amber-500/10 p-3 pl-7 text-xs text-amber-200">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
          <ErrorNote failure={failure} />
          <button type="submit" disabled={busy || problems.length > 0} className={buttonClass}>{busy ? 'Granting…' : 'Grant access'}</button>
        </form>
      )}

      <section aria-label="Export" className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="mb-1 text-sm font-bold text-white">Download as CSV</h2>
        <p className="mb-3 text-xs text-stone-500">These files hold names and e-mail addresses. Every download is written to the audit log. Open them in a spreadsheet safely: text that could run as a formula is neutralised.</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={exporting !== null} className={ghostButtonClass} onClick={() => void download('enrolments.csv')}>{exporting === 'enrolments.csv' ? 'Preparing…' : 'Download enrolments CSV'}</button>
          <button type="button" disabled={exporting !== null} className={ghostButtonClass} onClick={() => void download('learners.csv')}>{exporting === 'learners.csv' ? 'Preparing…' : 'Download learners CSV'}</button>
        </div>
        {exportNote?.text && <p role="status" className="mt-3 text-sm text-emerald-300">{exportNote.text}</p>}
        <div className="mt-2"><ErrorNote failure={exportNote?.failure ?? null} /></div>
      </section>

      <form className="mb-4 flex flex-wrap items-end gap-3" aria-label="Filter enrolments" onSubmit={(e) => { e.preventDefault(); setAppliedQ(q); }}>
        <label className={label}>Search by name or e-mail<input value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
        <label className={label}>Cohort<select value={cohort} onChange={(e) => setCohort(e.target.value)} className={`${inputClass} mt-1 font-normal`}><option value="">All</option>{cohortSlugs.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
        <button type="submit" className={ghostButtonClass}>Search</button>
      </form>
      <ErrorNote failure={list.failure} />
      {list.loading && !list.items.length ? <Spinner /> : (
        <DataTable rows={list.items} rowKey={(en) => en.id} empty="No enrolments match."
          columns={[
            { header: 'Learner', cell: (en) => <span>{en.name || '(no name)'} <span className="block text-xs text-stone-500">{en.email ?? en.userId}</span></span> },
            { header: 'Cohort', cell: (en) => <span className="font-mono text-xs">{en.cohortSlug}</span> },
            { header: 'Plan', cell: (en) => en.planId ?? '—' },
            { header: 'Coupon', cell: (en) => en.couponUsed ?? '—' },
            { header: 'Enrolled', cell: (en) => <span title={en.enrolledAt}>{en.enrolledAt.slice(0, 10)}</span> },
            { header: '', cell: (en) => <button type="button" className="text-xs font-semibold text-red-300 hover:text-red-200" aria-label={`Remove ${who(en)} from ${en.cohortSlug}`} onClick={() => { setRemoved(null); setRemoveFailure(null); setTarget(en); }}>Remove</button> },
          ]} />
      )}
      {list.hasMore && <div className="mt-4 text-center"><button type="button" disabled={list.loading} className={ghostButtonClass} onClick={() => void list.loadMore()}>{list.loading ? 'Loading…' : 'Load more'}</button></div>}

      {target && <ConfirmDialog title={`Remove ${who(target)} from ${target.cohortSlug}?`} danger busy={busy} confirmLabel="Remove access" onCancel={() => { setTarget(null); setRemoveFailure(null); }} onConfirm={() => void doRemove(target, false)}
        body={<div className="space-y-2"><p>They lose access to the cohort straight away. Their progress and submissions are kept, so granting access again restores them.</p><ErrorNote failure={removeFailure} /></div>} />}
      {forceFor && <ConfirmDialog title={`${who(forceFor)} may have paid`} danger busy={busy} confirmLabel="Remove anyway" confirmDisabled={!understood} onCancel={() => { setForceFor(null); setRemoveFailure(null); }} onConfirm={() => void doRemove(forceFor, true)}
        body={<div className="space-y-3"><p>This enrolment was not granted through the admin portal, so it may be a paid purchase or come from a coupon. Refund first if money was taken. Only the owner can remove it anyway.</p>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="mt-1" /> I understand this learner may have paid</label><ErrorNote failure={removeFailure} /></div>} />}
    </div>
  );
}
