// app/admin/api-docs/page.tsx
// Swagger UI for the admin API. The admin check runs on the server before any Swagger code is sent; the spec itself is fetched from
// /api/admin/v1/openapi.json, which checks the admin again. Visitors go to the home page, other signed-in users to their learning area.
import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { isAdminEmail } from '@/lib/admin';
import { getPrimaryEmail } from '@/lib/serverAuth';
import AdminApiDocsClient from './AdminApiDocsClient';

export default async function AdminApiDocsPage() {
  const user = await currentUser();
  if (!user) redirect('/');
  const email = getPrimaryEmail(user);
  if (!email || !isAdminEmail(email)) redirect('/learning');
  return <AdminApiDocsClient adminEmail={email} />;
}
