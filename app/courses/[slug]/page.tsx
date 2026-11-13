import { notFound } from 'next/navigation';
import { getCourse, getSupport } from '@/lib/catalog/catalog';
import CourseSalesView from '@/components/catalog/CourseSalesView';
import { auth } from '@clerk/nextjs/server';
import { hasCourseAccess } from '@/lib/learnerApi';
import { canOpenSalesPage } from '@/lib/courseAccess';

export default async function CourseSalesPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const course = await getCourse(params.slug);
  const support = await getSupport();
  const couponCheck = course?.pricedBy === 'database' ? 'server' : 'browser';   // a course priced from the portal asks the server (its codes never ship to the browser)

  if (!course) {
    notFound();
  }

  // A hidden (unlisted) course, an old live cohort, has no public page: only its learners and the admin can open it; everyone else gets "not found". Any error is a refusal.
  if (course.listed === false) {
    const { userId } = await auth();
    const hasAccess = userId ? await hasCourseAccess(userId, course.slug).catch(() => false) : false;
    if (!canOpenSalesPage({ listed: false, hasAccess })) notFound();
  }

  return <CourseSalesView course={course} support={support} couponCheck={couponCheck} />;
}
