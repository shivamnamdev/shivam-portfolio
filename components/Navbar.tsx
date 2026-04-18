'use client';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  },[]);

  return (
    <motion.nav
      initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
      className={`sticky w-full top-0 z-50 flex justify-center transition-all duration-300 ${scrolled ? 'py-4' : 'py-6'}`}
    >
      <div className="flex items-center gap-6 md:gap-8 px-6 py-3 rounded-full border border-stone-200 bg-white/90 backdrop-blur-xl shadow-lg">
        <Link href="/" className={`text-sm font-bold transition-colors ${pathname === '/' ? 'text-amber-600' : 'text-stone-600 hover:text-amber-600'}`}>
          Home
        </Link>
        <Link href="/courses" className={`text-sm font-bold transition-colors ${pathname.includes('/courses') ? 'text-amber-600' : 'text-stone-600 hover:text-amber-600'}`}>
          Courses
        </Link>
        <Link href="/about" className={`text-sm font-bold transition-colors ${pathname === '/about' ? 'text-amber-600' : 'text-stone-600 hover:text-amber-600'}`}>
          About
        </Link>
        <Link href="/contact" className={`text-sm font-bold transition-colors ${pathname === '/contact' ? 'text-amber-600' : 'text-stone-600 hover:text-amber-600'}`}>
          Contact
        </Link>
      </div>
    </motion.nav>
  );
}