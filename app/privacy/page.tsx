import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-transparent">
      <Navbar />
      <main className="flex-grow max-w-4xl mx-auto px-6 py-20 w-full relative z-10">
        <h1 className="text-4xl font-display font-black text-white mb-8">Privacy Policy</h1>
        <div className="prose prose-invert max-w-none text-stone-400 space-y-6">
          <p><strong>Last Updated: {new Date().getFullYear()}</strong></p>
          <p>This Privacy Policy describes how your personal information is collected, used, and shared when you visit or make a purchase from shivamnamdev.com.</p>
          <h3 className="text-xl font-bold text-white">Personal Information We Collect</h3>
          <p>When you make a purchase or attempt to make a purchase through the Site, we collect certain information from you, including your name, billing address, payment information, email address, and phone number.</p>
          <h3 className="text-xl font-bold text-white">How Do We Use Your Personal Information?</h3>
          <p>We use the Order Information to fulfill any orders placed through the Site and communicate with you.</p>
          <h3 className="text-xl font-bold text-white">Contact Us</h3>
          <p>For more information about our privacy practices, please contact us by e-mail at shivamnamdev.edu@gmail.com.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}