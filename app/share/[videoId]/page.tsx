// app/share/[videoId]/page.tsx
import { redirect } from 'next/navigation';
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

// 2. 🚨 THE MAGIC: Generate Dynamic SEO Metadata for WhatsApp!
export async function generateMetadata({ params }: { params: { videoId: string } }): Promise<Metadata> {
  const details = getVideoDetails(params.videoId);
  const title = details ? `${details.title} | ${details.courseTitle}` : "Exclusive Lesson | Shivam Academy";
  
  // Force WhatsApp to pull the YouTube High-Quality Thumbnail
  const imageUrl = `https://img.youtube.com/vi/${params.videoId}/hqdefault.jpg`;

  return {
    title: title,
    description: "Join the live interactive cohorts and master Python engineering. Click to watch this specific lesson directly on the student dashboard!",
    openGraph: {
      title: title,
      description: "Click to watch this specific lesson directly on the student dashboard!",
      images: [imageUrl], // 🚨 Feeds the exact video thumbnail to WhatsApp
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

// 3. 🚨 THE REDIRECT: When a human clicks the link, instantly send them to the dashboard!
export default function ShareRedirectPage({ params }: { params: { videoId: string } }) {
  const details = getVideoDetails(params.videoId);
  
  if (details) {
    // Redirects to the specific course AND the specific video!
    redirect(`/learning/${details.slug}?v=${params.videoId}`);
  } else {
    // Fallback if video isn't found
    redirect('/learning');
  }
}