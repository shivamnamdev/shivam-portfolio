import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { isQaFixture } from "@/data/courses";
import { getCatalog } from "@/lib/catalog/catalog";
import Banners from "@/components/Banners";
import CourseGrid from "@/components/catalog/CourseGrid";

export default async function CoursesPage() {
  const catalog = await getCatalog();
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

        <div className="w-full max-w-5xl"><Banners placement="courses" /></div>

        <CourseGrid courses={catalog.filter((course) => !isQaFixture(course.slug) && course.listed !== false)} />
      </main>
      <Footer />
    </div>
  );
}