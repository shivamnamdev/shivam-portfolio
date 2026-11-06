// app/share/[videoId]/page.tsx
import { Metadata } from 'next';
import { auth, currentUser } from '@clerk/nextjs/server';
import { findLesson } from '@/lib/catalog/learning';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAdminEmail } from '@/lib/admin';
import { getPrimaryEmail } from '@/lib/serverAuth';

// 1. Which course (and lesson title) a video belongs to: the published portal curriculum or the data files, per PORTAL_LEARNING.
const getVideoDetails = findLesson;

// 2. Generate Dynamic SEO Metadata for WhatsApp!
export async function generateMetadata({ params }: { params: { videoId: string } }): Promise<Metadata> {
  const details = await getVideoDetails(params.videoId);
  const title = details ? `${details.title} | ${details.courseTitle}` : "Exclusive Lesson | Shivam Academy";
  
  // 🚨 THE FIX: Use 0.jpg which is guaranteed to exist even for Unlisted YouTube videos!
  const imageUrl = `https://img.youtube.com/vi/${params.videoId}/0.jpg`;

  return {
    title: title,
    description: "Join the live interactive cohorts and master Python engineering. Click to watch this specific lesson directly on the student dashboard!",
    openGraph: {
      title: title,
      description: "Click to watch this specific lesson directly on the student dashboard!",
      images: [imageUrl], 
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: title,
      description: "Master Python Programming & Logic Building.",
      images: [imageUrl],
    }
  }
}

async function resolveDestination(videoId: string) {
  const details = await getVideoDetails(videoId);
  if (!details) return '/learning';

  const { userId } = auth();
  if (!userId) return `/courses/${details.slug}`;

  const clerkUser = await currentUser();
  // Server-side Clerk users expose emailAddresses + primaryEmailAddressId, not primaryEmailAddress.
  const isAdmin = isAdminEmail(getPrimaryEmail(clerkUser));
  if (isAdmin) return `/learning/${details.slug}?v=${videoId}`;

  try {
    const { data, error } = await supabaseAdmin
      .from('user_enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_slug', details.slug)
      .limit(1);

    if (!error && data && data.length > 0) {
      return `/learning/${details.slug}?v=${videoId}`;
    }
  } catch (err) {
    // Default-deny on any server error.
  }

  return `/courses/${details.slug}`;
}

// 3. 🚨 THE FIX: A 200 OK page with a Client-Side JavaScript Redirect
export default async function ShareRedirectPage({ params }: { params: { videoId: string } }) {
  const destination = await resolveDestination(params.videoId);

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center text-white font-sans p-6 text-center">
      <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <h1 className="text-xl font-bold mb-2">Unlocking Secure Classroom...</h1>
      <p className="text-stone-400 text-sm">Please wait while we verify your access and redirect you.</p>
      
      {/* This tiny script instantly routes humans to the dashboard, but allows WhatsApp bots to read the page! */}
      <script dangerouslySetInnerHTML={{ __html: `window.location.href = ${JSON.stringify(destination)};` }} />
      <noscript>
        <a href={destination} className="mt-4 text-amber-400 underline">Continue</a>
      </noscript>
    </div>
  );
}