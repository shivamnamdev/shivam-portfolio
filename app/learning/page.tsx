'use client';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { BookOpen, Video, FileText, CheckCircle2, PlayCircle, Code2, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function LearningDashboard() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    }
  },[isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-50">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="animate-spin text-amber-500" size={48} />
        </div>
        <Footer />
      </div>
    );
  }

  const firstName = user.firstName || 'Student';

  return (
    <div className="relative min-h-screen flex flex-col bg-stone-50">
      <Navbar />
      
      <main className="flex-grow max-w-7xl mx-auto px-6 py-20 w-full">
        
        <div className="mb-12 border-b border-stone-200 pb-8">
          <h1 className="text-4xl font-display font-black text-stone-900 mb-2">
            Welcome back, {firstName}! 👋
          </h1>
          <p className="text-stone-500 text-lg">Pick up right where you left off.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
              <BookOpen size={24} className="text-amber-600" /> My Enrolled Courses
            </h2>

            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[40px] pointer-events-none" />
              
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 bg-green-100 text-green-700 font-bold rounded-full text-xs flex items-center gap-1">
                  <CheckCircle2 size={12} /> Enrolled
                </span>
                <span className="text-sm font-bold text-amber-600">Cohort 1</span>
              </div>
              
              <h3 className="text-2xl font-bold text-stone-900 mb-2">Python Live Session for Beginners</h3>
              <p className="text-stone-500 text-sm mb-6">Next Live Class: Tomorrow at 7:00 PM IST</p>
              
              <div className="w-full bg-stone-100 rounded-full h-2.5 mb-2">
                <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: '15%' }}></div>
              </div>
              <p className="text-xs text-stone-400 font-bold text-right mb-6">15% Completed</p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="flex-1 py-3 rounded-xl bg-stone-900 text-white font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors shadow-md">
                  <PlayCircle size={18} /> Join Live Class
                </button>
                <Link href="/learning/python-beginners" className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-700 font-bold flex items-center justify-center gap-2 hover:bg-stone-50 hover:border-amber-400 hover:text-amber-600 transition-all bg-white shadow-sm">
                  <Video size={18} /> View Recordings
                </Link>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2 mb-2">
              <FileText size={24} className="text-amber-600" /> Resources
            </h2>

            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm">
              <h4 className="font-bold text-stone-900 mb-4">Downloads</h4>
              <div className="space-y-3">
                <a href="/python-syllabus.pdf" download className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors">
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-700"><FileText size={16} /></div>
                  <div>
                    <p className="text-sm font-bold text-stone-800">Course Syllabus</p>
                    <p className="text-xs text-stone-500">PDF Document</p>
                  </div>
                </a>
              </div>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}