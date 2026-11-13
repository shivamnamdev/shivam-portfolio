import Link from 'next/link';
import { formatPrice, parsePrice } from '@/lib/pricing';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroVSL from "@/components/HeroVSL";
import InstructorStory from "@/components/InstructorStory";
import PainPoints from "@/components/PainPoints";
import Differentiators from "@/components/Differentiators";
import CourseCurriculum from "@/components/CourseCurriculum";
import CertificatePreview from "@/components/CertificatePreview";
import CoursePricing from "@/components/CoursePricing";
import ActiveCohorts from "@/components/ActiveCohorts";
import StickyEnrollBar from "@/components/StickyEnrollBar";
import FAQ from "@/components/FAQ";
import WhatsAppWidget from "@/components/WhatsAppWidget";
import Banners from "@/components/Banners";
import SpotlightCard from '@/components/SpotlightCard';
import { ChevronRight, Quote } from 'lucide-react';


export type PreviewInfo = { status: 'draft' | 'published' | 'archived'; note?: string };
const PREVIEW_LABEL: Record<PreviewInfo['status'], string> = {
  draft: 'Draft preview: only you can see this page. It is not on the public site until you publish it.',
  published: 'Published: this is the live page. Preview is read-only, buy from the public page.',
  archived: 'Archived: hidden from the public site. Preview is read-only.',
};

// The course sales page, shared by the public /courses/{slug} and the admin-only /preview/courses/{slug}. The preview looks the same; it adds one slim
// label and turns the checkout off (nothing can be bought from a preview, and the order routes refuse a draft anyway).
export default function CourseSalesView({ course, support, couponCheck, preview }: { course: any; support: { whatsappNumber: string }; couponCheck: 'browser' | 'server'; preview?: PreviewInfo }) {
  // Plan-based courses sell through plan cards (#pricing); others through the cohort box (#live-sessions).
  const hasPlans = !!course.pricingPlans?.length;
  const enrollTarget = hasPlans ? 'pricing' : 'live-sessions';
  const startingPrice = hasPlans
    ? formatPrice(Math.min(...course.pricingPlans!.map((p: { price: string }) => parsePrice(p.price))), 'INR')
    : course.pricing.inr.currentPrice;

  return (
    <div className="relative min-h-screen bg-black">
      <div className="absolute inset-0 bg-grid-pattern z-0 opacity-30 pointer-events-none" />
      <Navbar />

      <main className="flex flex-col items-center max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pb-24 md:pb-10 space-y-20 md:space-y-28 relative z-10">

        {preview
          ? <div data-testid="preview-label" data-status={preview.status} role="status" className={`w-full mt-6 rounded-lg border px-4 py-2 text-center text-sm font-semibold ${preview.status === 'draft' ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-white/15 bg-white/5 text-stone-300'}`}>{PREVIEW_LABEL[preview.status]}{preview.note ? ` (${preview.note})` : ''}</div>
          : <div className="w-full pt-6"><Banners placement="course-page" /></div>}
        <HeroVSL course={course} />
        <InstructorStory />
        <PainPoints painPoints={course.painPoints} />
        <Differentiators course={course} />
        <CourseCurriculum modules={course.modules} />
        <CertificatePreview courseTitle={course.title} />

        {preview
          ? <div data-testid="preview-checkout-off" title="Checkout is off in preview" className="w-full opacity-90 pointer-events-none select-none" aria-disabled="true" {...({ inert: true } as object)}>
              {hasPlans ? <CoursePricing course={course} couponCheck={couponCheck} /> : <ActiveCohorts course={course} hideCurriculum couponCheck={couponCheck} />}
            </div>
          : hasPlans ? <CoursePricing course={course} couponCheck={couponCheck} /> : <ActiveCohorts course={course} hideCurriculum couponCheck={couponCheck} />}

        {/* COURSE-SPECIFIC TESTIMONIALS */}
        {course.courseTestimonials && course.courseTestimonials.length > 0 && (
          <section className="w-full relative z-10 max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-display font-black text-white mb-4">What Our Learners Say</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {course.courseTestimonials.map((test: any, i: number) => (
                <SpotlightCard key={i} className="p-8 bg-[#121212] group">
                  <Quote size={40} className="text-amber-500/20 absolute top-6 right-6" />
                  <p className="text-stone-400 italic mb-8 relative z-10 leading-relaxed">"{test.text}"</p>
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-xl">
                      {test.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{test.name}</h3>
                      <p className="text-xs text-stone-500">Verified Learner</p>
                    </div>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </section>
        )}

        <FAQ />

        {/* a portal course may have no sales pitch yet, so the closing heading falls back to a plain one */}
        {/* CLOSING CTA — repeats the primary action at the last decision point */}
        <section className="w-full max-w-4xl mx-auto text-center rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-transparent px-6 py-14">
          <h2 className="text-3xl md:text-5xl font-display font-black text-white mb-4">
            Ready to {course.vsl?.headlineHighlight ? course.vsl.headlineHighlight.toLowerCase() : 'get started'}?
          </h2>
          <p className="text-stone-400 text-lg mb-8">
            {course.enrollmentClosed
              ? (course.format === 'recorded' ? 'Enrollment opens soon. Browse the catalog in the meantime.' : 'This cohort has started. Check the catalog for the next open batch.')
              : `${course.duration}. Starting at ${startingPrice}, inclusive of all taxes.`}
          </p>
          {course.enrollmentClosed ? (
            <Link href="/courses" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black font-black text-lg hover:bg-stone-200 transition-colors">
              {course.format === 'recorded' ? 'Browse Courses' : 'View Open Cohorts'} <ChevronRight size={20} />
            </Link>
          ) : (
            <a href={`#${enrollTarget}`} className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-amber-500 text-black font-black text-lg hover:bg-amber-400 transition-colors">
              {course.vsl?.ctaLabel || 'Enroll Now'} <ChevronRight size={20} />
            </a>
          )}
        </section>
      </main>

      <Footer />
      <WhatsAppWidget number={support.whatsappNumber} topic={`the ${course.title.replace(/\s*\(Batch\s*\d+\)/i, '')}`} liftOnMobile={!course.enrollmentClosed} />
      {!preview && !course.enrollmentClosed && <StickyEnrollBar targetId={enrollTarget} priceLabel={startingPrice} />}
    </div>
  );
}
