'use client';
import { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { activeCourses } from '@/data/courses';
import { activeCoupons } from '@/data/coupons';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayCircle, CheckCircle2, MonitorPlay, Infinity, Trophy, ChevronDown, Tag, CreditCard, Loader2, Globe, ShieldCheck, Code2, Award, ChevronRight } from 'lucide-react';


const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function CourseSalesPage({ params }: { params: { slug: string } }) {
  const course = activeCourses.find((c) => c.slug === params.slug);
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();

  const [openModule, setOpenModule] = useState<number | null>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState(false);
  const [region, setRegion] = useState<'inr' | 'usd'>('inr');
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponMessage, setCouponMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    async function checkEnrollment() {
      if (!isSignedIn || !user?.id || !course?.slug) return;
      try {
        const { data, error } = await supabase.from('user_enrollments').select('id').eq('user_id', user.id).eq('course_slug', course.slug);
        if (!error && data && data.length > 0) setIsAlreadyEnrolled(true);
      } catch (err) {}
    }
    checkEnrollment();
  }, [isSignedIn, user?.id, course?.slug]);

  if (!course) {
    return <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">Course not found.</div>;
  }

  const activePricing = course.pricing[region];
  let displayPriceNumeric = parseInt(activePricing.currentPrice.replace(/[^0-9]/g, ''));

  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      displayPriceNumeric = displayPriceNumeric - (displayPriceNumeric * (appliedCoupon.discountValue / 100));
    } else if (appliedCoupon.discountType === 'fixed') {
      displayPriceNumeric = displayPriceNumeric - (appliedCoupon.discountValue[region] || 0);
    }
    displayPriceNumeric = Math.max(Math.round(displayPriceNumeric), 0);
  }

  const handleApplyCoupon = () => {
    if (!isSignedIn) { alert("Please log in first to apply a coupon!"); openSignIn(); return; }
    setCouponMessage({ text: "", type: "" });
    const coupon = activeCoupons.find(c => c.code.toUpperCase() === couponInput.toUpperCase());
    if (!coupon) { setCouponMessage({ text: "Invalid coupon code.", type: "error" }); setAppliedCoupon(null); return; }
    if (coupon.allowedUsers && coupon.allowedUsers.length > 0 && !coupon.allowedUsers.includes(user?.id)) {
      setCouponMessage({ text: "This coupon is restricted.", type: "error" }); setAppliedCoupon(null); return;
    }
    setAppliedCoupon(coupon);
    setCouponMessage({ text: "Coupon applied successfully!", type: "success" });
  };

  const handlePayment = async () => {
    if (!isSignedIn) { alert("Please log in or create an account first to secure your spot!"); openSignIn(); return; }
    setIsProcessing(true);

    try {
      if (displayPriceNumeric === 0) {
        const res = await fetch('/api/enroll-free', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId: course.id, courseSlug: course.slug, currency: activePricing.currencyCode, couponCode: appliedCoupon?.code, userId: user?.id })
        });
        const data = await res.json();
        if (data.success) { alert("🎉 100% Discount Applied! You are now enrolled."); router.push('/learning'); } 
        else { alert(data.error || "Failed to process free enrollment."); }
        setIsProcessing(false); return; 
      }

      const res = await loadRazorpayScript();
      if (!res) { alert("Razorpay SDK failed to load."); setIsProcessing(false); return; }

      const orderResponse = await fetch('/api/create-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: displayPriceNumeric, courseId: course.id, currency: activePricing.currencyCode, couponCode: appliedCoupon?.code, userId: user?.id })
      });
      const data = await orderResponse.json();

      if (!data.success) throw new Error(data.error || "Failed to create Razorpay order");

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!, amount: data.order.amount, currency: data.order.currency,
        name: "Shivam Academy", description: `Enrollment: ${course.title}`, order_id: data.order.id,
        prefill: { name: user?.fullName || "", email: user?.primaryEmailAddress?.emailAddress || "" },
        theme: { color: "#f59e0b" },
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, userId: user?.id, courseSlug: course.slug, userEmail: user?.primaryEmailAddress?.emailAddress, userName: user?.fullName || user?.firstName || "Student", courseTitle: course.title, amountPaid: `${activePricing.currencyCode === 'USD' ? '$' : '₹'}${displayPriceNumeric}`, couponCode: appliedCoupon?.code })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) { alert("🎉 Payment Verified! You are now enrolled."); router.push('/learning'); }
          } catch (err) { alert("Error verifying enrollment."); }
        },
      };

      const RazorpayConstructor = (window as any).Razorpay;
      const paymentObject = new RazorpayConstructor(options);
      paymentObject.on("payment.failed", function () { alert("Payment failed. Please try again."); });
      paymentObject.open();

    } catch (error: any) { alert("Something went wrong connecting to the payment gateway."); } 
    finally { setIsProcessing(false); }
  };

  return (
    <div className="relative min-h-screen bg-[#050505] text-white">
      <div className="absolute inset-0 bg-grid-pattern z-0 opacity-20 pointer-events-none" />
      <Navbar />

      {/* 🚨 1. THE HERO SECTION (Full Width, Dark) */}
      <section className="w-full bg-[#0a0a0a] border-b border-white/10 pt-20 pb-16 relative z-10">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-xs text-amber-500 font-bold uppercase tracking-widest mb-6">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span></span>
              {course.statusText}
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-black leading-tight mb-4 text-white">
              {course.vsl.headlinePart1} <br/>
              <span className="text-amber-500">{course.vsl.headlineHighlight}</span>
            </h1>
            <p className="text-stone-400 text-lg leading-relaxed mb-6">
              {course.vsl.subheadline}
            </p>
            <div className="flex items-center gap-4 text-sm font-bold text-stone-300">
              <div className="flex items-center gap-2"><MonitorPlay size={18} className="text-amber-500"/> {course.duration}</div>
              <div className="flex items-center gap-2"><Trophy size={18} className="text-amber-500"/> Certificate of Completion</div>
              <div className="flex items-center gap-2"><Globe size={18} className="text-amber-500"/> Available in Hinglish</div>
            </div>
            {/* 🚨 THE RESTORED BUTTON */}
            <motion.button 
              onClick={() => document.getElementById('curriculum')?.scrollIntoView({ behavior: 'smooth' })} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.3 }} 
              className="px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-lg flex items-center justify-center gap-3 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] w-full sm:w-auto group"
            >
              View Course Details <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </div>
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
            <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors z-10" />
            <img src={course.vsl.flyerUrl} alt="Course Preview" className="w-full h-auto object-cover" />
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <PlayCircle size={64} className="text-white/80 group-hover:scale-110 transition-transform drop-shadow-xl" />
            </div>
          </div>
        </div>
      </section>

      {/* 🚨 2. THE MAIN CONTENT (Left) & STICKY SIDEBAR (Right) */}
      <main className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-3 gap-12 relative z-10">
        
        {/* LEFT COLUMN: Details */}
        <div className="lg:col-span-2 space-y-16">
          
          {/* What You Will Learn */}
          <section>
            <h2 className="text-3xl font-black mb-8 text-white border-b border-white/10 pb-4">What you'll learn</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {course.outcomes?.map((outcome: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 size={24} className="text-amber-500 shrink-0" />
                  <span className="text-stone-300 leading-relaxed">{outcome}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Differentiators */}
          {course.differentiators && (
            <section>
              <h2 className="text-3xl font-black mb-8 text-white border-b border-white/10 pb-4">Why this cohort is different</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {course.differentiators.map((diff: any, idx: number) => (
                  <div key={idx} className="p-6 bg-[#121212] border border-white/5 rounded-xl hover:border-amber-500/30 transition-colors">
                    <h3 className="text-amber-500 font-bold mb-2 uppercase tracking-widest text-xs">{diff.title}</h3>
                    <p className="text-stone-400 text-sm">{diff.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Curriculum Accordion */}
          <section id="curriculum" className="scroll-mt-32">
            <h2 className="text-3xl font-black mb-8 text-white border-b border-white/10 pb-4">Course Curriculum</h2>
            <div className="space-y-3">
              {course.modules?.map((mod: any, i: number) => {
                const isActive = openModule === i;
                return (
                  <div key={i} className={`rounded-xl overflow-hidden transition-all border ${isActive ? 'bg-[#121212] border-amber-500/50' : 'bg-transparent border-white/10 hover:border-white/30'}`}>
                    <button onClick={() => setOpenModule(isActive ? null : i)} className="w-full p-5 flex items-center justify-between text-left">
                      <div className="flex items-center gap-4">
                        {mod.week && <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 bg-white/5 px-2 py-1 rounded">{mod.week}</span>}
                        <h5 className={`font-bold ${isActive ? 'text-amber-500' : 'text-stone-300'}`}>{mod.title}</h5>
                      </div>
                      <motion.div animate={{ rotate: isActive ? 180 : 0 }}><ChevronDown className="text-stone-500"/></motion.div>
                    </button>
                    <AnimatePresence>
                      {isActive && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <ul className="p-5 pt-0 space-y-3 border-t border-white/5 mt-2">
                            {mod.topics.map((topic: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-3 text-stone-400 text-sm">
                                <PlayCircle size={16} className="text-stone-600 mt-0.5 shrink-0" /> {topic}
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Testimonials */}
          {course.courseTestimonials && (
            <section>
              <h2 className="text-3xl font-black mb-8 text-white border-b border-white/10 pb-4">What Our Learners Say</h2>
              <div className="space-y-6">
                {course.courseTestimonials.map((test: any, i: number) => (
                  <div key={i} className="p-8 bg-[#121212] border border-white/10 rounded-2xl relative">
                    <p className="text-stone-300 italic mb-6 leading-relaxed">"{test.text}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">{test.name.charAt(0)}</div>
                      <div>
                        <p className="font-bold text-white text-sm">{test.name}</p>
                        <p className="text-xs text-stone-500">Verified Learner</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* 🚨 RIGHT COLUMN: STICKY PRICING SIDEBAR */}
        <div className="lg:col-span-1">
          <div className="sticky top-32 flex flex-col gap-6">
            
            <div className="bg-[#121212] p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] pointer-events-none" />

              {course.enrollmentClosed ? (
                <div className="text-center py-4 relative z-10">
                  <h4 className="text-2xl font-black text-white mb-2">Enrollment Closed</h4>
                  <p className="text-stone-400 text-sm mb-6">This cohort is no longer accepting new students.</p>
                  {isAlreadyEnrolled ? (
                    <button onClick={() => router.push('/learning')} className="w-full py-4 rounded-xl bg-green-500/20 text-green-400 font-black flex items-center justify-center gap-2 border border-green-500/30">
                      <CheckCircle2 size={20} /> Go to Dashboard
                    </button>
                  ) : (
                    <button onClick={() => router.push('/courses')} className="w-full py-4 rounded-xl bg-white text-black font-black hover:bg-stone-200 transition-colors">
                      View Open Cohorts
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative z-10">
                  <div className="flex p-1 bg-[#0a0a0a] rounded-xl mb-6 border border-white/10">
                    <button onClick={() => setRegion('inr')} className={`w-1/2 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${region === 'inr' ? 'bg-[#1a1a1a] text-amber-500 shadow-lg border border-white/10' : 'text-stone-500 hover:text-stone-300'}`}>🇮🇳 India</button>
                    <button onClick={() => setRegion('usd')} className={`w-1/2 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${region === 'usd' ? 'bg-[#1a1a1a] text-amber-500 shadow-lg border border-white/10' : 'text-stone-500 hover:text-stone-300'}`}><Globe size={16} /> Global</button>
                  </div>

                  <div className="flex items-end gap-3 mb-2">
                    <span className="text-5xl font-black text-white">{activePricing.currencyCode === 'USD' ? '$' : '₹'}{displayPriceNumeric}</span>
                    <span className={`text-xl font-bold mb-1 ${appliedCoupon ? 'text-red-400 line-through' : 'text-stone-500 line-through'}`}>
                      {appliedCoupon ? activePricing.currentPrice : activePricing.originalPrice}
                    </span>
                  </div>
                  <p className="text-amber-500 font-bold text-sm tracking-wide uppercase mb-6">
                    {appliedCoupon ? `🎉 ${appliedCoupon.code} Applied!` : activePricing?.savingsText}
                  </p>
                  
                  {!isAlreadyEnrolled && (
                    <div className="mb-6 p-4 rounded-xl border border-white/10 bg-[#0a0a0a]">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 block flex items-center gap-1"><Tag size={12}/> Have a Coupon Code?</label>
                      <div className="flex gap-2">
                        <input type="text" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Enter code" className="flex-1 px-4 py-2 rounded-lg border border-white/10 bg-[#121212] text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono text-sm transition-all" />
                        <button onClick={handleApplyCoupon} className="px-4 py-2 bg-white text-black rounded-lg font-bold text-sm hover:bg-stone-200 transition-colors">Apply</button>
                      </div>
                      {couponMessage.text && <p className={`text-xs font-bold mt-2 ${couponMessage.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{couponMessage.text}</p>}
                    </div>
                  )}

                  <div className="mt-2 flex flex-col gap-3">
                    {isAlreadyEnrolled ? (
                      <button onClick={() => router.push('/learning')} className="w-full py-4 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 font-black text-lg flex items-center justify-center gap-2 hover:bg-green-500/30 transition-all">
                        <CheckCircle2 size={24} /> Enrolled! Dashboard
                      </button>
                    ) : (
                      <button onClick={handlePayment} disabled={isProcessing} className="w-full py-4 rounded-xl bg-amber-500 text-black font-black text-lg flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-70">
                        {isProcessing ? <Loader2 className="animate-spin text-black" size={24} /> : <CreditCard size={24} className="text-black" />}
                        {isProcessing ? "Processing..." : displayPriceNumeric === 0 ? "Enroll for Free" : `Enroll Now`}
                      </button>
                    )}
                  </div>
                  <p className="text-center text-stone-500 text-xs mt-4 flex justify-center items-center gap-1"><ShieldCheck size={14}/> 100% Secure Checkout via Razorpay</p>
                </div>
              )}
            </div>

            {/* This Course Includes Card */}
            <div className="bg-[#121212] p-6 rounded-2xl border border-white/10">
              <h4 className="font-bold text-white mb-4">This course includes:</h4>
              <ul className="space-y-3">
                <li className="flex gap-3 text-stone-400 text-sm font-medium"><MonitorPlay size={18} className="text-amber-500 flex-shrink-0" /> Live Interactive Classes</li>
                <li className="flex gap-3 text-stone-400 text-sm font-medium"><Code2 size={18} className="text-amber-500 flex-shrink-0" /> In-Browser Practice Labs</li>
                <li className="flex gap-3 text-stone-400 text-sm font-medium"><Infinity size={18} className="text-amber-500 flex-shrink-0" /> Lifetime Access to Recordings</li>
                <li className="flex gap-3 text-stone-400 text-sm font-medium"><Award size={18} className="text-amber-500 flex-shrink-0" /> Certificate of Completion</li>
              </ul>
            </div>

          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}