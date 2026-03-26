'use client';
import { motion } from 'framer-motion';
import { Shield, Music, Terminal } from 'lucide-react';

export default function Story() {
  return (
    <section className="w-full relative scroll-mt-32" id="story">
      <div className="mb-12">
        <h3 className="text-3xl font-bold text-white mb-4">My Journey</h3>
        <p className="text-slate-400 text-lg max-w-3xl">
          My path to technology wasn't linear. Every phase taught me how to approach problems with discipline, creativity, and an eye for quality. Excellence is a habit, not a one-time act.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
          <Shield className="w-10 h-10 text-blue-400 mb-4" />
          <h4 className="text-xl font-bold text-white mb-2">The Discipline</h4>
          <p className="text-sm text-slate-400">At 17, I competed in the Asian & World Karate Championships. The dojo taught me resilience, discipline, and the power of a strong mindset.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
          <Music className="w-10 h-10 text-cyan-400 mb-4" />
          <h4 className="text-xl font-bold text-white mb-2">The Harmony</h4>
          <p className="text-sm text-slate-400">I traded sparring mats for a piano, studying the ABRSM syllabus and composing music. It taught me how to master a craft through relentless practice.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
          <Terminal className="w-10 h-10 text-blue-500 mb-4" />
          <h4 className="text-xl font-bold text-white mb-2">The Precision</h4>
          <p className="text-sm text-slate-400">Bringing that focus to tech, I now lead QA teams, build scalable automation, and leverage Agentic AI to eliminate fragile, inefficient testing systems.</p>
        </motion.div>
      </div>
    </section>
  );
}