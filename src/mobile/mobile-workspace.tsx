import { useEffect, useState } from "react";
import {
  Activity, FlaskConical, History, House, ScanSearch, Zap,
  ShieldCheck, Smartphone, UsersRound, type LucideIcon,
} from "lucide-react";
import { HeroSection } from "@/pages/home/hero-section";
import { BrandMark } from "@/components/layout/brand-mark";
import FamilyPage from "@/pages/familia";
import { MobileHome } from "./mobile-home";
import { MobileOnboarding } from "./mobile-onboarding";
import { ProtectionInsights } from "./protection-insights";
import { isOnboarded, markOnboarded } from "./onboarding-state";
import { COMMERCIAL_ENABLED, fetchCommercialAccess, type CommercialAccess } from "./commercial-client";
import { isAndroidPilot, Protection, type ProtectionStatus } from "./native";
import {
  PREVIEW_SCENARIOS, canOpenTab, scenarioTitle, visibleTabs,
  type AccessScenario, type MobileTab,
} from "./access-navigation";

const tabDetails: Record<MobileTab, { title: string; Icon: LucideIcon }> = {
  home: { title: "Inicio", Icon: House },
  analyze: { title: "Analizar", Icon: ScanSearch },
  activity: { title: "Actividad", Icon: History },
  protection: { title: "Protección", Icon: ShieldCheck },
  family: { title: "Familia", Icon: UsersRound },
};

function PreviewPanel({ title, description, children }: {
  title: string; description: string; children?: React.ReactNode;
}) {
  return (
    <section className="section-shell mx-auto max-w-4xl py-8">
      <div className="rounded-3xl border border-teal-100 bg-white p-6 shadow-sm">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
          <FlaskConical className="size-4" aria-hidden="true" /> Prueba visual · No es la aplicación real
        </div>
        <h2 className="text-2xl font-black text-slate-900">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{description}</p>
        {children}
        <p className="mt-5 border-t border-slate-100 pt-3 text-xs text-slate-500">
          Esta vista es ilustrativa. No modifica pagos, permisos, cuentas ni datos reales.
        </p>
      </div>
    </section>
  );
}

/**
 * One Android app and one navigation shell. The first-run guide does not create
 * any paid subscription; trial and plan preview scenarios are UI-only.
 */
