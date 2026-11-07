'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { adminFetch, useAdminGet } from '@/components/admin/useAdminApi';
import LifecycleBar from '@/components/admin/LifecycleBar';
import { ConfirmDialog, DataTable, ErrorNote, PageHeader, Spinner, StatusBadge, buttonClass, ghostButtonClass, inputClass } from '@/components/admin/ui';
import { ifMatchHeader, type Failure } from '@/lib/adminUi/client';
import { isSlug, parsePitch, pitchText, slugify } from '@/lib/adminUi/forms';

type Course = { slug: string; title: string; summary?: string; pitch?: Record<string, unknown>; status: string; version: number };
type Cohort = { slug: string; title: string; status: string; enrollmentClosed?: boolean };

export default function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const loaded = useAdminGet<Course>(`/courses/${encodeURIComponent(slug)}`);
  const cohorts = useAdminGet<{ items: Cohort[] }>(`/cohorts?courseSlug=${encodeURIComponent(slug)}&limit=100`);
  const [course, setCourse] = useState<Course | null>(null);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [pitch, setPitch] = useState('{}');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [saved, setSaved] = useState(false);
  const [dialog, setDialog] = useState<'delete' | 'duplicate' | null>(null);
  const [dup, setDup] = useState({ title: '', slug: '' });

  const adopt = (c: Course) => { setCourse(c); setTitle(c.title); setSummary(c.summary ?? ''); setPitch(pitchText(c.pitch)); };
  useEffect(() => { if (loaded.data) adopt(loaded.data); }, [loaded.data]);

  const pitchCheck = parsePitch(pitch);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!course || !pitchCheck.ok) return;
    const body: Record<string, unknown> = {};
    if (title.trim() !== course.title && title.trim()) body.title = title.trim();
    if (summary.trim() !== (course.summary ?? '') && summary.trim()) body.summary = summary.trim();
    if (JSON.stringify(pitchCheck.value) !== JSON.stringify(course.pitch ?? {})) body.pitch = pitchCheck.value;
    if (!Object.keys(body).length) { setFailure({ status: 400, code: 'nothing', message: 'Nothing has changed' }); return; }
    setBusy(true); setFailure(null); setSaved(false);
    const r = await adminFetch<Course>(`/courses/${encodeURIComponent(slug)}`, { method: 'PATCH', body, headers: ifMatchHeader(course.version) });
    setBusy(false);
    if (r.ok) { adopt(r.data); setSaved(true); } else setFailure(r.failure);
  }
  async function remove() {
    setBusy(true);
    const r = await adminFetch(`/courses/${encodeURIComponent(slug)}`, { method: 'DELETE' });
    setBusy(false); setDialog(null);
    if (r.ok) router.push('/admin/courses'); else setFailure(r.failure);
  }
  async function duplicate() {
    setBusy(true);
    const r = await adminFetch<Course>(`/courses/${encodeURIComponent(slug)}/duplicate`, { method: 'POST', body: { slug: dup.slug, ...(dup.title.trim() ? { title: dup.title.trim() } : {}) } });
    setBusy(false);
    if (r.ok) router.push(`/admin/courses/${r.data.slug}`); else { setFailure(r.failure); setDialog(null); }
  }

  if (loaded.loading && !course) return <Spinner />;
  if (!course) return <div><ErrorNote failure={loaded.failure} /><Link href="/admin/courses" className="text-sm text-amber-400">Back to courses</Link></div>;
  const stale = failure?.status === 409 || failure?.status === 428;
  return (
    <div>
      <p className="mb-2 text-sm"><Link href="/admin/courses" className="text-amber-400 hover:text-amber-300">Courses</Link> / <span className="font-mono text-stone-400">{course.slug}</span></p>
      <PageHeader title={course.title} subtitle={`Version ${course.version}`} actions={<a href="/preview/courses" target="_blank" rel="noreferrer" className={ghostButtonClass}>Preview as learner</a>} />
      <div className="mb-6"><LifecycleBar<Course> kind="courses" slug={slug} status={course.status} onChanged={adopt} /></div>

      <form onSubmit={save} className="space-y-4" aria-label="Edit course">
        <label className="block text-xs font-semibold text-stone-400">Title<input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
        <label className="block text-xs font-semibold text-stone-400">Summary<input value={summary} maxLength={500} onChange={(e) => setSummary(e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
        <label className="block text-xs font-semibold text-stone-400">Sales page content (JSON)
          <textarea rows={14} value={pitch} spellCheck={false} onChange={(e) => setPitch(e.target.value)} aria-invalid={!pitchCheck.ok} className={`${inputClass} mt-1 font-mono text-xs font-normal ${pitchCheck.ok ? '' : 'border-red-500'}`} /></label>
        {!pitchCheck.ok && <p role="alert" className="text-xs text-red-300">{pitchCheck.message}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy || !pitchCheck.ok || !title.trim()} className={buttonClass}>{busy ? 'Saving…' : 'Save changes'}</button>
          {saved && <span role="status" className="text-sm text-emerald-300">Saved</span>}
          {stale && <button type="button" className={ghostButtonClass} onClick={() => { setFailure(null); void loaded.reload(); }}>Reload the latest version</button>}
        </div>
        <ErrorNote failure={failure} />
      </form>

      <section className="mt-10" aria-labelledby="its-cohorts">
        <div className="mb-3 flex items-center justify-between"><h2 id="its-cohorts" className="text-lg font-bold text-white">Cohorts of this course</h2><Link href={`/admin/cohorts?course=${encodeURIComponent(slug)}`} className="text-sm font-semibold text-amber-400">New cohort</Link></div>
        {cohorts.loading && !cohorts.data ? <Spinner /> : (
          <DataTable rows={cohorts.data?.items ?? []} rowKey={(c) => c.slug} empty="No cohorts yet."
            columns={[{ header: 'Cohort', cell: (c) => <Link href={`/admin/cohorts/${c.slug}`} className="font-semibold text-amber-400">{c.title}</Link> }, { header: 'Slug', cell: (c) => <span className="font-mono text-xs">{c.slug}</span> },
              { header: 'Status', cell: (c) => <StatusBadge value={c.status} /> }, { header: 'Enrolment', cell: (c) => (c.enrollmentClosed ? 'closed' : 'open') }]} />
        )}
      </section>

      <section className="mt-10 flex flex-wrap gap-3 border-t border-white/10 pt-6" aria-label="Other actions">
        <button type="button" className={ghostButtonClass} onClick={() => { setDup({ title: `${course.title} (copy)`, slug: slugify(`${course.slug}-copy`) }); setDialog('duplicate'); }}>Duplicate as a new draft</button>
        <button type="button" className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10" onClick={() => setDialog('delete')}>Delete course</button>
      </section>

      {dialog === 'delete' && <ConfirmDialog title={`Delete “${course.title}”?`} danger busy={busy} confirmLabel="Delete course" onCancel={() => setDialog(null)} onConfirm={remove}
        body={<p>This cannot be undone. The server refuses if the course has cohorts or learners; archive it instead in that case.</p>} />}
      {dialog === 'duplicate' && <ConfirmDialog title="Duplicate course" busy={busy} confirmLabel="Create copy" onCancel={() => setDialog(null)} onConfirm={duplicate}
        body={<div className="space-y-3"><label className="block text-xs font-semibold text-stone-400">New title<input value={dup.title} onChange={(e) => setDup({ ...dup, title: e.target.value })} className={`${inputClass} mt-1 font-normal`} /></label>
          <label className="block text-xs font-semibold text-stone-400">New slug<input value={dup.slug} onChange={(e) => setDup({ ...dup, slug: e.target.value })} aria-invalid={!isSlug(dup.slug)} className={`${inputClass} mt-1 font-mono font-normal`} /></label></div>} />}
    </div>
  );
}
