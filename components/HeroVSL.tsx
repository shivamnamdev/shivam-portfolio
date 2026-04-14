'use client';
import { motion } from 'framer-motion';
import { ChevronRight, Star } from 'lucide-react';

export default function HeroVSL() {
  const scrollToCohorts = () => document.getElementById('live-sessions')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section className="w-full pt-16 md:pt-28 flex flex-col lg:flex-row items-center gap-12 relative z-10" id="hero">
      <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-sm text-amber-400 font-bold mb-6 shadow-sm">
          <Star size={16} className="fill-amber-500 text-amber-500" /> Starting Today: 2 Days Free Demo
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-5xl md:text-6xl lg:text-7xl font-display font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 leading-tight mb-6">
          Master Python Programming & <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-yellow-400">Logic Building</span>.
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg md:text-xl text-slate-300 font-medium max-w-xl leading-relaxed mb-10">
          Stop getting stuck in "tutorial hell." Join my interactive live cohort to write code confidently, build real-world projects, and become job-ready in just 45 days.
        </motion.p>
        <motion.button onClick={scrollToCohorts} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black text-lg flex items-center justify-center gap-3 transition-all hover:scale-105 hover:shadow-xl shadow-amber-500/30 w-full sm:w-auto group">
          Claim Your Free Demo <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </div>
      <div className="w-full lg:w-1/2 flex justify-center lg:justify-end relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-amber-500/15 blur-[100px] rounded-full pointer-events-none -z-10" />
        <motion.div initial={{ opacity: 0, scale: 0.9, rotate: -2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ delay: 0.4, duration: 0.6, type: "spring" }} className="relative w-full max-w-md rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(245,158,11,0.2)] transform hover:scale-[1.02] hover:-rotate-1 transition-all duration-300 bg-black">
          <img src="/course-flyer.jpg" alt="Python Course Early Bird Offer" className="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity" />
        </motion.div>
      </div>
    </section>
  );
}