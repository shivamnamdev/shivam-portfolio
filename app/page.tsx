import SplashScreen from "@/components/SplashScreen";
import Hero from "@/components/Hero";
import Impact from "@/components/Impact";
import Experience from "@/components/Experience";
import Certifications from "@/components/Certifications";
import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center max-w-7xl mx-auto px-6 sm:px-12 pt-32 pb-32 space-y-40">
      <SplashScreen />
      <Navbar />
      <Hero />
      <Impact />
      <Experience />
      <Certifications />
    </main>
  );
}