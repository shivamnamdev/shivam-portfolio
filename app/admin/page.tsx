'use client';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ShieldAlert, CheckCircle2, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { activeCourses } from '@/data/courses';

// 🚨 REPLACE THIS WITH YOUR EXACT CLERK EMAIL ADDRESS:
const ADMIN_EMAIL = "shivamnamdev.corp@gmail.com"; 

export default function AdminDashboard() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  const [studentId, setStudentId] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(activeCourses[0].slug);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const[message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Security Check: Kick out anyone who isn't the Admin
  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn) {
        router.push('/');
      } else if (user.primaryEmailAddress?.emailAddress !== ADMIN_EMAIL) {
        // Log them out or kick them to the homepage if they aren't you!
        router.push('/learning');
      }
    }
  }, [isLoaded, isSignedIn, user, router]);

  // Show nothing while verifying admin status
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
      // 1. Check if they already have access
      const { data: existing } = await supabase
        .from('user_enrollments')
        .select('id')
        .eq('user_id', studentId.trim())
        .eq('course_slug', selectedCourse);

      if (existing && existing.length > 0) {
        setMessage({ text: "Student is already enrolled in this course!", type: 'error' });
        return;
      }

      // 2. Grant Access (Backdoor Entry)
      const { error } = await supabase
        .from('user_enrollments')
        .insert([{ 
          user_id: studentId.trim(), 
          course_slug: selectedCourse 
        }]);

      if (error) throw error;

      setMessage({ text: "Access Granted Successfully!", type: 'success' });
      setStudentId(""); // Clear the input
      
    } catch (err) {
      console.error("Manual Enrollment Error:", err);
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
            <h1 className="text-4xl font-display font-black text-stone-900 mb-1">
              Admin Portal
            </h1>
            <p className="text-stone-500 font-mono text-sm">Security Level: Maximum Clearance ({ADMIN_EMAIL})</p>
          </div>
        </div>

        {/* Backdoor Access Form */}
        <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[40px] pointer-events-none" />
          
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2 mb-2 relative z-10">
            <UserPlus size={24} className="text-amber-600" /> Grant Backdoor Access
          </h2>
          <p className="text-stone-500 text-sm mb-8 relative z-10">
            Manually enroll students who paid via UPI/Offline. They must create a free account first to generate a User ID.
          </p>

          {message && (
            <div className={`p-4 rounded-xl mb-6 font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.type === 'success' && <CheckCircle2 size={18} />}
              {message.text}
            </div>
          )}

          <form onSubmit={handleManualEnrollment} className="flex flex-col gap-6 relative z-10">
            
            {/* Input: Clerk User ID */}
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2">Student's Clerk User ID</label>
              <input 
                type="text" 
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g., user_2aBcD123..." 
                className="w-full px-5 py-4 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-mono text-sm"
              />
              <p className="text-xs text-stone-400 mt-2">Find this in your Clerk Dashboard under the 'Users' tab.</p>
            </div>

            {/* Input: Course Selection */}
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2">Select Course to Unlock</label>
              <select 
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-5 py-4 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer font-bold text-stone-700"
              >
                {activeCourses.map(course => (
                  <option key={course.id} value={course.slug}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="mt-4 w-full py-4 rounded-xl bg-stone-900 text-white font-black text-lg flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors disabled:opacity-70 shadow-lg"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
              {isSubmitting ? "Processing..." : "Unlock Course for Student"}
            </button>
            
          </form>
        </div>

      </main>
      <Footer />
    </div>
  );
}