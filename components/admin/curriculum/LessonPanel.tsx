'use client';
import { useState } from 'react';
import { ErrorNote, buttonClass, ghostButtonClass, inputClass } from '../ui';
import type { Failure } from '@/lib/adminUi/client';
import { sameJson } from '@/lib/adminUi/forms';
import {
  ASSIGNMENT_HOSTS, CARRY_OVER_LABEL, FIELD_LABELS, LIMITS, assignmentProblems, assignmentToForm, cleanResources, documentFile, examChange, examSwitchBlock, formToAssignment, lessonLabel, linkProblem,
  resourceProblems, urlFieldsFor, type AssignmentForm, type ExamChange, type Lesson, type Resource, type VideoDetails,
} from '@/lib/adminUi/curriculum';

// What the panel needs to know about the course's exam (from the curriculum read): can an exam be marked here, is the lesson in a locked module, which lesson is the exam now.
export type ExamContext = { grader: boolean; moduleLocked: boolean; currentId: string | null; currentLabel: string };

export type LessonPatch = { title?: string; description?: string; assignment?: ReturnType<typeof formToAssignment> | null; resources?: Resource[] };

const hintClass = 'mt-1 text-[11px] leading-snug text-stone-500';
const emptyResource = (): Resource => ({ title: '', url: '', type: 'Link' });

