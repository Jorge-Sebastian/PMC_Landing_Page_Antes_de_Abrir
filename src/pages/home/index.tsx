import { AnalysisResult } from "./analysis-result";
import { getMockResult, MOCK_RESULT_STATES } from "@/lib/link-analysis/__fixtures__/mock-results";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { HowItWorks } from "./how-it-works";
import { HeroSection } from "./hero-section";
import { SafetyTips } from "./safety-tips";
import { TrustNotice } from "./trust-notice";
import { UseCases } from "./use-cases";

/** Página principal: historia corta de dudas -> comprobación -> decisión. */
const Home = () => {
  const previewState = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("resultado") : null;
  const fixture = MOCK_RESULT_STATES.find((state) => state === previewState);
  if (import.meta.env.DEV && fixture) {
    return <main className="section-shell py-8"><p className="mb-4 font-semibold">Vista de prueba: datos simulados ({fixture})</p><AnalysisResult {...getMockResult(fixture)} onRestart={() => window.location.assign("/")} /></main>;
  }
  return (
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
};

export default Home;
