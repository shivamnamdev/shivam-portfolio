'use client';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

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
      className={`sticky w-full top-0 z-50 flex justify-center transition-all duration-300 ${scrolled ? 'py-4' : 'py-6 px-6'}`}
    >
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto px-6 py-3 rounded-full border border-stone-200 bg-white/90 backdrop-blur-xl shadow-lg">
        
        {/* LEFT: YOUR NEW LOGO */}
        <Link href="/" className="flex items-center gap-3 group">
          {/* Ensure you have logo.png in your public folder! */}
          <img src="/logo.png" alt="Logo" className="h-8 w-auto group-hover:scale-105 transition-transform" onError={(e) => e.currentTarget.style.display = 'none'} />
          <span className="font-display font-black text-xl tracking-tight text-stone-900 hidden sm:block">SHIVAM.</span>
        </Link>

        {/* MIDDLE: NAVIGATION LINKS */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className={`text-sm font-bold transition-colors ${pathname === '/' ? 'text-amber-600' : 'text-stone-600 hover:text-amber-600'}`}>Home</Link>
          <Link href="/courses" className={`text-sm font-bold transition-colors ${pathname.includes('/courses') ? 'text-amber-600' : 'text-stone-600 hover:text-amber-600'}`}>Courses</Link>
          <Link href="/about" className={`text-sm font-bold transition-colors ${pathname === '/about' ? 'text-amber-600' : 'text-stone-600 hover:text-amber-600'}`}>About</Link>
        </div>

        {/* RIGHT: LOGIN SYSTEM */}
        <div className="flex items-center gap-4">
          
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-6 py-2 rounded-full bg-stone-900 text-white font-bold text-sm hover:bg-stone-800 transition-colors shadow-md">
                Student Login
              </button>
            </SignInButton>
          </SignedOut>
          
          <SignedIn>
            <div className="flex items-center gap-4">
              <Link href="/learning" className="hidden sm:block px-5 py-2 rounded-full bg-stone-900 text-white font-bold text-sm hover:bg-stone-800 transition-colors">
                My Dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>

          {/* 🚨 DEBUG TEXT: If you see this, but no buttons, Clerk is failing to read your API keys! */}
          <div className="text-xs text-red-500 font-mono hidden">Clerk Area</div>

        </div>

      </div>
    </motion.nav>
  );
}