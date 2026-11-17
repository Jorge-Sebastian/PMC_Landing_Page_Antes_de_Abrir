import { useEffect, useState } from "react";
import {
  Activity, ArrowRight, BellRing, ChevronDown, FlaskConical,
  History, House, LockKeyhole, ScanSearch, ShieldCheck, Smartphone,
  UsersRound, type LucideIcon,
} from "lucide-react";
import { HeroSection } from "@/pages/home/hero-section";
import FamilyPage from "@/pages/familia";
import { ProtectionPanel } from "./protection-panel";
import { Protection, type ProtectionStatus } from "./native";
import {
  PREVIEW_SCENARIOS, canOpenTab, scenarioTitle, visibleTabs,
  type AccessScenario, type MobileTab,
} from "./access-navigation";

const tabDetails: Record<MobileTab, { title: string; Icon: LucideIcon }> = {
  home: { title: "Inicio", Icon: House },
  analyze: { title: "Analizar", Icon: ScanSearch },
  activity: { title: "Actividad", Icon: History },
  protection: { title: "Proteccion", Icon: ShieldCheck },
  family: { title: "Familia", Icon: UsersRound },
};

function PreviewPanel({ title, description, children }: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="section-shell py-8">
      <div className="rounded-3xl border border-teal-100 bg-white p-6 shadow-sm">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
          <FlaskConical className="size-4" aria-hidden="true" /> Vista simulada: solo interfaz
        </div>
        <h2 className="text-2xl font-black text-slate-900">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{description}</p>
        {children}
        <p className="mt-5 border-t border-slate-100 pt-3 text-xs text-slate-500">
          Esta vista no cambia permisos, suscripciones ni datos reales.
        </p>
      </div>
    </section>
  );
}

/**
 * First navigation pass: one Android APK and one set of real modules.
 *
 * "real" always shows the CURRENT existing pilot, whose paid entitlements
 * are NOT yet implemented. Other scenarios are a temporary read-only preview
 * of future navigation, never an authorization override.
 */
