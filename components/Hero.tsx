'use client';
import { motion } from 'framer-motion';
import { Mail, MapPin, Download, ChevronRight } from 'lucide-react';

const LinkedinIcon = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export default function Hero() {
  return (
    <section className="w-full pt-16 md:pt-24 flex flex-col gap-6 relative" id="hero">
      {/* Background Ambient Glow */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none -z-10" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2, duration: 0.8 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-sm text-blue-300 w-fit backdrop-blur-md">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
        </span>
        Available for new opportunities
      </motion.div>

      <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.1, duration: 0.8 }} className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-600 drop-shadow-sm">
        Shivam Namdev
      </motion.h1>

      <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.2, duration: 0.8 }} className="text-xl md:text-2xl text-slate-300 font-medium max-w-3xl leading-relaxed">
        QA Lead | Python, Pytest, Playwright | GitHub Copilot & AgenticAI Specialist
        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mt-2 font-semibold">Delivering Scalable, Reliable Test Automation Frameworks.</span>
      </motion.h2>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.3, duration: 0.8 }} className="flex flex-wrap items-center gap-6 text-slate-400 text-sm md:text-base mt-2 font-medium">
        <div className="flex items-center gap-2"><MapPin size={18} className="text-slate-500"/> Pune, Maharashtra, India</div>
        <a href="mailto:shivamnamdev.edu@gmail.com" className="flex items-center gap-2 hover:text-white transition-colors"><Mail size={18} className="text-slate-500"/> shivamnamdev.edu@gmail.com</a>
        <a href="https://linkedin.com/in/shivam-namdev" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white transition-colors"><LinkedinIcon size={18} /> linkedin.com/in/shivam-namdev</a>
      </motion.div>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4, duration: 0.8 }} className="text-slate-300 max-w-4xl mt-8 leading-relaxed text-sm md:text-base glass-panel p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        I didn’t start my journey in a tech lab or at a coding bootcamp. I started in a karate dojo. At 17, I was selected and played in the Asian and World Karate Championships; I was learning discipline, resilience, and the power of a strong mindset. Later, I traded sparring mats for a piano keyboard, studying under the ABRSM syllabus, writing songs, and composing music. Those early chapters taught me two things: how to master a craft through practice and how to adapt to new challenges. When I stepped into the world of technology, I brought the same focus, creativity, and persistence. Today, as a Lead QA, I design and lead scalable and reliable test automation frameworks using Python, Pytest, Selenium, Protractor, and Shell scripting. I’m hands-on with GitHub Copilot and agentic AI for coding, accelerating development cycles and improving quality at scale. I solve problems like: • Slow, inefficient QA processes • Fragile, hard-to-maintain automation systems • Underused opportunities to apply AI in testing. For me, leadership is about empathy, clarity, and helping teams grow— because great technology is built by great people. From martial arts to music and now technology, my journey has been anything but linear — but every turn has taught me to approach problems with discipline, creativity, and an eye for quality. Because in life, as in software, excellence is a habit, not a one-time act.
      </motion.p>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.5, duration: 0.8 }} className="flex flex-wrap gap-4 mt-8">
        <button onClick={() => document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' })} className="px-8 py-3.5 rounded-full bg-white text-slate-950 font-bold flex items-center gap-2 transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] group">
          View Experience <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
        <button onClick={() => window.print()} className="px-8 py-3.5 rounded-full glass-panel text-white font-medium flex items-center gap-2 hover:bg-white/10 transition-all hover:scale-105">
          <Download size={18} /> Download Resume
        </button>
      </motion.div>
    </section>
  );
}