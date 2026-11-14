'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCurriculum } from '@/components/admin/curriculum/useCurriculum';
import LessonPanel, { type ExamContext, type LessonPatch } from '@/components/admin/curriculum/LessonPanel';
import OutlinePreview from '@/components/admin/curriculum/OutlinePreview';
import { ConfirmDialog, ErrorNote, PageHeader, Spinner, StatusBadge, buttonClass, ghostButtonClass, inputClass } from '@/components/admin/ui';
import type { Failure } from '@/lib/adminUi/client';
import {
  FINAL_EXAM_BADGE, LIMITS, LOCKED_HINT, LOCKED_LABEL, countLessons, documentLessonBody, documentProblems, emptyDocumentForm, examOf, layoutAfterMove, layoutAfterMoveToModule, lessonIdFrom, lessonLabel,
  moduleOrderAfterMove, parseYoutubeItems, youtubeRequestUrls, type DocumentForm, type ExamChange, type Lesson, type Module, type VideoDetails,
} from '@/lib/adminUi/curriculum';

type Pending = { kind: 'publish' } | { kind: 'discard' } | { kind: 'delete-module'; module: Module } | { kind: 'delete-lesson'; lesson: Lesson };
type YtState = 'idle' | 'loading' | 'ok' | 'failed' | 'nokey';