export function MobileWorkspace() {
  const [scenario, setScenario] = useState<AccessScenario>("real");
  const [tab, setTab] = useState<MobileTab>("home");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [status, setStatus] = useState<ProtectionStatus | null>(null);
  const [previewFamilyAction, setPreviewFamilyAction] = useState<"create" | "join" | null>(null);
  const tabs = visibleTabs(scenario);
  const preview = scenario !== "real";

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
    return () => { mounted = false; window.clearInterval(id); };
  }, [scenario, tab]);

  const chooseScenario = (next: AccessScenario) => {
    setScenario(next);
    setTab("home");
    setPreviewFamilyAction(null);
    setToolsOpen(next !== "real");
  };
  const openTab = (next: MobileTab) => {
    if (!canOpenTab(scenario, next)) return;
    setTab(next);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#103640] px-4 py-3 text-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-6 text-teal-300" aria-hidden="true" />
            <div>
              <p className="text-base font-black leading-tight">SmartGuard Family</p>
              <p className="text-xs text-teal-100/80">Seguridad antes de abrir</p>
            </div>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
            {preview ? "Prueba visual" : "Piloto real"}
          </span>
        </div>
      </header>

      {preview ? (
        <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold">
              Simulando vistas: {scenarioTitle(scenario)}. No modifica el estado real.
            </p>
            <button type="button" className="rounded-lg border border-amber-400 px-3 py-2 text-xs font-bold"
              onClick={() => chooseScenario("real")}>
              Salir de pruebas y volver a la app real
            </button>
          </div>
        </div>
      ) : null}

      <main id="smartguard-content">
        {tab === "home" ? (
          <div className="section-shell space-y-5 py-7">
            <div className="rounded-3xl bg-[#123b46] p-6 text-white shadow-lg">
              <p className="text-xs font-bold uppercase tracking-widest text-teal-200">Tu seguridad</p>
              <h1 className="mt-3 text-3xl font-black">
                {scenario === "expired" ? "Tu prueba termino" :
                 scenario === "free" || scenario === "invited" ? "SmartGuard gratuito" :
                 scenario === "trial" ? "Prueba Premium de 15 dias" :
                 scenario === "premium" ? "SmartGuard Premium" :
                 "SmartGuard esta contigo"}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-200">
                {preview
                  ? "Estás viendo una simulacion de navegacion. Tu cuenta, los cobros y la proteccion real no cambian."
                  : "Consulta enlaces sospechosos sin abrirlos. Para la deteccion automatica, configura el acceso a notificaciones."}
              </p>
              <button type="button" onClick={() => openTab("analyze")}
                className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-teal-300 px-5 py-3 font-bold text-slate-950">
                Analizar un enlace <ArrowRight className="size-4" />
              </button>
            </div>

            {!preview ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border bg-white p-4">
                  <p className="text-xs text-slate-600">Proteccion automatica</p>
                  <p className="mt-2 font-black">
                    {status === null ? "Por comprobar" :
                      status.enabled && status.access && status.notifications ? "Activa" : "No activa"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Estado real de Android</p>
                </div>
                <div className="rounded-2xl border bg-white p-4">
                  <p className="text-xs text-slate-600">Enlaces procesados</p>
                  <p className="mt-2 text-2xl font-black">{status?.processed ?? "—"}</p>
                  <p className="mt-1 text-xs text-slate-500">Contador local</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-950">Previsualizacion: {scenarioTitle(scenario)}</p>
                <p className="mt-2 text-sm text-amber-900">
                  {tabs.length === 2
                    ? "Esta persona solo ve Inicio y Analizar. No se le muestran Actividad, Proteccion ni Familia."
                    : "Esta persona ve las cinco secciones. Su contenido aqui es una maqueta, sin datos reales."}
                </p>
              </div>
            )}

            {tabs.length > 2 ? (
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => openTab("protection")}
                  className="rounded-2xl border bg-white p-4 text-left shadow-sm">
                  <BellRing className="size-6 text-teal-700" />
                  <span className="mt-3 block font-bold">Proteccion</span>
                  <span className="mt-1 block text-xs text-slate-500">Configurar avisos y permisos</span>
                </button>
                <button type="button" onClick={() => openTab("family")}
                  className="rounded-2xl border bg-white p-4 text-left shadow-sm">
                  <UsersRound className="size-6 text-teal-700" />
                  <span className="mt-3 block font-bold">Mi familia</span>
                  <span className="mt-1 block text-xs text-slate-500">Grupos y riesgos compartidos</span>
                </button>
              </div>
            ) : (
              <div className="flex gap-3 rounded-2xl border bg-white p-4">
                <LockKeyhole className="size-6 shrink-0 text-slate-500" aria-hidden="true" />
                <div>
                  <p className="font-bold">Funciones avanzadas no disponibles</p>
                  <p className="mt-1 text-sm text-slate-600">El analisis manual sigue disponible en el plan gratuito.</p>
                </div>
              </div>
            )}

            <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-4" aria-label="Herramientas de vista">
              <button type="button" onClick={() => setToolsOpen((open) => !open)}
                className="flex w-full items-center justify-between gap-3 py-1 text-left text-sm font-semibold text-slate-600"
                aria-expanded={toolsOpen}>
                <span className="inline-flex items-center gap-2">
                  <FlaskConical className="size-4" aria-hidden="true" /> Herramientas de vista · Probar escenarios
                </span>
                <ChevronDown className={"size-4 transition-transform " + (toolsOpen ? "rotate-180" : "")} />
              </button>
              {toolsOpen ? (
                <div className="mt-4 space-y-3 border-t pt-4">
                  <p className="text-xs leading-relaxed text-slate-600">
                    Selector temporal para monitores. No activa suscripciones, no altera Firebase y nunca simula pagos reales.
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {PREVIEW_SCENARIOS.map((item) => (
                      <button key={item.id} type="button" onClick={() => chooseScenario(item.id)}
                        aria-pressed={scenario === item.id}
                        className={"rounded-xl border p-3 text-left " +
                          (scenario === item.id ? "border-teal-700 bg-teal-50" : "border-slate-200 bg-slate-50")}>
                        <span className="block text-sm font-bold">{item.title}</span>
                        <span className="mt-1 block text-xs text-slate-600">{item.description}</span>
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => chooseScenario("real")}
                    className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">
                    Volver a la aplicacion real (sin simulacion)
                  </button>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}

        {tab === "analyze" ? (
          <>
            {preview ? (
              <p className="section-shell pt-5 text-xs text-amber-900" role="note">
                Vista de pruebas: el analizador manual que aparece abajo sigue siendo real.
              </p>
            ) : null}
            <HeroSection />
          </>
        ) : null}

        {tab === "activity" ? (
          preview ? (
            <PreviewPanel title="Actividad" description="Vista Premium del historial. No fabricamos eventos ni cifras en las simulaciones.">
              <div className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                <Activity className="size-5" /> Los eventos reales se mostraran aqui en el producto activo.
              </div>
            </PreviewPanel>
          ) : (
            <section className="section-shell space-y-4 py-7">
              <h1 className="text-2xl font-black">Actividad del dispositivo</h1>
              <p className="text-sm text-slate-600">Historial real que el servicio Android conserva localmente.</p>
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
                  {status ? "Aun no hay eventos guardados en el historial local." : "No se pudo consultar el historial del dispositivo."}
                </div>
              )}
            </section>
          )
        ) : null}

        {tab === "protection" ? (
          preview ? (
            <PreviewPanel title="Proteccion automatica"
              description="En el plan Premium se muestran los permisos, la proteccion en segundo plano y las notificaciones.">
              <div className="mt-5 rounded-xl border bg-slate-50 p-4 text-sm">
                <Smartphone className="mb-2 size-5 text-teal-700" />
                Configuracion Android disponible en la aplicacion real; esta simulacion no cambia permisos.
              </div>
            </PreviewPanel>
          ) : <ProtectionPanel />
        ) : null}

        {tab === "family" ? (
          preview ? (
            <PreviewPanel title="SmartGuard Family"
              description="Aqui el titular crea o administra su familia y puede invitar integrantes cuando tiene acceso.">
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setPreviewFamilyAction("create")}
                  className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm font-bold">Crear familia</button>
                <button type="button" onClick={() => setPreviewFamilyAction("join")}
                  className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm font-bold">Unirme por codigo</button>
              </div>
              {previewFamilyAction ? (
                <div className="mt-3 rounded-xl bg-slate-100 p-4 text-sm">
                  {previewFamilyAction === "create"
                    ? "Vista de creacion familiar. En el producto real se genera un codigo de invitacion."
                    : "Vista de ingreso por codigo. En el producto real se valida el codigo en Firebase."}
                </div>
              ) : null}
            </PreviewPanel>
          ) : <FamilyPage embedded />
        ) : null}
      </main>

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
    </div>
  );
}