export function MobileWorkspace() {
  const [scenario, setScenario] = useState<AccessScenario>("real");
  const [tab, setTab] = useState<MobileTab>("home");
  const [onboardingOpen, setOnboardingOpen] = useState(() => {
    try { return !isOnboarded(window.localStorage); }
    catch { return false; }
  });
  const [settingsRequest, setSettingsRequest] = useState(0);
  const [status, setStatus] = useState<ProtectionStatus | null>(null);
  const [commercial, setCommercial] = useState<CommercialAccess | null>(null);
  const [commercialError, setCommercialError] = useState("");
  const [previewFamilyAction, setPreviewFamilyAction] = useState<"create" | "join" | null>(null);
  const preview = scenario !== "real";
  // Commercial gate is opt-in for deployment compatibility. When enabled, paid tabs
  // are unlocked only by the latest verified backend entitlement, never UI previews.
  const tabs: readonly MobileTab[] = scenario !== "real" || !COMMERCIAL_ENABLED
    ? visibleTabs(scenario)
    : commercial && commercial.plan !== "free"
      ? ["home","analyze","activity","protection","family"]
      : ["home","analyze"];

  useEffect(() => {
    if (!COMMERCIAL_ENABLED || !isAndroidPilot) return;
    let alive = true;
    const poll = async () => {
      if (document.hidden) return;
      try {
        const value = await fetchCommercialAccess();
        if (alive) { setCommercial(value); setCommercialError(""); }
      } catch (error) {
        if (alive) {
          setCommercial(null); // fail closed for paid access while authorization cannot be verified
          setCommercialError(error instanceof Error ? error.message : "No fue posible verificar el plan.");
        }
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 5 * 60_000);
    const focus = () => void poll();
    window.addEventListener("focus", focus);
    return () => { alive = false; window.clearInterval(timer); window.removeEventListener("focus", focus); };
  }, []);

  useEffect(() => {
    if (scenario !== "real") return;
    let mounted = true;
    const refresh = () => {
      void Protection.status().then((value) => {
        if (mounted) setStatus(value);
      }).catch(() => { if (mounted) setStatus(null); });
    };
    refresh();
    const id = window.setInterval(refresh, 15000);
    const onFocus = () => { if (!document.hidden) refresh(); };
    window.addEventListener("focus", onFocus);
    return () => { mounted = false; window.clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, [scenario, tab, onboardingOpen]);

  const chooseScenario = (next: AccessScenario) => {
    setScenario(next);
    setTab("home");
    setPreviewFamilyAction(null);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const openTab = (next: MobileTab) => {
    if (!canOpenTab(scenario, next) || !tabs.includes(next)) return;
    setTab(next);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const completeGuide = (destination: "home" | "analyze") => {
    try { markOnboarded(window.localStorage); } catch { /* Still navigable. */ }
    setOnboardingOpen(false);
    setTab(destination);
    void Protection.status().then(setStatus).catch(() => {});
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const repeatGuide = () => {
    if (preview) return;
    setOnboardingOpen(true);
    setTab("home");
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const openSettings = () => {
    setTab("home");
    setSettingsRequest((previous) => previous + 1);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#103640] px-4 py-3 text-white shadow-sm">
        <div className="mx-auto flex max-w-4xl justify-center">
          <div className="flex items-center justify-center gap-3 text-center">
            <BrandMark className="size-11" priority />
            <div>
              <p className="text-center text-lg font-black leading-tight">SmartGuard</p>
              <p className="mt-0.5 text-center text-xs text-teal-100/80">Seguridad antes de abrir</p>
              {COMMERCIAL_ENABLED ? <p className="mt-1 text-center text-[10px] text-teal-100">
                {commercial ? commercial.publicId + " · " + commercial.plan.toUpperCase() : "Verificando cuenta"}
              </p> : null}
            </div>
          </div>
        </div>
      </header>

      {COMMERCIAL_ENABLED && commercialError && !preview ? (
        <p className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900" role="status">
          No se pudo verificar Premium: {commercialError}. El análisis manual sigue disponible.
        </p>
      ) : null}

      {preview ? (
        <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="size-4" />
              Prueba visual · {scenarioTitle(scenario)}. Los datos reales no cambian.
            </p>
            <button type="button" className="rounded-lg border border-amber-400 px-3 py-2 text-xs font-bold"
              onClick={() => chooseScenario("real")}>
              Salir de prueba
            </button>
          </div>
        </div>
      ) : null}

      <main id="smartguard-content" className="min-h-[60vh]">
        {onboardingOpen && !preview ? (
          <MobileOnboarding onComplete={completeGuide} />
        ) : (
          <>
            {tab === "home" ? (
              <MobileHome
                scenario={scenario}
                status={status}
                onOpenTab={openTab}
                onChooseScenario={chooseScenario}
                onRepeatGuide={repeatGuide}
                openSettingsRequest={settingsRequest}
              />
            ) : null}

            {tab === "analyze" ? (
              <>
                {preview ? (
                  <p className="section-shell pt-5 text-xs font-semibold text-amber-900" role="note">
                    Prueba de interfaz: el analizador manual sigue siendo real.
                  </p>
                ) : null}
                <HeroSection />
              </>
            ) : null}

            {tab === "activity" ? (
              preview ? (
                <PreviewPanel title="Actividad" description="Aquí estará el historial Premium. No mostramos eventos inventados en una simulación.">
                  <div className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                    <Activity className="size-5" /> En la aplicación real, el historial utiliza registros del dispositivo.
                  </div>
                </PreviewPanel>
              ) : (
                <section className="section-shell mx-auto max-w-4xl space-y-4 py-7">
                  <h1 className="text-2xl font-black">Actividad</h1>
                  <p className="text-sm text-slate-600">Historial real de los análisis que el dispositivo ha guardado.</p>
                  {status?.history?.length ? (
                    <div className="space-y-2">
                      {status.history.slice(0, 30).map((entry, index) => (
                        <div key={String(entry.date) + "-" + index} className="rounded-2xl border bg-white p-4">
                          <p className="break-all font-semibold">{entry.domain}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {entry.color} · {new Date(entry.date).toLocaleString("es-CO")}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600">
                      {status ? "Aún no hay eventos guardados en el historial local." : "No se pudo consultar el historial."}
                    </div>
                  )}
                </section>
              )
            ) : null}

            {tab === "protection" ? (
              preview ? (
                <PreviewPanel title="Protección y estadísticas"
                  description="Resumen Premium de análisis, notificaciones, aplicaciones seleccionadas y tiempos de respuesta. Los permisos se configuran en Inicio.">
                  <div className="mt-5 rounded-xl border bg-slate-50 p-4 text-sm">
                    <Smartphone className="mb-2 size-5 text-teal-700" />
                    En la aplicación real verás mediciones de tu propio teléfono, sin números simulados.
                  </div>
                </PreviewPanel>
              ) : (
                <ProtectionInsights onOpenSettings={openSettings} onOpenActivity={() => openTab("activity")} />
              )
            ) : null}

            {tab === "family" ? (
              preview ? (
                <PreviewPanel title="SmartGuard Family"
                  description="El titular puede crear o administrar una familia, invitar integrantes y compartir resultados con consentimiento.">
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setPreviewFamilyAction("create")}
                      className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm font-bold">Crear familia</button>
                    <button type="button" onClick={() => setPreviewFamilyAction("join")}
                      className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm font-bold">Unirme por código</button>
                  </div>
                  {previewFamilyAction ? (
                    <div className="mt-3 rounded-xl bg-slate-100 p-4 text-sm">
                      {previewFamilyAction === "create"
                        ? "Creación familiar: en el producto real se genera un código de invitación."
                        : "Ingreso familiar: en el producto real se valida la invitación en Firebase."}
                    </div>
                  ) : null}
                </PreviewPanel>
              ) : COMMERCIAL_ENABLED && commercial?.plan === "individual" ? (
                <PreviewPanel title="Familia · Conoce Premium familiar" description="El plan individual no permite crear grupos privados. Comparte SmartGuard con tus contactos o amplía a Familiar cuando quieras crear un grupo." />
              ) : <FamilyPage embedded />
            ) : null}
          </>
        )}
      </main>

      {!(onboardingOpen && !preview) ? (
        <nav aria-label="Secciones de SmartGuard"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_18px_rgba(15,23,42,.08)] backdrop-blur">
          <div className={"mx-auto grid max-w-3xl gap-1 " + (tabs.length === 2 ? "grid-cols-2" : "grid-cols-5")}>
            {tabs.map((item) => {
              const { Icon, title } = tabDetails[item];
              return (
                <button key={item} type="button" onClick={() => openTab(item)}
                  aria-current={tab === item ? "page" : undefined}
                  className={"flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 " +
                    (tab === item ? "bg-teal-50 font-bold text-teal-800" : "text-slate-600")}>
                  <Icon className="size-5" aria-hidden="true" />
                  <span className="text-[10px] leading-tight sm:text-xs">{title}</span>
                </button>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
