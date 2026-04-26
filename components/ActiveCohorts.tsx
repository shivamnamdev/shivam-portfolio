'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { CheckCircle2, ChevronDown, Gift, Calendar, Code2, Download, CreditCard, Loader2 } from 'lucide-react';
import { activeCourses } from '@/data/courses';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

interface ActiveCohortsProps {
  course?: any;
}

// Helper function to safely load Razorpay's checkout script
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
  
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();
  const router = useRouter();

  const displayCourse = propCourse || activeCourses[0];

  if (!displayCourse) return null;

  const handlePayment = async () => {
    if (!isSignedIn) {
      alert("Please log in or create an account first to secure your spot!");
      openSignIn();
      return;
    }

    setIsProcessing(true);

    try {
      const res = await loadRazorpayScript();
      
      if (!res) {
        alert("Razorpay SDK failed to load. Are you online?");
        setIsProcessing(false);
        return;
      }

      const numericAmount = parseInt(displayCourse.pricing.currentPrice.replace(/[^0-9]/g, ''));

      const orderResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numericAmount, courseId: displayCourse.id })
      });
      const data = await orderResponse.json();

      if (!data.success) throw new Error("Failed to create Razorpay order");

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "Shivam Academy",
        description: `Enrollment: ${displayCourse.title}`,
        order_id: data.order.id,
        prefill: {
          name: user?.fullName || "",
          email: user?.primaryEmailAddress?.emailAddress || "",
        },
        theme: {
          color: "#f59e0b",
        },
        handler: function (response: any) {
          console.log("Payment ID:", response.razorpay_payment_id);
          alert("🎉 Payment Successful! Welcome to the Cohort.");
          router.push('/learning');
        },
      };

      // Safely tell TypeScript that Razorpay exists on the window object
      const RazorpayConstructor = (window as any).Razorpay;
      const paymentObject = new RazorpayConstructor(options);
      
      paymentObject.on("payment.failed", function (response: any) {
        alert("Payment failed or was cancelled. Please try again.");
      });

      paymentObject.open();

    } catch (error) {
      console.error("Payment Error:", error);
      alert("Something went wrong connecting to the payment gateway.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section className="w-full relative z-10 py-12" id="live-sessions">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-stone-900 to-stone-600 mb-4">Course Breakdown</h2>
        <p className="text-stone-500">Everything included in this program.</p>
      </div>

      <div className="flex flex-col gap-12 max-w-6xl mx-auto">
        <div className="glass-panel rounded-3xl p-6 md:p-10 border-2 border-amber-400 bg-amber-50 shadow-xl shadow-amber-500/10 grid grid-cols-1 lg:grid-cols-2 gap-12 relative overflow-hidden">
          
          <div className="flex flex-col relative z-10">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="px-4 py-1 bg-red-500 text-white font-bold rounded-full text-sm animate-pulse shadow-md">{displayCourse.statusText}</span>
              <span className="px-4 py-1 bg-amber-500 text-white font-bold rounded-full text-sm shadow-md">{displayCourse.demoOffer}</span>
            </div>
            
            <h3 className="text-3xl md:text-4xl font-black text-stone-900 mb-4">{displayCourse.title}</h3>
            
            <div className="flex items-center gap-2 text-stone-600 font-medium mb-6">
              <Calendar size={18} className="text-amber-500" />
              <span>{displayCourse.duration}</span>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm mb-6">
              <div className="flex items-end gap-3 mb-2">
                <span className="text-5xl font-black text-stone-900">{displayCourse.pricing?.currentPrice}</span>
                <span className="text-xl text-stone-400 line-through font-bold mb-1">{displayCourse.pricing?.originalPrice}</span>
              </div>
              <p className="text-amber-600 font-bold text-sm tracking-wide uppercase">{displayCourse.pricing?.savingsText}</p>
              
              <div className="mt-6 flex flex-col gap-3">
                <button 
                  onClick={handlePayment} 
                  disabled={isProcessing}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-all shadow-lg shadow-amber-500/30 disabled:opacity-70"
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <CreditCard size={24} />}
                  {isProcessing ? "Processing..." : "Buy Now & Enroll"}
                </button>
                
                <a href="/python-syllabus.pdf" download
                   className="w-full py-4 rounded-xl border-2 border-stone-200 text-stone-700 font-bold text-lg flex items-center justify-center gap-2 hover:bg-stone-50 hover:border-amber-400 hover:text-amber-600 transition-all">
                  <Download size={20} /> Download Full Syllabus (PDF)
                </a>
              </div>
              <p className="text-center text-stone-500 text-xs mt-3">100% Secure Checkout via Razorpay</p>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-stone-800 mb-3 text-lg">What You Will Achieve:</h4>
                <ul className="space-y-2">
                  {displayCourse.outcomes?.map((outcome: string, idx: number) => (
                    <li key={idx} className="flex gap-3 text-stone-600 text-sm font-medium">
                      <CheckCircle2 size={18} className="text-amber-500 flex-shrink-0" /> {outcome}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="p-4 bg-amber-100/50 rounded-xl border border-amber-200">
                <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2"><Gift size={18}/> Special Bonuses included:</h4>
                <ul className="space-y-2">
                  {displayCourse.bonuses?.map((bonus: string, idx: number) => (
                    <li key={idx} className="flex gap-2 text-stone-700 text-sm">
                      <span className="text-amber-600">✔</span> {bonus}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col z-10">
            <h4 className="font-display font-black text-2xl text-stone-900 mb-6 border-b border-stone-200 pb-4">Program Curriculum</h4>
            <div className="flex flex-col gap-3">
              {displayCourse.modules?.map((mod: any, i: number) => {
                const isActive = openModule === i;
                return (
                  <div key={i} className={`rounded-2xl overflow-hidden transition-all border bg-white ${isActive ? 'border-amber-400 shadow-md' : 'border-stone-200 hover:border-amber-300'}`}>
                    <button onClick={() => setOpenModule(isActive ? null : i)} className="w-full p-4 md:p-5 flex items-center justify-between text-left">
                      <h5 className={`font-bold ${isActive ? 'text-amber-600' : 'text-stone-700'}`}>{mod.title}</h5>
                      <motion.div animate={{ rotate: isActive ? 180 : 0 }}><ChevronDown className="text-stone-400"/></motion.div>
                    </button>
                    <AnimatePresence>
                      {isActive && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <ul className="p-4 md:p-5 pt-0 space-y-3 border-t border-stone-100 mt-2 bg-stone-50">
                            {mod.topics.map((topic: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-3 text-stone-600 text-sm">
                                <Code2 size={16} className="text-amber-500 opacity-80 mt-0.5 flex-shrink-0" /> {topic}
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
      </div>
    </section>
  );
}