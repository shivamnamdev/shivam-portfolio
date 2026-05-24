'use client';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { BookOpen, Video, FileText, CheckCircle2, PlayCircle, Loader2, Flame, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { activeCourses } from '@/data/courses';
import SpotlightCard from '@/components/SpotlightCard';

export default function LearningDashboard() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [stats, setStats] = useState({ streak: 0, points: 0 });
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push('/');
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!isLoaded || !user) return;
      try {
        const { data: enrollments } = await supabase.from('user_enrollments').select('course_slug').eq('user_id', user.id);
        if (enrollments) {
          const purchasedSlugs = enrollments.map(d => d.course_slug);
          const myCourses = activeCourses.filter(c => purchasedSlugs.includes(c.slug));
          setEnrolledCourses(myCourses);
        }

        const todayDate = new Date();
        const today = todayDate.toISOString().split('T')[0];
        todayDate.setDate(todayDate.getDate() - 1);
        const yesterday = todayDate.toISOString().split('T')[0];

        const studentName = user.fullName || user.firstName || user.primaryEmailAddress?.emailAddress || 'Student';
        const studentEmail = user.primaryEmailAddress?.emailAddress || ""; 

        const { data: userStats } = await supabase.from('user_stats').select('*').eq('user_id', user.id).single();

        if (userStats) {
          let newStreak = userStats.current_streak || 0;
          if (userStats.last_active_date === yesterday) newStreak += 1; 
          else if (userStats.last_active_date < yesterday) newStreak = 1; 
          
          setStats({ streak: newStreak, points: userStats.total_points || 0 });

          if (userStats.last_active_date !== today || userStats.user_email !== studentEmail) {
            await supabase.from('user_stats').update({ current_streak: newStreak, last_active_date: today, user_name: studentName, user_email: studentEmail }).eq('user_id', user.id);
          }
        } else {
          setStats({ streak: 1, points: 0 });
          await supabase.from('user_stats').insert([{ user_id: user.id, user_name: studentName, user_email: studentEmail, current_streak: 1, total_points: 0, last_active_date: today }]);
        }

        const { data: leaders } = await supabase.from('user_stats').select('user_name, total_points, user_email').order('total_points', { ascending: false }).limit(15); 
        if (leaders) {
          const blockedEmails = ["financetrail.bazar@gmail.com", "mavish.ps8@gmail.com", "shivamnamdev.edu@gmail.com", "shivamnamdev.corp@gmail.com"]; 
          const realStudents = leaders.filter(leader => !blockedEmails.includes(leader.user_email)).slice(0, 5); 
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
      <div className="min-h-screen flex flex-col bg-black">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-amber-500" size={48} />
          <p className="text-stone-400 font-medium">Loading your dashboard...</p>
        </div>
        <Footer />
      </div>
    );
  }

  const firstName = user.firstName || 'Student';

  return (
    <div className="relative min-h-screen flex flex-col bg-black selection:bg-amber-500/30">
      <div className="absolute inset-0 bg-grid-pattern z-0 opacity-30 pointer-events-none" />
      <Navbar />
      
      <main className="flex-grow max-w-7xl mx-auto px-6 py-20 w-full relative z-10">
        <div className="mb-12 border-b border-white/10 pb-8 flex justify-between items-end">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-2 drop-shadow-md">Welcome back, {firstName}! 👋</h1>
            <p className="text-stone-400 text-lg">Pick up right where you left off.</p>
          </div>
          <div className="hidden md:flex gap-6">
            <div className="text-right">
              <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mb-1">Total XP</p>
              <p className="text-3xl font-black text-amber-500 drop-shadow-md">{stats.points}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2 drop-shadow-sm">
              <BookOpen size={24} className="text-amber-500" /> My Enrolled Courses
            </h2>

            {enrolledCourses.length === 0 ? (
              <SpotlightCard className="p-10 text-center flex flex-col items-center bg-[#0a0a0a]">
                <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-6">
                  <BookOpen size={32} className="text-stone-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">No courses yet!</h3>
                <p className="text-stone-400 mb-8">You haven't enrolled in any cohorts. Ready to level up?</p>
                <button onClick={() => router.push('/courses')} className="px-8 py-3.5 rounded-full bg-amber-500 text-black font-black hover:bg-amber-400 transition-colors shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                  Browse Catalog
                </button>
              </SpotlightCard>
            ) : (
              enrolledCourses.map((course) => (
                // 🚨 THE FIX: Replaced muddy div with Pitch Black SpotlightCard!
                <SpotlightCard key={course.id} className="p-8 group bg-gradient-to-br from-[#121212] to-[#0a0a0a]">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 blur-[50px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />
                  
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <span className="px-3 py-1.5 bg-green-500/10 text-green-400 border border-green-500/20 font-bold rounded-full text-xs flex items-center gap-1 shadow-sm">
                      <CheckCircle2 size={14} /> Enrolled
                    </span>
                    <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20 uppercase tracking-widest">Active Access</span>
                  </div>
                  
                  <h3 className="text-2xl md:text-3xl font-black text-white mb-3 relative z-10">{course.title}</h3>
                  <p className="text-stone-400 text-sm mb-8 relative z-10">Your learning materials and lab access are fully unlocked.</p>
                  
                  {/* 🚨 THE FIX: Styled the buttons to pop beautifully against the black card */}
                  <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                    <button onClick={() => router.push(`/live/${course.slug}`)} className="flex-1 py-4 rounded-xl bg-stone-900 border border-stone-700 text-white font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors shadow-md">
                      <PlayCircle size={18} /> Join Live Class
                    </button>
                    <button onClick={() => router.push(`/learning/${course.slug}`)} className="flex-1 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black flex items-center justify-center gap-2 hover:from-amber-400 hover:to-amber-500 transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                      <Video size={18} /> View Recordings
                    </button>
                  </div>
                </SpotlightCard>
              ))
            )}
          </div>

          {/* Gamification & Resources */}
          <div className="space-y-6">
            
            {/* 🚨 THE FIX: Upgraded sidebar widgets to SpotlightCards too! */}
            <SpotlightCard interactive className="p-6 flex flex-row items-center justify-between bg-[#0a0a0a]">
              <div>
                <h4 className="font-bold text-white mb-1">Current Streak</h4>
                <p className="text-stone-400 text-sm">Log in daily to keep the fire alive!</p>
              </div>
              <div className="flex items-center gap-1 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                <span className="text-3xl font-black text-white">{stats.streak}</span>
                <Flame size={28} className={stats.streak > 0 ? "text-orange-500 fill-orange-500 animate-pulse" : "text-stone-600"} />
              </div>
            </SpotlightCard>

            <SpotlightCard interactive className="p-6 bg-[#0a0a0a]">
              <h4 className="font-bold text-white flex items-center gap-2 mb-4"><Trophy size={20} className="text-amber-500"/> Global Leaderboard</h4>
              <div className="space-y-3">
                {leaderboard.map((leader, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <span className={`font-black w-5 text-center ${i===0 ? 'text-amber-500 text-lg drop-shadow-md' : i===1 ? 'text-stone-300' : i===2 ? 'text-amber-700' : 'text-stone-500'}`}>
                        {i===0 ? '🥇' : i===1 ? '🥈' : i===2 ? '🥉' : `#${i+1}`}
                      </span>
                      <span className="font-bold text-stone-200 text-sm truncate max-w-[120px]">{leader.user_name}</span>
                    </div>
                    <span className="text-xs font-bold bg-amber-500/10 text-amber-500 px-2 py-1 rounded-full border border-amber-500/20">{leader.total_points} XP</span>
                  </div>
                ))}
              </div>
            </SpotlightCard>

            <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-2 mt-8 drop-shadow-sm">
              <FileText size={24} className="text-amber-500" /> Resources
            </h2>
            <SpotlightCard interactive className="p-6 bg-[#0a0a0a]">
              <div className="space-y-3">
                <a href="/python-syllabus.pdf" download className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 group">
                  <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 group-hover:scale-110 transition-transform"><FileText size={16} /></div>
                  <div>
                    <p className="text-sm font-bold text-stone-200 group-hover:text-white transition-colors">Course Syllabus</p>
                    <p className="text-xs text-stone-500">PDF Document</p>
                  </div>
                </a>
              </div>
            </SpotlightCard>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}