// app/admin/(shell)/layout.tsx
// The server-side guard of the admin portal screens: the admin check runs here, before any admin component is sent to the browser.
// A visitor goes to the home page, another signed-in user to their learning area. The API behind every screen checks the admin again.
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { isAdminEmail } from '@/lib/admin';
import { getPrimaryEmail } from '@/lib/serverAuth';
import AdminShell from '@/components/admin/AdminShell';

export const metadata: Metadata = { title: 'Admin | Shivam Academy', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminShellLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect('/');
  const email = getPrimaryEmail(user);
  if (!email || !isAdminEmail(email)) redirect('/learning');
  return <AdminShell email={email}>{children}</AdminShell>;
}
