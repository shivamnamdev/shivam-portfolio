'use client';
import { useState } from 'react';
import { ErrorNote, buttonClass, ghostButtonClass, inputClass } from '../ui';
import type { Failure } from '@/lib/adminUi/client';
import {
  LIMITS, assignmentProblems, assignmentToForm, cleanResources, formToAssignment, lessonLabel, resourceProblems, urlFieldsFor, type AssignmentForm, type Lesson, type Resource,
} from '@/lib/adminUi/curriculum';

export type LessonPatch = { title?: string; description?: string; assignment?: ReturnType<typeof formToAssignment> | null; resources?: Resource[] };

// Edits one lesson: title, description, the assignment (python or git lab) and the resource list. Sends only what changed. The exam flags are shown
// as read-only: they are set in the repo, never here, and an exam's assignment cannot be removed. Hints inform; the server has the last word.
export default function LessonPanel({ lesson, busy, failure, onSave, onClose }: { lesson: Lesson; busy: boolean; failure: Failure | null; onSave: (patch: LessonPatch) => void; onClose: () => void }) {
  const [title, setTitle] = useState(lesson.title ?? '');
  const [description, setDescription] = useState(lesson.description ?? '');
  const [hasAssignment, setHasAssignment] = useState(!!lesson.assignment);
  const [form, setForm] = useState<AssignmentForm>(assignmentToForm(lesson.assignment));
  const [resources, setResources] = useState<Resource[]>(lesson.resources ?? []);
  const exam = !!lesson.assignment?.isExam;

  const aProblems = hasAssignment ? assignmentProblems(form) : [];
  const rProblems = resourceProblems(resources);
  const problems = [...aProblems, ...rProblems];
  const setRes = (i: number, patch: Partial<Resource>) => setResources(resources.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  function save(e: React.FormEvent) {
    e.preventDefault();
    const patch: LessonPatch = {};
    if (title.trim() && title.trim() !== (lesson.title ?? '')) patch.title = title.trim();
    if (description.trim() && description.trim() !== (lesson.description ?? '')) patch.description = description.trim();
    const was = lesson.assignment;
    if (!hasAssignment && was) patch.assignment = null;
    else if (hasAssignment) { const next = formToAssignment(form); const prev = was ? formToAssignment(assignmentToForm(was)) : null; if (JSON.stringify(next) !== JSON.stringify(prev)) patch.assignment = next; }
    const nextRes = cleanResources(resources);
    if (JSON.stringify(nextRes) !== JSON.stringify(lesson.resources ?? [])) patch.resources = nextRes;
    if (!Object.keys(patch).length) { onClose(); return; }
    onSave(patch);
  }
  return (
    <form onSubmit={save} aria-label={`Edit lesson ${lessonLabel(lesson)}`} className="space-y-4 rounded-xl border border-amber-500/30 bg-[#111] p-4">
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="text-base font-bold text-white">Edit lesson</h3><p className="break-all font-mono text-xs text-stone-500">{lesson.id} · {lesson.kind}{exam ? ' · exam' : ''}</p></div>
        <button type="button" onClick={onClose} className="text-sm font-semibold text-stone-400 hover:text-white">Close</button>
      </div>
      <label className="block text-xs font-semibold text-stone-400">Title<input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
      <label className="block text-xs font-semibold text-stone-400">Description (up to 500 characters)<textarea rows={3} value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>

      <fieldset className="rounded-lg border border-white/10 p-3">
        <legend className="px-2 text-sm font-bold text-white">Assignment</legend>
        <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={hasAssignment} disabled={exam} onChange={(e) => setHasAssignment(e.target.checked)} />This lesson has an assignment</label>
        {exam && <p className="mb-3 text-xs text-amber-300">This lesson holds the exam. The exam settings are fixed in the repository and cannot be changed or removed here.</p>}
        {hasAssignment && (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-stone-400">Assignment title<input value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`${inputClass} mt-1 font-normal`} /></label>
            <div role="radiogroup" aria-label="Lab type" className="flex gap-4 text-sm">
              {(['python', 'git'] as const).map((k) => <label key={k} className="flex items-center gap-2"><input type="radio" name={`lab-${lesson.id}`} checked={form.labType === k} onChange={() => setForm({ ...form, labType: k })} />{k === 'python' ? 'Python lab' : 'Git lab'}</label>)}
            </div>
            {urlFieldsFor(form.labType).map((k) => (
              <label key={k} className="block text-xs font-semibold text-stone-400">{k}<input value={form[k]} placeholder="https://raw.githubusercontent.com/…" onChange={(e) => setForm({ ...form, [k]: e.target.value })} className={`${inputClass} mt-1 font-mono text-xs font-normal`} /></label>
            ))}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.carryOverCode} onChange={(e) => setForm({ ...form, carryOverCode: e.target.checked })} />Start from the previous lesson's code</label>
          </div>
        )}
      </fieldset>

      <fieldset className="rounded-lg border border-white/10 p-3">
        <legend className="px-2 text-sm font-bold text-white">Resources ({resources.length} of {LIMITS.resourcesPerLesson})</legend>
        <div className="space-y-3">
          {resources.map((r, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.5fr_110px_auto]">
              <label className="text-xs font-semibold text-stone-400">Title<input value={r.title} maxLength={200} onChange={(e) => setRes(i, { title: e.target.value })} className={`${inputClass} mt-1 font-normal`} /></label>
              <label className="text-xs font-semibold text-stone-400">Link<input value={r.url} onChange={(e) => setRes(i, { url: e.target.value })} placeholder="https://…" className={`${inputClass} mt-1 font-mono text-xs font-normal`} /></label>
              <label className="text-xs font-semibold text-stone-400">Type<select value={r.type} onChange={(e) => setRes(i, { type: e.target.value as Resource['type'] })} className={`${inputClass} mt-1 font-normal`}><option>PDF</option><option>Document</option><option>Link</option></select></label>
              <button type="button" aria-label={`Remove resource ${i + 1}`} onClick={() => setResources(resources.filter((_, j) => j !== i))} className="self-end pb-2 text-xs font-semibold text-red-400 hover:text-red-300">Remove</button>
            </div>
          ))}
          {resources.length < LIMITS.resourcesPerLesson && <button type="button" className={ghostButtonClass} onClick={() => setResources([...resources, { title: '', url: '', type: 'Link' }])}>Add a resource</button>}
        </div>
      </fieldset>

      {problems.length > 0 && <ul role="alert" className="list-disc rounded-lg bg-amber-500/10 p-3 pl-7 text-xs text-amber-200">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
      <ErrorNote failure={failure} />
      <div className="flex gap-3"><button type="submit" disabled={busy || problems.length > 0} className={buttonClass}>{busy ? 'Saving…' : 'Save lesson'}</button><button type="button" className={ghostButtonClass} onClick={onClose}>Cancel</button></div>
    </form>
  );
}
