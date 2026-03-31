'use client';
import { motion } from 'framer-motion';
import { Mail, MapPin, Download, ChevronRight } from 'lucide-react';
import Terminal from './Terminal';

const LinkedinIcon = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" /></svg>
);

export default function Hero() {
  return (
    <section className="w-full pt-16 md:pt-24 flex flex-col lg:flex-row gap-12 lg:gap-6 items-center relative" id="hero">
      
      {/* Left Column: Text & CTA */}
      <div className="w-full lg:w-3/5 flex flex-col gap-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2, duration: 0.8 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-sm text-amber-300 w-fit backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          Executive QA Leadership
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.1, duration: 0.8 }} className="text-6xl md:text-8xl font-display font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-600">
          Shivam Namdev
        </motion.h1>

        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.2, duration: 0.8 }} className="text-xl md:text-2xl text-slate-300 font-medium max-w-2xl leading-relaxed">
          QA Lead | Python, Pytest, Playwright
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500 mt-2 font-semibold">GitHub Copilot & Agentic AI Specialist.</span>
        </motion.h2>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.3, duration: 0.8 }} className="flex flex-wrap items-center gap-6 text-slate-400 text-sm md:text-base mt-2 font-mono">
          <div className="flex items-center gap-2"><MapPin size={18} className="text-amber-500"/> Pune, India</div>
          <a href="mailto:shivamnamdev.edu@gmail.com" className="flex items-center gap-2 hover:text-white transition-colors"><Mail size={18} className="text-amber-500"/> Email</a>
          <a href="https://linkedin.com/in/shivam-namdev" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white transition-colors"><LinkedinIcon size={18} /> LinkedIn</a>
        </motion.div>

        {/* 🚨 THE FIX: Changed motion.p to motion.div here! */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4, duration: 0.8 }} className="text-slate-300 max-w-2xl mt-4 leading-relaxed text-sm md:text-base glass-panel p-6 md:p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <p className="relative z-10">
            I didn’t start my journey in a tech lab. I started in a karate dojo. At 17, I played in the Asian & World Karate Championships. Later, I traded sparring mats for a piano, writing and composing music. Those early chapters taught me how to master a craft through practice. Today, as a Lead QA, I bring that same discipline to tech—designing scalable automation frameworks using Python and Agentic AI to eliminate fragile testing systems. Excellence is a habit, not a one-time act.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.5, duration: 0.8 }} className="flex flex-wrap gap-4 mt-4">
          <button onClick={() => document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' })} className="px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold flex items-center gap-2 transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] group">
            View Experience <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <button onClick={() => window.print()} className="px-8 py-3.5 rounded-full glass-panel text-white font-medium flex items-center gap-2 hover:bg-white/10 transition-all hover:scale-105">
            <Download size={18} /> Resume
          </button>
        </motion.div>
      </div>

      {/* Right Column: Image & Terminal */}
      <div className="w-full lg:w-2/5 relative min-h-[500px] flex items-center justify-center">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-amber-500/20 blur-[100px] rounded-full pointer-events-none" />
        
        {/* Profile Image Wrapper */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 2.5, duration: 1 }}
          className="absolute top-0 right-0 lg:right-10 w-64 h-80 rounded-3xl overflow-hidden border border-white/10 shadow-2xl z-0 bg-white/5"
        >
          <img src="/shivam.png" alt="Shivam Namdev" className="w-full h-full object-cover opacity-90 mix-blend-luminosity hover:mix-blend-normal transition-all duration-700" onError={(e) => e.currentTarget.style.display = 'none'} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-transparent to-transparent" />
        </motion.div>

        {/* Terminal Component */}
        <div className="absolute bottom-0 left-0 lg:-left-12 z-20 w-full">
          <Terminal />
        </div>
      </div>
    </section>
  );
}