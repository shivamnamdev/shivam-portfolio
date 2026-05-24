import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { activeCourses } from "@/data/courses";
import { ChevronRight, Calendar } from "lucide-react";
import SpotlightCard from "@/components/SpotlightCard";

export default function CoursesPage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-black">
      <div className="absolute inset-0 bg-grid-pattern z-0 opacity-50" />
      <Navbar />
      
      <main className="flex-grow flex flex-col items-center max-w-7xl mx-auto px-6 py-20 w-full relative z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

        <h1 className="text-5xl md:text-7xl font-display font-black text-white mb-6 text-center drop-shadow-lg">
          Course Catalog
        </h1>
        <p className="text-xl text-stone-400 max-w-2xl text-center mb-16">
          Browse my live cohorts and self-paced programs. Master the skills needed to lead in 2026.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
          {activeCourses.map((course) => (
            <SpotlightCard key={course.id} className="flex flex-col h-full p-8 md:p-10 group">
              <div className="flex justify-between items-start mb-6 relative z-10">
                <span className={`px-3 py-1 font-bold rounded-full text-xs ${course.enrollmentClosed ? 'bg-white/10 text-stone-400 border border-white/10' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                  {course.statusText}
                </span>
                
                <span className={`text-2xl font-black ${course.enrollmentClosed ? 'text-stone-500' : 'text-white'}`}>
                  {course.enrollmentClosed ? "Closed" : course.pricing?.inr.currentPrice}
                </span>
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-3 line-clamp-2 relative z-10">{course.title}</h2>
              
              <div className="flex items-center gap-2 text-stone-400 text-sm font-medium mb-8 relative z-10">
                <Calendar size={16} className="text-amber-500" />
                <span>{course.duration}</span>
              </div>
              
              <Link href={`/courses/${course.slug}`} className="mt-auto w-full py-4 rounded-xl border border-white/20 bg-white/5 text-white font-bold text-center flex items-center justify-center gap-2 group-hover:bg-amber-500 group-hover:border-amber-500 group-hover:text-black transition-all relative z-10">
                View Details <ChevronRight size={18} />
              </Link>
            </SpotlightCard>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}