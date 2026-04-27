import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function TermsPage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-stone-50">
      <Navbar />
      <main className="flex-grow max-w-4xl mx-auto px-6 py-20 w-full">
        <h1 className="text-4xl font-display font-black text-stone-900 mb-8">Terms of Service</h1>
        <div className="prose prose-stone max-w-none text-stone-600 space-y-6">
          <p>By visiting our site and/or purchasing something from us, you engage in our "Service" and agree to be bound by the following terms and conditions.</p>
          <h3 className="text-xl font-bold text-stone-900">1. Intellectual Property</h3>
          <p>All course materials, videos, code snippets, and PDFs provided are the intellectual property of Shivam Namdev. You may not reproduce, distribute, or share these materials publicly without written permission.</p>
          <h3 className="text-xl font-bold text-stone-900">2. Course Access</h3>
          <p>Upon successful payment, you will receive access to the course dashboard. Access is granted to a single user and login sharing is strictly prohibited. Violation will result in immediate account termination.</p>
          <h3 className="text-xl font-bold text-stone-900">3. Governing Law</h3>
          <p>These Terms of Service and any separate agreements whereby we provide you Services shall be governed by and construed in accordance with the laws of India.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}