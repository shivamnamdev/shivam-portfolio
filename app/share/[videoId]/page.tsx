// app/share/[videoId]/page.tsx
import { Metadata } from 'next';
import { auth, currentUser } from '@clerk/nextjs/server';
import { findLesson } from '@/lib/catalog/learning';
import { getCourse } from '@/lib/catalog/catalog';
import { shareDestination, sharePreviewIsPublic } from '@/lib/courseAccess';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAdminEmail } from '@/lib/admin';
import { getPrimaryEmail } from '@/lib/serverAuth';

// 1. Which course (and lesson title) a video belongs to: the published portal curriculum or the data files, per PORTAL_LEARNING.
const getVideoDetails = findLesson;

// 2. Generate Dynamic SEO Metadata for WhatsApp!
export async function generateMetadata(props: { params: Promise<{ videoId: string }> }): Promise<Metadata> {
  const params = await props.params;
  const details = await getVideoDetails(params.videoId);
  // A hidden (old live) course shows no lesson title and no thumbnail in the preview: the preview is public to any crawler.
  if (details && !sharePreviewIsPublic(await isListed(details.slug))) {
    return {
      title: "Exclusive Lesson | Shivam Academy",
      description: "Sign in to open this lesson on your student dashboard.",
      robots: { index: false, follow: false },
    };
  }
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

// A course missing from the catalog counts as listed (nothing to hide).
async function isListed(slug: string): Promise<boolean> {
  return (await getCourse(slug))?.listed !== false;
}

async function resolveDestination(videoId: string) {
  const details = await getVideoDetails(videoId);
  if (!details) return '/learning';
  const listed = await isListed(details.slug);
  const to = (hasAccess: boolean) => shareDestination({ slug: details.slug, videoId, listed, hasAccess });

  const { userId } = await auth();
  if (!userId) return to(false);

  const clerkUser = await currentUser();
  // Server-side Clerk users expose emailAddresses + primaryEmailAddressId, not primaryEmailAddress.
  const isAdmin = isAdminEmail(getPrimaryEmail(clerkUser));
  if (isAdmin) return to(true);

  try {
    const { data, error } = await supabaseAdmin
      .from('user_enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_slug', details.slug)
      .limit(1);

    if (!error && data && data.length > 0) return to(true);
  } catch (err) {
    // Default-deny on any server error.
  }

  return to(false);
}

// 3. 🚨 THE FIX: A 200 OK page with a Client-Side JavaScript Redirect
export default async function ShareRedirectPage(props: { params: Promise<{ videoId: string }> }) {
  const params = await props.params;
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