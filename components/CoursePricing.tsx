'use client';
import { useEffect, useState } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, Tag, Lock, PartyPopper, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { applyCoupon, formatPrice, parsePrice, resolveCoupon, type Coupon, type PricingPlan } from '@/lib/pricing';

const loadRazorpayScript = () => new Promise<boolean>((resolve) => {
  if ((window as any).Razorpay) return resolve(true);
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

// Plan cards for plan-based courses. Prices shown here are re-computed on the server
// (/api/create-order, /api/enroll-free) from courseId + planId + coupon — the client never sends an amount.
export default function CoursePricing({ course }: { course: any }) {
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();
  const router = useRouter();

  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponMessage, setCouponMessage] = useState({ text: '', type: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState<{ show: boolean; whatsappLink: string }>({ show: false, whatsappLink: '' });

  useEffect(() => {
    if (!isSignedIn || !user?.id || !course?.slug) return;
    supabase.from('user_enrollments').select('id').eq('user_id', user.id).eq('course_slug', course.slug)
      .then(({ data, error }) => { if (!error && data && data.length > 0) setIsAlreadyEnrolled(true); });
  }, [isSignedIn, user?.id, course?.slug]);

  const plans: PricingPlan[] = course?.pricingPlans || [];
  if (!plans.length) return null;
  const isClosed = !!course.enrollmentClosed;

  const handleApplyCoupon = () => {
    if (!isSignedIn) { openSignIn(); return; }
    const result = resolveCoupon(couponInput, user?.id);
    if (!result.ok || !result.coupon) {
      setAppliedCoupon(null);
      setCouponMessage({ text: !result.ok && result.status === 403 ? 'This coupon is restricted to specific accounts.' : 'Invalid coupon code.', type: 'error' });
      return;
    }
    setAppliedCoupon(result.coupon);
    setCouponMessage({ text: 'Coupon applied successfully!', type: 'success' });
  };

  const handleEnroll = async (plan: PricingPlan, finalPrice: number) => {
    setErrorMessage('');
    if (!isSignedIn) { openSignIn(); return; }
    setProcessingPlan(plan.id);
    const body = { courseId: course.id, planId: plan.id, currency: 'INR', couponCode: appliedCoupon?.code };

    try {
      if (finalPrice === 0) {
        const res = await fetch('/api/enroll-free', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to process free enrollment.');
        setSuccess({ show: true, whatsappLink: course.whatsappLink || '#' });
        return;
      }

      if (!(await loadRazorpayScript())) throw new Error('Payment gateway failed to load. Please check your connection.');

      const orderRes = await fetch('/api/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.error || 'Could not start checkout.');

      const checkout = new (window as any).Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Shivam Academy',
        description: `${course.title} — ${plan.name}`,
        order_id: orderData.order.id,
        prefill: { name: user?.fullName || '', email: user?.primaryEmailAddress?.emailAddress || '' },
        theme: { color: '#f59e0b' },
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) setSuccess({ show: true, whatsappLink: verifyData.whatsappLink || course.whatsappLink || '#' });
            else setErrorMessage(verifyData.error || 'We could not verify your payment. Please contact support.');
          } catch {
            setErrorMessage('We could not verify your payment. Please contact support.');
          }
        },
      });
      checkout.on('payment.failed', () => setErrorMessage('Payment failed or was cancelled. Please try again.'));
      checkout.open();
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    } finally {
      setProcessingPlan(null);
    }
  };

  return (
    <section className="w-full relative z-10 scroll-mt-24" id="pricing">
      <AnimatePresence>
        {success.show && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" role="dialog" aria-modal="true">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#121212] border border-white/10 rounded-3xl p-8 max-w-md w-full text-center">
              <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <PartyPopper size={36} className="text-green-400" />
              </div>
              <h3 className="text-3xl font-black text-white mb-3">Welcome Aboard!</h3>
              <p className="text-stone-400 mb-8 leading-relaxed">Your enrollment is confirmed. Join the official WhatsApp group so you don't miss any live class links.</p>
              <div className="space-y-4">
                <a href={success.whatsappLink} target="_blank" rel="noreferrer" className="w-full py-4 rounded-xl bg-[#25D366] text-white font-black text-lg flex items-center justify-center gap-2 hover:bg-[#20bd5a] transition-colors">
                  Join WhatsApp Group <ExternalLink size={20} />
                </a>
                <button onClick={() => router.push('/learning')} className="w-full py-4 rounded-xl bg-white text-black font-black text-lg hover:bg-stone-200 transition-colors">
                  Go to Dashboard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="text-center mb-12">
        <span className={`inline-block font-bold px-4 py-1 rounded-full text-xs uppercase tracking-widest mb-4 border ${isClosed ? 'bg-white/5 border-white/10 text-stone-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
          {isClosed ? 'Enrollment Closed' : 'Enrollment Open'}
        </span>
        <h2 className="text-4xl md:text-5xl font-display font-black text-white mb-4">Flexible Pricing <span className="text-amber-500">Plans</span></h2>
        <p className="text-stone-400 text-lg">{isClosed ? 'This cohort is no longer accepting new students — plans are shown for reference.' : 'Choose the plan that suits you best.'}</p>
      </div>

      {!isClosed && !isAlreadyEnrolled && (
        <div className="max-w-md mx-auto mb-12 p-4 rounded-xl border border-white/10 bg-[#121212]">
          <label htmlFor="coupon" className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Tag size={12} /> Have a Coupon Code?</label>
          <div className="flex gap-2">
            <input id="coupon" type="text" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Enter code" className="flex-1 min-w-0 px-4 py-2 rounded-lg border border-white/10 bg-black text-white focus:outline-none focus:border-amber-500 font-mono text-sm" />
            <button onClick={handleApplyCoupon} className="px-4 py-2 bg-white text-black rounded-lg font-bold text-sm hover:bg-stone-200">Apply</button>
          </div>
          {couponMessage.text && <p className={`text-xs font-bold mt-2 ${couponMessage.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{couponMessage.text}</p>}
        </div>
      )}

      {errorMessage && <p role="alert" className="max-w-md mx-auto mb-8 text-center text-sm font-bold text-red-400">{errorMessage}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {plans.map((plan) => {
          const basePrice = parsePrice(plan.price);
          const finalPrice = applyCoupon(basePrice, appliedCoupon, 'INR');
          const struck = appliedCoupon && finalPrice !== basePrice ? formatPrice(basePrice, 'INR') : plan.originalPrice;
          const isProcessing = processingPlan === plan.id;

          return (
            <div key={plan.id} className={`rounded-3xl p-8 md:p-10 relative flex flex-col border ${plan.isPopular ? 'bg-gradient-to-b from-amber-500/15 to-[#121212] border-amber-500/60' : 'bg-[#121212] border-white/10'}`}>
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-black font-black text-xs px-4 py-1.5 rounded-full uppercase tracking-widest whitespace-nowrap">
                  ⭐ Most Popular
                </div>
              )}

              <h3 className="text-2xl md:text-3xl font-black text-white mb-2">{plan.name}</h3>
              {plan.subtitle && <p className="text-sm text-stone-400 mb-8">{plan.subtitle}</p>}

              <div className="mb-8 pb-8 border-b border-white/10">
                <div className="flex items-end gap-3 flex-wrap">
                  <span className="text-5xl font-black text-white">{formatPrice(finalPrice, 'INR')}</span>
                  {struck && <span className="text-xl font-bold text-stone-500 line-through mb-1">{struck}</span>}
                </div>
                <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mt-2">Inclusive of all taxes</p>
              </div>

              <ul className="space-y-4 mb-10 flex-grow">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 font-medium text-sm text-stone-300">
                    <CheckCircle2 size={20} className="shrink-0 text-amber-500" /> {feature}
                  </li>
                ))}
              </ul>

              {isAlreadyEnrolled ? (
                <button onClick={() => router.push('/learning')} className="w-full py-4 rounded-full font-black text-lg bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 transition-colors">
                  You are Enrolled — Go to Dashboard
                </button>
              ) : isClosed ? (
                <button disabled className="w-full py-4 rounded-full font-black text-lg bg-white/5 border border-white/10 text-stone-500 flex justify-center items-center gap-2 cursor-not-allowed">
                  <Lock size={18} /> Enrollment Closed
                </button>
              ) : (
                <button
                  onClick={() => handleEnroll(plan, finalPrice)}
                  disabled={processingPlan !== null}
                  className={`w-full py-4 rounded-full font-black text-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-70 ${plan.isPopular ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-white text-black hover:bg-stone-200'}`}
                >
                  {isProcessing && <Loader2 className="animate-spin" size={22} />}
                  {isProcessing ? 'Processing...' : finalPrice === 0 ? `Enroll for Free — ${plan.name}` : `Enroll in ${plan.name} →`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
