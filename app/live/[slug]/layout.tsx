// SCP-39: enrolment (or admin) is checked on the server before this course page is rendered, so the page code is not sent to anyone who may not open it.
// The routes behind the page (lessons, links, progress) check again on every call.
import { gateFor } from '@/lib/courseGate';
import LiveDenied from '@/components/learning/LiveDenied';

export default async function CourseLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if ((await gateFor(slug)) === 'denied') return <LiveDenied />;
  return children;
}
