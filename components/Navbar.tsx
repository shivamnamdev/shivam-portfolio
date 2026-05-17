'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from '@clerk/nextjs';
import { Bell, Sparkles, Calendar, AlertCircle, Menu, X, ShieldAlert, Code } from 'lucide-react';
import { platformNotifications } from '@/data/notifications';
import { supabase } from '@/lib/supabaseClient';

const ADMIN_EMAIL = "shivamnamdev.corp@gmail.com";

export default function Navbar() {
  const { user, isSignedIn } = useUser();
  const [scrolled, setScrolled] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const notifRef = useRef<HTMLDivElement>(null);

  // Student Notification States
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  // 🚨 NEW: Admin Notification States
  const isAdmin = user?.primaryEmailAddress?.emailAddress === ADMIN_EMAIL;
  const [adminLogs, setAdminLogs] = useState<any[]>([]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Standard Student Notifications
  useEffect(() => {
    setIsMounted(true);
    const savedReadCount = parseInt(localStorage.getItem('shivam_academy_read_count') || '0');
    setUnreadCount(Math.max(0, platformNotifications.length - savedReadCount));
  }, []);

  // 🚨 NEW: Fetch Admin Activity Logs from Supabase!
  useEffect(() => {
    async function fetchAdminLogs() {
      if (!isAdmin) return;
      const { data } = await supabase
        .from('admin_activity_log')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false });
      
      if (data) setAdminLogs(data);
    }
    fetchAdminLogs();
  }, [isAdmin]);

  const handleMarkAllAsRead = async () => {
    if (isAdmin) {
      // 1. Mark all admin logs as read in the database
      const unreadIds = adminLogs.filter(log => !log.is_read).map(log => log.id);
      
      if (unreadIds.length > 0) {
        await supabase.from('admin_activity_log').update({ is_read: true }).in('id', unreadIds);
      }
      
      // 2. 🚨 THE FIX: Update the local state to mark them as read, but DO NOT delete them!
      setAdminLogs(prevLogs => 
        prevLogs.map(log => ({ ...log, is_read: true }))
      );
      
    } else {
      // Student logic remains the same
      localStorage.setItem('shivam_academy_read_count', platformNotifications.length.toString());
      setUnreadCount(0);
    }
    
    // Close the dropdown menu
    setShowNotifications(false);
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'feature': return <Sparkles size={16} className="text-purple-500" />;
      case 'event': return <Calendar size={16} className="text-blue-500" />;
      case 'submission': return <Code size={16} className="text-green-500" />;
      case 'enrollment': return <Sparkles size={16} className="text-amber-500" />;
      default: return <AlertCircle size={16} className="text-stone-500" />;
    }
  };

  // Determine total unread based on role
  const totalUnread = isAdmin ? adminLogs.filter(log => !log.is_read).length : unreadCount;


  return (
    <motion.nav
      initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
      className={`sticky w-full top-0 z-50 flex justify-center transition-all duration-300 ${scrolled ? 'py-2 md:py-4' : 'py-4 md:py-6 px-4 md:px-6'}`}
    >
      <div className="relative flex items-center justify-between w-full max-w-7xl mx-auto px-4 md:px-6 py-3 rounded-3xl md:rounded-full border border-stone-200 bg-white/90 backdrop-blur-xl shadow-lg">
        
        <Link href="/" className="flex items-center gap-2 md:gap-3 group z-50" onClick={() => setIsMobileMenuOpen(false)}>
          <img src="/logo.png" alt="Logo" className="h-7 md:h-8 w-auto group-hover:scale-105 transition-transform" onError={(e) => e.currentTarget.style.display = 'none'} />
          <span className="font-display font-black text-lg md:text-xl tracking-tight text-stone-900">SHIVAM.</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          <Link href="/" className={`text-sm font-bold transition-colors ${pathname === '/' ? 'text-amber-600' : 'text-stone-600 hover:text-amber-600'}`}>Home</Link>
          <Link href="/courses" className={`text-sm font-bold transition-colors ${pathname.includes('/courses') ? 'text-amber-600' : 'text-stone-600 hover:text-amber-600'}`}>Courses</Link>
          <Link href="/about" className={`text-sm font-bold transition-colors ${pathname === '/about' ? 'text-amber-600' : 'text-stone-600 hover:text-amber-600'}`}>About</Link>
          <Link href="/contact" className={`text-sm font-bold transition-colors ${pathname === '/contact' ? 'text-amber-600' : 'text-stone-600 hover:text-amber-600'}`}>Contact</Link>
        </div>

        <div className="flex items-center gap-2 md:gap-4 z-50">
          <SignedIn>
            <div className="relative" ref={notifRef}>
              <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 text-stone-600 hover:text-amber-600 hover:bg-stone-100 rounded-full transition-all">
                <Bell size={20} />
                {isMounted && totalUnread > 0 && <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }} className="absolute right-0 mt-3 w-[300px] md:w-80 bg-white border border-stone-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50 origin-top-right">
                    <div className="bg-stone-50 border-b border-stone-100 px-5 py-3 flex justify-between items-center">
                      <h3 className="font-bold text-stone-900">{isAdmin ? "Admin Alerts" : "Notifications"}</h3>
                      <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{isMounted ? totalUnread : 0} New</span>
                    </div>
                    
                    <div className="max-h-[350px] overflow-y-auto">
                      {/* 🚨 RENDER ADMIN LOGS OR STUDENT NOTIFICATIONS */}
                      {isAdmin ? (
                        adminLogs.length === 0 ? (
                           <div className="p-5 text-center text-sm text-stone-500">No new activity.</div>
                        ) : (
                          adminLogs.map((log) => (
                            <div key={log.id} className="block p-5 border-b border-stone-50 bg-stone-50/50">
                              <div className="flex gap-3 items-start">
                                <div className="mt-0.5 p-2 rounded-full flex-shrink-0 bg-stone-200">{getIcon(log.type)}</div>
                                <div>
                                  <h4 className="text-sm font-bold text-stone-900 leading-tight mb-1">{log.message}</h4>
                                  <p className="text-xs text-stone-500 mb-2 font-mono">{log.user_email}</p>
                                  <span className="text-[10px] font-bold text-stone-400 uppercase">{new Date(log.created_at).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        )
                      ) : (
                        platformNotifications.map((notif) => (
                          <Link key={notif.id} href={notif.link || "#"} onClick={() => setShowNotifications(false)} className="block p-5 border-b border-stone-50 hover:bg-stone-50 transition-colors">
                            <div className="flex gap-3 items-start">
                              <div className={`mt-0.5 p-2 rounded-full flex-shrink-0 ${notif.type === 'feature' ? 'bg-purple-100' : notif.type === 'event' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                                {getIcon(notif.type)}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-stone-900 leading-tight mb-1">{notif.title}</h4>
                                <p className="text-xs text-stone-500 mb-2 leading-relaxed">{notif.message}</p>
                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{notif.date}</span>
                              </div>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                    
                    <div className="p-3 bg-stone-50 border-t border-stone-100 text-center flex justify-center gap-4">
                      {isAdmin && <Link href="/admin" onClick={() => setShowNotifications(false)} className="text-xs font-bold text-stone-600 hover:text-stone-900">Admin Portal</Link>}
                      <button onClick={handleMarkAllAsRead} className="text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors">Mark all as read</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-4 py-2 md:px-6 md:py-2 rounded-full bg-stone-900 text-white font-bold text-xs md:text-sm hover:bg-stone-800 transition-colors shadow-md whitespace-nowrap">Log In</button>
            </SignInButton>
          </SignedOut>
          
          <SignedIn>
            <Link href="/learning" className="hidden md:block px-5 py-2 rounded-full bg-stone-900 text-white font-bold text-sm hover:bg-stone-800 transition-colors">Dashboard</Link>
            <div className="border-l border-stone-200 h-6 mx-1 hidden md:block"></div>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>

          <button className="md:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-full transition-colors ml-1" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -20, height: 0 }} className="absolute top-[110%] left-0 right-0 bg-white/95 backdrop-blur-xl border border-stone-200 shadow-2xl rounded-2xl p-6 flex flex-col gap-6 md:hidden z-40 overflow-hidden">
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className={`text-lg font-bold transition-colors ${pathname === '/' ? 'text-amber-600' : 'text-stone-800'}`}>Home</Link>
              <div className="w-full h-px bg-stone-100"></div>
              <Link href="/courses" onClick={() => setIsMobileMenuOpen(false)} className={`text-lg font-bold transition-colors ${pathname.includes('/courses') ? 'text-amber-600' : 'text-stone-800'}`}>Courses</Link>
              <div className="w-full h-px bg-stone-100"></div>
              <Link href="/about" onClick={() => setIsMobileMenuOpen(false)} className={`text-lg font-bold transition-colors ${pathname === '/about' ? 'text-amber-600' : 'text-stone-800'}`}>About</Link>
              <div className="w-full h-px bg-stone-100"></div>
              <Link href="/contact" onClick={() => setIsMobileMenuOpen(false)} className={`text-lg font-bold transition-colors ${pathname === '/contact' ? 'text-amber-600' : 'text-stone-800'}`}>Contact</Link>
              <SignedIn>
                <div className="w-full h-px bg-stone-100"></div>
                <Link href="/learning" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-bold text-amber-600 flex items-center justify-between">My Dashboard <span className="text-xl">➔</span></Link>
                {isAdmin && <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-bold text-red-600 flex items-center justify-between mt-4">Admin Portal <ShieldAlert size={20}/></Link>}
              </SignedIn>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.nav>
  );
}