// app/share/[videoId]/page.tsx
import { Metadata } from 'next';
import { courseCurriculumMap } from '@/data/learning-content';
import { activeCourses } from '@/data/courses';

// 1. Helper function to find which course this video belongs to
function getVideoDetails(videoId: string) {
  for (const slug in courseCurriculumMap) {
    for (const module of courseCurriculumMap[slug]) {
      const vIndex = module.videoIds.indexOf(videoId);
      if (vIndex !== -1) {
        let title = `Lesson ${vIndex + 1}`;
        if (module.githubAssignments && module.githubAssignments[videoId]) {
           title = module.githubAssignments[videoId].title;
        }
        const course = activeCourses.find(c => c.slug === slug);
        return { slug, title, courseTitle: course?.title || "Python Course" };
      }
    }
  }
  return null;
}

// 2. Generate Dynamic SEO Metadata for WhatsApp!
export async function generateMetadata({ params }: { params: { videoId: string } }): Promise<Metadata> {
  const details = getVideoDetails(params.videoId);
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

// 3. 🚨 THE FIX: A 200 OK page with a Client-Side JavaScript Redirect
export default function ShareRedirectPage({ params }: { params: { videoId: string } }) {
  const details = getVideoDetails(params.videoId);
  const destination = details ? `/learning/${details.slug}?v=${params.videoId}` : '/learning';

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center text-white font-sans p-6 text-center">
      <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <h1 className="text-xl font-bold mb-2">Unlocking Secure Classroom...</h1>
      <p className="text-stone-400 text-sm">Please wait while we redirect you to your dashboard.</p>
      
      {/* This tiny script instantly routes humans to the dashboard, but allows WhatsApp bots to read the page! */}
      <script dangerouslySetInnerHTML={{ __html: `window.location.href = "${destination}";` }} />
    </div>
  );
}