export default function CurriculumEditorPage() {
  const { cohort } = useParams<{ cohort: string }>();
  const c = useCurriculum(cohort);
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [open, setOpen] = useState<string | null>(null);   // lesson id being edited
  const [pending, setPending] = useState<Pending | null>(null);
  const [newModule, setNewModule] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [newLesson, setNewLesson] = useState<Record<string, { value: string; title: string }>>({});
  const [newKind, setNewKind] = useState<Record<string, 'video' | 'document'>>({});
  const [newDoc, setNewDoc] = useState<Record<string, DocumentForm>>({});
  const [lessonFailure, setLessonFailure] = useState<Failure | null>(null);
  // What YouTube says about each video (title, length, description, picture): read in the browser with the public key the learner page uses, shown
  // next to the stored data, never stored. When the key is missing or YouTube cannot be reached the rows simply show the stored labels.
  const [yt, setYt] = useState<Record<string, VideoDetails>>({});
  const [ytState, setYtState] = useState<YtState>('idle');
  const idsKey = (c.data?.modules ?? []).flatMap((m) => m.lessons.map((l) => l.id)).join(',');
  useEffect(() => {
    const missing = idsKey.split(',').filter((id) => id && !(id in yt));
    const urls = youtubeRequestUrls(missing, process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ?? '');
    if (!urls.length) return;
    if (!process.env.NEXT_PUBLIC_YOUTUBE_API_KEY) { setYtState('nokey'); return; }
    let cancelled = false;
    setYtState('loading');
    (async () => {
      try {
        const found: Record<string, VideoDetails> = {};
        for (const u of urls) { const r = await fetch(u); if (!r.ok) throw new Error(String(r.status)); Object.assign(found, parseYoutubeItems(await r.json())); }
        if (!cancelled) { setYt((now) => ({ ...now, ...found })); setYtState('ok'); }
      } catch { if (!cancelled) setYtState('failed'); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  if (c.loading && !c.data) return <Spinner />;
  if (!c.data) return <div><ErrorNote failure={c.failure} /><Link href="/admin/curriculum" className="text-sm text-amber-400">Back to curriculum</Link></div>;
  const { data } = c;
  const modules = data.modules;
  const editing = open ? modules.flatMap((m) => m.lessons).find((l) => l.id === open) ?? null : null;
  const allIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
  const exam = examOf(modules);
  const examContext = (lessonId: string): ExamContext => ({ grader: data.examGrader, moduleLocked: !!modules.find((m) => m.lessons.some((l) => l.id === lessonId))?.advanced, currentId: exam?.lesson.id ?? null, currentLabel: exam ? lessonLabel(exam.lesson) : '' });

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
  async function addDocument(m: Module, e: React.FormEvent) {
    e.preventDefault();
    const f = newDoc[m.id]; const body = f ? documentLessonBody(f, allIds) : null;
    if (!body) return;
    if (!(await c.act(`/modules/${m.id}/lessons`, 'POST', body))) {
      setNewDoc((all) => (all[m.id] === f ? { ...all, [m.id]: emptyDocumentForm() } : all));   // never wipe what was typed meanwhile
    }
  }
  const docForm = (id: string): DocumentForm => newDoc[id] ?? emptyDocumentForm();
  const setDoc = (id: string, patch: Partial<DocumentForm>) => setNewDoc((all) => ({ ...all, [id]: { ...docForm(id), ...patch } }));
  // The lesson's own fields first (the exam needs its assignment file to exist), then the exam switch through its dedicated call.
  async function saveLesson(patch: LessonPatch, exam: ExamChange | null) {
    if (!editing) return;
    setLessonFailure(null);
    if (Object.keys(patch).length) {
      const failed = await c.act(`/lessons/${encodeURIComponent(editing.id)}`, 'PATCH', patch, true);
      if (failed) { setLessonFailure(failed); return; }
    }
    if (exam) {
      const failed = await c.act('/exam', 'PUT', exam, true);
      if (failed) { setLessonFailure(failed); return; }
    }
    setOpen(null);
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
      {ytState === 'failed' && <p className="mb-4 text-xs text-stone-500">YouTube details are unavailable right now; the rows show the stored titles.</p>}
      {ytState === 'nokey' && <p className="mb-4 text-xs text-stone-500">YouTube details are off: this deployment has no public YouTube key.</p>}

      {view === 'preview' ? <OutlinePreview modules={modules} /> : (
        <div className={`grid gap-6 ${editing ? 'xl:grid-cols-[1fr_minmax(0,28rem)]' : ''}`}>
          <div className="space-y-4">
            <section aria-label="Final exam" className="rounded-xl border border-sky-500/30 bg-sky-500/[0.06] p-4">
              {exam ? (<>
                <h2 className="font-display text-base font-bold text-white"><span className="mr-2 rounded-full bg-purple-500/25 px-2 py-0.5 text-[11px] font-semibold text-purple-200">{FINAL_EXAM_BADGE}</span>Final exam: {lessonLabel(exam.lesson)}</h2>
                <p className="mt-1 text-sm text-stone-300">Lesson {exam.number} in <span className="font-semibold">{exam.moduleTitle}</span>{exam.serverGraded ? ' · graded on the server' : ''}. Learners must pass it to get the certificate, and modules marked “{LOCKED_LABEL}” open once they do.</p>
                {exam.files.length > 0 && <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">{exam.files.map((f) => <li key={f.label}><a href={f.url} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">{f.label} ↗</a></li>)}</ul>}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button type="button" className={ghostButtonClass} onClick={() => { setLessonFailure(null); c.setFailure(null); setOpen(exam.lesson.id); }}>Go to the exam lesson</button>
                  <span className="text-xs text-stone-500">To move the exam, open another lesson that has an assignment and turn on “This lesson is the final exam”. Learners keep their results.</span>
                </div>
              </>) : (<>
                <h2 className="font-display text-base font-bold text-white">Final exam: none</h2>
                <p className="mt-1 text-sm text-stone-400">{data.examGrader ? 'An exam is optional. To add one, open a lesson that has an assignment file and turn on “This lesson is the final exam”; learners must then pass it to get the certificate.' : 'An exam is optional, and this course has none. To offer one, a grader first has to be added in the code; after that the switch appears on the lesson.'}</p>
              </>)}
            </section>
            {modules.map((m, mi) => (
              <section key={m.id} aria-label={`Module ${m.title}`} className="rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-3">
                  {renaming?.id === m.id ? (
                    <form onSubmit={rename} className="flex flex-1 gap-2"><input autoFocus aria-label="Module title" value={renaming.title} maxLength={200} onChange={(e) => setRenaming({ id: m.id, title: e.target.value })} className={inputClass} />
                      <button type="submit" disabled={c.busy || !renaming.title.trim()} className={buttonClass}>Save</button><button type="button" className={ghostButtonClass} onClick={() => setRenaming(null)}>Cancel</button></form>
                  ) : (<>
                    <h2 className="flex-1 font-display text-base font-bold text-white">{m.title}</h2>
                    <label className="flex items-center gap-1.5 text-xs text-stone-300" title={LOCKED_HINT}><input type="checkbox" checked={m.advanced} disabled={c.busy} onChange={(e) => void c.act(`/modules/${m.id}`, 'PATCH', { advanced: e.target.checked })} />{LOCKED_LABEL}</label>
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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {yt[l.id] && <img src={yt[l.id].thumbnail} alt="" width={64} height={36} loading="lazy" className="h-9 w-16 shrink-0 rounded object-cover" />}
                      {/* headline: the stored title, else what YouTube calls the video, else the id; the small line keeps whichever one is not the headline */}
                      <span className="min-w-0 flex-1" title={l.id}>
                        <span className="block truncate text-stone-200">{l.title?.trim() || yt[l.id]?.title || lessonLabel(l)}</span>
                        {yt[l.id] && <span className="block truncate text-xs text-stone-500">{l.title?.trim() ? `On YouTube: ${yt[l.id].title || 'untitled'}` : l.id}{yt[l.id].duration ? ` · ${yt[l.id].duration}` : ''}</span>}
                      </span>
                      {l.assignment && (l.assignment.isExam ? <span className="rounded-full bg-purple-500/25 px-2 py-0.5 text-[11px] font-semibold text-purple-200">{FINAL_EXAM_BADGE}</span> : <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[11px] text-sky-300">Assignment</span>)}
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
                  <div className="border-t border-white/10 p-3">
                    <div role="radiogroup" aria-label={`What to add to ${m.title}`} className="mb-2 flex gap-4 text-xs text-stone-300">
                      {(['video', 'document'] as const).map((k) => <label key={k} className="flex items-center gap-1.5"><input type="radio" name={`add-${m.id}`} checked={(newKind[m.id] ?? 'video') === k} onChange={() => setNewKind({ ...newKind, [m.id]: k })} />{k === 'video' ? 'Video' : 'Document (PDF, notes, cheat sheet)'}</label>)}
                    </div>
                    {(newKind[m.id] ?? 'video') === 'video' ? (
                      <form onSubmit={(e) => void addLesson(m, e)} aria-label={`Add a lesson to ${m.title}`} className="grid gap-2 sm:grid-cols-[1.4fr_1fr_auto]">
                        <label className="text-xs font-semibold text-stone-400">YouTube link or id, or doc-… id<input value={newLesson[m.id]?.value ?? ''} onChange={(e) => setNewLesson({ ...newLesson, [m.id]: { value: e.target.value, title: newLesson[m.id]?.title ?? '' } })} aria-invalid={!!newLesson[m.id]?.value && !lessonIdFrom(newLesson[m.id].value)} placeholder="https://www.youtube.com/watch?v=…" className={`${inputClass} mt-1 font-mono text-xs font-normal`} /></label>
                        <label className="text-xs font-semibold text-stone-400">Title (optional)<input value={newLesson[m.id]?.title ?? ''} maxLength={200} onChange={(e) => setNewLesson({ ...newLesson, [m.id]: { value: newLesson[m.id]?.value ?? '', title: e.target.value } })} className={`${inputClass} mt-1 font-normal`} /></label>
                        <div className="flex items-end"><button type="submit" disabled={c.busy || !lessonIdFrom(newLesson[m.id]?.value ?? '')} className={ghostButtonClass}>Add lesson</button></div>
                      </form>
                    ) : (
                      <form onSubmit={(e) => void addDocument(m, e)} aria-label={`Add a document to ${m.title}`} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_120px_auto]">
                        <label className="text-xs font-semibold text-stone-400">Document title<input value={docForm(m.id).title} maxLength={200} onChange={(e) => setDoc(m.id, { title: e.target.value })} className={`${inputClass} mt-1 font-normal`} /></label>
                        <label className="text-xs font-semibold text-stone-400">Document link<input value={docForm(m.id).url} onChange={(e) => setDoc(m.id, { url: e.target.value })} placeholder="https://s3.ap-south-1.amazonaws.com/… or a GitHub or Drive link" className={`${inputClass} mt-1 font-mono text-xs font-normal`} /></label>
                        <label className="text-xs font-semibold text-stone-400">Document type<select value={docForm(m.id).type} onChange={(e) => setDoc(m.id, { type: e.target.value as DocumentForm['type'] })} className={`${inputClass} mt-1 font-normal`}><option>PDF</option><option>Document</option><option>Link</option></select></label>
                        <div className="flex items-end"><button type="submit" disabled={c.busy || !documentLessonBody(docForm(m.id), allIds)} className={ghostButtonClass}>Add document</button></div>
                        <label className="text-xs font-semibold text-stone-400 sm:col-span-4">Short description (optional)<input value={docForm(m.id).description} maxLength={500} onChange={(e) => setDoc(m.id, { description: e.target.value })} className={`${inputClass} mt-1 font-normal`} /></label>
                        {(docForm(m.id).title || docForm(m.id).url) && documentProblems(docForm(m.id)).length > 0 && <ul className="list-disc pl-5 text-xs text-amber-200 sm:col-span-4">{documentProblems(docForm(m.id)).map((p) => <li key={p}>{p}</li>)}</ul>}
                      </form>
                    )}
                  </div>
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
          {editing && <aside><LessonPanel key={editing.id} lesson={editing} details={yt[editing.id]} exam={examContext(editing.id)} busy={c.busy} failure={lessonFailure} onSave={(p, x) => void saveLesson(p, x)} onClose={() => { setOpen(null); setLessonFailure(null); }} /></aside>}
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
