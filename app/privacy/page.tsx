import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-stone-50">
      <Navbar />
      <main className="flex-grow max-w-4xl mx-auto px-6 py-20 w-full">
        <h1 className="text-4xl font-display font-black text-stone-900 mb-8">Privacy Policy</h1>
        <div className="prose prose-stone max-w-none text-stone-600 space-y-6">
          <p><strong>Last Updated: {new Date().getFullYear()}</strong></p>
          <p>This Privacy Policy describes how your personal information is collected, used, and shared when you visit or make a purchase from shivamnamdev.com.</p>
          <h3 className="text-xl font-bold text-stone-900">Personal Information We Collect</h3>
          <p>When you make a purchase or attempt to make a purchase through the Site, we collect certain information from you, including your name, billing address, payment information (processed securely via Razorpay), email address, and phone number.</p>
          <h3 className="text-xl font-bold text-stone-900">How Do We Use Your Personal Information?</h3>
          <p>We use the Order Information that we collect generally to fulfill any orders placed through the Site (including processing your payment information, providing you with course access, and providing you with invoices and/or order confirmations).</p>
          <h3 className="text-xl font-bold text-stone-900">Contact Us</h3>
          <p>For more information about our privacy practices, if you have questions, or if you would like to make a complaint, please contact us by e-mail at shivamnamdev.edu@gmail.com.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}