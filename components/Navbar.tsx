'use client';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const[scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  },[]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut", delay: 1.5 }}
      className={`fixed top-0 left-0 right-0 z-50 flex justify-center py-6 transition-all duration-300 ${
        scrolled ? 'py-4' : 'py-6'
      }`}
    >
      <div className="flex items-center gap-8 px-6 py-3 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <button onClick={() => scrollTo('hero')} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Home</button>
        <button onClick={() => scrollTo('impact')} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Impact</button>
        <button onClick={() => scrollTo('experience')} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Experience</button>
      </div>
    </motion.nav>
  );
}