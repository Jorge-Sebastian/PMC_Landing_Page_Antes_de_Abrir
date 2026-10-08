import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { HowItWorks } from "./how-it-works";
import { HeroSection } from "./hero-section";
import { SafetyTips } from "./safety-tips";
import { TrustNotice } from "./trust-notice";
import { UseCases } from "./use-cases";

/** Página principal: historia corta de dudas -> comprobación -> decisión. */
const Home = () => (
  <div className="flex min-h-screen flex-col">
    <SiteHeader />
    <main className="flex-1">
      <HeroSection />
      <HowItWorks />
      <UseCases />
      <SafetyTips />
      <TrustNotice />
    </main>
    <SiteFooter />
  </div>
);

export default Home;
