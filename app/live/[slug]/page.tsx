'use client';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Loader2, ChevronLeft, ShieldAlert, Video, ExternalLink, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { activeCourses } from '@/data/courses';

export default function LiveClassLobby({ params }: { params: { slug: string } }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  const courseDetails = activeCourses.find(c => c.slug === params.slug);

  // Security Check: Ensure they bought the course!
  useEffect(() => {
    async function verifyAccess() {
      if (!isLoaded || !isSignedIn || !user) return;
      
      // Admin backdoor access
      if (user.primaryEmailAddress?.emailAddress === "shivamnamdev.corp@gmail.com") {
        setHasAccess(true);
        setIsVerifying(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_enrollments')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_slug', params.slug);

        if (!error && data && data.length > 0) {
          setHasAccess(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsVerifying(false);
      }
    }
    verifyAccess();
  }, [isLoaded, isSignedIn, user, params.slug]);

  if (!isLoaded || isVerifying) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-50">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="animate-spin text-amber-500" size={48} />
        </div>
      </div>
    );
  }

  // If they somehow got the link but aren't enrolled, block them!
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-50 items-center justify-center text-center p-6">
        <ShieldAlert size={64} className="text-red-500 mb-4" />
        <h1 className="text-3xl font-black text-stone-900 mb-2">Access Denied</h1>
        <p className="text-stone-500 mb-6 max-w-md">You are not enrolled in this cohort, or your session has expired.</p>
        <Link href="/learning" className="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold transition-colors">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-stone-50 overflow-hidden">
      
      {/* Sleek Light Mode Header */}
      <div className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Link href={`/learning`} className="text-stone-500 hover:text-amber-600 transition-colors flex items-center gap-1 text-sm font-bold">
            <ChevronLeft size={16} /> Dashboard
          </Link>
          <div className="h-4 w-px bg-stone-300"></div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
            <span className="text-stone-900 font-bold text-sm tracking-wide uppercase">Secure Lobby</span>
          </div>
        </div>
      </div>

      {/* The Secure Gateway UI */}
      <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
        
        <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-8 border border-amber-200 shadow-[0_0_50px_rgba(245,158,11,0.15)]">
          <Video size={40} className="text-amber-600" />
        </div>

        <h1 className="text-4xl md:text-5xl font-black text-stone-900 mb-4">
          Ready to join the class?
        </h1>
        <p className="text-stone-600 text-lg max-w-lg mb-10 leading-relaxed">
          Your enrollment is verified. Click below to enter the private Google Meet classroom for <strong className="text-amber-600">{courseDetails?.title}</strong>.
        </p>

        {courseDetails?.liveLink ? (
          <a 
            href={courseDetails.liveLink} 
            target="_blank" 
            rel="noreferrer" 
            className="px-10 py-5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-xl flex items-center gap-3 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] group"
          >
            Enter Google Meet <ExternalLink size={24} className="group-hover:translate-x-1 transition-transform" />
          </a>
        ) : (
           <div className="px-8 py-4 rounded-xl bg-stone-100 border border-stone-200 text-stone-500 font-bold">
             No live link configured for this cohort yet.
           </div>
        )}

        {/* 🚨 THE INVERTED PRE-CLASS CHECKLIST (Dark Box) */}
        <div className="mt-12 p-6 md:p-8 bg-stone-900 border border-stone-800 rounded-3xl max-w-lg text-left shadow-2xl relative overflow-hidden">
          {/* Subtle internal glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[40px] pointer-events-none" />
          
          <h4 className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-5 flex items-center gap-2 relative z-10">
            <CheckCircle2 size={18} /> Pre-Class Checklist
          </h4>
          <ul className="text-sm md:text-base text-stone-300 space-y-4 font-medium mb-6 relative z-10">
            <li className="flex items-start gap-3">
              <span className="text-amber-500 mt-1 flex-shrink-0">•</span> 
              Join the session 5–10 minutes early to avoid last-minute issues.
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-500 mt-1 flex-shrink-0">•</span> 
              Ensure you have a stable internet connection.
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-500 mt-1 flex-shrink-0">•</span> 
              Keep your system ready or a notebook open for hands-on learning.
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-500 mt-1 flex-shrink-0">•</span> 
              Live class recordings will be available on your dashboard by the next morning.
            </li>
          </ul>
          <div className="border-t border-stone-800 pt-5 mt-2 relative z-10">
            <p className="text-amber-400 font-bold italic text-center text-sm md:text-base">
              "Looking forward to seeing you in the live class! 🚀"
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}