'use client';
import { motion } from 'framer-motion';
import { PlayCircle, ChevronRight, Star } from 'lucide-react';

export default function HeroVSL() {
  const scrollToPricing = () => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section className="w-full pt-20 md:pt-32 flex flex-col items-center text-center relative z-10" id="hero">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-amber-500/10 blur-[150px] rounded-full pointer-events-none -z-10" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-sm text-amber-400 font-bold mb-6">
        <Star size={16} className="fill-amber-400" /> Waitlist Open: 50% Off Early Bird
      </motion.div>

      <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-5xl md:text-7xl font-display font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-400 max-w-4xl leading-tight mb-6">
        Master Scalable Test Automation & <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500">Agentic AI</span>.
      </motion.h1>

      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg md:text-xl text-slate-300 font-medium max-w-2xl leading-relaxed mb-10">
        Stop writing fragile, flaky scripts. Learn the exact Python, Pytest, and GitHub Copilot frameworks I use to cut QA cycles by 50% and bulletproof enterprise releases.
      </motion.p>

      {/* Video Sales Letter (VSL) Placeholder */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="w-full max-w-4xl aspect-video rounded-3xl glass-panel relative flex items-center justify-center overflow-hidden group cursor-pointer border border-amber-500/20 shadow-[0_0_50px_rgba(245,158,11,0.15)] mb-10">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-luminosity group-hover:opacity-30 transition-opacity" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-transparent to-transparent" />
        <PlayCircle size={80} className="text-amber-400 opacity-80 group-hover:scale-110 group-hover:opacity-100 transition-all duration-300 z-10" />
      </motion.div>

      <motion.button onClick={scrollToPricing} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="px-10 py-5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-lg flex items-center gap-3 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] group">
        Secure Your Early Bird Spot <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
      </motion.button>
    </section>
  );
}