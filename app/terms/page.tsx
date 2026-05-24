import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function TermsPage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-transparent">
      <Navbar />
      <main className="flex-grow max-w-4xl mx-auto px-6 py-20 w-full relative z-10">
        <h1 className="text-4xl font-display font-black text-white mb-8">Terms of Service</h1>
        <div className="prose prose-invert max-w-none text-stone-400 space-y-6">
          <p>By visiting our site and/or purchasing something from us, you engage in our "Service" and agree to be bound by the following terms.</p>
          <h3 className="text-xl font-bold text-white">1. Intellectual Property</h3>
          <p>All course materials, videos, and PDFs provided are the intellectual property of Shivam Namdev. You may not reproduce or distribute these materials.</p>
          <h3 className="text-xl font-bold text-white">2. Course Access</h3>
          <p>Upon successful payment, you receive access to the dashboard. Login sharing is strictly prohibited.</p>
          <h3 className="text-xl font-bold text-white">3. Governing Law</h3>
          <p>These Terms of Service shall be governed by and construed in accordance with the laws of India.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}