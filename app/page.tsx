import Navbar from "@/components/Navbar";
import HeroVSL from "@/components/HeroVSL";
import PainPoints from "@/components/PainPoints";
import ActiveCohorts from "@/components/ActiveCohorts";
import Instructor from "@/components/Instructor";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center max-w-7xl mx-auto px-6 sm:px-12 pb-32 space-y-32">
      <Navbar />
      <HeroVSL />
      <PainPoints />
      <ActiveCohorts /> 
      <Instructor />
    </main>
  );
}