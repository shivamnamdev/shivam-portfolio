'use client';
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Send, CheckCircle2 } from "lucide-react";

export default function MentorshipPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const[isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    const formData = new FormData(e.currentTarget);
    
    // 🚨 PASTE YOUR WEB3FORMS ACCESS KEY HERE:
    formData.append("access_key", "YOUR_ACCESS_KEY_HERE"); 
    
    // Hardcoded Subject specifically for Mentorship
    formData.append("subject", "🚨 NEW LEAD: 1-on-1 Mentorship Request!");

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          message: formData.get("message"),
          subject: "🚨 NEW LEAD: 1-on-1 Mentorship Request!",
        }),
      });

      const data = await response.json();
      if (data.success) {
        setIsSuccess(true);
        (e.target as HTMLFormElement).reset(); 
      } else {
        setErrorMsg("Something went wrong sending the email.");
      }
    } catch (error) {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow flex flex-col items-center justify-center max-w-3xl mx-auto px-6 py-32 text-center w-full">
        <h1 className="text-5xl font-display font-black text-stone-900 mb-6">1-on-1 Mentorship</h1>
        <p className="text-xl text-stone-600 mb-12">
          Need architectural advice for your company's QA framework or private career coaching? Apply below.
        </p>
        
        <div className="glass-panel p-8 md:p-10 rounded-3xl w-full border border-amber-400 bg-amber-50 shadow-xl shadow-amber-500/10">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={40} className="text-green-500" />
              </div>
              <h3 className="text-3xl font-black text-stone-900 mb-3">Application Received!</h3>
              <p className="text-stone-600">I will review your request and get back to you within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-left">
              <div>
                <label htmlFor="name" className="block text-sm font-bold text-stone-700 mb-1">Full Name</label>
                <input type="text" name="name" required className="w-full px-5 py-4 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all" placeholder="John Doe" />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-stone-700 mb-1">Email Address</label>
                <input type="email" name="email" required className="w-full px-5 py-4 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all" placeholder="john@example.com" />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-bold text-stone-700 mb-1">What do you need help with?</label>
                <textarea name="message" required rows={5} defaultValue="Hi Shivam, I am interested in 1-on-1 mentorship regarding..." className="w-full px-5 py-4 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none" />
              </div>
              <input type="checkbox" name="botcheck" className="hidden" style={{ display: 'none' }} />
              {errorMsg && <p className="text-red-500 text-sm font-medium">{errorMsg}</p>}
              <button type="submit" disabled={isSubmitting} className="mt-4 w-full py-4 rounded-xl bg-amber-500 text-white font-black text-lg flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors disabled:opacity-70 shadow-lg shadow-amber-500/30">
                {isSubmitting ? <span className="animate-pulse">Sending...</span> : <>Apply for Mentorship <Send size={20} /></>}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}