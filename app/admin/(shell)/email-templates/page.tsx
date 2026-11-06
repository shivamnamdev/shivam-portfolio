'use client';
import Link from 'next/link';
import { useAdminGet } from '@/components/admin/useAdminApi';
import { DataTable, ErrorNote, PageHeader, Spinner, StatusBadge } from '@/components/admin/ui';
import type { TemplateView } from '@/lib/adminUi/engagement';

export default function EmailTemplatesPage() {
  const loaded = useAdminGet<{ items: TemplateView[] }>('/email-templates');
  return (
    <div>
      <PageHeader title="E-mail templates" subtitle="The text of the automatic e-mails (welcome, receipt, free enrolment). Until you save a change, the built-in text is used." />
      <ErrorNote failure={loaded.failure} />
      {loaded.loading && !loaded.data ? <Spinner /> : (
        <DataTable rows={loaded.data?.items ?? []} rowKey={(t) => t.key} empty="No templates."
          columns={[
            { header: 'Template', cell: (t) => <Link href={`/admin/email-templates/${t.key}`} className="font-mono font-semibold text-amber-400 hover:text-amber-300">{t.key}</Link> },
            { header: 'Subject', cell: (t) => t.subject },
            { header: 'Text', cell: (t) => <StatusBadge value={t.source === 'custom' ? 'published' : 'draft'} /> },
            { header: 'Source', cell: (t) => (t.source === 'custom' ? `Saved (version ${t.version})` : 'Built-in') },
          ]} />
      )}
    </div>
  );
}
