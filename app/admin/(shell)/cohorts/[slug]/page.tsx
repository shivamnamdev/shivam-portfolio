'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { adminFetch, useAdminGet } from '@/components/admin/useAdminApi';
import LifecycleBar from '@/components/admin/LifecycleBar';
import PricingEditor from '@/components/admin/PricingEditor';
import { ConfirmDialog, ErrorNote, PageHeader, Spinner, buttonClass, ghostButtonClass, inputClass } from '@/components/admin/ui';
import { ifMatchHeader, type Failure } from '@/lib/adminUi/client';
import { cohortChanges, cohortToForm, freeNotice, pricingHints, type CohortForm } from '@/lib/adminUi/forms';

type Cohort = Parameters<typeof cohortToForm>[0] & { title: string; slug: string; courseSlug: string; status: string; version: number };
type Links = { whatsappLink: string; liveLink: string };

export default function CohortDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const loaded = useAdminGet<Cohort>(`/cohorts/${encodeURIComponent(slug)}`);
  const links = useAdminGet<Links>(`/cohorts/${encodeURIComponent(slug)}/links`);
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [original, setOriginal] = useState<CohortForm | null>(null);
  const [form, setForm] = useState<CohortForm | null>(null);
  const [wa, setWa] = useState('');
  const [live, setLive] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [linkFailure, setLinkFailure] = useState<Failure | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const adopt = (c: Cohort) => { setCohort(c); const f = cohortToForm(c); setOriginal(f); setForm(f); };
  useEffect(() => { if (loaded.data) adopt(loaded.data); }, [loaded.data]);
  useEffect(() => { if (links.data) { setWa(links.data.whatsappLink); setLive(links.data.liveLink); } }, [links.data]);

  const patch = async (body: Record<string, unknown>, onFail: (f: Failure) => void) => {
    if (!cohort) return false;
    const r = await adminFetch<Cohort>(`/cohorts/${encodeURIComponent(slug)}`, { method: 'PATCH', body, headers: ifMatchHeader(cohort.version) });
    if (r.ok) { adopt(r.data); return true; }
    onFail(r.failure); return false;
  };
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!original || !form) return;
    const body = cohortChanges(original, form);
    if (!Object.keys(body).length) { setFailure({ status: 400, code: 'nothing', message: 'Nothing has changed' }); return; }
    setBusy(true); setFailure(null); setSaved(null);
    if (await patch(body, setFailure)) setSaved('Saved');
    setBusy(false);
  }
  async function saveLinks(e: React.FormEvent) {
    e.preventDefault();
    if (!links.data) return;
    const body: Record<string, unknown> = {};
    if (wa !== links.data.whatsappLink) body.whatsappLink = wa.trim();
    if (live !== links.data.liveLink) body.liveLink = live.trim();
    if (!Object.keys(body).length) { setLinkFailure({ status: 400, code: 'nothing', message: 'Nothing has changed' }); return; }
    setBusy(true); setLinkFailure(null); setSaved(null);
    if (await patch(body, setLinkFailure)) { setSaved('Links saved'); void links.reload(); }
    setBusy(false);
  }
  async function enrolment(action: 'open-enrolment' | 'close-enrolment') {
    setBusy(true); setFailure(null);
    const r = await adminFetch<Cohort>(`/cohorts/${encodeURIComponent(slug)}/${action}`, { method: 'POST' });
    setBusy(false);
    if (r.ok) adopt(r.data); else setFailure(r.failure);
  }
  async function remove() {
    setBusy(true);
    const r = await adminFetch(`/cohorts/${encodeURIComponent(slug)}`, { method: 'DELETE' });
    setBusy(false); setConfirmDelete(false);
    if (r.ok) router.push('/admin/cohorts'); else setFailure(r.failure);
  }

  if (loaded.loading && !cohort) return <Spinner />;
  if (!cohort || !form) return <div><ErrorNote failure={loaded.failure} /><Link href="/admin/cohorts" className="text-sm text-amber-400">Back to cohorts</Link></div>;
  const set = <K extends keyof CohortForm>(k: K, v: CohortForm[K]) => setForm({ ...form, [k]: v });
  const stale = [failure, linkFailure].some((f) => f?.status === 409 || f?.status === 428);
  const free = freeNotice(form.pricing);
  const field = (k: 'title' | 'statusText' | 'demoOffer' | 'duration' | 'contactPhone', label: string, max: number) => (
    <label className="block text-xs font-semibold text-stone-400">{label}<input value={form[k]} maxLength={max} onChange={(e) => set(k, e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
  );
  return (
    <div>
      <p className="mb-2 text-sm"><Link href="/admin/cohorts" className="text-amber-400 hover:text-amber-300">Cohorts</Link> / <span className="font-mono text-stone-400">{cohort.slug}</span> · course <Link href={`/admin/courses/${cohort.courseSlug}`} className="font-mono text-stone-300 hover:text-white">{cohort.courseSlug}</Link></p>
      <PageHeader title={cohort.title} subtitle={`Version ${cohort.version}`} actions={<a href={`/preview/courses/${cohort.slug}`} target="_blank" rel="noreferrer" className={ghostButtonClass}>Preview as learner</a>} />
      <div className="mb-6 space-y-3">
        <LifecycleBar<Cohort> kind="cohorts" slug={slug} status={cohort.status} onChanged={adopt} />
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>Enrolment is <strong className={cohort.enrollmentClosed ? 'text-red-300' : 'text-emerald-300'}>{cohort.enrollmentClosed ? 'closed' : 'open'}</strong></span>
          <button type="button" disabled={busy} className={ghostButtonClass} onClick={() => void enrolment(cohort.enrollmentClosed ? 'open-enrolment' : 'close-enrolment')}>{cohort.enrollmentClosed ? 'Open enrolment' : 'Close enrolment'}</button>
        </div>
      </div>

      <form onSubmit={save} className="space-y-4" aria-label="Edit cohort">
        <div className="grid gap-4 md:grid-cols-2">
          {field('title', 'Title', 200)}{field('statusText', 'Status text shown on the page (for example “Open”)', 100)}
          {field('demoOffer', 'Demo offer text', 100)}{field('duration', 'Duration (for example “8 weeks”)', 100)}
          {field('contactPhone', 'Contact phone', 20)}
          <div className="flex items-end gap-6 pb-2 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={form.listed} onChange={(e) => set('listed', e.target.checked)} />Listed on the courses page</label></div>
          <label className="block text-xs font-semibold text-stone-400">Starts<input type="datetime-local" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
          <label className="block text-xs font-semibold text-stone-400">Ends<input type="datetime-local" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
        </div>
        <p className="text-xs text-stone-500">Text and date boxes cannot be emptied here: a cleared box keeps its saved value.</p>
        <PricingEditor value={form.pricing} onChange={(p) => set('pricing', p)} />
        {free && <p role="status" className="text-sm text-amber-300">{free}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy || !form.title.trim() || pricingHints(form.pricing).length > 0} className={buttonClass}>{busy ? 'Saving…' : 'Save changes'}</button>
          {saved && <span role="status" className="text-sm text-emerald-300">{saved}</span>}
          {stale && <button type="button" className={ghostButtonClass} onClick={() => { setFailure(null); setLinkFailure(null); void loaded.reload(); }}>Reload the latest version</button>}
        </div>
        <ErrorNote failure={failure} />
      </form>

      <form onSubmit={saveLinks} className="mt-10 space-y-3 rounded-xl border border-white/10 p-4" aria-label="Private links">
        <h2 className="text-lg font-bold text-white">Private links</h2>
        <p className="text-xs text-stone-500">Shown only to enrolled learners (later phase). https links only; leave empty to remove a link.</p>
        {links.loading && !links.data ? <Spinner /> : (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-xs font-semibold text-stone-400">WhatsApp group link<input value={wa} onChange={(e) => setWa(e.target.value)} placeholder="https://chat.whatsapp.com/..." className={`${inputClass} mt-1 font-normal`} /></label>
            <label className="block text-xs font-semibold text-stone-400">Live class link<input value={live} onChange={(e) => setLive(e.target.value)} placeholder="https://meet.google.com/..." className={`${inputClass} mt-1 font-normal`} /></label>
          </div>
        )}
        <button type="submit" disabled={busy || !links.data} className={buttonClass}>Save links</button>
        <ErrorNote failure={linkFailure ?? links.failure} />
      </form>

      <section className="mt-10 border-t border-white/10 pt-6">
        <button type="button" className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10" onClick={() => setConfirmDelete(true)}>Delete cohort</button>
      </section>
      {confirmDelete && <ConfirmDialog title={`Delete “${cohort.title}”?`} danger busy={busy} confirmLabel="Delete cohort" onCancel={() => setConfirmDelete(false)} onConfirm={remove}
        body={<p>This cannot be undone. The server refuses while learners are enrolled; close enrolment or archive the cohort instead.</p>} />}
    </div>
  );
}
