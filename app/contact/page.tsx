'use client';
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Send, CheckCircle2 } from "lucide-react";
import SpotlightCard from "@/components/SpotlightCard";

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");
    const formData = new FormData(e.currentTarget);
    try {
      const response = await fetch("/api/send-email", {
        method: "POST", headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.get("name"), email: formData.get("email"), message: formData.get("message"), subject: "New General Inquiry from Contact Page" }),
      });
      const data = await response.json();
      if (data.success) { setIsSuccess(true); (e.target as HTMLFormElement).reset(); } 
      else setErrorMsg("Something went wrong sending the email.");
    } catch (error) { setErrorMsg("Network error. Please try again."); } 
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-black">
      <div className="absolute inset-0 bg-grid-pattern z-0 opacity-50" />
      <Navbar />
      <main className="flex-grow flex flex-col items-center justify-center max-w-3xl mx-auto px-6 py-20 w-full relative z-10">
        <h1 className="text-5xl font-display font-black text-white mb-6">Let's Connect</h1>
        <p className="text-xl text-stone-400 mb-12 text-center">Have a question about corporate training or courses? Reach out below.</p>
        
        <SpotlightCard className="w-full p-8 md:p-10">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-10 text-center relative z-10">
              <div className="w-20 h-20 bg-green-500/20 border border-green-500/50 rounded-full flex items-center justify-center mb-6"><CheckCircle2 size={40} className="text-green-400" /></div>
              <h3 className="text-3xl font-black text-white mb-3">Message Sent!</h3>
              <p className="text-stone-400">I will get back to you within 24 hours.</p>
              <button onClick={() => setIsSuccess(false)} className="mt-8 text-amber-500 font-bold hover:text-amber-400 transition-colors">Send another message</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-left relative z-10">
              <div><label className="block text-sm font-bold text-stone-400 mb-2">Full Name</label><input type="text" name="name" required className="w-full px-5 py-4 rounded-xl border border-white/10 bg-black/50 text-white focus:outline-none focus:border-amber-500 transition-all" placeholder="John Doe" /></div>
              <div><label className="block text-sm font-bold text-stone-400 mb-2">Email Address</label><input type="email" name="email" required className="w-full px-5 py-4 rounded-xl border border-white/10 bg-black/50 text-white focus:outline-none focus:border-amber-500 transition-all" placeholder="john@example.com" /></div>
              <div><label className="block text-sm font-bold text-stone-400 mb-2">Message</label><textarea name="message" required rows={5} className="w-full px-5 py-4 rounded-xl border border-white/10 bg-black/50 text-white focus:outline-none focus:border-amber-500 transition-all resize-none" placeholder="I have a question about..." /></div>
              {errorMsg && <p className="text-red-400 text-sm font-medium">{errorMsg}</p>}
              <button type="submit" disabled={isSubmitting} className="mt-4 w-full py-4 rounded-xl bg-amber-500 text-black font-black text-lg flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors disabled:opacity-70">
                {isSubmitting ? "Sending..." : "Send Message"}
              </button>
            </form>
          )}
        </SpotlightCard>
      </main>
      <Footer />
    </div>
  );
}