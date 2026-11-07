'use client';
import { useRouter } from 'next/navigation';

// "Show" dropdown of the preview list: draft and published (default) or archived only.
export default function PreviewFilter({ value }: { value: 'active' | 'archived' }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-stone-300">Show
      <select aria-label="Show" value={value} onChange={(e) => router.push(e.target.value === 'archived' ? '/preview/courses?show=archived' : '/preview/courses')}
        className="rounded-lg border border-white/15 bg-black px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none">
        <option value="active">Draft and published</option>
        <option value="archived">Archived only</option>
      </select>
    </label>
  );
}
