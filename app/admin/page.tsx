'use client';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ShieldAlert, CheckCircle2, UserPlus, Loader2, FileCode2, Users, BarChart, Code2, Eye, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { activeCourses } from '@/data/courses';
import { courseCurriculumMap } from '@/data/learning-content';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';

// 🚨 Ensure this is your exact Clerk login email!
const ADMIN_EMAIL = "shivamnamdev.corp@gmail.com"; 

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
  return `Unknown Video`;
}

function getCourseTotals(slug: string) {
  const courseModules = courseCurriculumMap[slug] ||[];
  const totalVideos = courseModules.flatMap(m => m.videoIds).length;
  const totalAssignments = courseModules.flatMap(m => m.videoIds.filter((v: string) => m.githubAssignments?.[v])).length;
  return { totalVideos, totalAssignments, totalTasks: totalVideos + totalAssignments };
}

export default function AdminDashboard() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  const [studentId, setStudentId] = useState("");
  const[selectedCourse, setSelectedCourse] = useState(activeCourses[0].slug);
  const[isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const[enrollments, setEnrollments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [videoProgress, setVideoProgress] = useState<any[]>([]);
  const[isLoadingData, setIsLoadingData] = useState(true);
  const [analytics, setAnalytics] = useState({ totalStudents: 0, couponUsage: {} as Record<string, number> });

  // 🚨 NEW: State to hold the real names and emails from Clerk!
  const [clerkUserMap, setClerkUserMap] = useState<Record<string, {name: string, email: string, image: string}>>({});

  const [activeTab, setActiveTab] = useState<'enrollments' | 'progress' | 'assignments'>('enrollments');
  const [showCodeModal, setShowCodeModal] = useState(false);
  const[activeCodeView, setActiveCodeView] = useState<{name: string, title: string, code: string} | null>(null);

  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn) router.push('/');
      else if (user.primaryEmailAddress?.emailAddress !== ADMIN_EMAIL) router.push('/learning');
    }
  }, [isLoaded, isSignedIn, user, router]);

  useEffect(() => {
    async function fetchAdminData() {
      if (!isLoaded || !isSignedIn || user.primaryEmailAddress?.emailAddress !== ADMIN_EMAIL) return;
      try {
        const[enrRes, assRes, vidRes] = await Promise.all([
          supabase.from('user_enrollments').select('*').order('enrolled_at', { ascending: false }),
          supabase.from('assignment_progress').select('*').order('completed_at', { ascending: false }),
          supabase.from('video_progress').select('*')
        ]);

        if (enrRes.data) {
          setEnrollments(enrRes.data);
          const usage: Record<string, number> = {};
          enrRes.data.forEach((row) => {
            if (row.coupon_used) usage[row.coupon_used] = (usage[row.coupon_used] || 0) + 1;
          });
          setAnalytics({ totalStudents: enrRes.data.length, couponUsage: usage });
        }
        
        if (assRes.data) setSubmissions(assRes.data);
        if (vidRes.data) setVideoProgress(vidRes.data);

        // 🚨 NEW: Gather all unique User IDs and fetch their real details from Clerk
        const allUserIds = new Set<string>();
        if (enrRes.data) enrRes.data.forEach(d => allUserIds.add(d.user_id));
        if (assRes.data) assRes.data.forEach(d => allUserIds.add(d.user_id));

        const uniqueIds = Array.from(allUserIds);
        
        if (uniqueIds.length > 0) {
          const clerkRes = await fetch('/api/get-clerk-users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds: uniqueIds })
          });
          const clerkData = await clerkRes.json();
          if (clerkData.success) {
            setClerkUserMap(clerkData.users);
          }
        }

      } catch (err) {
        console.error("Failed to load admin data:", err);
      } finally {
        setIsLoadingData(false);
      }
    }
    fetchAdminData();
  }, [isLoaded, isSignedIn, user]);

  if (!isLoaded || !isSignedIn || user.primaryEmailAddress?.emailAddress !== ADMIN_EMAIL) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50"><Loader2 className="animate-spin text-amber-500" size={48} /></div>;
  }

  const handleManualEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    if (!studentId.trim()) { setMessage({ text: "Please enter a valid Clerk User ID.", type: 'error' }); setIsSubmitting(false); return; }

    try {
      const { data: existing } = await supabase.from('user_enrollments').select('id').eq('user_id', studentId.trim()).eq('course_slug', selectedCourse);
      if (existing && existing.length > 0) { setMessage({ text: "Student is already enrolled!", type: 'error' }); return; }
      
      const { error } = await supabase.from('user_enrollments').insert([{ user_id: studentId.trim(), course_slug: selectedCourse }]);
      if (error) throw error;
      
      setMessage({ text: "Access Granted Successfully!", type: 'success' });
      setStudentId(""); 
      setAnalytics(prev => ({ ...prev, totalStudents: prev.totalStudents + 1 }));
      
      // We push the new enrollment. If they are in Clerk, refreshing the page will grab their real name!
      setEnrollments([{ user_id: studentId.trim(), course_slug: selectedCourse, enrolled_at: new Date().toISOString() }, ...enrollments]);
    } catch (err) {
      setMessage({ text: "Database Error.", type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCodeViewer = (sub: any) => {
    const clerkInfo = clerkUserMap[sub.user_id];
    setActiveCodeView({ 
      name: clerkInfo?.name || sub.user_name || 'Unknown Student', 
      title: getVideoTitle(sub.video_id), 
      code: sub.submitted_code 
    });
    setShowCodeModal(true);
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-stone-50">
      <Navbar />
      
      <AnimatePresence>
        {showCodeModal && activeCodeView && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#0d1117] w-full max-w-4xl rounded-2xl border border-stone-700 shadow-2xl flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-800 flex justify-between items-center bg-[#161b22]">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2"><Code2 className="text-amber-500" size={18}/> Code Review</h3>
                  <p className="text-stone-400 text-xs mt-1">{activeCodeView.name} • {activeCodeView.title}</p>
                </div>
                <button onClick={() => setShowCodeModal(false)} className="text-stone-400 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              <div className="h-[500px]">
                <Editor height="100%" defaultLanguage="python" theme="vs-dark" value={activeCodeView.code || "# No code provided."} options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14, padding: { top: 16 } }} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="flex-grow max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        
        <div className="mb-10 border-b border-stone-200 pb-6 flex items-center gap-4">
          <div className="w-16 h-16 bg-stone-900 rounded-2xl flex items-center justify-center shadow-lg"><ShieldAlert size={32} className="text-amber-500" /></div>
          <div>
            <h1 className="text-3xl font-display font-black text-stone-900 mb-1">Admin Command Center</h1>
            <p className="text-stone-500 font-mono text-sm">Authenticated as: {ADMIN_EMAIL}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm flex items-center gap-6">
            <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Users size={24}/></div>
            <div>
              <p className="text-stone-500 text-sm font-bold uppercase tracking-wider">Total Students</p>
              <h3 className="text-4xl font-black text-stone-900">{analytics.totalStudents}</h3>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm flex items-center gap-6">
            <div className="w-14 h-14 rounded-full bg-green-50 text-green-600 flex items-center justify-center"><FileCode2 size={24}/></div>
            <div>
              <p className="text-stone-500 text-sm font-bold uppercase tracking-wider">Assignments</p>
              <h3 className="text-4xl font-black text-stone-900">{submissions.length}</h3>
            </div>
          </div>
          <div className="bg-stone-900 rounded-2xl p-6 border border-stone-800 shadow-xl flex items-center gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 blur-[40px] pointer-events-none" />
            <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center relative z-10"><BarChart size={24}/></div>
            <div className="relative z-10">
              <p className="text-stone-400 text-sm font-bold uppercase tracking-wider">Coupons Used</p>
              <h3 className="text-4xl font-black text-white">{Object.values(analytics.couponUsage).reduce((a, b) => a + b, 0)}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden mb-10">
          <div className="flex border-b border-stone-200 bg-stone-50/50 overflow-x-auto">
            <button onClick={() => setActiveTab('enrollments')} className={`px-6 py-4 font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'enrollments' ? 'text-amber-600 border-b-2 border-amber-500 bg-white' : 'text-stone-500 hover:text-stone-800'}`}><Users size={16} /> Enrollments</button>
            <button onClick={() => setActiveTab('progress')} className={`px-6 py-4 font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'progress' ? 'text-amber-600 border-b-2 border-amber-500 bg-white' : 'text-stone-500 hover:text-stone-800'}`}><BarChart size={16} /> Student Progress</button>
            <button onClick={() => setActiveTab('assignments')} className={`px-6 py-4 font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'assignments' ? 'text-amber-600 border-b-2 border-amber-500 bg-white' : 'text-stone-500 hover:text-stone-800'}`}><FileCode2 size={16} /> Code Submissions</button>
          </div>

          <div className="p-0 overflow-x-auto">
            {isLoadingData ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-amber-500" size={32} /></div>
            ) : (
              <table className="w-full text-left text-sm text-stone-600 min-w-[800px]">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-800 font-bold uppercase tracking-wider text-xs">
                  {activeTab === 'enrollments' && <tr><th className="p-4">Student Identity</th><th className="p-4">Course</th><th className="p-4">Coupon</th><th className="p-4">Date Enrolled</th></tr>}
                  {activeTab === 'progress' && <tr><th className="p-4">Student Identity</th><th className="p-4">Course</th><th className="p-4">Videos</th><th className="p-4">Assignments</th><th className="p-4">Completion</th></tr>}
                  {activeTab === 'assignments' && <tr><th className="p-4">Student Identity</th><th className="p-4">Assignment Task</th><th className="p-4">Date Submitted</th><th className="p-4 text-right">Action</th></tr>}
                </thead>
                <tbody className="divide-y divide-stone-100">
                  
                  {/* TAB 1: ENROLLMENTS */}
                  {activeTab === 'enrollments' && enrollments.map((enr, i) => {
                    const clerkInfo = clerkUserMap[enr.user_id];
                    const displayName = clerkInfo?.name || enr.user_name || "Unknown Student";
                    const displayEmail = clerkInfo?.email || enr.user_email || enr.user_id;
                    
                    return (
                      <tr key={i} className="hover:bg-stone-50 transition-colors">
                        <td className="p-4 flex items-center gap-3">
                          {clerkInfo?.image ? (
                            <img src={clerkInfo.image} alt="User" className="w-8 h-8 rounded-full border border-stone-200" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                              {displayName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-stone-800">{displayName}</div>
                            <div className="text-xs text-stone-400 font-mono mt-0.5">{displayEmail}</div>
                          </div>
                        </td>
                        <td className="p-4 font-bold text-stone-800">{enr.course_slug}</td>
                        <td className="p-4">{enr.coupon_used ? <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold">{enr.coupon_used}</span> : '-'}</td>
                        <td className="p-4">{new Date(enr.enrolled_at).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}

                  {/* TAB 2: PROGRESS ANALYTICS */}
                  {activeTab === 'progress' && enrollments.map((enr, i) => {
                    const totals = getCourseTotals(enr.course_slug);
                    const vidsDone = videoProgress.filter(v => v.user_id === enr.user_id && v.course_slug === enr.course_slug).length;
                    const assDone = submissions.filter(a => a.user_id === enr.user_id && a.course_slug === enr.course_slug).length;
                    const pct = totals.totalTasks > 0 ? Math.round(((vidsDone + assDone) / totals.totalTasks) * 100) : 0;
                    
                    const clerkInfo = clerkUserMap[enr.user_id];
                    const displayName = clerkInfo?.name || enr.user_name || "Unknown Student";
                    const displayEmail = clerkInfo?.email || enr.user_email || enr.user_id;

                    return (
                      <tr key={i} className="hover:bg-stone-50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-stone-800">{displayName}</div>
                          <div className="text-xs text-stone-400 font-mono mt-0.5">{displayEmail}</div>
                        </td>
                        <td className="p-4 font-bold text-stone-800">{enr.course_slug}</td>
                        <td className="p-4">{vidsDone} / {totals.totalVideos}</td>
                        <td className="p-4">{assDone} / {totals.totalAssignments}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-full bg-stone-200 rounded-full h-2 max-w-[100px]"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${pct}%` }}></div></div>
                            <span className="font-bold text-xs">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* TAB 3: ASSIGNMENT SUBMISSIONS */}
                  {activeTab === 'assignments' && submissions.map((sub, i) => {
                    const clerkInfo = clerkUserMap[sub.user_id];
                    const displayName = clerkInfo?.name || sub.user_name || "Unknown Student";
                    
                    return (
                      <tr key={i} className="hover:bg-stone-50 transition-colors">
                        <td className="p-4 font-bold text-stone-800 flex items-center gap-3">
                          {clerkInfo?.image ? (
                            <img src={clerkInfo.image} alt="User" className="w-8 h-8 rounded-full border border-stone-200" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs">
                              {displayName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div>{displayName}</div>
                            <div className="text-xs text-stone-400 font-mono font-normal mt-0.5">{clerkInfo?.email || sub.user_id}</div>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-stone-600 line-clamp-1">{getVideoTitle(sub.video_id)}</td>
                        <td className="p-4 text-sm">{new Date(sub.completed_at).toLocaleString()}</td>
                        <td className="p-4 text-right">
                          <button onClick={() => openCodeViewer(sub)} className="inline-flex items-center gap-1 bg-stone-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-stone-800 transition-colors">
                            <Eye size={14} /> View Code
                          </button>
                        </td>
                      </tr>
                    )
                  })}

                  {/* Empty States */}
                  {activeTab === 'enrollments' && enrollments.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-stone-400">No enrollments found.</td></tr>}
                  {activeTab === 'assignments' && submissions.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-stone-400">No assignments submitted yet.</td></tr>}
                  
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* QUICK ACTIONS (Backdoor Form) */}
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

          <form onSubmit={handleManualEnrollment} className="flex flex-col sm:flex-row gap-4 items-end relative z-10">
            <div className="w-full sm:flex-1">
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Clerk User ID</label>
              <input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="user_2aBcD123..." className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-mono text-sm" />
            </div>
            <div className="w-full sm:flex-1">
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Course</label>
              <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer font-bold text-stone-700">
                {activeCourses.map(course => <option key={course.id} value={course.slug}>{course.title}</option>)}
              </select>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-6 py-3 rounded-xl bg-stone-900 text-white font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors disabled:opacity-70 shadow-lg">
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Grant Access"}
            </button>
          </form>
        </div>

      </main>
      <Footer />
    </div>
  );
}