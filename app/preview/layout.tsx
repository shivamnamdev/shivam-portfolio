// app/preview/layout.tsx
// Server-side guard of the learner preview: only the admin gets past it (a visitor goes to the home page, any other signed-in user to their learning
// area), and nothing here is indexed or cached. The pages read the portal's drafts, which no one else may see.
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { isAdminEmail } from '@/lib/admin';
import { getPrimaryEmail } from '@/lib/serverAuth';

export const metadata: Metadata = { title: 'Learner preview | Shivam Academy', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function PreviewLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect('/');
  const email = getPrimaryEmail(user);
  if (!email || !isAdminEmail(email)) redirect('/learning');
  return <>{children}</>;
}
