'use client';
import { useState } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, Tag } from 'lucide-react';
import { activeCoupons } from '@/data/coupons';

const loadRazorpayScript = () => new Promise((resolve) => {
  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

export default function CoursePricing({ course }: { course: any }) {
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();
  const router = useRouter();
  
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponMessage, setCouponMessage] = useState({ text: "", type: "" });

  if (!course || !course.pricingPlans) return null;

  const handleApplyCoupon = () => {
    if (!isSignedIn) { alert("Please log in first!"); openSignIn(); return; }
    setCouponMessage({ text: "", type: "" });
    const coupon = activeCoupons.find(c => c.code.toUpperCase() === couponInput.toUpperCase());
    if (!coupon) { setCouponMessage({ text: "Invalid code.", type: "error" }); setAppliedCoupon(null); return; }
    setAppliedCoupon(coupon);
    setCouponMessage({ text: "Coupon applied!", type: "success" });
  };

  const handlePayment = async (plan: any) => {
    if (!isSignedIn) { alert("Please log in or create an account first!"); openSignIn(); return; }
    setIsProcessing(plan.id);

    try {
      let numericAmount = parseInt(plan.price.replace(/[^0-9]/g, ''));
      
      if (appliedCoupon) {
        if (appliedCoupon.discountType === 'percentage') numericAmount -= (numericAmount * (appliedCoupon.discountValue / 100));
        else if (appliedCoupon.discountType === 'fixed') numericAmount -= (appliedCoupon.discountValue['inr'] || 0);
        numericAmount = Math.max(Math.round(numericAmount), 0);
      }

      if (numericAmount === 0) {
        const res = await fetch('/api/enroll-free', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId: course.id, courseSlug: course.slug, currency: "INR", couponCode: appliedCoupon?.code, userId: user?.id })
        });
        const data = await res.json();
        if (data.success) { alert("🎉 Enrolled!"); router.push('/learning'); }
        setIsProcessing(null); return; 
      }

      await loadRazorpayScript();

      const orderResponse = await fetch('/api/create-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numericAmount, courseId: course.id, currency: "INR", couponCode: appliedCoupon?.code, userId: user?.id })
      });
      const data = await orderResponse.json();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!, amount: data.order.amount, currency: data.order.currency,
        name: "Shivam Academy", description: `${plan.name} Enrollment`, order_id: data.order.id,
        prefill: { name: user?.fullName || "", email: user?.primaryEmailAddress?.emailAddress || "" },
        theme: { color: plan.isPopular ? "#2563eb" : "#121212" },
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, userId: user?.id, courseSlug: course.slug, userEmail: user?.primaryEmailAddress?.emailAddress, userName: user?.fullName || user?.firstName || "Student", courseTitle: course.title, amountPaid: `₹${numericAmount}`, couponCode: appliedCoupon?.code })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) { alert("🎉 Payment Verified!"); router.push('/learning'); }
          } catch (err) { alert("Error verifying enrollment."); }
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();

    } catch (error: any) { alert("Gateway error."); } 
    finally { setIsProcessing(null); }
  };

  return (
    <section className="w-full relative z-10 py-20" id="pricing">
      <div className="text-center mb-16">
        <div className="inline-block bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold px-4 py-1 rounded-full text-xs uppercase tracking-widest mb-4">
          Live Now
        </div>
        <h2 className="text-4xl md:text-5xl font-display font-black text-white mb-4">Flexible Pricing <span className="text-blue-500 border-b-4 border-blue-500 pb-1">Plans</span></h2>
        <p className="text-stone-400 text-lg">Choose a plan that suits you best</p>
      </div>

      {/* Coupon Box */}
      <div className="max-w-md mx-auto mb-12 p-4 rounded-xl border border-white/10 bg-[#121212]">
        <label className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 block flex items-center gap-1"><Tag size={12}/> Have a Coupon Code?</label>
        <div className="flex gap-2">
          <input type="text" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Enter code" className="flex-1 px-4 py-2 rounded-lg border border-white/10 bg-black text-white focus:outline-none focus:border-amber-500 text-sm" />
          <button onClick={handleApplyCoupon} className="px-4 py-2 bg-white text-black rounded-lg font-bold text-sm hover:bg-stone-200">Apply</button>
        </div>
        {couponMessage.text && <p className={`text-xs font-bold mt-2 ${couponMessage.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{couponMessage.text}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {course.pricingPlans.map((plan: any) => {
          
          // Calculate active price per card if coupon is applied
          let activePrice = parseInt(plan.price.replace(/[^0-9]/g, ''));
          if (appliedCoupon) {
            if (appliedCoupon.discountType === 'percentage') activePrice -= (activePrice * (appliedCoupon.discountValue / 100));
            else if (appliedCoupon.discountType === 'fixed') activePrice -= (appliedCoupon.discountValue['inr'] || 0);
            activePrice = Math.max(Math.round(activePrice), 0);
          }

          return (
            <div key={plan.id} className={`rounded-3xl p-8 md:p-12 relative flex flex-col transition-transform hover:-translate-y-2 ${plan.isPopular ? 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-[0_0_40px_rgba(37,99,235,0.3)] border-0' : 'bg-stone-100 border border-stone-200'}`}>
              
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-black font-black text-xs px-4 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1 shadow-lg">
                  ⭐ Most Popular
                </div>
              )}

              <h3 className={`text-3xl font-black mb-2 ${plan.isPopular ? 'text-white' : 'text-stone-900'}`}>{plan.name}</h3>
              <p className={`text-sm mb-8 ${plan.isPopular ? 'text-blue-100' : 'text-stone-500'}`}>{plan.subtitle}</p>
              
              <div className="flex items-end gap-2 mb-8 border-b pb-8 border-black/10">
                <span className={`text-5xl font-black ${plan.isPopular ? 'text-white' : 'text-stone-900'}`}>₹{activePrice}</span>
                <span className={`text-xl font-bold line-through mb-1 ${plan.isPopular ? 'text-blue-300' : 'text-stone-400'}`}>{plan.originalPrice}</span>
                <span className={`text-sm font-bold mb-2 ml-2 ${plan.isPopular ? 'text-amber-300' : 'text-stone-500'}`}>+ GST</span>
              </div>

              <ul className="space-y-4 mb-12 flex-grow">
                {plan.features.map((feature: string, i: number) => (
                  <li key={i} className={`flex items-start gap-3 font-medium text-sm ${plan.isPopular ? 'text-white' : 'text-stone-700'}`}>
                    <CheckCircle2 size={20} className={`shrink-0 ${plan.isPopular ? 'text-amber-400' : 'text-blue-600'}`} />
                    {feature}
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => handlePayment(plan)}
                disabled={isProcessing !== null}
                className={`w-full py-4 rounded-full font-black text-lg transition-all flex justify-center items-center gap-2 ${plan.isPopular ? 'bg-white text-blue-600 hover:bg-stone-100' : 'bg-[#0a0a0a] text-white hover:bg-stone-800'}`}
              >
                {isProcessing === plan.id ? <Loader2 className="animate-spin" size={24} /> : null}
                {isProcessing === plan.id ? "Processing..." : `Enroll in ${plan.name} ➔`}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}