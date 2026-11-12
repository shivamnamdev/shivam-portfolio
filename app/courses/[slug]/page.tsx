import { notFound } from 'next/navigation';
import { getCourse, getSupport } from '@/lib/catalog/catalog';
import CourseSalesView from '@/components/catalog/CourseSalesView';

export default async function CourseSalesPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const course = await getCourse(params.slug);
  const support = await getSupport();
  const couponCheck = course?.pricedBy === 'database' ? 'server' : 'browser';   // a course priced from the portal asks the server (its codes never ship to the browser)

  if (!course) {
    notFound();
  }

  return <CourseSalesView course={course} support={support} couponCheck={couponCheck} />;
}
