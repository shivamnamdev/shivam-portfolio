'use client';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { BookOpen, Video, FileText, CheckCircle2, PlayCircle, Code2, Loader2, Flame, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { activeCourses } from '@/data/courses';
import Link from 'next/link';


export default function LearningDashboard() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(true);
  
  // 🚨 NEW: Gamification States
  const [stats, setStats] = useState({ streak: 0, points: 0 });
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push('/');
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!isLoaded || !user) return;
      
      try {
        // 1. Fetch Enrolled Courses
        const { data: enrollments } = await supabase.from('user_enrollments').select('course_slug').eq('user_id', user.id);
        if (enrollments) {
          const purchasedSlugs = enrollments.map(d => d.course_slug);
          const myCourses = activeCourses.filter(c => purchasedSlugs.includes(c.slug));
          setEnrolledCourses(myCourses);
        }

        // 2. 🚨 Handle Streaks & Points
        const todayDate = new Date();
        const today = todayDate.toISOString().split('T')[0];
        todayDate.setDate(todayDate.getDate() - 1);
        const yesterday = todayDate.toISOString().split('T')[0];

        const studentName = user.fullName || user.firstName || user.primaryEmailAddress?.emailAddress || 'Student';
        const studentEmail = user.primaryEmailAddress?.emailAddress || ""; // 🚨 NEW: Fetch Email

        const { data: userStats } = await supabase.from('user_stats').select('*').eq('user_id', user.id).single();

        if (userStats) {
          let newStreak = userStats.current_streak || 0;
          
          if (userStats.last_active_date === yesterday) {
            newStreak += 1; 
          } else if (userStats.last_active_date < yesterday) {
            newStreak = 1; 
          }
          
          setStats({ streak: newStreak, points: userStats.total_points || 0 });

          // Save updated streak and ensure the email is recorded!
          if (userStats.last_active_date !== today || userStats.user_email !== studentEmail) {
            await supabase.from('user_stats').update({ 
              current_streak: newStreak, 
              last_active_date: today, 
              user_name: studentName,
              user_email: studentEmail // 🚨 Save Email
            }).eq('user_id', user.id);
          }
        } else {
          setStats({ streak: 1, points: 0 });
          await supabase.from('user_stats').insert([{ 
            user_id: user.id, 
            user_name: studentName, 
            user_email: studentEmail, // 🚨 Save Email
            current_streak: 1, 
            total_points: 0, 
            last_active_date: today 
          }]);
        }

        // 3. 🚨 Fetch the Global Leaderboard & Block Test Accounts!
        const { data: leaders } = await supabase
          .from('user_stats')
          .select('user_name, total_points, user_email') // Fetch emails too
          .order('total_points', { ascending: false })
          .limit(15); 

        if (leaders) {
          // Put your exact test emails here
          const blockedEmails = [
            "financetrail.bazar@gmail.com",
            "mavish.ps8@gmail.com",
            "shivamnamdev.edu@gmail.com",
            "shivamnamdev.corp@gmail.com"
          ]; 
          
          const realStudents = leaders
            // Filter out anyone whose email is in our blocked list
            .filter(leader => !blockedEmails.includes(leader.user_email))
            // Slice the array to only keep the top 5 REAL students
            .slice(0, 5); 

          setLeaderboard(realStudents);
        }

      } catch (error) {
        console.error("Error fetching dashboard:", error);
      } finally {
        setIsFetchingData(false);
      }
    }
    fetchDashboardData();
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
        
        <div className="mb-12 border-b border-stone-200 pb-8 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-display font-black text-stone-900 mb-2">Welcome back, {firstName}! 👋</h1>
            <p className="text-stone-500 text-lg">Pick up right where you left off.</p>
          </div>
          {/* Top Right Quick Stats */}
          <div className="hidden md:flex gap-6">
            <div className="text-right">
              <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Total XP</p>
              <p className="text-2xl font-black text-amber-600">{stats.points}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
              <BookOpen size={24} className="text-amber-600" /> My Enrolled Courses
            </h2>

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
                    {/* 🚨 THE NEW NATIVE LIVE CLASS LINK */}
                <Link href={`/live/${course.slug}`} className="flex-1 py-3 rounded-xl bg-stone-900 text-white font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors shadow-md">
                  <PlayCircle size={18} /> Join Live Class
                </Link>
                    <button onClick={() => router.push(`/learning/${course.slug}`)} className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-700 font-bold flex items-center justify-center gap-2 hover:bg-stone-50 hover:border-amber-400 hover:text-amber-600 transition-all bg-white shadow-sm cursor-pointer">
                      <Video size={18} /> View Recordings
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Column: Gamification & Resources */}
          <div className="space-y-6">
            
            {/* 🚨 THE DAILY STREAK WIDGET */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm flex items-center justify-between">
              <div>
                <h4 className="font-bold text-stone-900">Current Streak</h4>
                <p className="text-stone-500 text-sm">Log in daily to keep the fire alive!</p>
              </div>
              <div className="flex items-center gap-1 bg-stone-50 px-4 py-2 rounded-xl border border-stone-100">
                <span className="text-3xl font-black text-stone-900">{stats.streak}</span>
                <Flame size={28} className={stats.streak > 0 ? "text-orange-500 fill-orange-500 animate-pulse" : "text-stone-300"} />
              </div>
            </div>

            {/* 🚨 THE LEADERBOARD WIDGET */}
            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm">
              <h4 className="font-bold text-stone-900 flex items-center gap-2 mb-4"><Trophy size={20} className="text-amber-500"/> Global Leaderboard</h4>
              <div className="space-y-3">
                {leaderboard.map((leader, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <div className="flex items-center gap-3">
                      <span className={`font-black w-5 text-center ${i===0 ? 'text-amber-500 text-lg' : i===1 ? 'text-stone-400' : i===2 ? 'text-amber-700' : 'text-stone-300'}`}>
                        {i===0 ? '🥇' : i===1 ? '🥈' : i===2 ? '🥉' : `#${i+1}`}
                      </span>
                      <span className="font-bold text-stone-800 text-sm truncate max-w-[120px]">{leader.user_name}</span>
                    </div>
                    <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full shadow-sm">{leader.total_points} XP</span>
                  </div>
                ))}
              </div>
            </div>

            <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2 mb-2 mt-8">
              <FileText size={24} className="text-amber-600" /> Resources
            </h2>
            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm">
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