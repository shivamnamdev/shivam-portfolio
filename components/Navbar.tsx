'use client';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  },[]);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <motion.nav
      initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.5 }}
      className={`sticky w-full top-0 left-0 right-0 z-50 flex justify-center transition-all duration-300 ${scrolled ? 'py-4' : 'py-6'}`}
    >
      <div className="flex items-center gap-6 md:gap-8 px-6 py-3 rounded-full border border-amber-500/20 bg-[#0a0a0b]/80 backdrop-blur-xl shadow-lg">
        <button onClick={() => scrollTo('hero')} className="text-sm font-medium text-slate-300 hover:text-amber-400 transition-colors">Course</button>
        <button onClick={() => scrollTo('live-sessions')} className="text-sm font-medium text-slate-300 hover:text-amber-400 transition-colors">Live Cohorts & Sessions</button>
        <button onClick={() => scrollTo('instructor')} className="text-sm font-medium text-slate-300 hover:text-amber-400 transition-colors">Instructor</button>
      </div>
    </motion.nav>
  );
}