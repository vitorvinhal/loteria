import { HeroSection, LoteriasGrid, FeaturesSection, CTASection } from "@/components/lottery/hero-section";
import { PainelTempoReal } from "@/components/lottery/painel-tempo-real";

export default function Home() {
  return (
    <div className="flex flex-col">
      <HeroSection />
      <PainelTempoReal />
      <LoteriasGrid />
      <FeaturesSection />
      <CTASection />
    </div>
  );
}
