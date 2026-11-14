import { FINAL_EXAM_BADGE, outline, type Module } from '@/lib/adminUi/curriculum';

// A read-only preview of the working copy the way a learner will see the outline: modules in order, lessons numbered per module, modules locked until the exam,
// assignments, the exam and resources flagged. It writes nothing and calls no learner API.
export default function OutlinePreview({ modules }: { modules: Module[] }) {
  const rows = outline(modules);
  if (!rows.length) return <p className="rounded-xl border border-white/10 p-6 text-center text-sm text-stone-400">The curriculum is empty. Add a module to start.</p>;
  return (
    <div aria-label="Learner outline preview" className="space-y-4">
      <p className="text-xs text-stone-500">Preview of the working copy (including unpublished changes). Learners see only the published copy.</p>
      {rows.map((m, i) => (
        <section key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="flex items-center gap-2 font-display text-base font-bold text-white">{m.moduleTitle}{m.advanced && <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[11px] font-semibold text-purple-300" title="Learners see these videos after passing the final exam">Locked until exam</span>}</h3>
          {m.lessons.length === 0 ? <p className="mt-2 text-sm text-stone-500">No lessons yet.</p> : (
            <ol className="mt-3 space-y-1.5">
              {m.lessons.map((l) => (
                <li key={l.number} className="flex flex-wrap items-center gap-2 text-sm text-stone-300"><span className="w-14 shrink-0 text-xs text-stone-500">Lesson {l.number}</span><span>{l.label}</span>
                  {l.assignment && (l.exam ? <span className="rounded-full bg-purple-500/25 px-2 py-0.5 text-[11px] font-semibold text-purple-200">{FINAL_EXAM_BADGE}</span> : <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[11px] text-sky-300">Assignment</span>)}
                  {l.resources > 0 && <span className="rounded-full bg-stone-500/20 px-2 py-0.5 text-[11px] text-stone-300">{l.resources} resource{l.resources === 1 ? '' : 's'}</span>}</li>
              ))}
            </ol>
          )}
        </section>
      ))}
    </div>
  );
}
