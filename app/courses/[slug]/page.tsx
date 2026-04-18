import { notFound } from 'next/navigation';
import { activeCourses } from '@/data/courses';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroVSL from "@/components/HeroVSL"; // We will make this dynamic later
import PainPoints from "@/components/PainPoints";
import ActiveCohorts from "@/components/ActiveCohorts";
import Instructor from "@/components/Instructor";
import FAQ from "@/components/FAQ";
import WhatsAppWidget from "@/components/WhatsAppWidget";

// Next.js passes the URL slug as a 'params' object
export default function CourseSalesPage({ params }: { params: { slug: string } }) {
  
  // 1. Find the specific course in our JSON data that matches the URL slug
  const course = activeCourses.find((c) => c.slug === params.slug);

  // 2. If someone types a random URL like /courses/fake-course, show a 404 page
  if (!course) {
    notFound();
  }

  // 3. If found, render the entire high-converting sales funnel!
  return (
    <div className="relative min-h-screen">
      <Navbar />
      
      <main className="flex flex-col items-center max-w-7xl mx-auto px-6 sm:px-12 pb-10 space-y-32">
        {/* Later, we can pass course.title to HeroVSL to make it dynamic too! */}
        <HeroVSL /> 
        
        <PainPoints />
        
        {/* We keep ActiveCohorts here, but eventually we will pass the specific `course` data as a prop */}
        <ActiveCohorts /> 
        
        <Instructor />
        
        <FAQ />
      </main>
      
      <Footer />
      <WhatsAppWidget />
    </div>
  );
}