import Link from "next/link";
import { ChevronRight, Calendar } from "lucide-react";
import SpotlightCard from "@/components/SpotlightCard";
import { formatPrice, parsePrice } from "@/lib/pricing";

// The course cards of the catalog, shared by the public /courses page and the admin-only preview. In the preview each card also carries the
// state of its cohort (draft, published, archived; archived is greyed out) and a note when something is missing.
export type GridCourse = {
  id: string; slug: string; title: string; statusText: string; duration: string; enrollmentClosed: boolean;
  pricing?: { inr: { currentPrice: string } }; pricingPlans?: Array<{ price: string }>;
  previewStatus?: "draft" | "published" | "archived"; previewNote?: string;
};
const PREVIEW_TAG = {
  draft: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  published: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  archived: "bg-white/10 text-stone-400 border border-white/10",
} as const;

export default function CourseGrid({ courses, hrefBase = "/courses" }: { courses: GridCourse[]; hrefBase?: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
          {courses.map((course) => (
            <SpotlightCard key={course.id} className={`flex flex-col h-full p-8 md:p-10 group ${course.previewStatus === 'archived' ? 'opacity-50 grayscale' : ''}`}>
              {course.previewStatus && (
                <p data-testid="preview-status" data-status={course.previewStatus} className={`mb-4 inline-block self-start rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider relative z-10 ${PREVIEW_TAG[course.previewStatus]}`}>
                  {course.previewStatus}{course.previewNote ? ` · ${course.previewNote}` : ''}
                </p>
              )}
              <div className="flex justify-between items-start mb-6 relative z-10">
                <span className={`px-3 py-1 font-bold rounded-full text-xs ${course.enrollmentClosed ? 'bg-white/10 text-stone-400 border border-white/10' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                  {course.statusText}
                </span>
                
                <span className={`text-2xl font-black ${course.enrollmentClosed ? 'text-stone-500' : 'text-white'}`}>
                  {course.enrollmentClosed
                    ? "Closed"
                    : course.pricingPlans?.length
                      ? `From ${formatPrice(Math.min(...course.pricingPlans.map((p: { price: string }) => parsePrice(p.price))), "INR")}`
                      : course.pricing?.inr.currentPrice}
                </span>
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-3 line-clamp-2 relative z-10">{course.title}</h2>
              
              <div className="flex items-center gap-2 text-stone-400 text-sm font-medium mb-8 relative z-10">
                <Calendar size={16} className="text-amber-500" />
                <span>{course.duration}</span>
              </div>
              
              <Link href={`${hrefBase}/${course.slug}`} className="mt-auto w-full py-4 rounded-xl border border-white/20 bg-white/5 text-white font-bold text-center flex items-center justify-center gap-2 group-hover:bg-amber-500 group-hover:border-amber-500 group-hover:text-black transition-all relative z-10">
                View Details <ChevronRight size={18} />
              </Link>
            </SpotlightCard>
          ))}
        </div>

  );
}
