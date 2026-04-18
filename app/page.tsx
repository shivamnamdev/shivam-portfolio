import UrgencyBanner from "@/components/UrgencyBanner";
import Navbar from "@/components/Navbar";
import HeroVSL from "@/components/HeroVSL"; // We will keep this here temporarily as your main hook
import Testimonials from "@/components/Testimonials";
import LeadMagnet from "@/components/LeadMagnet";
import Footer from "@/components/Footer";
import WhatsAppWidget from "@/components/WhatsAppWidget";

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <UrgencyBanner />
      <Navbar />
      <main className="flex flex-col items-center max-w-7xl mx-auto px-6 sm:px-12 pb-10 space-y-32">
        <HeroVSL />
        {/* The detailed course components (PainPoints, ActiveCohorts, FAQ) are hidden here for now, 
            they will live on the dedicated course sales page in Phase 3! */}
        <Testimonials />
        <LeadMagnet />
      </main>
      <Footer />
      <WhatsAppWidget /> 
    </div>
  );
}