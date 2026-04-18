import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Instructor from "@/components/Instructor"; // Reusing your amazing story component!

export default function AboutPage() {
  return (
    <div className="relative min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow flex flex-col items-center max-w-7xl mx-auto px-6 py-20 space-y-20">
        <div className="text-center">
          <h1 className="text-5xl font-display font-black text-stone-900 mb-4">My Journey</h1>
          <p className="text-xl text-stone-600">From the Dojo to the Tech Lab.</p>
        </div>
        {/* We can just drop your Instructor component right here for now! */}
        <Instructor />
      </main>
      <Footer />
    </div>
  );
}
