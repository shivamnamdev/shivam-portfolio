import SplashScreen from "@/components/SplashScreen";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Story from "@/components/Story";
import Expertise from "@/components/Expertise";
import Skills from "@/components/Skills";
import Experience from "@/components/Experience";
import Education from "@/components/Education";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-32 space-y-32">
      <SplashScreen />
      <Navbar />
      <Hero />
      <Story />
      <Expertise />
      <Skills />
      <Experience />
      <Education />
      <Footer />
    </main>
  );
}