"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, Calendar, GraduationCap } from "lucide-react";
import SpotlightCard from "@/components/SpotlightCard";
import { cardPrice, INSTRUCTOR, type GridCourse } from "@/lib/catalogCard";
import type { CurrencyCode } from "@/lib/pricing";

// The course cards of the catalog, shared by the public /courses page and the admin-only preview (SCP-43). Each card shows the instructor, its price in
// the chosen currency (the toggle above the grid) and a quick preview panel (highlights and syllabus). In the preview each card also carries the state
// of its cohort (draft, published, archived; archived is greyed out) and a note when something is missing.
export type { GridCourse };
const PREVIEW_TAG = {
  draft: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  published: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  archived: "bg-white/10 text-stone-400 border border-white/10",
} as const;

export default function CourseGrid({ courses, hrefBase = "/courses" }: { courses: GridCourse[]; hrefBase?: string }) {
  const [currency, setCurrency] = useState<CurrencyCode>("INR");
  const [open, setOpen] = useState<string | null>(null);   // the card whose quick preview is open (one at a time)
  return (
    <div className="w-full max-w-5xl">
      <div role="group" aria-label="Show prices in" className="mb-6 flex justify-end gap-2">
        {(["INR", "USD"] as const).map((code) => (
          <button key={code} type="button" aria-pressed={currency === code} onClick={() => setCurrency(code)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-colors ${currency === code ? "bg-amber-500 border-amber-500 text-black" : "bg-white/5 border-white/20 text-stone-300 hover:bg-white/10"}`}>
            {code === "INR" ? "₹ INR" : "$ USD"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        {courses.map((course) => {
          const price = cardPrice(course, currency);
          const isOpen = open === course.id;
          const panelId = `quick-${course.id}`;
          return (
            <SpotlightCard key={course.id} className={`flex flex-col h-full p-8 md:p-10 group ${course.previewStatus === 'archived' ? 'opacity-50 grayscale' : ''}`}>
              {course.previewStatus && (
                <p data-testid="preview-status" data-status={course.previewStatus} className={`mb-4 inline-block self-start rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider relative z-10 ${PREVIEW_TAG[course.previewStatus]}`}>
                  {course.previewStatus}{course.previewNote ? ` · ${course.previewNote}` : ''}
                </p>
              )}
              <div className="flex justify-between items-start mb-6 relative z-10">
                <span className={`px-3 py-1 font-bold rounded-full text-xs ${course.enrollmentClosed ? 'bg-white/10 text-stone-400 border border-white/10' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                  {course.statusText}
                </span>
                <span className="text-right">
                  <span className={`block text-2xl font-black ${course.enrollmentClosed ? 'text-stone-500' : 'text-white'}`}>{price.label}</span>
                  {price.note && <span className="block text-[11px] font-semibold text-stone-500">{price.note}</span>}
                </span>
              </div>

              <h2 className="text-2xl font-bold text-white mb-3 line-clamp-2 relative z-10">{course.title}</h2>

              <p className="flex items-center gap-2 text-stone-300 text-sm font-medium mb-2 relative z-10">
                <GraduationCap size={16} className="text-amber-500" /> Taught by {INSTRUCTOR}
              </p>
              <div className="flex items-center gap-2 text-stone-400 text-sm font-medium mb-6 relative z-10">
                <Calendar size={16} className="text-amber-500" />
                <span>{course.duration}</span>
              </div>

              {(course.highlights.length > 0 || course.modules.length > 0) && (
                <div className="mb-6 relative z-10">
                  <button type="button" aria-expanded={isOpen} aria-controls={panelId} onClick={() => setOpen(isOpen ? null : course.id)}
                    className="flex items-center gap-1 text-sm font-bold text-amber-400 hover:text-amber-300">
                    Quick preview <ChevronDown size={16} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div id={panelId} className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-stone-300">
                      {course.highlights.length > 0 && (
                        <>
                          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-stone-500">Highlights</h3>
                          <ul className="mb-4 flex flex-wrap gap-2">
                            {course.highlights.map((h) => <li key={h} className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs">{h}</li>)}
                          </ul>
                        </>
                      )}
                      {course.modules.length > 0 && (
                        <>
                          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-stone-500">Syllabus</h3>
                          <ol className="list-decimal space-y-1 pl-5">
                            {course.modules.map((m) => <li key={m}>{m}</li>)}
                          </ol>
                          {course.moreModules > 0 && <p className="mt-2 text-xs text-stone-500">+ {course.moreModules} more {course.moreModules === 1 ? "module" : "modules"}</p>}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              <Link href={`${hrefBase}/${course.slug}`} className="mt-auto w-full py-4 rounded-xl border border-white/20 bg-white/5 text-white font-bold text-center flex items-center justify-center gap-2 group-hover:bg-amber-500 group-hover:border-amber-500 group-hover:text-black transition-all relative z-10">
                View Details <ChevronRight size={18} />
              </Link>
            </SpotlightCard>
          );
        })}
      </div>
    </div>
  );
}
