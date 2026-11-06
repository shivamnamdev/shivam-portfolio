'use client';
import Link from 'next/link';
import { useState } from 'react';
import { adminFetch, useAdminGet, useAdminList } from '@/components/admin/useAdminApi';
import { DataTable, ErrorNote, PageHeader, Spinner, StatusBadge, buttonClass, ghostButtonClass, inputClass } from '@/components/admin/ui';
import { CHANNELS_BY_TYPE, NOTIFICATION_TYPES, TARGET_LABEL, emailAllowed, emailState, emptyNotificationForm, notificationBody, notificationProblems, targetText, withType, type NotificationForm, type NotificationView, type TargetKind } from '@/lib/adminUi/engagement';
import { queryString, type Failure } from '@/lib/adminUi/client';

const label = 'text-xs font-semibold text-stone-400';
export default function NotificationsPage() {
  const cohorts = useAdminGet<{ items: Array<{ slug: string; title: string }> }>('/cohorts?limit=100');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const list = useAdminList<NotificationView>(`/notifications${queryString({ limit: 25, status, q: appliedQ })}`);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NotificationForm>(emptyNotificationForm);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [created, setCreated] = useState<NotificationView | null>(null);
  const problems = notificationProblems(form, new Date());
  const set = <K extends keyof NotificationForm>(k: K, v: NotificationForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const targetKinds = (Object.keys(TARGET_LABEL) as TargetKind[]).filter((k) => (form.type === 'admin-alert') === (k === 'admins'));

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setFailure(null); setCreated(null);
    const r = await adminFetch<NotificationView>('/notifications', { method: 'POST', body: notificationBody(form) });
    setBusy(false);
    if (r.ok) { setCreated(r.data); setForm(emptyNotificationForm()); void list.reload(); } else setFailure(r.failure);
  }

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Messages in the learners' inbox. Creating one never sends e-mail; an e-mail goes out only when you send it from the notification's page." actions={
        <button type="button" className={open ? buttonClass : ghostButtonClass} aria-expanded={open} onClick={() => { setOpen(!open); setFailure(null); setCreated(null); }}>New notification</button>} />
      {created && <p role="status" className="mb-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">Created <Link href={`/admin/notifications/${created.id}`} className="font-semibold underline">{created.title}</Link>{created.channels.includes('email') ? '. Open it to send the e-mail.' : '.'}</p>}
      {open && (
        <form onSubmit={create} aria-label="New notification" className="mb-6 space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className={label}>Type<select value={form.type} onChange={(e) => setForm((f) => withType(f, e.target.value as NotificationForm['type']))} className={`${inputClass} mt-1 font-normal`}>{NOTIFICATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
            <label className={label}>Who gets it
              <select value={form.targetKind} onChange={(e) => setForm((f) => ({ ...f, targetKind: e.target.value as TargetKind, targetValue: '' }))} className={`${inputClass} mt-1 font-normal`}>{targetKinds.map((k) => <option key={k} value={k}>{TARGET_LABEL[k]}</option>)}</select></label>
          </div>
          {form.targetKind === 'cohort' && <label className={`block max-w-md ${label}`}>Cohort<select value={form.targetValue} onChange={(e) => set('targetValue', e.target.value)} className={`${inputClass} mt-1 font-normal`}><option value="">Choose a cohort</option>{(cohorts.data?.items ?? []).map((c) => <option key={c.slug} value={c.slug}>{c.title} ({c.slug})</option>)}</select></label>}
          {form.targetKind === 'plan' && <label className={`block max-w-md ${label}`}>Plan id<input value={form.targetValue} onChange={(e) => set('targetValue', e.target.value)} className={`${inputClass} mt-1 font-mono font-normal`} /></label>}
          {form.targetKind === 'user' && <label className={`block max-w-md ${label}`}>Learner's user id (user_...)<input value={form.targetValue} onChange={(e) => set('targetValue', e.target.value)} className={`${inputClass} mt-1 font-mono font-normal`} /></label>}
          <label className={`block ${label}`}>Title (also the e-mail subject; up to 120 characters)<input value={form.title} maxLength={130} onChange={(e) => set('title', e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
          <label className={`block ${label}`}>Message (plain text; a blank line starts a paragraph; **bold** and [label](https://link) work)<textarea rows={5} value={form.body} onChange={(e) => set('body', e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
          <label className={`block max-w-md ${label}`}>Link (optional; https, or a path such as /courses)<input value={form.link} onChange={(e) => set('link', e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className={label}>Show from (empty = now)<input type="datetime-local" value={form.publishAt} onChange={(e) => set('publishAt', e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
            <label className={label}>Hide after (optional)<input type="datetime-local" value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
          </div>
          <label className={`flex items-center gap-2 text-sm ${emailAllowed(form.type) ? 'text-stone-300' : 'text-stone-500'}`}>
            <input type="checkbox" checked={form.email} disabled={!emailAllowed(form.type)} onChange={(e) => set('email', e.target.checked)} /> Also allow an e-mail (you still send it yourself afterwards)
          </label>
          {!emailAllowed(form.type) && <p className="text-xs text-stone-500">A {form.type} notification appears in the inbox only ({CHANNELS_BY_TYPE[form.type].join(', ')}).</p>}
          {problems.length > 0 && form.title && <ul role="alert" className="list-disc rounded-lg bg-amber-500/10 p-3 pl-7 text-xs text-amber-200">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
          <ErrorNote failure={failure} />
          <button type="submit" disabled={busy || problems.length > 0} className={buttonClass}>{busy ? 'Creating…' : 'Create notification'}</button>
        </form>
      )}
      <form className="mb-4 flex flex-wrap items-end gap-3" aria-label="Filter notifications" onSubmit={(e) => { e.preventDefault(); setAppliedQ(q); }}>
        <label className={label}>Search by title<input value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
        <label className={label}>Status<select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputClass} mt-1 font-normal`}><option value="">All</option>{['scheduled', 'live', 'expired'].map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
        <button type="submit" className={ghostButtonClass}>Search</button>
      </form>
      <ErrorNote failure={list.failure} />
      {list.loading && !list.items.length ? <Spinner /> : (
        <DataTable rows={list.items} rowKey={(n) => n.id} empty="No notifications match."
          columns={[
            { header: 'Title', cell: (n) => <Link href={`/admin/notifications/${n.id}`} className="font-semibold text-amber-400 hover:text-amber-300">{n.title}</Link> },
            { header: 'Type', cell: (n) => n.type },
            { header: 'Status', cell: (n) => <StatusBadge value={n.status} /> },
            { header: 'Who', cell: (n) => targetText(n.target) },
            { header: 'E-mail', cell: (n) => emailState(n) },
            { header: 'Shown from', cell: (n) => <span title={n.publishAt}>{n.publishAt.slice(0, 10)}</span> },
          ]} />
      )}
      {list.hasMore && <div className="mt-4 text-center"><button type="button" disabled={list.loading} className={ghostButtonClass} onClick={() => void list.loadMore()}>{list.loading ? 'Loading…' : 'Load more'}</button></div>}
    </div>
  );
}
