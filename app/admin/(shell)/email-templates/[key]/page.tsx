'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { adminFetch, useAdminGet } from '@/components/admin/useAdminApi';
import { ErrorNote, PageHeader, Spinner, StatusBadge, buttonClass, ghostButtonClass, inputClass } from '@/components/admin/ui';
import { normaliseTemplate, templateChanged, templateHints, type TemplateView } from '@/lib/adminUi/engagement';
import { ifMatchHeader, type Failure } from '@/lib/adminUi/client';

type Preview = { subject: string; text: string; html: string; values: Record<string, string> };

export default function EmailTemplatePage() {
  const { key } = useParams<{ key: string }>();
  const loaded = useAdminGet<TemplateView>(`/email-templates/${encodeURIComponent(key)}`);
  const [tpl, setTpl] = useState<TemplateView | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewFailure, setPreviewFailure] = useState<Failure | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [saved, setSaved] = useState(false);
  const bodyBox = useRef<HTMLTextAreaElement>(null);

  const adopt = (t: TemplateView) => { setTpl(t); setSubject(t.subject); setBody(t.body); };
  useEffect(() => { if (loaded.data) adopt(loaded.data); }, [loaded.data]);

  const hints = tpl ? templateHints(tpl.placeholders, subject, body) : [];
  const changed = tpl ? templateChanged(tpl, subject, body) : false;
  // The preview is always drawn by the server (the same renderer the real e-mail uses). It waits for a pause in typing and for a text with no hints.
  useEffect(() => {
    if (!tpl || hints.length) { setPreview(null); return; }
    let live = true;
    const timer = setTimeout(async () => {
      const r = await adminFetch<Preview>(`/email-templates/${encodeURIComponent(key)}/preview`, { method: 'POST', body: normaliseTemplate(subject, body) });
      if (!live) return;
      if (r.ok) { setPreview(r.data); setPreviewFailure(null); } else setPreviewFailure(r.failure);
    }, 400);
    return () => { live = false; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tpl, subject, body, key]);

  function insert(name: string) {
    const box = bodyBox.current;
    const at = box ? box.selectionStart : body.length;
    const end = box ? box.selectionEnd : body.length;
    setBody(`${body.slice(0, at)}{{${name}}}${body.slice(end)}`); setSaved(false);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!tpl) return;
    setBusy(true); setFailure(null); setSaved(false);
    const r = await adminFetch<TemplateView>(`/email-templates/${encodeURIComponent(key)}`, { method: 'PUT', body: normaliseTemplate(subject, body), headers: tpl.version === null ? undefined : ifMatchHeader(tpl.version) });
    setBusy(false);
    if (r.ok) { adopt(r.data); setSaved(true); } else setFailure(r.failure);
  }

  if (loaded.loading && !tpl) return <Spinner />;
  if (!tpl) return <div><ErrorNote failure={loaded.failure} /><Link href="/admin/email-templates" className="text-sm text-amber-400">Back to templates</Link></div>;
  return (
    <div>
      <p className="mb-2 text-sm"><Link href="/admin/email-templates" className="text-amber-400 hover:text-amber-300">E-mail templates</Link> / <span className="font-mono text-stone-400">{tpl.key}</span></p>
      <PageHeader title={tpl.key} subtitle="Plain text only. A blank line starts a paragraph; **bold** and [label](https://link) are the only formatting." />
      <div className="mb-4 flex flex-wrap items-center gap-3"><StatusBadge value={tpl.source === 'custom' ? 'published' : 'draft'} /><span className="text-sm text-stone-400">{tpl.source === 'custom' ? `Saved text, version ${tpl.version}` : 'Built-in text (nothing saved yet)'}</span></div>
      <form onSubmit={save} aria-label="Edit template" className="space-y-4">
        <label className="block text-xs font-semibold text-stone-400">Subject<input value={subject} maxLength={160} onChange={(e) => { setSubject(e.target.value); setSaved(false); }} className={`${inputClass} mt-1 font-normal`} /></label>
        <label className="block text-xs font-semibold text-stone-400">Message<textarea ref={bodyBox} rows={10} value={body} onChange={(e) => { setBody(e.target.value); setSaved(false); }} className={`${inputClass} mt-1 font-mono text-xs font-normal`} /></label>
        <div className="flex flex-wrap items-center gap-2" aria-label="Placeholders">
          <span className="text-xs text-stone-400">Insert a placeholder:</span>
          {tpl.placeholders.map((p) => <button key={p} type="button" className={`${ghostButtonClass} !px-2 !py-1 font-mono text-xs`} onClick={() => insert(p)}>{`{{${p}}}`}</button>)}
        </div>
        {hints.length > 0 && <ul role="alert" className="list-disc rounded-lg bg-amber-500/10 p-3 pl-7 text-xs text-amber-200">{hints.map((h) => <li key={h}>{h}</li>)}</ul>}
        <ErrorNote failure={failure} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy || hints.length > 0 || !changed} className={buttonClass}>{busy ? 'Saving…' : 'Save template'}</button>
          {saved && <span role="status" className="text-sm text-emerald-300">Saved</span>}
        </div>
      </form>

      <section aria-label="Preview" className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="mb-1 text-sm font-bold text-white">Preview with sample values</h2>
        <p className="mb-3 text-xs text-stone-500">Sample: {Object.entries(preview?.values ?? {}).map(([k, v]) => `${k} = ${v}`).join(', ') || '…'}. Nothing is sent or saved by the preview.</p>
        <ErrorNote failure={previewFailure} />
        {preview ? (
          <div>
            <p data-testid="preview-subject" className="mb-2 text-sm font-semibold text-white">Subject: {preview.subject}</p>
            {/* The HTML is drawn by the server's own e-mail renderer, which escapes everything first (UI test ADMUI-TPL-002 checks hostile text stays inert). */}
            <div data-testid="preview-body" className="space-y-2 rounded-lg bg-white p-4 text-sm text-stone-900 [&_a]:text-blue-700 [&_a]:underline" dangerouslySetInnerHTML={{ __html: preview.html }} />
          </div>
        ) : <p className="text-sm text-stone-500">{hints.length ? 'Fix the problems above to see the preview.' : 'Loading the preview…'}</p>}
      </section>
    </div>
  );
}