// Edits one lesson: title, description, the assignment (python or git lab) and the materials. Sends only what changed. For a document lesson the first
// resource is the document itself and is edited as "Document file"; the rest are extra materials. Every link field has a plain label and a hint (the
// owner never sees a field name). The exam flags are read-only: they are set in the repo, never here, and an exam's assignment cannot be removed.
// `details` are the video's title, length and description read from YouTube by the page (shown, never stored). Hints inform; the server has the last word.
export default function LessonPanel({ lesson, details, exam: examCtx, busy, failure, onSave, onClose }: { lesson: Lesson; details?: VideoDetails; exam: ExamContext; busy: boolean; failure: Failure | null; onSave: (patch: LessonPatch, exam: ExamChange | null) => void; onClose: () => void }) {
  const isDoc = lesson.kind === 'document';
  const split = documentFile(lesson);
  const [title, setTitle] = useState(lesson.title ?? '');
  const [description, setDescription] = useState(lesson.description ?? '');
  const [hasAssignment, setHasAssignment] = useState(!!lesson.assignment);
  const [form, setForm] = useState<AssignmentForm>(assignmentToForm(lesson.assignment));
  const [file, setFile] = useState<Resource>(split.file ?? { title: '', url: '', type: 'PDF' });
  const [extras, setExtras] = useState<Resource[]>(split.extras);
  const exam = !!lesson.assignment?.isExam;           // is the exam today
  const [isExam, setIsExam] = useState(exam);           // the switch
  const [outcome, setOutcome] = useState(lesson.assignment?.expectedOutcomeUrl ?? '');
  const showAssignment = !isDoc || !!lesson.assignment;   // a document is a file to read; an assignment on one is only shown when it already exists

  const allResources = (): Resource[] => (isDoc ? [file, ...extras] : extras);
  const aProblems = [...(hasAssignment && showAssignment ? assignmentProblems(form) : []), ...(isExam && outcome.trim() ? [linkProblem(outcome, ASSIGNMENT_HOSTS)].filter(Boolean).map((p) => `Expected result ${p}`) : [])];
  const switchBlock = examSwitchBlock({ grader: examCtx.grader, kind: lesson.kind, moduleLocked: examCtx.moduleLocked, hasAssignment, assignmentFileSet: !!form.rawUrl.trim(), isExamNow: exam });
  // the document's own problems are worded as such; the extras keep their numbering as the learner sees them
  const fileProblems = isDoc ? resourceProblems([file]).map((p) => p.replace(/^Resource 1 link/, 'The document link').replace(/^Resource 1/, 'The document')) : [];
  const rProblems = resourceProblems(extras);
  const problems = [...aProblems, ...fileProblems, ...rProblems];
  const setExtra = (i: number, patch: Partial<Resource>) => setExtras(extras.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  function save(e: React.FormEvent) {
    e.preventDefault();
    const patch: LessonPatch = {};
    if (title.trim() && title.trim() !== (lesson.title ?? '')) patch.title = title.trim();
    if (description.trim() && description.trim() !== (lesson.description ?? '')) patch.description = description.trim();
    const was = lesson.assignment;
    if (showAssignment) {
      if (!hasAssignment && was) patch.assignment = null;
      else if (hasAssignment) { const next = formToAssignment(form); const prev = was ? formToAssignment(assignmentToForm(was)) : null; if (!sameJson(next, prev)) patch.assignment = next; }
    }
    const nextRes = cleanResources(allResources());
    if (!sameJson(nextRes, lesson.resources ?? [])) patch.resources = nextRes;
    const change = examChange({ lessonId: lesson.id, wasExam: exam, isExam, wasOutcome: lesson.assignment?.expectedOutcomeUrl ?? '', outcome });
    if (!Object.keys(patch).length && !change) { onClose(); return; }
    onSave(patch, change);
  }

  const resourceRow = (r: Resource, onChange: (patch: Partial<Resource>) => void, labels: { title: string; url: string; type: string }, remove?: () => void, removeLabel?: string) => (
    <div className={`grid gap-2 ${remove ? 'sm:grid-cols-[1fr_1.5fr_110px_auto]' : 'sm:grid-cols-[1fr_1.5fr_110px]'}`}>
      <label className="text-xs font-semibold text-stone-400">{labels.title}<input value={r.title} maxLength={200} onChange={(e) => onChange({ title: e.target.value })} className={`${inputClass} mt-1 font-normal`} /></label>
      <label className="text-xs font-semibold text-stone-400">{labels.url}<input value={r.url} onChange={(e) => onChange({ url: e.target.value })} placeholder="https://…" className={`${inputClass} mt-1 font-mono text-xs font-normal`} /></label>
      <label className="text-xs font-semibold text-stone-400">{labels.type}<select value={r.type} onChange={(e) => onChange({ type: e.target.value as Resource['type'] })} className={`${inputClass} mt-1 font-normal`}><option>PDF</option><option>Document</option><option>Link</option></select></label>
      {remove && <button type="button" aria-label={removeLabel} onClick={remove} className="self-end pb-2 text-xs font-semibold text-red-400 hover:text-red-300">Remove</button>}
    </div>
  );

  return (
    <form onSubmit={save} aria-label={`Edit lesson ${lessonLabel(lesson)}`} className="space-y-4 rounded-xl border border-amber-500/30 bg-[#111] p-4">
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="text-base font-bold text-white">{exam ? '🏆 Final exam' : 'Edit lesson'}</h3><p className="break-all font-mono text-xs text-stone-500">{lesson.id} · {lesson.kind}{exam ? ' · exam' : ''}</p></div>
        <button type="button" onClick={onClose} className="text-sm font-semibold text-stone-400 hover:text-white">Close</button>
      </div>

      {details && (
        <section aria-label="On YouTube" className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={details.thumbnail} alt="" width={120} height={68} className="h-[68px] w-[120px] shrink-0 rounded object-cover" />
          <div className="min-w-0 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">On YouTube</p>
            <p className="font-semibold text-white">{details.title || 'Untitled video'}{details.duration && <span className="ml-2 text-xs font-normal text-stone-400">{details.duration}</span>}</p>
            {details.description && <details className="mt-1 text-xs text-stone-400"><summary className="cursor-pointer select-none text-stone-300">YouTube description</summary><p className="mt-1 whitespace-pre-wrap">{details.description}</p></details>}
          </div>
        </section>
      )}

      <div>
        <label className="block text-xs font-semibold text-stone-400">Title<input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>
        <p className={hintClass}>{isDoc ? 'Shown to learners as the name of this document.' : 'Names this row in the portal. Learners see the YouTube title.'}</p>
      </div>
      <label className="block text-xs font-semibold text-stone-400">Description (up to 500 characters)<textarea rows={3} value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} className={`${inputClass} mt-1 font-normal`} /></label>

      {isDoc && (
        <fieldset className="rounded-lg border border-white/10 p-3">
          <legend className="px-2 text-sm font-bold text-white">Document file</legend>
          <p className={`${hintClass} mb-2 mt-0`}>The file learners open for this lesson (S3, GitHub or Google Drive link).</p>
          {resourceRow(file, (p) => setFile({ ...file, ...p }), { title: 'Document title', url: 'Document link', type: 'Document type' })}
        </fieldset>
      )}

      {showAssignment && (
        <fieldset className="rounded-lg border border-white/10 p-3">
          <legend className="px-2 text-sm font-bold text-white">Assignment</legend>
          <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={hasAssignment} disabled={exam} onChange={(e) => setHasAssignment(e.target.checked)} />This lesson has an assignment</label>
          {exam && <p className="mb-3 text-xs text-purple-300">This lesson is the final exam. Learners must pass it to get the certificate. Turn the switch below off to make it an ordinary assignment.</p>}
          {hasAssignment && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-stone-400">Assignment title<input value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`${inputClass} mt-1 font-normal`} /></label>
              <div role="radiogroup" aria-label="Lab type" className="flex gap-4 text-sm">
                {(['python', 'git'] as const).map((k) => <label key={k} className="flex items-center gap-2"><input type="radio" name={`lab-${lesson.id}`} checked={form.labType === k} onChange={() => setForm({ ...form, labType: k })} />{k === 'python' ? 'Python lab' : 'Git lab'}</label>)}
              </div>
              {urlFieldsFor(form.labType).map((k) => (
                <div key={k}>
                  <label className="block text-xs font-semibold text-stone-400">{FIELD_LABELS[k].label}<input value={form[k]} placeholder="https://raw.githubusercontent.com/…" onChange={(e) => setForm({ ...form, [k]: e.target.value })} className={`${inputClass} mt-1 font-mono text-xs font-normal`} /></label>
                  <p className={hintClass}>{FIELD_LABELS[k].hint}</p>
                </div>
              ))}
              {form.labType === 'python' && (
                <div className="rounded-lg border border-purple-500/30 bg-purple-500/[0.06] p-3">
                  <label className="flex items-start gap-2 text-sm font-semibold text-white"><input type="checkbox" className="mt-1" checked={isExam} disabled={!!switchBlock} onChange={(e) => setIsExam(e.target.checked)} /><span>This lesson is the final exam</span></label>
                  {switchBlock && <p role="note" className="mt-1 text-xs text-amber-300">{switchBlock}</p>}
                  {!switchBlock && !exam && examCtx.currentId && examCtx.currentId !== lesson.id && <p className="mt-1 text-xs text-stone-400">This moves the exam from “{examCtx.currentLabel}”, which stays an ordinary assignment. Learners keep their exam results.</p>}
                  {!switchBlock && <p className="mt-1 text-xs text-stone-500">An exam is optional. With one, learners must pass it (graded on the server) to get the certificate; the exam file is this lesson's assignment file.</p>}
                  {isExam && (
                    <label className="mt-2 block text-xs font-semibold text-stone-400">Expected result (optional)<input value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="https://raw.githubusercontent.com/…" className={`${inputClass} mt-1 font-mono text-xs font-normal`} /></label>
                  )}
                </div>
              )}
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={form.carryOverCode} onChange={(e) => setForm({ ...form, carryOverCode: e.target.checked })} /><span>{CARRY_OVER_LABEL}</span></label>
            </div>
          )}
        </fieldset>
      )}

      <fieldset className="rounded-lg border border-white/10 p-3">
        <legend className="px-2 text-sm font-bold text-white">{isDoc ? 'Extra materials' : 'Resources'} ({allResources().length} of {LIMITS.resourcesPerLesson})</legend>
        <p className={`${hintClass} mb-2 mt-0`}>Cheat sheets, slides or links shown next to the lesson.</p>
        <div className="space-y-3">
          {extras.map((r, i) => <div key={i}>{resourceRow(r, (p) => setExtra(i, p), { title: 'Title', url: 'Link', type: 'Type' }, () => setExtras(extras.filter((_, j) => j !== i)), `Remove resource ${i + 1}`)}</div>)}
          {allResources().length < LIMITS.resourcesPerLesson && <button type="button" className={ghostButtonClass} onClick={() => setExtras([...extras, emptyResource()])}>Add a resource</button>}
        </div>
      </fieldset>

      {problems.length > 0 && <ul role="alert" className="list-disc rounded-lg bg-amber-500/10 p-3 pl-7 text-xs text-amber-200">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
      <ErrorNote failure={failure} />
      <div className="flex gap-3"><button type="submit" disabled={busy || problems.length > 0} className={buttonClass}>{busy ? 'Saving…' : 'Save lesson'}</button><button type="button" className={ghostButtonClass} onClick={onClose}>Cancel</button></div>
    </form>
  );
}
