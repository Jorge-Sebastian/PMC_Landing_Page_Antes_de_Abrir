import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft, ArrowRight, BellRing, Check, CheckCircle2, Clock3,
  HeartHandshake, Link2, LockKeyhole, MessageCircleWarning, ScanSearch,
  Shield, ShieldAlert, ShieldCheck, Smartphone, UsersRound,
  type LucideIcon,
} from "lucide-react";
import { formatMonthlyPriceCOP, PRICING_PLANS } from "@/pages/home/pricing-model";
import { Protection, type ProtectionStatus } from "./native";
import { hasNotificationConsent, saveNotificationConsent } from "./onboarding-state";

type Destination = "home" | "analyze";
const PAGES = [
  "Bienvenida", "Cómo funciona", "Privacidad y permisos", "Conoce las secciones", "Todo listo",
] as const;

function StoryCard({ Icon, title, children }: {
  Icon: LucideIcon; title: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <h3 className="font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{children}</p>
    </div>
  );
}

/** First-run education, separate from the native metrics and diagnostics. */
export function MobileOnboarding({ onComplete }: {
  onComplete: (destination: Destination) => void;
}) {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<ProtectionStatus | null>(null);
  const [consent, setConsent] = useState(() => hasNotificationConsent(window.localStorage));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const active = Boolean(status?.enabled && status.access && status.notifications);
  const permissions = Number(Boolean(status?.access)) + Number(Boolean(status?.notifications));
  const refresh = useCallback(async () => {
    try { setStatus(await Protection.status()); }
    catch { setStatus(null); }
  }, []);

  useEffect(() => {
    void refresh();
    const handleReturn = () => { if (!document.hidden) void refresh(); };
    window.addEventListener("focus", handleReturn);
    document.addEventListener("visibilitychange", handleReturn);
    return () => {
      window.removeEventListener("focus", handleReturn);
      document.removeEventListener("visibilitychange", handleReturn);
    };
  }, [refresh]);

  const activate = async () => {
    if (!consent) {
      setMessage("Para activar la detección automática primero debes autorizar la lectura de notificaciones compatibles.");
      return;
    }
    setBusy(true); setMessage("");
    try {
      await Protection.activate();
      await refresh();
      setMessage("Revisa los permisos solicitados por Android y vuelve a SmartGuard. También puedes continuar sin activarlos.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo abrir la configuración de Android.");
    } finally {
      setBusy(false);
    }
  };
  const next = () => { setMessage(""); setStep((current) => Math.min(PAGES.length - 1, current + 1)); };
  const previous = () => { setMessage(""); setStep((current) => Math.max(0, current - 1)); };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pb-10 pt-7">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
        <span>PASO {step + 1} DE {PAGES.length} · {PAGES[step]}</span>
        <span>{Math.round(((step + 1) / PAGES.length) * 100)} %</span>
      </div>
      <div aria-label={"Progreso de bienvenida: " + (step + 1) + " de " + PAGES.length}
        className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-teal-600 transition-all"
          style={{ width: ((step + 1) / PAGES.length) * 100 + "%" }} />
      </div>

      {step === 0 ? (
        <section className="space-y-5">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#103640] p-7 text-white shadow-xl">
            <div className="absolute -right-12 -top-12 size-48 rounded-full bg-teal-300/10 blur-2xl" aria-hidden="true" />
            <div className="flex size-14 items-center justify-center rounded-2xl bg-teal-300/15 text-teal-200">
              <ShieldCheck className="size-8" aria-hidden="true" />
            </div>
            <p className="mt-7 text-xs font-bold uppercase tracking-[.2em] text-teal-200">Tu seguridad, paso a paso</p>
            <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
              Antes de abrir un enlace, revísalo.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-200">
              SmartGuard te ayuda a detectar señales de riesgo en enlaces recibidos por mensajes.
              Puedes analizar manualmente y, si activas los permisos, recibir avisos automáticos.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StoryCard Icon={ScanSearch} title="Entiende el riesgo">
              Una explicación clara para decidir con más información.
            </StoryCard>
            <StoryCard Icon={UsersRound} title="Cuida a tu familia">
              Comparte únicamente alertas familiares autorizadas.
            </StoryCard>
          </div>
          <p className="px-1 text-sm text-slate-600">
            No necesitas crear una cuenta para analizar un enlace manualmente.
          </p>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-teal-800">CÓMO TE PROTEGEMOS</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">Tres maneras de usar SmartGuard</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Tú decides qué funciones quieres activar. El análisis detecta señales: ningún resultado es una garantía absoluta de seguridad.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex gap-4 rounded-2xl border bg-white p-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
                <Link2 className="size-5 text-slate-700" />
              </div>
              <div><h3 className="font-bold">1. Analiza un enlace</h3>
                <p className="mt-1 text-sm text-slate-600">Pega un enlace o mensaje y consulta sus señales de riesgo. No requiere permisos de notificaciones.</p></div>
            </div>
            <div className="flex gap-4 rounded-2xl border bg-white p-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50">
                <BellRing className="size-5 text-teal-800" />
              </div>
              <div><h3 className="font-bold">2. Recibe alertas automáticas</h3>
                <p className="mt-1 text-sm text-slate-600">Si lo autorizas, Android permite revisar enlaces visibles en notificaciones compatibles, sin que tengas que copiarlos uno a uno.</p></div>
            </div>
            <div className="flex gap-4 rounded-2xl border bg-white p-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50">
                <HeartHandshake className="size-5 text-teal-800" />
              </div>
              <div><h3 className="font-bold">3. Conecta a tu familia</h3>
                <p className="mt-1 text-sm text-slate-600">Únete mediante invitación y decide si compartes dominios clasificados como riesgo alto.</p></div>
            </div>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-teal-800">TÚ TIENES EL CONTROL</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">Privacidad y permisos</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              La protección automática necesita permisos que Android solicita directamente.
              Puedes continuar sin concederlos: el analizador manual seguirá disponible.
            </p>
          </div>
          <div className="rounded-3xl border bg-white p-5">
            <h2 className="text-lg font-bold">Lo que SmartGuard necesita</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                {status?.access ? <CheckCircle2 className="text-teal-700" /> : <LockKeyhole className="text-slate-500" />}
                <div><p className="text-sm font-bold">Acceso a notificaciones</p>
                  <p className="text-xs text-slate-600">{status?.access ? "Concedido" : "No concedido"}</p></div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                {status?.notifications ? <CheckCircle2 className="text-teal-700" /> : <BellRing className="text-slate-500" />}
                <div><p className="text-sm font-bold">Mostrar alertas</p>
                  <p className="text-xs text-slate-600">{status?.notifications ? "Concedido" : "No concedido"}</p></div>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">{permissions} de 2 autorizaciones concedidas</p>
            <label className="mt-5 flex items-start gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm">
              <input type="checkbox" className="mt-1 size-5 shrink-0 accent-teal-700"
                checked={consent} onChange={(event) => {
                  setConsent(event.target.checked);
                  saveNotificationConsent(window.localStorage, event.target.checked);
                }} />
              <span>Autorizo que SmartGuard revise enlaces visibles en las notificaciones de aplicaciones compatibles para detectar riesgos. Puedo desactivarlo después.</span>
            </label>
            <button type="button" disabled={busy || !consent} onClick={() => void activate()}
              className="mt-4 w-full rounded-xl bg-teal-800 px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? "Comprobando permisos…" : "Configurar protección automática"}
            </button>
            {message ? <p role="status" className="mt-3 text-sm text-slate-700">{message}</p> : null}
          </div>
          <div className="flex gap-3 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
            <ShieldAlert className="size-5 shrink-0" />
            <p>Compartir riesgos con familiares y enviar estadísticas técnicas son autorizaciones independientes. No se activan automáticamente en este paso.</p>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-teal-800">TU APLICACIÓN</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">Conoce las cinco secciones</h1>
            <p className="mt-3 text-sm text-slate-600">Una sola aplicación. Las funciones disponibles dependen del acceso contratado cuando los planes estén habilitados.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StoryCard Icon={Shield} title="Inicio">Tu resumen, la guía y la configuración inicial.</StoryCard>
            <StoryCard Icon={ScanSearch} title="Analizar">Pega enlaces manualmente; siempre disponible.</StoryCard>
            <StoryCard Icon={Clock3} title="Actividad">Historial de análisis almacenados en el dispositivo.</StoryCard>
            <StoryCard Icon={Smartphone} title="Protección">Estadísticas, mediciones y estado de la protección.</StoryCard>
            <StoryCard Icon={UsersRound} title="Familia">Invitaciones y alertas compartidas con autorización.</StoryCard>
          </div>
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            En la propuesta freemium, Gratis conserva Inicio y Analizar. Prueba y Premium habilitan las otras tres secciones.
          </p>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="space-y-5">
          <div className="rounded-[2rem] bg-[#103640] p-7 text-white">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-teal-300/15">
              {active ? <ShieldCheck className="size-8 text-teal-200" /> : <Shield className="size-8 text-teal-200" />}
            </div>
            <h1 className="mt-6 text-3xl font-black">Tu seguridad está contigo</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">
              {active
                ? "La protección automática está activa en este dispositivo. Puedes comenzar a utilizar SmartGuard."
                : "SmartGuard está listo para analizar enlaces manualmente. La protección automática no está activa; puedes configurarla desde Inicio."}
            </p>
            <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-bold">
              {active ? <CheckCircle2 className="size-4 text-teal-200" /> : <MessageCircleWarning className="size-4 text-amber-200" />}
              {active ? "Protección automática activada" : "Análisis manual disponible"}
            </span>
          </div>
          <div className="rounded-3xl border bg-white p-5">
            <div className="flex items-center gap-3">
              <Clock3 className="size-6 text-teal-800" />
              <h2 className="text-lg font-black">Planes y prueba de 15 días</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              SmartGuard propone un plan gratuito y opciones Premium con prueba de 15 días.
              Estos son precios en validación; la suscripción y el contador de prueba todavía no están activados en esta versión.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {PRICING_PLANS.filter((plan) => plan.id !== "free").map((plan) => (
                <div key={plan.id} className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-700">{plan.id === "family" ? "Familiar" : "Individual"}</p>
                  <p className="mt-1 text-lg font-black">{formatMonthlyPriceCOP(plan.monthlyCOP)}</p>
                  <p className="text-xs text-slate-500">COP/mes · propuesto</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-center text-xs text-slate-500">Nunca abras un enlace desconocido solo porque aparezca en verde. Revisa también el remitente y la dirección.</p>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-5">
        <button type="button" onClick={previous} disabled={step === 0}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-0">
          <ArrowLeft className="size-4" /> Atrás
        </button>
        <div className="flex flex-wrap justify-end gap-2">
          {step === 0 ? (
            <button type="button" onClick={() => onComplete("analyze")}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">
              Solo analizar enlaces
            </button>
          ) : null}
          {step === PAGES.length - 1 ? (
            <button type="button" onClick={() => onComplete("home")}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-800 px-5 py-3 font-bold text-white">
              Entrar a SmartGuard <Check className="size-4" />
            </button>
          ) : (
            <button type="button" onClick={next}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-800 px-5 py-3 font-bold text-white">
              Continuar <ArrowRight className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
