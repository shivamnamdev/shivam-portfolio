import { notFound } from 'next/navigation';
import { activeCourses } from '@/data/courses';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroVSL from "@/components/HeroVSL"; 
import PainPoints from "@/components/PainPoints";
import ActiveCohorts from "@/components/ActiveCohorts";
import Instructor from "@/components/Instructor";
import FAQ from "@/components/FAQ";
import WhatsAppWidget from "@/components/WhatsAppWidget";

export default function CourseSalesPage({ params }: { params: { slug: string } }) {
  
  // Find the specific course
  const course = activeCourses.find((c) => c.slug === params.slug);

  if (!course) {
    notFound();
  }

  return (
    <div className="relative min-h-screen">
      <Navbar />
      
      <main className="flex flex-col items-center max-w-7xl mx-auto px-6 sm:px-12 pb-10 space-y-32">
        {/* PASS THE COURSE DATA AS PROPS! */}
        <HeroVSL course={course} /> 
        
        <PainPoints />
        
        <ActiveCohorts course={course} /> 
        
        <Instructor />
        <FAQ />
      </main>
      
      <Footer />
      <WhatsAppWidget />
    </div>
  );
}