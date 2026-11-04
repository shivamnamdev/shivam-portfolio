'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Code2 } from 'lucide-react';

type Module = { week?: string; title: string; topics: string[] };

export default function CourseCurriculum({ modules }: { modules?: Module[] }) {
  const [openModule, setOpenModule] = useState<number | null>(0);
  if (!modules?.length) return null;

  return (
    <section className="w-full max-w-4xl mx-auto scroll-mt-24" id="curriculum">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-display font-black text-white mb-4">Program Curriculum</h2>
        <p className="text-stone-400">Everything you will master in this cohort.</p>
      </div>
      <div className="space-y-4">
        {modules.map((mod, i) => {
          const isActive = openModule === i;
          return (
            <div key={i} className={`rounded-xl overflow-hidden transition-colors border ${isActive ? 'bg-[#121212] border-amber-500/50' : 'border-white/10 hover:border-white/30'}`}>
              <button onClick={() => setOpenModule(isActive ? null : i)} aria-expanded={isActive} className="w-full p-5 flex items-center justify-between text-left">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  {mod.week && <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 bg-white/5 px-2 py-1 rounded border border-white/5 w-fit">{mod.week}</span>}
                  <h3 className={`font-bold ${isActive ? 'text-amber-500' : 'text-stone-300'}`}>{mod.title}</h3>
                </div>
                <motion.div animate={{ rotate: isActive ? 180 : 0 }}><ChevronDown className="text-stone-500 shrink-0 ml-2" /></motion.div>
              </button>
              <AnimatePresence>
                {isActive && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <ul className="p-5 pt-3 space-y-3 border-t border-white/5 bg-[#0a0a0a]">
                      {mod.topics.map((topic, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-stone-400 text-sm">
                          <Code2 size={16} className="text-amber-500/80 mt-0.5 shrink-0" /> {topic}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
