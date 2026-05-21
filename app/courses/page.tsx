import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { activeCourses } from "@/data/courses";
import { ChevronRight, Calendar } from "lucide-react";

export default function CoursesPage() {
  return (
    <div className="relative min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow flex flex-col items-center max-w-7xl mx-auto px-6 py-32 w-full">
        <h1 className="text-5xl font-display font-black text-stone-900 mb-6 text-center">Course Catalog</h1>
        <p className="text-xl text-stone-600 max-w-2xl text-center mb-16">
          Browse my live cohorts and self-paced programs. Master the skills needed to lead in 2026.
        </p>

        {/* The Dynamic Course Grid */}
        {/* The Dynamic Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
          {activeCourses.map((course) => (
            <div key={course.id} className="glass-panel p-8 rounded-3xl border border-stone-200 bg-white shadow-sm hover:shadow-xl transition-shadow flex flex-col h-full group">
              <div className="flex justify-between items-start mb-6">
                <span className={`px-3 py-1 font-bold rounded-full text-xs ${course.enrollmentClosed ? 'bg-stone-100 text-stone-600' : 'bg-red-100 text-red-600'}`}>
                  {course.statusText}
                </span>
                
                {/* 🚨 Show "Closed" if enrollment is closed, otherwise show INR price */}
                <span className={`text-2xl font-black ${course.enrollmentClosed ? 'text-stone-400' : 'text-stone-900'}`}>
                  {course.enrollmentClosed ? "Closed" : course.pricing?.inr.currentPrice}
                </span>
              </div>
              
              <h2 className="text-2xl font-bold text-stone-900 mb-3 line-clamp-2">{course.title}</h2>
              
              <div className="flex items-center gap-2 text-stone-500 text-sm font-medium mb-8">
                <Calendar size={16} className="text-amber-500" />
                <span>{course.duration}</span>
              </div>
              
              <Link href={`/courses/${course.slug}`} className="mt-auto w-full py-4 rounded-xl border-2 border-stone-200 text-stone-700 font-bold text-center flex items-center justify-center gap-2 group-hover:bg-amber-500 group-hover:border-amber-500 group-hover:text-white transition-all">
                View Details <ChevronRight size={18} />
              </Link>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}