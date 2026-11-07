import { notFound } from 'next/navigation';
import { getSupport } from '@/lib/catalog/catalog';
import { getPreview } from '@/lib/catalog/preview';
import CourseSalesView from '@/components/catalog/CourseSalesView';

// One cohort's sales page exactly as a learner will see it, in any status, with a slim label and the checkout turned off. Admin only (see ../../layout.tsx).
export default async function PreviewCoursePage({ params }: { params: { slug: string } }) {
  const course = await getPreview(params.slug);
  if (!course) notFound();
  const support = await getSupport();
  return <CourseSalesView course={course} support={support} couponCheck="server" preview={{ status: course.previewStatus, note: course.previewNote }} />;
}
