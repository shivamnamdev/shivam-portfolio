import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ContactPage() {
  return (
    <div className="relative min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow flex flex-col items-center justify-center max-w-3xl mx-auto px-6 py-32 text-center">
        <h1 className="text-5xl font-display font-black text-stone-900 mb-6">Let's Connect</h1>
        <p className="text-xl text-stone-600 mb-12">
          Have a question about corporate training, consulting, or my courses? Reach out below.
        </p>
        
        <div className="glass-panel p-8 rounded-3xl w-full border border-stone-200">
          <form className="flex flex-col gap-4 text-left">
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-1">Name</label>
              <input type="text" className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-1">Email</label>
              <input type="email" className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="john@example.com" />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-1">Message</label>
              <textarea rows={4} className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="How can I help you?" />
            </div>
            <button className="mt-2 w-full py-4 rounded-xl bg-amber-500 text-white font-bold text-lg hover:bg-amber-600 transition-colors">
              Send Message
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}