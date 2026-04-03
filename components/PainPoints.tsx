'use client';
import { motion } from 'framer-motion';
import { XCircle, CheckCircle2 } from 'lucide-react';

export default function PainPoints() {
  return (
    <section className="w-full relative z-10 my-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* The Old Way */}
        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="glass-panel p-8 rounded-3xl border border-red-500/20 bg-red-500/5">
          <h3 className="text-2xl font-bold text-white mb-6">The Old QA Reality</h3>
          <ul className="space-y-4">
            {['Tests constantly breaking on UI changes.', 'Regression suites taking 4+ hours to run.', 'Hours wasted writing boilerplate code.', 'Fear of AI rendering manual testing obsolete.'].map((point, i) => (
              <li key={i} className="flex gap-3 text-slate-300">
                <XCircle className="text-red-400 flex-shrink-0 mt-0.5" /> <span>{point}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* The New Way */}
        <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="glass-panel p-8 rounded-3xl border border-amber-500/30 bg-amber-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[80px]" />
          <h3 className="text-2xl font-bold text-white mb-6 relative z-10">The Agentic AI Reality</h3>
          <ul className="space-y-4 relative z-10">
            {['Modular, bulletproof Pytest & Playwright architecture.', 'Parallel execution cutting runs to minutes.', 'GitHub Copilot writing 60% of your boilerplate.', 'Leading the AI QA transition instead of fearing it.'].map((point, i) => (
              <li key={i} className="flex gap-3 text-slate-200 font-medium">
                <CheckCircle2 className="text-amber-400 flex-shrink-0 mt-0.5" /> <span>{point}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}