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
    <section className="w-full pt-10 flex flex-col gap-6 relative" id="hero">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2, duration: 0.8 }} className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel text-sm text-blue-400 w-fit">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
        </span>
        Available for new opportunities
      </motion.div>

      <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.1, duration: 0.8 }} className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500">
        Shivam Namdev
      </motion.h1>

      <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.2, duration: 0.8 }} className="text-xl md:text-2xl text-slate-300 font-medium max-w-3xl leading-relaxed">
        QA Lead | Python, Pytest, Playwright | GitHub Copilot & AgenticAI Specialist
        <span className="block text-blue-400 mt-2">Delivering Scalable, Reliable Test Automation Frameworks.</span>
      </motion.h2>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.3, duration: 0.8 }} className="flex flex-wrap items-center gap-4 text-slate-400 text-sm md:text-base mt-2">
        <div className="flex items-center gap-2"><MapPin size={16}/> Pune Division, Maharashtra, India</div>
        <div className="flex items-center gap-2"><Mail size={16}/> shivamnamdev.edu@gmail.com</div>
        <div className="flex items-center gap-2 cursor-pointer hover:text-white transition"><LinkedinIcon size={16}/> linkedin.com/in/shivam-namdev</div>
      </motion.div>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4, duration: 0.8 }} className="text-slate-400 max-w-4xl mt-6 leading-relaxed text-sm md:text-base glass-panel p-6 rounded-2xl">
        I didn’t start my journey in a tech lab or at a coding bootcamp. I started in a karate dojo. At 17, I was selected and played in the Asian and World Karate Championships; I was learning discipline, resilience, and the power of a strong mindset. Later, I traded sparring mats for a piano keyboard, studying under the ABRSM syllabus, writing songs, and composing music. Those early chapters taught me two things: how to master a craft through practice and how to adapt to new challenges. When I stepped into the world of technology, I brought the same focus, creativity, and persistence. Today, as a Lead QA, I design and lead scalable and reliable test automation frameworks using Python, Pytest, Selenium, Protractor, and Shell scripting. I’m hands-on with GitHub Copilot and agentic AI for coding, accelerating development cycles and improving quality at scale. I solve problems like: • Slow, inefficient QA processes • Fragile, hard-to-maintain automation systems • Underused opportunities to apply AI in testing. For me, leadership is about empathy, clarity, and helping teams grow— because great technology is built by great people. From martial arts to music and now technology, my journey has been anything but linear — but every turn has taught me to approach problems with discipline, creativity, and an eye for quality. Because in life, as in software, excellence is a habit, not a one-time act.
      </motion.p>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.5, duration: 0.8 }} className="flex gap-4 mt-6">
        <button onClick={() => document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' })} className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-2 transition-all hover:gap-3">
          View Experience <ChevronRight size={18} />
        </button>
        <button onClick={() => window.print()} className="px-6 py-3 rounded-lg glass-panel text-white font-medium flex items-center gap-2 hover:bg-white/10 transition-all">
          <Download size={18} /> Download Resume
        </button>
      </motion.div>
    </section>
  );
}