'use client';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { BookOpen, Video, FileText, CheckCircle2, PlayCircle, Code2, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { activeCourses } from '@/data/courses';

export default function LearningDashboard() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(true);

  // 1. Authentication Check
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, router]);

  // 2. Fetch User's Purchased Courses from Supabase
  useEffect(() => {
    async function getEnrollments() {
      if (!isLoaded || !user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_enrollments')
          .select('course_slug')
          .eq('user_id', user.id);

        if (error) throw error;

        if (data) {
          // Match their purchased slugs against our database of all courses
          const purchasedSlugs = data.map(d => d.course_slug);
          const myCourses = activeCourses.filter(c => purchasedSlugs.includes(c.slug));
          setEnrolledCourses(myCourses);
        }
      } catch (error) {
        console.error("Error fetching enrollments:", error);
      } finally {
        setIsFetchingData(false);
      }
    }
    getEnrollments();
  }, [isLoaded, user]);

  if (!isLoaded || !isSignedIn || isFetchingData) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-50">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-amber-500" size={48} />
          <p className="text-stone-500 font-medium">Loading your dashboard...</p>
        </div>
        <Footer />
      </div>
    );
  }

  const firstName = user.firstName || 'Student';

  return (
    <div className="relative min-h-screen flex flex-col bg-stone-50">
      <Navbar />
      
      <main className="flex-grow max-w-7xl mx-auto px-6 py-20 w-full relative z-10">
        
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

            {/* If they haven't bought anything yet */}
            {enrolledCourses.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 border border-stone-200 shadow-sm text-center">
                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen size={32} className="text-stone-400" />
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-2">No courses yet!</h3>
                <p className="text-stone-500 mb-6">You haven't enrolled in any cohorts. Ready to level up?</p>
                <button onClick={() => router.push('/courses')} className="px-6 py-3 rounded-full bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors shadow-md">
                  Browse Catalog
                </button>
              </div>
            ) : (
              /* If they have bought courses, render them dynamically! */
              enrolledCourses.map((course) => (
                <div key={course.id} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[40px] pointer-events-none" />
                  
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <span className="px-3 py-1 bg-green-100 text-green-700 font-bold rounded-full text-xs flex items-center gap-1">
                      <CheckCircle2 size={12} /> Enrolled
                    </span>
                    <span className="text-sm font-bold text-amber-600">Active Access</span>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-stone-900 mb-2 relative z-10">{course.title}</h3>
                  <p className="text-stone-500 text-sm mb-6 relative z-10">Your learning materials are unlocked.</p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                    <a 
                      href={course.liveLink || "#"} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex-1 py-3 rounded-xl bg-stone-900 text-white font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors shadow-md cursor-pointer"
                    >
                      <PlayCircle size={18} /> Join Live Class
                    </a>
                    {/* THE FIX: Replaced Link with an onClick button to bypass z-index routing bugs */}
                    <button 
                      onClick={() => router.push(`/learning/${course.slug}`)} 
                      className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-700 font-bold flex items-center justify-center gap-2 hover:bg-stone-50 hover:border-amber-400 hover:text-amber-600 transition-all bg-white shadow-sm cursor-pointer"
                    >
                      <Video size={18} /> View Recordings
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2 mb-2">
              <FileText size={24} className="text-amber-600" /> Resources
            </h2>
            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm">
              <h4 className="font-bold text-stone-900 mb-4">Downloads</h4>
              <div className="space-y-3">
                <a href="/python-syllabus.pdf" download className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors border border-transparent hover:border-stone-200">
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