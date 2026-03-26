'use client';
import { motion } from 'framer-motion';

export default function Expertise() {
  return (
    <section className="w-full relative scroll-mt-32" id="impact">
      <div className="mb-12">
        <h3 className="text-3xl font-bold text-white mb-4">My Expertise</h3>
        <p className="text-slate-400 text-lg max-w-2xl">Measurable impact delivered through advanced automation and strategic leadership.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { metric: "30%", title: "Speed Increase", context: "Cut automation dev time via Copilot & Agentic AI" },
          { metric: "40%", title: "Manual Effort Saved", context: "Reduction in manual testing via Pytest frameworks" },
          { metric: ">85%", title: "Test Coverage", context: "API & UI automation coverage achieved consistently" },
          { metric: "50%", title: "Pipeline Speed", context: "Faster regression testing via parallel execution" },
        ].map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="p-6 rounded-3xl border border-white/10 bg-white/5 relative overflow-hidden group hover:border-blue-500/50 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />
            <span className="block text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 mb-2">{item.metric}</span>
            <h4 className="text-white font-bold mb-1">{item.title}</h4>
            <p className="text-sm text-slate-400">{item.context}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}