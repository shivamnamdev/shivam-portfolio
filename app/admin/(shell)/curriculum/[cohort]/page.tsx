'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useCurriculum } from '@/components/admin/curriculum/useCurriculum';
import LessonPanel, { type LessonPatch } from '@/components/admin/curriculum/LessonPanel';
import OutlinePreview from '@/components/admin/curriculum/OutlinePreview';
import { ConfirmDialog, ErrorNote, PageHeader, Spinner, StatusBadge, buttonClass, ghostButtonClass, inputClass } from '@/components/admin/ui';
import type { Failure } from '@/lib/adminUi/client';
import { LIMITS, countLessons, layoutAfterMove, layoutAfterMoveToModule, lessonIdFrom, lessonLabel, moduleOrderAfterMove, type Lesson, type Module } from '@/lib/adminUi/curriculum';

type Pending = { kind: 'publish' } | { kind: 'discard' } | { kind: 'delete-module'; module: Module } | { kind: 'delete-lesson'; lesson: Lesson };

export default function CurriculumEditorPage() {
  const { cohort } = useParams<{ cohort: string }>();
  const c = useCurriculum(cohort);
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [open, setOpen] = useState<string | null>(null);   // lesson id being edited
  const [pending, setPending] = useState<Pending | null>(null);
  const [newModule, setNewModule] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [newLesson, setNewLesson] = useState<Record<string, { value: string; title: string }>>({});
  const [lessonFailure, setLessonFailure] = useState<Failure | null>(null);

  if (c.loading && !c.data) return <Spinner />;
  if (!c.data) return <div><ErrorNote failure={c.failure} /><Link href="/admin/curriculum" className="text-sm text-amber-400">Back to curriculum</Link></div>;
  const { data } = c;
  const modules = data.modules;
  const editing = open ? modules.flatMap((m) => m.lessons).find((l) => l.id === open) ?? null : null;

  async function confirm() {
    if (!pending) return;
    const p = pending;
    const sub = p.kind === 'publish' ? '/publish' : p.kind === 'discard' ? '/discard' : p.kind === 'delete-module' ? `/modules/${p.module.id}` : `/lessons/${encodeURIComponent(p.lesson.id)}`;
    const failed = await c.act(sub, p.kind === 'publish' || p.kind === 'discard' ? 'POST' : 'DELETE');
    if (!failed && p.kind === 'delete-lesson' && open === p.lesson.id) setOpen(null);
    setPending(null);
  }
  async function addModule(e: React.FormEvent) {
    e.preventDefault();
    const submitted = newModule;
    if (!(await c.act('/modules', 'POST', { title: submitted.trim() }))) setNewModule((now) => (now === submitted ? '' : now));   // never wipe what was typed meanwhile
  }
  async function rename(e: React.FormEvent) { e.preventDefault(); if (!renaming) return; if (!(await c.act(`/modules/${renaming.id}`, 'PATCH', { title: renaming.title.trim() }))) setRenaming(null); }
  async function addLesson(m: Module, e: React.FormEvent) {
    e.preventDefault();
    const f = newLesson[m.id]; const id = f ? lessonIdFrom(f.value) : null;
    if (!id) return;
    if (!(await c.act(`/modules/${m.id}/lessons`, 'POST', { id, ...(f.title.trim() ? { title: f.title.trim() } : {}) }))) {
      setNewLesson((all) => (all[m.id]?.value === f.value && all[m.id]?.title === f.title ? { ...all, [m.id]: { value: '', title: '' } } : all));   // never wipe what was typed meanwhile
    }
  }
  async function saveLesson(patch: LessonPatch) {
    if (!editing) return;
    setLessonFailure(null);
    const failed = await c.act(`/lessons/${encodeURIComponent(editing.id)}`, 'PATCH', patch, true);
    if (failed) setLessonFailure(failed); else setOpen(null);
  }
  const stale = [c.failure, lessonFailure].some((f) => f?.status === 409 || f?.status === 428);

  return (
    <div>
      <p className="mb-2 text-sm"><Link href="/admin/curriculum" className="text-amber-400 hover:text-amber-300">Curriculum</Link> / <span className="font-mono text-stone-400">{data.cohort}</span></p>
      <PageHeader title="Curriculum" subtitle={`${data.counts.modules} modules, ${data.counts.lessons} lessons · version ${data.version}`}
        actions={<>
          <button type="button" className={ghostButtonClass} aria-pressed={view === 'preview'} onClick={() => setView(view === 'edit' ? 'preview' : 'edit')}>{view === 'edit' ? 'Preview as learner' : 'Back to editing'}</button>
        </>} />
      <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge value={data.published ? 'published' : 'draft'} />
          {data.hasUnpublishedChanges ? <span role="status" className="text-sm font-semibold text-amber-300">Changes not published yet. Learners (later phase) will keep seeing the published copy.</span> : <span className="text-sm text-stone-400">The published copy matches this one.</span>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={buttonClass} disabled={c.busy || modules.length === 0 || !data.hasUnpublishedChanges} onClick={() => setPending({ kind: 'publish' })}>Publish</button>
          <button type="button" className={ghostButtonClass} disabled={c.busy || !data.published || !data.hasUnpublishedChanges} onClick={() => setPending({ kind: 'discard' })}>Discard draft changes</button>
        </div>
        {data.publishedAt && <p className="mt-2 text-xs text-stone-500">Last published {data.publishedAt.slice(0, 16).replace('T', ' ')} UTC</p>}
      </div>
      <div className="mb-4 space-y-2"><ErrorNote failure={c.failure} />{stale && <button type="button" className={ghostButtonClass} onClick={() => { c.setFailure(null); setLessonFailure(null); void c.reload(); }}>Reload the latest version</button>}</div>

      {view === 'preview' ? <OutlinePreview modules={modules} /> : (
        <div className={`grid gap-6 ${editing ? 'xl:grid-cols-[1fr_minmax(0,28rem)]' : ''}`}>
          <div className="space-y-4">
            {modules.map((m, mi) => (
              <section key={m.id} aria-label={`Module ${m.title}`} className="rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-3">
                  {renaming?.id === m.id ? (
                    <form onSubmit={rename} className="flex flex-1 gap-2"><input autoFocus aria-label="Module title" value={renaming.title} maxLength={200} onChange={(e) => setRenaming({ id: m.id, title: e.target.value })} className={inputClass} />
                      <button type="submit" disabled={c.busy || !renaming.title.trim()} className={buttonClass}>Save</button><button type="button" className={ghostButtonClass} onClick={() => setRenaming(null)}>Cancel</button></form>
                  ) : (<>
                    <h2 className="flex-1 font-display text-base font-bold text-white">{m.title}</h2>
                    <label className="flex items-center gap-1.5 text-xs text-stone-300"><input type="checkbox" checked={m.advanced} disabled={c.busy} onChange={(e) => void c.act(`/modules/${m.id}`, 'PATCH', { advanced: e.target.checked })} />Advanced</label>
                    <button type="button" className="text-xs font-semibold text-amber-400" onClick={() => setRenaming({ id: m.id, title: m.title })}>Rename</button>
                    <button type="button" aria-label={`Move module ${m.title} up`} disabled={c.busy || mi === 0} className="rounded border border-white/15 px-2 py-1 text-xs disabled:opacity-30" onClick={() => { const ids = moduleOrderAfterMove(modules, m.id, -1); if (ids) void c.act('/modules/reorder', 'POST', { moduleIds: ids }); }}>↑</button>
                    <button type="button" aria-label={`Move module ${m.title} down`} disabled={c.busy || mi === modules.length - 1} className="rounded border border-white/15 px-2 py-1 text-xs disabled:opacity-30" onClick={() => { const ids = moduleOrderAfterMove(modules, m.id, 1); if (ids) void c.act('/modules/reorder', 'POST', { moduleIds: ids }); }}>↓</button>
                    <button type="button" className="text-xs font-semibold text-red-400" onClick={() => setPending({ kind: 'delete-module', module: m })}>Delete</button>
                  </>)}
                </div>
                <ul className="divide-y divide-white/5">
                  {m.lessons.map((l, li) => (
                    <li key={l.id} className={`flex flex-wrap items-center gap-2 px-3 py-2 text-sm ${open === l.id ? 'bg-amber-500/10' : ''}`}>
                      <span className="w-14 shrink-0 text-xs text-stone-500">Lesson {li + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-stone-200" title={l.id}>{lessonLabel(l)}</span>
                      {l.assignment && <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[11px] text-sky-300">{l.assignment.isExam ? 'Exam' : 'Assignment'}</span>}
                      {!!l.resources?.length && <span className="rounded-full bg-stone-500/20 px-2 py-0.5 text-[11px] text-stone-300">{l.resources.length} res.</span>}
                      <button type="button" aria-label={`Edit lesson ${lessonLabel(l)}`} className="text-xs font-semibold text-amber-400" onClick={() => { setLessonFailure(null); c.setFailure(null); setOpen(l.id); }}>Edit</button>
                      <button type="button" aria-label={`Move lesson ${lessonLabel(l)} up`} disabled={c.busy || li === 0} className="rounded border border-white/15 px-2 py-0.5 text-xs disabled:opacity-30" onClick={() => { const lay = layoutAfterMove(modules, l.id, -1); if (lay) void c.act('/lessons/reorder', 'POST', { layout: lay }); }}>↑</button>
                      <button type="button" aria-label={`Move lesson ${lessonLabel(l)} down`} disabled={c.busy || li === m.lessons.length - 1} className="rounded border border-white/15 px-2 py-0.5 text-xs disabled:opacity-30" onClick={() => { const lay = layoutAfterMove(modules, l.id, 1); if (lay) void c.act('/lessons/reorder', 'POST', { layout: lay }); }}>↓</button>
                      {modules.length > 1 && (
                        <select aria-label={`Move lesson ${lessonLabel(l)} to another module`} value="" disabled={c.busy} className="rounded border border-white/15 bg-black/40 px-1 py-0.5 text-xs" onChange={(e) => { const lay = layoutAfterMoveToModule(modules, l.id, e.target.value); if (lay) void c.act('/lessons/reorder', 'POST', { layout: lay }); }}>
                          <option value="">Move to…</option>{modules.filter((x) => x.id !== m.id).map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
                        </select>
                      )}
                      <button type="button" aria-label={`Delete lesson ${lessonLabel(l)}`} className="text-xs font-semibold text-red-400" onClick={() => setPending({ kind: 'delete-lesson', lesson: l })}>Delete</button>
                    </li>
                  ))}
                  {m.lessons.length === 0 && <li className="px-3 py-3 text-sm text-stone-500">No lessons in this module.</li>}
                </ul>
                {m.lessons.length < LIMITS.lessonsPerModule && (
                  <form onSubmit={(e) => void addLesson(m, e)} aria-label={`Add a lesson to ${m.title}`} className="grid gap-2 border-t border-white/10 p-3 sm:grid-cols-[1.4fr_1fr_auto]">
                    <label className="text-xs font-semibold text-stone-400">YouTube link or id, or doc-… id<input value={newLesson[m.id]?.value ?? ''} onChange={(e) => setNewLesson({ ...newLesson, [m.id]: { value: e.target.value, title: newLesson[m.id]?.title ?? '' } })} aria-invalid={!!newLesson[m.id]?.value && !lessonIdFrom(newLesson[m.id].value)} className={`${inputClass} mt-1 font-mono text-xs font-normal`} /></label>
                    <label className="text-xs font-semibold text-stone-400">Title (optional)<input value={newLesson[m.id]?.title ?? ''} maxLength={200} onChange={(e) => setNewLesson({ ...newLesson, [m.id]: { value: newLesson[m.id]?.value ?? '', title: e.target.value } })} className={`${inputClass} mt-1 font-normal`} /></label>
                    <div className="flex items-end"><button type="submit" disabled={c.busy || !lessonIdFrom(newLesson[m.id]?.value ?? '')} className={ghostButtonClass}>Add lesson</button></div>
                  </form>
                )}
              </section>
            ))}
            {modules.length < LIMITS.modules && (
              <form onSubmit={addModule} aria-label="Add a module" className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-white/20 p-4">
                <label className="flex-1 text-xs font-semibold text-stone-400">New module title<input value={newModule} maxLength={200} onChange={(e) => setNewModule(e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
                <button type="submit" disabled={c.busy || !newModule.trim()} className={buttonClass}>Add module</button>
              </form>
            )}
          </div>
          {editing && <aside><LessonPanel key={editing.id} lesson={editing} busy={c.busy} failure={lessonFailure} onSave={(p) => void saveLesson(p)} onClose={() => { setOpen(null); setLessonFailure(null); }} /></aside>}
        </div>
      )}

      {pending && (
        <ConfirmDialog busy={c.busy} onCancel={() => setPending(null)} onConfirm={() => void confirm()}
          danger={pending.kind === 'delete-module' || pending.kind === 'delete-lesson' || pending.kind === 'discard'}
          title={pending.kind === 'publish' ? 'Publish this curriculum?' : pending.kind === 'discard' ? 'Discard the draft changes?' : pending.kind === 'delete-module' ? `Delete module “${pending.module.title}”?` : `Delete lesson “${lessonLabel(pending.lesson)}”?`}
          confirmLabel={pending.kind === 'publish' ? 'Publish' : pending.kind === 'discard' ? 'Discard changes' : 'Delete'}
          body={pending.kind === 'publish' ? <p>The published copy becomes these {data.counts.modules} modules and {data.counts.lessons} lessons.</p>
            : pending.kind === 'discard' ? <p>The working copy goes back to the published copy. Your unpublished edits are lost.</p>
            : pending.kind === 'delete-module' ? <p>This removes the module and its {pending.module.lessons.length} lesson(s) from the draft ({countLessons([pending.module])} lessons). The server refuses if learners have progress on any of them.</p>
            : <p>This removes the lesson from the draft. The server refuses if learners have progress on it; move or rename it instead.</p>} />
      )}
    </div>
  );
}
