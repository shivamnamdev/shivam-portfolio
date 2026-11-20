// The "Access Denied" screen of /live/[slug]. Shown by the server layout (lib/courseGate.ts) to anyone who is not enrolled (SCP-39), and by the page
// itself when its own check fails. No hooks, so it renders on the server as well as in the browser.
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function LiveDenied() {
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
