"use client";
// The result window after an exam submission (SCP-115): passing score, the score, green with a celebration at 80% or more, red with a
// motivational note below that, then the submitted code and one improvement note per question. All text is rendered as text (never HTML).
import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, X, Trophy, HeartCrack } from "lucide-react";
import type { ExamNote } from "@/lib/examNotes";
import type { ExamResultView } from "@/lib/examResult";

export type ExamResultData = { score: number; view: ExamResultView; notes: ExamNote[]; code: string };

const COLORS = ["#f59e0b", "#22c55e", "#38bdf8", "#f472b6", "#a78bfa", "#facc15"];
const PIECES = Array.from({ length: 36 }, (_, i) => ({ left: (i * 37) % 100, delay: (i % 9) * 0.08, drift: ((i * 53) % 80) - 40, color: COLORS[i % COLORS.length], size: 6 + (i % 4) * 2 }));

function Celebration() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div aria-hidden="true" data-testid="exam-celebration" className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden">
      {PIECES.map((p, i) => (
        <motion.span key={i} className="absolute top-0 block rounded-sm" style={{ left: `${p.left}%`, width: p.size, height: p.size * 1.6, background: p.color }}
          initial={{ y: -20, opacity: 1, rotate: 0 }} animate={{ y: 420, x: p.drift, opacity: 0, rotate: 540 }} transition={{ duration: 2.4, delay: p.delay, ease: "easeIn" }} />
      ))}
    </div>
  );
}

export default function ExamResultModal({ result, onClose }: { result: ExamResultData; onClose: () => void }) {
  const { view, notes, code, score } = result;
  const closeRef = useRef<HTMLButtonElement>(null);
  const pass = view.tone === "pass";
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-8">
      <motion.div role="dialog" aria-modal="true" aria-label="Exam result" data-testid="exam-result" data-tone={view.tone}
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-[#0d1117] w-full max-w-3xl rounded-3xl border border-stone-700 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {pass && <Celebration />}
        <div className={`relative px-6 py-6 border-b ${pass ? "bg-emerald-950/70 border-emerald-700" : "bg-red-950/70 border-red-800"}`}>
          <button ref={closeRef} aria-label="Close exam result" onClick={onClose} className="absolute right-4 top-4 text-stone-300 hover:text-white"><X size={22} /></button>
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-stone-300">{view.headline}</p>
          <div className="mt-2 flex items-center gap-4">
            <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${pass ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
              {pass ? <Trophy size={34} /> : <HeartCrack size={34} />}
            </div>
            <div>
              <h2 data-testid="exam-result-title" className={`text-2xl font-black ${pass ? "text-emerald-300" : "text-red-300"}`}>{pass ? "🎉 " : ""}{view.title}</h2>
              <p data-testid="exam-result-message" className="mt-1 text-sm text-stone-200">{view.message}</p>
            </div>
          </div>
          <p className={`mt-4 text-5xl font-black ${pass ? "text-emerald-400" : "text-red-400"}`} aria-label={`Score ${score} percent`}>{score}%</p>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          <section aria-labelledby="exam-notes-h">
            <h3 id="exam-notes-h" className="text-sm font-bold uppercase tracking-widest text-amber-400">Improvement note</h3>
            {notes.length === 0 ? <p className="mt-2 text-sm text-stone-400">No per-question notes were produced for this attempt.</p> : (
              <ul className="mt-3 space-y-2">
                {notes.map((n) => (
                  <li key={n.q} data-testid={`exam-note-${n.q}`} data-passed={n.passed} className={`rounded-xl border p-3 text-sm ${n.passed ? "border-emerald-800 bg-emerald-950/40 text-emerald-100" : "border-red-900 bg-red-950/40 text-red-100"}`}>
                    <span className="flex items-center gap-2 font-bold">{n.passed ? <CheckCircle2 size={16} /> : <X size={16} />}{n.label}</span>
                    <span className="mt-1 block text-stone-200">{n.note}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="exam-code-h">
            <h3 id="exam-code-h" className="text-sm font-bold uppercase tracking-widest text-stone-400">Your submitted code</h3>
            <pre data-testid="exam-submitted-code" className="mt-2 max-h-72 overflow-auto rounded-xl border border-stone-800 bg-[#0a0c10] p-4 text-xs font-mono text-stone-300 whitespace-pre-wrap">{code}</pre>
          </section>
        </div>
        <div className="p-4 border-t border-stone-800 bg-[#161b22] flex justify-end">
          <button onClick={onClose} className="px-8 py-3 bg-stone-700 hover:bg-stone-600 text-white rounded-xl font-bold transition-colors">Close</button>
        </div>
      </motion.div>
    </div>
  );
}
