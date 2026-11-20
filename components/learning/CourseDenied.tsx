// The "Access Denied" screen of /learning/[slug]. Shown by the server layout (lib/courseGate.ts) to anyone who is not enrolled (SCP-39), and by the page
// itself when its own enrolment lookup fails. No hooks, so it renders on the server as well as in the browser.
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function CourseDenied({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Navbar />
      <div className="flex-grow flex items-center justify-center px-6">
        <div className="w-full max-w-xl text-center border border-white/10 bg-[#0d1117] rounded-2xl p-8">
          <h1 className="text-3xl font-black text-white mb-3">Access Denied</h1>
          <p className="text-stone-400 mb-8">You are not enrolled in this course yet. Enroll first to unlock recordings, labs, and assignments.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={`/courses/${slug}`} className="px-6 py-3 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition-colors">
              Enroll In Course
            </Link>
            <Link href="/learning" className="px-6 py-3 rounded-xl bg-stone-800 text-stone-100 font-bold hover:bg-stone-700 transition-colors">
              Back To Dashboard
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
