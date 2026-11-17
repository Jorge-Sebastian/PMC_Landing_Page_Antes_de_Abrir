import { useEffect, useState } from "react";
import {
  ArrowRight, BellRing, CheckCircle2, ChevronDown, FlaskConical,
  HeartHandshake, History, House, LockKeyhole, ScanSearch, Settings2,
  Shield, ShieldCheck, UsersRound, type LucideIcon,
} from "lucide-react";
import { formatMonthlyPriceCOP, PRICING_PLANS } from "@/pages/home/pricing-model";
import { ProtectionPanel } from "./protection-panel";
import {
  PREVIEW_SCENARIOS, scenarioTitle, visibleTabs,
  type AccessScenario, type MobileTab,
} from "./access-navigation";
import type { ProtectionStatus } from "./native";

const TAB_DESCRIPTIONS: Record<MobileTab, {
  title: string; body: string; Icon: LucideIcon;
}> = {
  home: { title: "Inicio", body: "Tu estado y configuración", Icon: House },
  analyze: { title: "Analizar", body: "Comprueba enlaces manualmente", Icon: ScanSearch },
  activity: { title: "Actividad", body: "Historial de análisis", Icon: History },
  protection: { title: "Protección", body: "Métricas y estadísticas", Icon: ShieldCheck },
  family: { title: "Familia", body: "Alertas compartidas", Icon: UsersRound },
};

