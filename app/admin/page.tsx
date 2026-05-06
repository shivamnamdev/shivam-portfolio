'use client';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ShieldAlert, CheckCircle2, UserPlus, Loader2, FileCode2, UserCircle, PlayCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { activeCourses } from '@/data/courses';
import { courseCurriculumMap } from '@/data/learning-content';

// 🚨 Ensure this is your exact Clerk login email!
const ADMIN_EMAIL = "shivamnamdev.corp@gmail.com"; 

// Helper function to map a raw video_id to its readable title
function getVideoTitle(videoId: string) {
  for (const courseSlug in courseCurriculumMap) {
    for (const module of courseCurriculumMap[courseSlug]) {
      const videoIndex = module.videoIds.indexOf(videoId);
      if (videoIndex !== -1) {
        if (module.githubAssignments && module.githubAssignments[videoId]) {
          return module.githubAssignments[videoId].title;
        }
        return `${module.moduleTitle} (Lesson ${videoIndex + 1})`;
      }
    }
  }
  return `Unknown Video (${videoId})`;
}

export default function AdminDashboard() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  // Manual Enrollment States
  const[studentId, setStudentId] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(activeCourses[0].slug);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Submissions States
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true);

  // 🚨 NEW: Analytics States (Properly placed INSIDE the component!)
  const [analytics, setAnalytics] = useState({ totalStudents: 0, couponUsage: {} as Record<string, number> });

  // Security Check
  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn) {
        router.push('/');
      } else if (user.primaryEmailAddress?.emailAddress !== ADMIN_EMAIL) {
        router.push('/learning');
      }
    }
  }, [isLoaded, isSignedIn, user, router]);

  // Fetch Submissions
  useEffect(() => {
    async function fetchSubmissions() {
      if (!isLoaded || !isSignedIn || user.primaryEmailAddress?.emailAddress !== ADMIN_EMAIL) return;
      try {
        const { data, error } = await supabase
          .from('assignment_progress')
          .select('*')
          .order('completed_at', { ascending: false }) 
          .limit(20); 

        if (!error && data) {
          setSubmissions(data);
        }
      } catch (err) {
        console.error("Failed to load submissions:", err);
      } finally {
        setIsLoadingSubmissions(false);
      }
    }
    fetchSubmissions();
  }, [isLoaded, isSignedIn, user]);

  // 🚨 NEW: Fetch Revenue & Coupon Data
  useEffect(() => {
    async function fetchAnalytics() {
      if (!isLoaded || !isSignedIn || user.primaryEmailAddress?.emailAddress !== ADMIN_EMAIL) return;
      try {
        const { data, error } = await supabase.from('user_enrollments').select('coupon_used');
        if (!error && data) {
          const total = data.length;
          const usage: Record<string, number> = {};
          
          data.forEach((row) => {
            if (row.coupon_used) {
              usage[row.coupon_used] = (usage[row.coupon_used] || 0) + 1;
            }
          });

          setAnalytics({ totalStudents: total, couponUsage: usage });
        }
      } catch (err) {
        console.error("Failed to load analytics:", err);
      }
    }
    fetchAnalytics();
  },[isLoaded, isSignedIn, user]);

  if (!isLoaded || !isSignedIn || user.primaryEmailAddress?.emailAddress !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="animate-spin text-amber-500" size={48} />
      </div>
    );
  }

  const handleManualEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    if (!studentId.trim()) {
      setMessage({ text: "Please enter a valid Clerk User ID.", type: 'error' });
      setIsSubmitting(false);
      return;
    }

    try {
      const { data: existing } = await supabase
        .from('user_enrollments')
        .select('id')
        .eq('user_id', studentId.trim())
        .eq('course_slug', selectedCourse);

      if (existing && existing.length > 0) {
        setMessage({ text: "Student is already enrolled in this course!", type: 'error' });
        return;
      }

      const { error } = await supabase
        .from('user_enrollments')
        .insert([{ user_id: studentId.trim(), course_slug: selectedCourse }]);

      if (error) throw error;

      setMessage({ text: "Access Granted Successfully!", type: 'success' });
      setStudentId(""); 
      
      // Update analytics instantly
      setAnalytics(prev => ({ ...prev, totalStudents: prev.totalStudents + 1 }));
      
    } catch (err) {
      setMessage({ text: "Database Error. Please check the ID and try again.", type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-stone-50">
      <Navbar />
      
      <main className="flex-grow max-w-4xl mx-auto px-6 py-20 w-full">
        
        {/* Security Header */}
        <div className="mb-12 border-b border-stone-200 pb-8 flex items-center gap-4">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center border border-red-200">
            <ShieldAlert size={32} className="text-red-600" />
          </div>
          <div>
            <h1 className="text-4xl font-display font-black text-stone-900 mb-1">Admin Portal</h1>
            <p className="text-stone-500 font-mono text-sm">Security Level: Maximum Clearance ({ADMIN_EMAIL})</p>
          </div>
        </div>

        {/* 🚨 NEW: Analytics & Coupon Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Total Students Card */}
          <div className="bg-stone-900 rounded-3xl p-8 shadow-xl relative overflow-hidden flex flex-col justify-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 blur-[50px] pointer-events-none" />
            <h3 className="text-stone-400 font-bold uppercase tracking-widest text-xs mb-2">Total Enrollments</h3>
            <p className="text-6xl font-black text-white">{analytics.totalStudents}</p>
          </div>

          {/* Coupon Tracker Card */}
          <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm relative">
            <h3 className="text-stone-500 font-bold uppercase tracking-widest text-xs mb-4">Coupon Performance</h3>
            {Object.keys(analytics.couponUsage).length === 0 ? (
              <p className="text-stone-400 italic text-sm">No coupons used yet.</p>
            ) : (
              <div className="space-y-3 max-h-[120px] overflow-y-auto">
                {Object.entries(analytics.couponUsage).map(([code, count]) => (
                  <div key={code} className="flex justify-between items-center bg-stone-50 border border-stone-100 px-4 py-2.5 rounded-xl">
                    <span className="font-bold text-amber-600 bg-amber-100/50 px-2 py-0.5 rounded font-mono text-sm">{code}</span>
                    <span className="font-bold text-stone-900 text-sm bg-white px-3 py-1 rounded-full shadow-sm border border-stone-200">
                      Used {count} times
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* TOP SECTION: Backdoor Access Form */}
        <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm relative overflow-hidden mb-12">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[40px] pointer-events-none" />
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2 mb-2 relative z-10">
            <UserPlus size={24} className="text-amber-600" /> Grant Backdoor Access
          </h2>
          <p className="text-stone-500 text-sm mb-8 relative z-10">Manually enroll students who paid via UPI/Offline.</p>

          {message && (
            <div className={`p-4 rounded-xl mb-6 font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.type === 'success' && <CheckCircle2 size={18} />}
              {message.text}
            </div>
          )}

          <form onSubmit={handleManualEnrollment} className="flex flex-col gap-6 relative z-10">
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2">Student's Clerk User ID</label>
              <input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="e.g., user_2aBcD123..." className="w-full px-5 py-4 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-mono text-sm" />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2">Select Course to Unlock</label>
              <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="w-full px-5 py-4 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer font-bold text-stone-700">
                {activeCourses.map(course => <option key={course.id} value={course.slug}>{course.title}</option>)}
              </select>
            </div>
            <button type="submit" disabled={isSubmitting} className="mt-4 w-full py-4 rounded-xl bg-stone-900 text-white font-black text-lg flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors disabled:opacity-70 shadow-lg">
              {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
              {isSubmitting ? "Processing..." : "Unlock Course for Student"}
            </button>
          </form>
        </div>

        {/* BOTTOM SECTION: Assignment Submissions Viewer */}
        <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm relative overflow-hidden">
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2 mb-2">
            <FileCode2 size={24} className="text-amber-600" /> Recent Assignments
          </h2>
          <p className="text-stone-500 text-sm mb-8">Review the latest Python code submitted by your students.</p>

          {isLoadingSubmissions ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-amber-500" size={32} /></div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-10 bg-stone-50 rounded-xl border border-stone-200 border-dashed">
              <p className="text-stone-500">No assignments submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {submissions.map((sub) => (
                <div key={sub.id} className="border border-stone-200 rounded-xl p-5 bg-stone-50">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 border-b border-stone-200 pb-4">
                    <div className="flex items-center gap-2">
                      <UserCircle className="text-stone-400" size={20} />
                      <span className="font-bold text-stone-900">{sub.user_name || "Unknown Student"}</span>
                    </div>
                    <span className="text-xs text-stone-400 font-medium bg-white px-3 py-1 rounded-full border border-stone-200">
                      {new Date(sub.completed_at).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <PlayCircle className="text-amber-500" size={16} />
                    <span className="text-sm font-bold text-amber-700">
                      {getVideoTitle(sub.video_id)}
                    </span>
                  </div>

                  <div className="bg-[#0a0a0b] rounded-xl p-4 shadow-inner overflow-x-auto border border-stone-800">
                    <pre className="text-sm font-mono text-green-400 whitespace-pre-wrap leading-relaxed">
                      {sub.submitted_code || "No code provided."}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
      <Footer />
    </div>
  );
}