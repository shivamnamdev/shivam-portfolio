'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { CheckCircle2, ChevronDown, Gift, Calendar, Code2, Download, CreditCard, Loader2, Globe, Tag, PartyPopper, ExternalLink } from 'lucide-react';
import { activeCourses } from '@/data/courses';
import { activeCoupons } from '@/data/coupons';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import SpotlightCard from '@/components/SpotlightCard';

interface ActiveCohortsProps {
  course?: any;
}

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function ActiveCohorts({ course: propCourse }: ActiveCohortsProps) {
  const [openModule, setOpenModule] = useState<number | null>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState(false);
  const [region, setRegion] = useState<'inr' | 'usd'>('inr');
  
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponMessage, setCouponMessage] = useState({ text: "", type: "" });

  // 🚨 NEW: State to control the Post-Checkout WhatsApp Modal
  const [paymentSuccessData, setPaymentSuccessData] = useState<{show: boolean, whatsappLink: string}>({ show: false, whatsappLink: "" });

  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();
  const router = useRouter();

  const displayCourse = propCourse || activeCourses[0];

  useEffect(() => {
    async function checkEnrollment() {
      if (!isSignedIn || !user?.id || !displayCourse?.slug) return;
      try {
        const { data, error } = await supabase
          .from('user_enrollments')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_slug', displayCourse.slug);
          
        if (!error && data && data.length > 0) setIsAlreadyEnrolled(true);
      } catch (err) {}
    }
    checkEnrollment();
  }, [isSignedIn, user?.id, displayCourse?.slug]);

  if (!displayCourse) return null;

  const activePricing = displayCourse.pricing[region];

  let displayPriceNumeric = parseInt(activePricing.currentPrice.replace(/[^0-9]/g, ''));
  const originalPriceNumeric = displayPriceNumeric;

  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      displayPriceNumeric = displayPriceNumeric - (displayPriceNumeric * (appliedCoupon.discountValue / 100));
    } else if (appliedCoupon.discountType === 'fixed') {
      displayPriceNumeric = displayPriceNumeric - (appliedCoupon.discountValue[region] || 0);
    }
    displayPriceNumeric = Math.max(Math.round(displayPriceNumeric), 0);
  }

  const handleApplyCoupon = () => {
    if (!isSignedIn) {
      alert("Please log in first to apply a coupon!");
      openSignIn();
      return;
    }
    
    setCouponMessage({ text: "", type: "" });
    const coupon = activeCoupons.find(c => c.code.toUpperCase() === couponInput.toUpperCase());
    
    if (!coupon) {
      setCouponMessage({ text: "Invalid coupon code.", type: "error" });
      setAppliedCoupon(null);
      return;
    }
    
    if (coupon.allowedUsers && coupon.allowedUsers.length > 0) {
      if (!user?.id || !coupon.allowedUsers.includes(user.id)) {
        setCouponMessage({ text: "This coupon is restricted to specific accounts.", type: "error" });
        setAppliedCoupon(null);
        return;
      }
    }

    setAppliedCoupon(coupon);
    setCouponMessage({ text: "Coupon applied successfully!", type: "success" });
  };

  const handlePayment = async () => {
    if (!isSignedIn) {
      alert("Please log in or create an account first to secure your spot!");
      openSignIn();
      return;
    }
    setIsProcessing(true);

    try {
      if (displayPriceNumeric === 0) {
        const res = await fetch('/api/enroll-free', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            courseId: displayCourse.id, 
            courseSlug: displayCourse.slug, 
            currency: activePricing.currencyCode, 
            couponCode: appliedCoupon?.code, 
            userId: user?.id,
            userEmail: user?.primaryEmailAddress?.emailAddress,
            userName: user?.fullName || user?.firstName || "Student",
          })
        });
        const data = await res.json();
        if (data.success) {
          // 🚨 THE FIX: Trigger the beautiful success modal instead of an alert!
          setPaymentSuccessData({ show: true, whatsappLink: displayCourse.whatsappLink || "#" });
        } else {
          alert(data.error || "Failed to process free enrollment.");
        }
        setIsProcessing(false);
        return; 
      }

      const res = await loadRazorpayScript();
      if (!res) {
        alert("Razorpay SDK failed to load. Are you online?");
        setIsProcessing(false);
        return;
      }

      const orderResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: displayPriceNumeric, 
          courseId: displayCourse.id, 
          currency: activePricing.currencyCode, 
          couponCode: appliedCoupon?.code, 
          userId: user?.id 
        })
      });
      const data = await orderResponse.json();

      if (!data.success) throw new Error(data.error || "Failed to create Razorpay order");

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
        amount: data.order.amount,
        currency: data.order.currency,
        name: "Shivam Academy",
        description: `Enrollment: ${displayCourse.title}`,
        order_id: data.order.id,
        prefill: { name: user?.fullName || "", email: user?.primaryEmailAddress?.emailAddress || "" },
        theme: { color: "#f59e0b" },
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: user?.id,
                courseSlug: displayCourse.slug,
                userEmail: user?.primaryEmailAddress?.emailAddress,
                userName: user?.fullName || user?.firstName || "Student",
                courseTitle: displayCourse.title,
                amountPaid: `${activePricing.currencyCode === 'USD' ? '$' : '₹'}${displayPriceNumeric}`,
                couponCode: appliedCoupon?.code
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              // 🚨 THE FIX: Trigger the beautiful success modal instead of an alert!
              setPaymentSuccessData({ show: true, whatsappLink: displayCourse.whatsappLink || "#" });
            }
          } catch (err) { alert("Error verifying enrollment."); }
        },
      };

      const RazorpayConstructor = (window as any).Razorpay;
      const paymentObject = new RazorpayConstructor(options);
      paymentObject.on("payment.failed", function () { alert("Payment failed or was cancelled. Please try again."); });
      paymentObject.open();

    } catch (error: any) {
      console.error("Payment Error:", error);
      alert(error.message || "Something went wrong connecting to the payment gateway.");
    } finally {
      setIsProcessing(false);
    }
  };

  const syllabusPdf = displayCourse?.resources?.syllabusPdf;
  const syllabusLabel = displayCourse?.resources?.syllabusLabel || "Download Full Syllabus (PDF)";
  return (
    <section className="w-full relative z-10 py-12" id="live-sessions">
      
      {/* 🚨 NEW: THE SUCCESS MODAL OVERLAY */}
      <AnimatePresence>
        {paymentSuccessData.show && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              className="bg-[#121212] border border-white/10 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-green-500/10 blur-[60px] pointer-events-none" />
              
              <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                <PartyPopper size={36} className="text-green-400" />
              </div>
              
              <h3 className="text-3xl font-black text-white mb-3 relative z-10">Welcome Aboard!</h3>
              <p className="text-stone-400 mb-8 relative z-10 leading-relaxed">
                Your payment is verified. To ensure you don't miss any live class links, please join the official WhatsApp group right now.
              </p>

              <div className="space-y-4 relative z-10">
                <a 
                  href={paymentSuccessData.whatsappLink} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="w-full py-4 rounded-xl bg-[#25D366] text-white font-black text-lg flex items-center justify-center gap-2 hover:bg-[#20bd5a] transition-all shadow-lg shadow-[#25D366]/20"
                >
                  Join WhatsApp Group <ExternalLink size={20} />
                </a>
                
                <button 
                  onClick={() => router.push('/learning')} 
                  className="w-full py-4 rounded-xl bg-white text-black font-black text-lg flex items-center justify-center gap-2 hover:bg-stone-200 transition-all shadow-xl"
                >
                  Go to Dashboard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="text-center mb-12">
        <h2 className="text-4xl font-display font-black text-white mb-4 drop-shadow-lg">Course Breakdown</h2>
        <p className="text-stone-400">Everything included in this program.</p>
      </div>

      <div className="flex flex-col gap-12 max-w-6xl mx-auto">
        <SpotlightCard className="p-6 md:p-10 relative overflow-hidden bg-gradient-to-br from-[#0a0a0a] to-[#121212]">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10 w-full">
            
            {/* Left Column */}
            <div className="flex flex-col relative z-10">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className={`px-4 py-1 font-bold rounded-full text-sm shadow-md ${displayCourse.enrollmentClosed ? 'bg-white/10 text-stone-400 border border-white/10' : 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'}`}>
                  {displayCourse.statusText}
                </span>
                <span className={`px-4 py-1 font-bold rounded-full text-sm shadow-md ${displayCourse.enrollmentClosed ? 'bg-white/10 text-stone-400 border border-white/10' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                  {displayCourse.demoOffer}
                </span>
              </div>
              
              <h3 className="text-3xl md:text-4xl font-black text-white mb-4 drop-shadow-md">{displayCourse.title}</h3>
              
              <div className="flex items-center gap-2 text-stone-400 font-medium mb-6">
                <Calendar size={18} className="text-amber-500" />
                <span>{displayCourse.duration}</span>
              </div>

              <div className="bg-[#121212] p-6 rounded-2xl border border-white/10 shadow-2xl mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[50px] pointer-events-none" />

                {displayCourse.enrollmentClosed ? (
                  <div className="text-center py-4 relative z-10">
                    <h4 className="text-2xl font-black text-white mb-2">Enrollment Closed</h4>
                    <p className="text-stone-400 text-sm mb-6">This cohort is no longer accepting new students. Please check our latest batches to enroll.</p>
                    
                    {isAlreadyEnrolled ? (
                      <button onClick={() => router.push('/learning')} className="w-full py-4 rounded-xl bg-green-500/20 text-green-400 font-black text-lg flex items-center justify-center gap-2 border border-green-500/30 transition-all shadow-[0_0_15px_rgba(34,197,94,0.1)] hover:bg-green-500/30">
                        <CheckCircle2 size={24} /> You are Enrolled! Go to Dashboard
                      </button>
                    ) : (
                      <button onClick={() => router.push('/courses')} className="w-full py-4 rounded-xl bg-white text-black font-black text-lg flex items-center justify-center gap-2 hover:bg-stone-200 transition-all shadow-xl">
                        View Open Cohorts
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="relative z-10">
                    <div className="flex p-1 bg-[#0a0a0a] rounded-xl mb-6 border border-white/10">
                      <button onClick={() => setRegion('inr')} className={`w-1/2 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${region === 'inr' ? 'bg-[#1a1a1a] text-amber-500 shadow-lg border border-white/10' : 'text-stone-500 hover:text-stone-300'}`}>🇮🇳 India</button>
                      <button onClick={() => setRegion('usd')} className={`w-1/2 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${region === 'usd' ? 'bg-[#1a1a1a] text-amber-500 shadow-lg border border-white/10' : 'text-stone-500 hover:text-stone-300'}`}><Globe size={16} /> International</button>
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
                        <label className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 block flex items-center gap-1"><Tag size={12}/> Have a Coupon Code?</label>
                        <div className="flex gap-2">
                          <input type="text" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Enter code" className="flex-1 px-4 py-2 rounded-lg border border-white/10 bg-[#121212] text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono text-sm transition-all" />
                          <button onClick={handleApplyCoupon} className="px-4 py-2 bg-white text-black rounded-lg font-bold text-sm hover:bg-stone-200 transition-colors">Apply</button>
                        </div>
                        {couponMessage.text && <p className={`text-xs font-bold mt-2 ${couponMessage.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{couponMessage.text}</p>}
                      </div>
                    )}

                    <div className="mt-2 flex flex-col gap-3">
                      {isAlreadyEnrolled ? (
                        <button onClick={() => router.push('/learning')} className="w-full py-4 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 font-black text-lg flex items-center justify-center gap-2 hover:bg-green-500/30 transition-all shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                          <CheckCircle2 size={24} /> You are Enrolled! Go to Dashboard
                        </button>
                      ) : (
                        <button onClick={handlePayment} disabled={isProcessing} className="w-full py-4 rounded-xl bg-amber-500 text-black font-black text-lg flex items-center justify-center gap-2 hover:scale-[1.02] hover:bg-amber-400 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-70">
                          {isProcessing ? <Loader2 className="animate-spin text-black" size={24} /> : <CreditCard size={24} className="text-black" />}
                          {isProcessing ? "Processing..." : displayPriceNumeric === 0 ? "Enroll for Free" : `Buy Now (${activePricing.currencyCode})`}
                        </button>
                      )}
                      
                      {syllabusPdf ? (
                      <a
                      href={syllabusPdf}
                      download
                      className="w-full py-4 rounded-xl border border-white/20 bg-[#0a0a0a] text-stone-300 font-bold text-lg flex items-center justify-center gap-2 hover:bg-white/10 hover:border-amber-500 hover:text-amber-400 transition-all">
                      <Download size={20} /> {syllabusLabel}
                      </a> ) : null}
                      </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-bold text-white mb-3 text-lg">What You Will Achieve:</h4>
                  <ul className="space-y-2">
                    {displayCourse.outcomes?.map((outcome: string, idx: number) => <li key={idx} className="flex gap-3 text-stone-400 text-sm font-medium"><CheckCircle2 size={18} className="text-amber-500 flex-shrink-0" /> {outcome}</li>)}
                  </ul>
                </div>
                
                <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <h4 className="font-bold text-amber-500 mb-2 flex items-center gap-2"><Gift size={18}/> Special Bonuses included:</h4>
                  <ul className="space-y-2">
                    {displayCourse.bonuses?.map((bonus: string, idx: number) => <li key={idx} className="flex gap-2 text-stone-300 text-sm"><span className="text-amber-500">✔</span> {bonus}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            {/* Right Column: Highlights & Accordion */}
            <div className="flex flex-col z-10">
              
              {displayCourse.cohortHighlights && (
                <div className="mb-10 p-8 rounded-3xl bg-amber-500/5 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.1)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[40px] pointer-events-none" />
                  <h4 className="font-display font-black text-2xl text-amber-500 mb-6 relative z-10 uppercase tracking-wide">
                    Cohort Highlights
                  </h4>
                  <ul className="space-y-4 relative z-10">
                    {displayCourse.cohortHighlights.map((highlight: string, idx: number) => (
                      <li key={idx} className="flex gap-3 text-stone-300 text-[15px] font-medium leading-relaxed">
                        <CheckCircle2 size={20} className="text-amber-500 flex-shrink-0 mt-0.5" /> 
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <h4 className="font-display font-black text-2xl text-white mb-6 border-b border-white/10 pb-4">Program Curriculum</h4>
              <div className="flex flex-col gap-3">
                {displayCourse.modules?.map((mod: any, i: number) => {
                  const isActive = openModule === i;
                  return (
                    <div key={i} className={`rounded-2xl overflow-hidden transition-all border bg-[#0a0a0a] ${isActive ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'border-white/10 hover:border-amber-500/50'}`}>
                      <button onClick={() => setOpenModule(isActive ? null : i)} className="w-full p-4 md:p-5 flex items-center justify-between text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          {mod.week && (
                            <span className="text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-stone-400 px-3 py-1 rounded-md w-fit">
                              {mod.week}
                            </span>
                          )}
                          <h5 className={`font-bold ${isActive ? 'text-amber-500' : 'text-stone-300'}`}>{mod.title}</h5>
                        </div>
                        <motion.div animate={{ rotate: isActive ? 180 : 0 }}><ChevronDown className="text-stone-500 flex-shrink-0 ml-2"/></motion.div>
                      </button>
                      <AnimatePresence>
                        {isActive && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <ul className="p-4 md:p-5 pt-0 space-y-3 border-t border-white/10 mt-2 bg-[#121212]">
                              {mod.topics.map((topic: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-3 text-stone-400 text-sm">
                                  <Code2 size={16} className="text-amber-500/80 mt-0.5 flex-shrink-0" /> {topic}
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
            </div>

          </div>
        </SpotlightCard>
      </div>
    </section>
  );
}