export function MobileHome({
  scenario, status, onOpenTab, onChooseScenario, onRepeatGuide,
  openSettingsRequest,
}: {
  scenario: AccessScenario;
  status: ProtectionStatus | null;
  onOpenTab: (tab: MobileTab) => void;
  onChooseScenario: (scenario: AccessScenario) => void;
  onRepeatGuide: () => void;
  openSettingsRequest: number;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scenariosOpen, setScenariosOpen] = useState(false);
  const preview = scenario !== "real";
  const tabs = visibleTabs(scenario);
  const isActive = Boolean(status?.enabled && status.access && status.notifications);
  useEffect(() => { if (openSettingsRequest > 0) setSettingsOpen(true); }, [openSettingsRequest]);
  const settingsVisible = settingsOpen;
  const caption = scenario === "expired" ? "Prueba de 15 días finalizada" :
    scenario === "free" ? "Plan gratuito" : scenario === "invited" ? "Invitado sin Premium" :
    scenario === "trial" ? "Prueba de 15 días" :
    scenario === "premium" ? "Premium" : "Tu seguridad, en un solo lugar";

  return (
    <div className="section-shell mx-auto max-w-4xl space-y-6 py-7">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#103640] p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 size-56 rounded-full bg-teal-300/10 blur-2xl" aria-hidden="true" />
        <div className="relative">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-teal-200/15 text-teal-200">
            {isActive && !preview ? <ShieldCheck className="size-7" /> : <Shield className="size-7" />}
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-teal-200">{caption}</p>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
            {preview && tabs.length === 2 ? "Siempre puedes analizar un enlace" :
              "Tu seguridad está contigo"}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-200 sm:text-base">
            {preview
              ? "Estás explorando cómo se vería SmartGuard con este tipo de acceso. Ningún cobro ni permiso cambia."
              : isActive
                ? "La protección automática está funcionando en este teléfono. También puedes comprobar enlaces manualmente."
                : "El análisis manual está disponible. Activa la protección automática cuando quieras recibir alertas de Android."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => onOpenTab("analyze")}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-teal-300 px-5 py-3 text-sm font-bold text-slate-950">
              Analizar un enlace <ArrowRight className="size-4" />
            </button>
            {!preview && !isActive ? (
              <button type="button" onClick={() => setSettingsOpen(true)}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-teal-200/50 px-4 py-3 text-sm font-semibold">
                <Settings2 className="size-4" /> Configurar protección
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {!preview ? (
        <section className="grid grid-cols-2 gap-3" aria-label="Estado real">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              {isActive ? <CheckCircle2 className="size-4 text-teal-700" /> : <BellRing className="size-4" />}
              Estado de protección
            </div>
            <p className="mt-3 text-xl font-black text-slate-900">
              {!status ? "Por comprobar" : isActive ? "Activa" : "Pendiente"}
            </p>
            <p className="mt-1 text-xs text-slate-500">Información de este teléfono</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-600">Enlaces procesados</p>
            <p className="mt-3 text-2xl font-black text-slate-900">{status?.processed ?? "—"}</p>
            <p className="mt-1 text-xs text-slate-500">Contador nativo</p>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4" aria-label="Simulación activa">
          <div className="flex items-center gap-2">
            <FlaskConical className="size-5 text-amber-800" />
            <p className="font-bold text-amber-950">Prueba visual: {scenarioTitle(scenario)}</p>
          </div>
          <p className="mt-2 text-sm text-amber-900">
            {tabs.length === 2
              ? "En este escenario solo se muestran Inicio y Analizar."
              : "En este escenario se muestran las cinco secciones. Las pantallas avanzadas son ilustrativas."}
          </p>
        </section>
      )}

      <section className="space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-teal-800">EXPLORA SMARTGUARD</p>
          <h2 className="mt-1 text-xl font-black text-slate-900">Cada cosa en su lugar</h2>
          <p className="mt-1 text-sm text-slate-600">Estas son las secciones que puedes consultar desde la barra inferior.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tabs.map((tab) => {
            const detail = TAB_DESCRIPTIONS[tab];
            return (
              <button key={tab} type="button" onClick={() => onOpenTab(tab)}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-teal-300">
                <detail.Icon className="size-6 text-teal-800" aria-hidden="true" />
                <span className="mt-3 block font-bold text-slate-900">{detail.title}</span>
                <span className="mt-1 block text-xs text-slate-600">{detail.body}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <HeartHandshake className="mt-1 size-6 shrink-0 text-teal-800" />
          <div>
            <h2 className="font-black text-slate-900">¿Cómo funciona y qué información utilizamos?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Analizamos señales de enlaces y dominios. El monitoreo de notificaciones es opcional;
              compartir resultados con la familia requiere otra autorización independiente.
            </p>
            {!preview ? (
              <button type="button" onClick={onRepeatGuide}
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-800">
                Ver guía de inicio <ArrowRight className="size-4" />
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-black">Prueba gratuita y planes</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Diseñamos un modelo con análisis manual gratuito y funciones Premium.
          La propuesta incluye 15 días completos de prueba, pero el contador y los cobros todavía no están activos.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {PRICING_PLANS.filter((plan) => plan.id !== "free").map((plan) => (
            <div key={plan.id} className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-600">{plan.id === "family" ? "Familiar" : "Individual"}</p>
              <p className="mt-1 text-xl font-black">{formatMonthlyPriceCOP(plan.monthlyCOP)}</p>
              <p className="text-xs text-slate-500">COP/mes · propuesta</p>
            </div>
          ))}
        </div>
      </section>

      {!preview ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <button type="button" onClick={() => setSettingsOpen((open) => !open)}
            aria-expanded={settingsVisible}
            className="flex w-full items-center justify-between gap-3 p-5 text-left">
            <span className="flex items-center gap-3">
              <Settings2 className="size-5 text-teal-800" />
              <span><span className="block font-bold">Configuración y permisos</span>
                <span className="mt-1 block text-xs text-slate-600">Ajustes de Android, privacidad, pruebas técnicas y diagnóstico</span></span>
            </span>
            <ChevronDown className={"size-5 shrink-0 text-slate-600 " + (settingsVisible ? "rotate-180" : "")} />
          </button>
          {settingsVisible ? (
            <div className="border-t border-slate-100">
              <ProtectionPanel />
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-4" aria-label="Herramientas para probar vistas">
        <button type="button" onClick={() => setScenariosOpen((open) => !open)}
          aria-expanded={scenariosOpen} className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-slate-600">
          <span className="flex items-center gap-2"><FlaskConical className="size-4" />
            Experimentos · Probar vistas</span>
          <ChevronDown className={"size-4 " + (scenariosOpen ? "rotate-180" : "")} />
        </button>
        {scenariosOpen ? (
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
            <p className="text-xs leading-relaxed text-slate-600">
              Cambia solo la navegación para estudiar cómo se vería cada plan. No modifica tus permisos, datos ni suscripciones.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PREVIEW_SCENARIOS.map((item) => (
                <button key={item.id} type="button" onClick={() => onChooseScenario(item.id)}
                  aria-pressed={scenario === item.id}
                  className={"rounded-xl border p-3 text-left " +
                    (scenario === item.id ? "border-teal-700 bg-teal-50" : "border-slate-200 bg-slate-50")}>
                  <span className="block text-sm font-bold text-slate-900">{item.title}</span>
                  <span className="mt-1 block text-xs text-slate-600">{item.description}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => onChooseScenario("real")}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">
              Volver a la aplicación real
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
