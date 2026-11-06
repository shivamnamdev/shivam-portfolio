'use client';
import dynamic from 'next/dynamic';
import { ShieldAlert } from 'lucide-react';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

// Rendered only by the server page, which has already verified the admin. "Try it out" uses the admin's own session cookie.
export default function AdminApiDocsClient({ adminEmail }: { adminEmail: string }) {
  return (
    <div className="min-h-screen bg-white">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.css" />
      <main className="w-full max-w-6xl mx-auto py-8 px-4">
        <div className="mb-6 flex items-center justify-between bg-stone-900 text-white p-4 rounded-xl shadow-lg">
          <div className="flex items-center gap-3"><ShieldAlert className="text-amber-500" /><h1 className="text-xl font-bold font-mono">Admin API v1</h1></div>
          <span className="text-xs font-mono bg-stone-800 px-3 py-1 rounded-full text-green-400">Signed in as {adminEmail}</span>
        </div>
        <div className="border border-stone-200 rounded-xl overflow-hidden shadow-sm bg-white p-4">
          <SwaggerUI url="/api/admin/v1/openapi.json" />
        </div>
      </main>
    </div>
  );
}
