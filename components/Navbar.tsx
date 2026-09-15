'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { Bell, Sparkles, Calendar, AlertCircle, Menu, X, ShieldAlert, Code } from 'lucide-react';
import { platformNotifications } from '@/data/notifications';
import { supabase } from '@/lib/supabaseClient';

const ADMIN_EMAIL = "shivamnamdev.corp@gmail.com";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const notifRef = useRef<HTMLDivElement>(null);

  const [unreadCount, setUnreadCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setShowNotifications(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    const savedReadCount = parseInt(localStorage.getItem('shivam_academy_read_count') || '0');
    setUnreadCount(Math.max(0, platformNotifications.length - savedReadCount));
  }, []);

  const handleMarkAllAsRead = () => {
    localStorage.setItem('shivam_academy_read_count', platformNotifications.length.toString());
    setUnreadCount(0);
    setShowNotifications(false);
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'feature': return <Sparkles size={16} className="text-purple-400" />;
      case 'event': return <Calendar size={16} className="text-blue-400" />;
      case 'submission': return <Code size={16} className="text-green-400" />;
      case 'enrollment': return <Sparkles size={16} className="text-amber-400" />;
      default: return <AlertCircle size={16} className="text-stone-400" />;
    }
  };

  return (
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
          <SignedIn>
            <div className="relative" ref={notifRef}>
              <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 text-stone-400 hover:text-amber-500 hover:bg-white/10 rounded-full transition-all">
                <Bell size={20} />
                {isMounted && unreadCount > 0 && <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-[#0a0a0a] rounded-full"></span>}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
                    className="absolute right-0 mt-3 w-[300px] md:w-80 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50 origin-top-right"
                  >
                    <div className="bg-[#0a0a0a] border-b border-white/5 px-5 py-3 flex justify-between items-center">
                      <h3 className="font-bold text-white">Notifications</h3>
                      <span className="text-xs font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">{isMounted ? unreadCount : 0} New</span>
                    </div>
                    <div className="max-h-[350px] overflow-y-auto">
                      {platformNotifications.map((notif) => (
                        <Link key={notif.id} href={notif.link || "#"} onClick={() => setShowNotifications(false)} className="block p-5 border-b border-white/5 hover:bg-white/5 transition-colors">
                          <div className="flex gap-3 items-start">
                            <div className={`mt-0.5 p-2 rounded-full flex-shrink-0 ${notif.type === 'feature' ? 'bg-purple-500/20' : notif.type === 'event' ? 'bg-blue-500/20' : 'bg-amber-500/20'}`}>
                              {getIcon(notif.type)}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white leading-tight mb-1">{notif.title}</h4>
                              <p className="text-xs text-stone-400 mb-2 leading-relaxed">{notif.message}</p>
                              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">{notif.date}</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <div className="p-3 bg-[#0a0a0a] border-t border-white/5 text-center">
                      <button onClick={handleMarkAllAsRead} className="text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors">Mark all as read</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-4 py-2 md:px-6 md:py-2 rounded-full bg-white text-black font-bold text-xs md:text-sm hover:bg-stone-200 transition-colors shadow-md whitespace-nowrap">
                Log In
              </button>
            </SignInButton>
          </SignedOut>
          
          <SignedIn>
            <Link href="/learning" className="hidden md:block px-5 py-2 rounded-full bg-white text-black font-bold text-sm hover:bg-stone-200 transition-colors">
              Dashboard
            </Link>
            <div className="border-l border-white/20 h-6 mx-1 hidden md:block"></div>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>

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
                <SignedIn>
                  <div className="h-px w-full bg-white/10"></div>
                  <Link href="/learning" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between text-lg font-bold text-amber-500">My Dashboard <span className="text-xl">➔</span></Link>
                </SignedIn>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}