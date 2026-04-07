'use client';
import { motion } from 'framer-motion';
import { PlayCircle, ChevronRight, Star } from 'lucide-react';

export default function HeroVSL() {
  const scrollToCohorts = () => {
    document.getElementById('live-sessions')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="w-full pt-20 md:pt-32 flex flex-col items-center text-center relative z-10" id="hero">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-300 bg-amber-50 text-sm text-amber-700 font-bold mb-6 shadow-sm">
        <Star size={16} className="fill-amber-500 text-amber-500" /> Starting Today: 2 Days Free Demo
      </motion.div>

      <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-5xl md:text-7xl font-display font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-stone-900 via-stone-700 to-stone-500 max-w-4xl leading-tight mb-6">
        Master Python Programming & <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-500">Logic Building</span>.
      </motion.h1>

      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg md:text-xl text-stone-600 font-medium max-w-2xl leading-relaxed mb-10">
        Stop getting stuck in "tutorial hell." Join my interactive live cohort to write code confidently, build real-world projects, and become job-ready in just 45 days.
      </motion.p>

      {/* Video Sales Letter (VSL) Placeholder */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="w-full max-w-4xl aspect-video rounded-3xl glass-panel relative flex items-center justify-center overflow-hidden group cursor-pointer border border-stone-200 shadow-xl mb-10 bg-stone-100">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1526379095098-d400fd0bf935?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-10 group-hover:opacity-20 transition-opacity" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#fdfcf8] via-transparent to-transparent opacity-80" />
        <PlayCircle size={80} className="text-amber-500 opacity-90 group-hover:scale-110 group-hover:opacity-100 transition-all duration-300 z-10 drop-shadow-md" />
      </motion.div>

      <motion.button onClick={scrollToCohorts} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="px-10 py-5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-lg flex items-center gap-3 transition-all hover:scale-105 hover:shadow-xl shadow-amber-500/30 group">
        Claim Your Free Demo <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
      </motion.button>
    </section>
  );
}