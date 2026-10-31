// app/api-docs/page.tsx
// SCP-29: only the admin may see the internal API spec. The check runs on the server, before any Swagger
// code or spec is sent to the browser (the spec lives in ApiDocsClient and is only rendered for the admin).
import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { isAdminEmail } from '@/lib/admin';
import { getPrimaryEmail } from '@/lib/serverAuth';
import ApiDocsClient from './ApiDocsClient';

export default async function ApiDocsPage() {
  const user = await currentUser();
  if (!user) redirect('/');
  const email = getPrimaryEmail(user);
  if (!email || !isAdminEmail(email)) redirect('/learning');
  return <ApiDocsClient adminEmail={email} />;
}
