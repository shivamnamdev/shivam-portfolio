import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function RefundPage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-stone-50">
      <Navbar />
      <main className="flex-grow max-w-4xl mx-auto px-6 py-20 w-full">
        <h1 className="text-4xl font-display font-black text-stone-900 mb-8">Cancellation & Refund Policy</h1>
        <div className="prose prose-stone max-w-none text-stone-600 space-y-6">
          <p>Thank you for buying a course from Shivam Academy.</p>
          <h3 className="text-xl font-bold text-stone-900">Digital Products & Live Cohorts</h3>
          <p>Because our courses include instant access to digital materials, proprietary code repositories, and recorded sessions, <strong>we do not offer refunds once a purchase is completed.</strong></p>
          <h3 className="text-xl font-bold text-stone-900">Exceptions</h3>
          <p>If you made a duplicate payment by accident, please contact us within 48 hours of the transaction at shivamnamdev.edu@gmail.com with your payment proof. Duplicate payments will be refunded to the original payment method within 5-7 business days.</p>
          <h3 className="text-xl font-bold text-stone-900">Contact Us</h3>
          <p>If you face any technical issues accessing your purchased content, please reach out via WhatsApp or email, and we will resolve it immediately.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}