'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignInButton, Show, UserButton, useUser } from '@clerk/nextjs';
import { Menu, X, ShieldAlert } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import Banners from '@/components/Banners';

import { ADMIN_EMAIL, isAdminEmail } from '@/lib/admin';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useUser();
  const isAdmin = isAdminEmail(user?.primaryEmailAddress?.emailAddress);   // only decides whether the link is shown; /admin checks the admin on the server


  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
    <Banners placement="site-top" />
    <motion.nav
      initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${scrolled ? 'py-2 md:py-4' : 'py-3 md:py-6 px-2 md:px-6'}`}
    >
      <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0a0a0a]/80 px-3 py-3 shadow-2xl backdrop-blur-xl md:rounded-full md:px-6">
        
        <Link href="/" className="group z-50 flex items-center gap-2 md:gap-3" onClick={() => setIsMobileMenuOpen(false)}>
          <img src="/logo.png" alt="Logo" className="h-7 w-auto transition-transform group-hover:scale-105 md:h-8" onError={(e) => e.currentTarget.style.display = 'none'} />
          <span className="font-display text-lg font-black tracking-tight text-white md:text-xl">SHIVAM.</span>
        </Link>

        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
          <Link href="/" className={`text-sm font-bold transition-colors ${pathname === '/' ? 'text-amber-500' : 'text-stone-400 hover:text-white'}`}>Home</Link>
          <Link href="/courses" className={`text-sm font-bold transition-colors ${pathname.includes('/courses') ? 'text-amber-500' : 'text-stone-400 hover:text-white'}`}>Courses</Link>
          <Link href="/about" className={`text-sm font-bold transition-colors ${pathname === '/about' ? 'text-amber-500' : 'text-stone-400 hover:text-white'}`}>About</Link>
          <Link href="/contact" className={`text-sm font-bold transition-colors ${pathname === '/contact' ? 'text-amber-500' : 'text-stone-400 hover:text-white'}`}>Contact</Link>
        </div>

        <div className="z-50 flex items-center gap-2 md:gap-4">
          <Show when="signed-in">
            <NotificationBell />
          </Show>

          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="px-4 py-2 md:px-6 md:py-2 rounded-full bg-white text-black font-bold text-xs md:text-sm hover:bg-stone-200 transition-colors shadow-md whitespace-nowrap">
                Log In
              </button>
            </SignInButton>
          </Show>
          
          <Show when="signed-in">
            {isAdmin && (
              <Link href="/admin/overview" className="hidden md:block px-4 py-2 rounded-full border border-amber-500/50 text-amber-400 font-bold text-sm hover:bg-amber-500/10 transition-colors">
                Switch to admin portal
              </Link>
            )}
            <Link href="/learning" className="hidden md:block px-5 py-2 rounded-full bg-white text-black font-bold text-sm hover:bg-stone-200 transition-colors">
              Dashboard
            </Link>
            <div className="border-l border-white/20 h-6 mx-1 hidden md:block"></div>
            <UserButton />
          </Show>

          <button className="ml-1 rounded-full p-2 text-stone-400 transition-colors hover:bg-white/10 md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -20, height: 0 }} className="absolute left-0 right-0 top-[110%] z-40 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]/95 p-4 shadow-2xl backdrop-blur-xl md:hidden">
              <div className="flex flex-col gap-4">
                <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className={`text-lg font-bold transition-colors ${pathname === '/' ? 'text-amber-500' : 'text-white'}`}>Home</Link>
                <div className="h-px w-full bg-white/10"></div>
                <Link href="/courses" onClick={() => setIsMobileMenuOpen(false)} className={`text-lg font-bold transition-colors ${pathname.includes('/courses') ? 'text-amber-500' : 'text-white'}`}>Courses</Link>
                <div className="h-px w-full bg-white/10"></div>
                <Link href="/about" onClick={() => setIsMobileMenuOpen(false)} className={`text-lg font-bold transition-colors ${pathname === '/about' ? 'text-amber-500' : 'text-white'}`}>About</Link>
                <div className="h-px w-full bg-white/10"></div>
                <Link href="/contact" onClick={() => setIsMobileMenuOpen(false)} className={`text-lg font-bold transition-colors ${pathname === '/contact' ? 'text-amber-500' : 'text-white'}`}>Contact</Link>
                <Show when="signed-in">
                  <div className="h-px w-full bg-white/10"></div>
                  <Link href="/learning" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between text-lg font-bold text-amber-500">My Dashboard <span className="text-xl">➔</span></Link>
                  {isAdmin && (<>
                    <div className="h-px w-full bg-white/10"></div>
                    <Link href="/admin/overview" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between text-lg font-bold text-amber-500">Switch to admin portal <span className="text-xl">➔</span></Link>
                  </>)}
                </Show>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
    </>
  );
}