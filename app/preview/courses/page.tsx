import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CourseGrid from '@/components/catalog/CourseGrid';
import PreviewFilter from '@/components/catalog/PreviewFilter';
import { listPreview } from '@/lib/catalog/preview';
import { parseMode } from '@/lib/catalog/previewView';

// The catalog as a learner sees it, with the cohorts that are not public yet. Admin only (see layout.tsx).
export default async function PreviewCatalog({ searchParams }: { searchParams: { show?: string } }) {
  const mode = parseMode(searchParams.show);
  const courses = await listPreview(mode);
  return (
    <div className="relative min-h-screen flex flex-col bg-black">
      <div className="absolute inset-0 bg-grid-pattern z-0 opacity-50" />
      <Navbar />
      <main className="flex-grow flex flex-col items-center max-w-7xl mx-auto px-6 py-20 w-full relative z-10">
        <h1 className="text-5xl md:text-7xl font-display font-black text-white mb-6 text-center drop-shadow-lg">Course Catalog</h1>
        <p data-testid="preview-intro" className="text-lg text-amber-300 max-w-2xl text-center mb-8">
          Learner preview: only you can see this. It lists draft and published cohorts as learners will see them; archived ones are hidden unless you choose them below.
        </p>
        <div className="mb-8 flex w-full max-w-5xl items-center justify-between gap-4">
          <PreviewFilter value={mode} />
          <Link href="/admin/cohorts" className="text-sm font-semibold text-stone-300 underline hover:text-white">Back to the admin portal</Link>
        </div>
        {courses.length === 0
          ? <p data-testid="preview-empty" className="text-stone-400">{mode === 'archived' ? 'No archived cohorts.' : 'No draft or published cohorts yet. Create one in the admin portal.'}</p>
          : <CourseGrid courses={courses} hrefBase="/preview/courses" />}
      </main>
      <Footer />
    </div>
  );
}
