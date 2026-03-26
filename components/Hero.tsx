'use client';
import { motion } from 'framer-motion';
import { Mail, MapPin, Download, ChevronRight, Terminal, Award, Cpu } from 'lucide-react';

const LinkedinIcon = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" />
  </svg>
);

export default function Hero() {
  return (
    <section className="w-full pt-10 lg:pt-20 flex flex-col gap-8 relative" id="hero">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2, duration: 0.8 }} className="space-y-4">
        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white leading-tight">
          Shivam <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Namdev</span>
        </h1>
        <h2 className="text-xl sm:text-2xl text-slate-300 font-medium max-w-3xl leading-relaxed">
          QA Lead & Software Engineer | Python, Pytest, Playwright
          <span className="block text-slate-500 mt-1">Delivering Scalable Test Automation & Agentic AI Solutions.</span>
        </h2>
      </motion.div>

      {/* Quick Highlights Strip */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2, duration: 0.8 }} className="flex flex-wrap gap-4 mt-2">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm font-medium text-slate-200">
          <Terminal size={16} className="text-blue-400"/> 7+ Years Experience
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm font-medium text-slate-200">
          <Award size={16} className="text-cyan-400"/> ISTQB Certified
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm font-medium text-slate-200">
          <Cpu size={16} className="text-blue-400"/> Agentic AI Specialist
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.3, duration: 0.8 }} className="flex flex-wrap items-center gap-6 text-slate-400 text-sm mt-4">
        <div className="flex items-center gap-2"><MapPin size={16}/> Pune, India</div>
        <a href="mailto:shivamnamdev.edu@gmail.com" className="flex items-center gap-2 hover:text-white transition"><Mail size={16}/> shivamnamdev.edu@gmail.com</a>
        <a href="https://linkedin.com/in/shivam-namdev" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white transition"><LinkedinIcon size={16}/> linkedin.com/in/shivam-namdev</a>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.5, duration: 0.8 }} className="flex flex-wrap gap-4 mt-4">
        <button onClick={() => document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' })} className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-2 transition-all hover:gap-3 shadow-[0_0_20px_rgba(37,99,235,0.3)]">
          View Experience <ChevronRight size={18} />
        </button>
        <button onClick={() => window.print()} className="px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-medium flex items-center gap-2 hover:bg-white/10 transition-all">
          <Download size={18} /> Download Resume
        </button>
      </motion.div>
    </section>
  );
}