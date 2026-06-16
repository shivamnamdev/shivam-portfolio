import { notFound } from 'next/navigation';
import { activeCourses } from '@/data/courses';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroVSL from "@/components/HeroVSL"; 
import PainPoints from "@/components/PainPoints";
import ActiveCohorts from "@/components/ActiveCohorts";
import Differentiators from "@/components/Differentiators";
import FAQ from "@/components/FAQ";
import WhatsAppWidget from "@/components/WhatsAppWidget";
import SpotlightCard from '@/components/SpotlightCard';
import { Quote } from 'lucide-react';

export default function CourseSalesPage({ params }: { params: { slug: string } }) {
  
  const course = activeCourses.find((c) => c.slug === params.slug);

  if (!course) {
    notFound();
  }

  return (
    <div className="relative min-h-screen bg-black">
      <div className="absolute inset-0 bg-grid-pattern z-0 opacity-30" />
      <Navbar />
      
      <main className="flex flex-col items-center max-w-7xl mx-auto px-6 sm:px-12 pb-10 space-y-20 md:space-y-32 relative z-10">
        
        <HeroVSL course={course} /> 
        <PainPoints painPoints={course.painPoints} />
        <Differentiators course={course} />
        <ActiveCohorts course={course} /> 
        
        {/* 🚨 NEW: COURSE-SPECIFIC TESTIMONIALS */}
        {course.courseTestimonials && course.courseTestimonials.length > 0 && (
          <section className="w-full relative z-10 py-10 max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-display font-black text-white mb-4 drop-shadow-md">What Our Learners Say</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {course.courseTestimonials.map((test: any, i: number) => (
                <SpotlightCard key={i} className="p-8 bg-[#121212] group">
                  <Quote size={40} className="text-amber-500/20 absolute top-6 right-6" />
                  <p className="text-stone-400 italic mb-8 relative z-10 leading-relaxed">"{test.text}"</p>
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-xl shadow-sm">
                      {test.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-lg">{test.name}</h4>
                      <p className="text-xs text-stone-500">Verified Learner</p>
                    </div>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </section>
        )}
        
        <FAQ />
      </main>
      
      <Footer />
      <WhatsAppWidget />
    </div>
  );
}