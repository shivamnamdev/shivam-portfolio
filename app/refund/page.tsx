import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function RefundPage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-transparent">
      <Navbar />
      <main className="flex-grow max-w-4xl mx-auto px-6 py-20 w-full relative z-10">
        <h1 className="text-4xl font-display font-black text-white mb-8">Cancellation & Refund Policy</h1>
        <div className="prose prose-invert max-w-none text-stone-400 space-y-6">
          <p>Thank you for buying a course from Shivam Academy.</p>
          <h3 className="text-xl font-bold text-white">Digital Products & Live Cohorts</h3>
          <p>Because our courses include instant access to digital materials and recorded sessions, <strong>we do not offer refunds once a purchase is completed.</strong></p>
          <h3 className="text-xl font-bold text-white">Exceptions</h3>
          <p>If you made a duplicate payment by accident, please contact us within 48 hours at shivamnamdev.edu@gmail.com with payment proof.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}