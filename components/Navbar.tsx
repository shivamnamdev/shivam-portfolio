'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { Bell, Sparkles, Calendar, AlertCircle } from 'lucide-react';
import { platformNotifications } from '@/data/notifications';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const[showNotifications, setShowNotifications] = useState(false);
  const pathname = usePathname();
  const notifRef = useRef<HTMLDivElement>(null);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  },[]);

  // Close notifications dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  },[]);

  // Helper to choose the right icon based on notification type
  const getIcon = (type: string) => {
    switch(type) {
      case 'feature': return <Sparkles size={16} className="text-purple-500" />;
      case 'event': return <Calendar size={16} className="text-blue-500" />;
      default: return <AlertCircle size={16} className="text-amber-500" />;
    }
  };

  return (
    <motion.nav
      initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
      className={`sticky w-full top-0 z-50 flex justify-center transition-all duration-300 ${scrolled ? 'py-4' : 'py-6 px-6'}`}
    >
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto px-6 py-3 rounded-full border border-stone-200 bg-white/90 backdrop-blur-xl shadow-lg">
        
        {/* LEFT: LOGO */}
        <Link href="/" className="flex items-center gap-3 group">
          <img src="/logo.png" alt="Logo" className="h-8 w-auto group-hover:scale-105 transition-transform" onError={(e) => e.currentTarget.style.display = 'none'} />
          <span className="font-display font-black text-xl tracking-tight text-stone-900 hidden sm:block">SHIVAM.</span>
        </Link>

        {/* MIDDLE: NAVIGATION LINKS */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className={`text-sm font-bold transition-colors ${pathname === '/' ? 'text-amber-600' : 'text-stone-600 hover:text-amber-600'}`}>Home</Link>
          <Link href="/courses" className={`text-sm font-bold transition-colors ${pathname.includes('/courses') ? 'text-amber-600' : 'text-stone-600 hover:text-amber-600'}`}>Courses</Link>
          <Link href="/about" className={`text-sm font-bold transition-colors ${pathname === '/about' ? 'text-amber-600' : 'text-stone-600 hover:text-amber-600'}`}>About</Link>
          <Link href="/contact" className={`text-sm font-bold transition-colors ${pathname === '/contact' ? 'text-amber-600' : 'text-stone-600 hover:text-amber-600'}`}>Contact</Link>
        </div>

        {/* RIGHT: LOGIN & NOTIFICATIONS */}
        <div className="flex items-center gap-4">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-6 py-2 rounded-full bg-stone-900 text-white font-bold text-sm hover:bg-stone-800 transition-colors shadow-md">
                Student Login
              </button>
            </SignInButton>
          </SignedOut>
          
          <SignedIn>
            <div className="flex items-center gap-3 md:gap-5">
              
              {/* 🚨 THE NOTIFICATION BELL */}
              <div className="relative" ref={notifRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-stone-600 hover:text-amber-600 hover:bg-stone-100 rounded-full transition-all"
                >
                  <Bell size={20} />
                  {/* Unread Red Dot */}
                  {platformNotifications.length > 0 && (
                    <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                  )}
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                      animate={{ opacity: 1, y: 0, scale: 1 }} 
                      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
                      className="absolute right-0 mt-3 w-80 bg-white border border-stone-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50 origin-top-right"
                    >
                      <div className="bg-stone-50 border-b border-stone-100 px-5 py-3 flex justify-between items-center">
                        <h3 className="font-bold text-stone-900">Notifications</h3>
                        <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{platformNotifications.length} New</span>
                      </div>
                      
                      <div className="max-h-[350px] overflow-y-auto">
                        {platformNotifications.map((notif) => (
                          <Link 
                            key={notif.id} 
                            href={notif.link || "#"}
                            onClick={() => setShowNotifications(false)}
                            className="block p-5 border-b border-stone-50 hover:bg-stone-50 transition-colors"
                          >
                            <div className="flex gap-3 items-start">
                              <div className={`mt-0.5 p-2 rounded-full flex-shrink-0 ${notif.type === 'feature' ? 'bg-purple-100' : notif.type === 'event' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                                {getIcon(notif.type)}
                              </div>
                              <div>
                                <div className="flex justify-between items-start gap-2 mb-1">
                                  <h4 className="text-sm font-bold text-stone-900 leading-tight">{notif.title}</h4>
                                </div>
                                <p className="text-xs text-stone-500 mb-2 leading-relaxed">{notif.message}</p>
                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{notif.date}</span>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                      
                      <div className="p-3 bg-stone-50 border-t border-stone-100 text-center">
                        <button onClick={() => setShowNotifications(false)} className="text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors">
                          Mark all as read
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link href="/learning" className="hidden sm:block px-5 py-2 rounded-full bg-stone-900 text-white font-bold text-sm hover:bg-stone-800 transition-colors">
                My Dashboard
              </Link>
              
              <div className="border-l border-stone-200 h-6 mx-1 hidden sm:block"></div>
              
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
        </div>

      </div>
    </motion.nav>
  );
}