import UrgencyBanner from "@/components/UrgencyBanner";
import Navbar from "@/components/Navbar";
import HeroVSL from "@/components/HeroVSL";
import PainPoints from "@/components/PainPoints";
import ActiveCohorts from "@/components/ActiveCohorts";
import Instructor from "@/components/Instructor";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import WhatsAppWidget from "@/components/WhatsAppWidget";

export default function Home() {
  return (
    <div className="relative min-h-screen">
      {/* <UrgencyBanner /> */}
      <Navbar />
      <main className="flex flex-col items-center max-w-7xl mx-auto px-6 sm:px-12 pb-10 space-y-32">
        <HeroVSL />
        <PainPoints />
        <ActiveCohorts /> 
        <Instructor />
        <Testimonials />
        <FAQ />
      </main>
      <Footer />
      <WhatsAppWidget /> 
    </div>
  );
}