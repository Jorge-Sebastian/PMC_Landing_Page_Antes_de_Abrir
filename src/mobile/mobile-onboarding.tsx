import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, BellRing, CheckCircle2 } from "lucide-react";
import { formatMonthlyPriceCOP, PRICING_PLANS } from "@/pages/home/pricing-model";
import { Protection, type ProtectionStatus } from "./native";
import { CommercialDetails } from "./commercial-details";
import { COMMERCIAL_ENABLED, fetchCommercialAccess } from "./commercial-client";
import { confirmedPremium } from "./commercial-policy";
import { hasNotificationConsent, saveNotificationConsent } from "./onboarding-state";

type Destination = "home" | "analyze";
type MessageKind = "parcel" | "account" | "bank";
type RiskKind = "info" | "whatsapp";
type PersonKind = "partner" | "grandma" | "friend";
type FeatureKind = "auto" | "manual" | "colors" | "activity" | "protection" | "family";
type PlanKind = "free" | "trial" | "automatic" | "family";
type ViewKind = "Inicio" | "Analizar" | "Actividad" | "Protección" | "Familia";

const STEPS = ["Bienvenida", "Funcionalidades", "Planes", "Detalles adicionales", "Permisos", "Comenzar"] as const;
const AUTOMATIC = PRICING_PLANS.find((p) => p.id === "automatic")!;
const FAMILY = PRICING_PLANS.find((p) => p.id === "family")!;

const MESSAGES: Record<MessageKind, { icon: string; sender: string; text: string; url: string }> = {
  parcel: { icon: "📦", sender: "Servicio de entregas", text: "No pudimos entregar tu paquete. Actualiza tu dirección para evitar que sea devuelto.", url: "seguimiento-entrega.example/confirmar" },
  account: { icon: "🔒", sender: "Equipo de seguridad", text: "Detectamos un inicio de sesión inusual. Verifica tu cuenta antes de que sea suspendida.", url: "seguridad-cuenta.example/verificar" },
  bank: { icon: "🏦", sender: "Notificación bancaria", text: "Se bloqueó temporalmente tu acceso. Confirma tus datos para restablecer tus servicios.", url: "seguridad-bancaria.example/ingresar" },
};

const RISKS: Record<RiskKind, { title: string; text: string; icons: string[]; captions: string[]; note: string }> = {
  info: {
    title: "Cuando alguien no reconoce una estafa",
    text: "Tu abuela recibe un mensaje sobre una supuesta entrega. Confía en él y podría introducir sus datos sin sospechar que intentan engañarla. Quizás tú reconocerías la estafa inmediatamente, pero ella no cuenta con la misma información.",
    icons: ["👵🏽", "📦", "⚠️"], captions: ["Tu abuela", "Un enlace", "El riesgo"],
    note: "Lo que tú sabes para reconocer un engaño también podría ayudar a alguien de tu círculo cercano.",
  },
  whatsapp: {
    title: "Cuando roban una cuenta de WhatsApp",
    text: "Alguien pierde el control de su WhatsApp. Desde esa cuenta comienzan a enviar enlaces sospechosos a sus contactos. Como los mensajes parecen venir de alguien conocido, resulta más fácil confiar en ellos.",
    icons: ["📱", "🔗", "👥"], captions: ["Cuenta robada", "Un enlace", "Sus contactos"],
    note: "Compartir antecedentes de dominios peligrosos puede ayudar a reconocer enlaces que vuelven a circular.",
  },
};

type Story = {
  face: string; heading: string; icon: string; sender: string; text: string; url: string;
  context: string; analysis: string; match: string; decision: string; action: string;
  result: string; detail: string; who: string; chat: string; answer: string; after: string;
};
const STORIES: Record<PersonKind, Story> = {
  partner: {
    face: "💑", heading: "Tu pareja mira su celular…", icon: "🏦", sender: "Alerta bancaria",
    text: "Para desbloquear tu cuenta debes realizar una transferencia de verificación de $1.200.000. Hazlo hoy desde el siguiente enlace:",
    url: "seguridad-cuenta.example/validar",
    context: "El mensaje parece urgente. Tu pareja duda si realmente lo envió su banco.",
    analysis: "SmartGuard detecta señales de posible suplantación bancaria sin abrir el enlace.",
    match: "Alguien de su grupo había autorizado compartir una alerta de riesgo alto relacionada con este dominio.",
    decision: "Decide no hacer la transferencia.",
    action: "Comprueba con su banco, por un canal oficial, que ese supuesto pago no existe.",
    result: "Evitó perder $1.200.000.", detail: "No entregó su dinero a una cuenta falsa.",
    who: "Tu pareja", chat: "Casi hago esa transferencia… Menos mal vi la alerta de SmartGuard. ¡Gracias por compartirla!",
    answer: "¡Qué alivio! Yo recibí ese mismo enlace. Mejor avisemos a los demás.",
    after: "No solo protegió su dinero. También ayudó a que los demás estuvieran atentos.",
  },
  grandma: {
    face: "👵", heading: "Tu abuela recibe un mensaje…", icon: "📦", sender: "Servicio de entregas",
    text: "Tu paquete está retenido. Actualiza tu dirección y confirma los datos de tu tarjeta aquí:",
    url: "entrega-pendiente.example/actualizar",
    context: "Tu abuela esperaba una entrega y el aviso parece auténtico.",
    analysis: "SmartGuard encuentra características de una página que podría intentar recopilar datos personales.",
    match: "Un integrante de su grupo había autorizado compartir un antecedente rojo de ese dominio.",
    decision: "Decide consultar directamente a la empresa.",
    action: "No introduce los datos de su tarjeta en el enlace del mensaje.",
    result: "Protegió sus datos personales.", detail: "No facilitó información sensible a una página sospechosa.",
    who: "Tu abuela", chat: "¡Gracias por avisarme! Yo sí pensé que era la empresa. Mejor llamé al número oficial.",
    answer: "¡Hiciste bien! Si vuelve a llegarte algo raro, lo revisamos juntos.",
    after: "Ahora sabe que puede consultar antes de confiar.",
  },
  friend: {
    face: "🧑", heading: "Tu mejor amigo recibe un WhatsApp…", icon: "💬", sender: "Un contacto conocido",
    text: "¡Hola! Soy yo. Necesito que entres a este enlace, es urgente. Confírmame cuando lo hagas:",
    url: "confirmacion-urgente.example/entrar",
    context: "El mensaje llega desde una cuenta conocida, así que parece más confiable.",
    analysis: "SmartGuard analiza el enlace y encuentra indicadores de riesgo.",
    match: "En el grupo ya existía un antecedente compartido de alto riesgo para ese dominio.",
    decision: "Decide contactar a esa persona por otra vía.",
    action: "Descubre que su cuenta había sido comprometida y evita seguir el enlace.",
    result: "Reconoció el engaño a tiempo.", detail: "No abrió el enlace sospechoso.",
    who: "Tu mejor amigo", chat: "Acabo de llamar. ¡Le habían robado el WhatsApp! Menos mal vi SmartGuard.",
    answer: "Gracias por avisar. Voy a tener cuidado si me llega ese mensaje.",
    after: "Una advertencia terminó ayudando a más personas.",
  },
};

const FEATURES: { id: FeatureKind; icon: string; label: string }[] = [
  { id: "auto", icon: "📲", label: "Automático" },
  { id: "manual", icon: "🔎", label: "Manual" },
  { id: "colors", icon: "🚦", label: "Alertas" },
  { id: "activity", icon: "🕘", label: "Actividad" },
  { id: "protection", icon: "📊", label: "Protección" },
  { id: "family", icon: "👥", label: "Familia" },
];
const VIEW_ICONS: Record<ViewKind, string> = {
  Inicio: "🏠", Analizar: "🔎", Actividad: "🕘", Protección: "🛡️", Familia: "👥",
};
const VIEWS: { name: ViewKind; description: string }[] = [
  { name: "Inicio", description: "Tu estado, tus accesos y tus ajustes." },
  { name: "Analizar", description: "Pega y revisa enlaces manualmente." },
  { name: "Actividad", description: "Resultados y análisis guardados." },
  { name: "Protección", description: "Configuración, estado y métricas disponibles." },
  { name: "Familia", description: "Grupos privados y antecedentes de riesgo autorizados." },
];

function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <p className={"mb-2 text-[10px] font-extrabold uppercase leading-relaxed tracking-[.12em] " + (light ? "text-emerald-200" : "text-emerald-800")}>{children}</p>;
}
function Section({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return <section className="mt-7 space-y-3"><div><Eyebrow>{label}</Eyebrow><h2 className="text-[1.35rem] font-black leading-tight tracking-tight text-[#173d35]">{title}</h2></div>{children}</section>;
}
function NoteCard({ children, tone = "mint" }: { children: ReactNode; tone?: "mint" | "warm" }) {
  return <div className={"rounded-xl px-3 py-3 text-xs leading-relaxed " + (tone === "mint" ? "bg-[#e6f5e9] text-emerald-900" : "bg-amber-50 text-amber-950")}>{children}</div>;
}
function IconCard({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return <div className="flex gap-3 rounded-2xl border border-emerald-100 bg-white p-3.5">
    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-2xl" aria-hidden="true">{icon}</div>
    <div className="min-w-0"><h3 className="text-[13px] font-black leading-snug text-emerald-950">{title}</h3><div className="mt-1 text-xs leading-relaxed text-slate-600">{children}</div></div>
  </div>;
}
function VisualFlow({ icons, captions }: { icons: readonly string[]; captions: readonly string[] }) {
  return <div className="flex items-center justify-between gap-1 rounded-xl bg-[#edf7ee] px-2 py-4">
    {icons.map((icon, index) => <div className="contents" key={index}>
      {index > 0 ? <span className="text-lg text-emerald-600" aria-hidden="true">→</span> : null}
      <div className="min-w-0 flex-1 text-center"><div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#d9eee1] text-2xl">{icon}</div><p className="mt-1 text-[10px] font-bold leading-snug text-emerald-900">{captions[index]}</p></div>
    </div>)}
  </div>;
}
function MessageCard({ sender, icon, text, url }: { sender: string; icon: string; text: string; url: string }) {
  return <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
    <div className="mb-3 flex items-center gap-2 text-xs font-extrabold text-emerald-950"><span className="flex size-8 items-center justify-center rounded-full bg-emerald-50 text-lg">{icon}</span>{sender}</div>
    <div className="rounded-2xl rounded-bl-sm bg-[#e3f3e7] p-3.5 text-xs leading-relaxed text-emerald-950">{text}<span className="mt-2 block break-all font-extrabold text-emerald-700">{url}</span></div>
  </div>;
}
function DemoNotice({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-2 text-xs font-black text-emerald-950"><span className="flex size-9 items-center justify-center rounded-xl bg-[#e1f4e8] text-lg">🛡️</span>{title}</div>
    <div className="mt-2 text-xs leading-relaxed text-slate-600">{children}</div>
  </div>;
}

export function MobileOnboarding({ onComplete }: { onComplete: (destination: Destination) => void }) {
  const [step, setStep] = useState(0);
  const [messageKind, setMessageKind] = useState<MessageKind>("parcel");
  const [riskKind, setRiskKind] = useState<RiskKind>("info");
  const [person, setPerson] = useState<PersonKind>("partner");
  const [storyStage, setStoryStage] = useState(0);
  const [feature, setFeature] = useState<FeatureKind>("auto");
  const [manualResult, setManualResult] = useState(false);
  const [color, setColor] = useState<"red" | "orange" | "green">("red");
  const [selection, setSelection] = useState<PlanKind>("free");
  const [confirmedPlan, setConfirmedPlan] = useState<PlanKind | null>(null);
  const [view, setView] = useState<ViewKind>("Inicio");
  const [commercialMode, setCommercialMode] = useState<"free" | "trial" | "pending" | "active">("free");
  const [manualAcknowledged, setManualAcknowledged] = useState(false);
  const [status, setStatus] = useState<ProtectionStatus | null>(null);
  const [battery, setBattery] = useState<{ supported: boolean; unrestricted: boolean } | null>(null);
  const [consent, setConsent] = useState(() => hasNotificationConsent(window.localStorage));
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [message, setMessage] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const active = Boolean(status?.enabled && status.access && status.notifications);
  const enoughPermissions = commercialMode === "free" ? manualAcknowledged : active;
  const story = STORIES[person];
  const visibleViews = selection === "free" ? VIEWS.slice(0, 2) : VIEWS;
  const planName = selection === "free" ? "Gratis" : selection === "trial" ? "Prueba de 15 días" : selection === "automatic" ? "Premium individual" : "Premium familiar";

  const refresh = useCallback(async () => {
    const result = await Promise.allSettled([Protection.status(), Protection.batteryOptimizationStatus()]);
    if (result[0].status === "fulfilled") setStatus(result[0].value);
    if (result[1].status === "fulfilled") setBattery(result[1].value);
  }, []);
  useEffect(() => {
    void refresh();
    const onFocus = () => { if (!document.hidden) void refresh(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => { window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, [refresh]);
  useEffect(() => { containerRef.current?.scrollIntoView({ block: "start", behavior: "auto" }); }, [step]);

  const activate = async () => {
    if (active) return;
    if (commercialMode === "free") {
      setMessage("Con Gratis puedes analizar manualmente sin activar la detección de notificaciones.");
      return;
    }
    if (COMMERCIAL_ENABLED) {
      try {
        if (!confirmedPremium(await fetchCommercialAccess())) {
          setMessage("Firebase no confirmó un plan Premium vigente. Puedes usar el análisis manual mientras tanto.");
          return;
        }
      } catch {
        setMessage("No fue posible verificar Premium. El servicio automático requiere una prueba o un plan activo.");
        return;
      }
    }
    if (!consent) { setMessage("Primero autoriza la detección automática. Si prefieres no hacerlo, puedes seguir con el análisis manual."); return; }
    setBusy(true); setMessage("");
    try {
      await Protection.activate();
      await refresh();
      setMessage("Al volver de los ajustes de Android comprobaremos automáticamente los permisos concedidos.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos abrir los ajustes. El análisis manual sigue disponible."); }
    finally { setBusy(false); }
  };
  const sendExample = async () => {
    if (!status?.notifications) { setMessage("Permite que SmartGuard muestre notificaciones para probar un aviso real."); return; }
    setDemoBusy(true); setMessage("");
    try { await Protection.testBanner({ level: "riesgo" }); setMessage("Enviamos una notificación de demostración a tu celular."); }
    catch { setMessage("Android no pudo mostrar la notificación de prueba en este dispositivo."); }
    finally { setDemoBusy(false); }
  };
  const batterySettings = async () => {
    try { await Protection.batterySettings(); setMessage("Regresa a SmartGuard después de revisar los ajustes de batería."); }
    catch { setMessage("No se pudieron abrir los ajustes de batería."); }
  };
  const changeStep = (next: number) => {
    // Step 4 has its own explicit plan action; Step 5 checks real Android state.
    if (next === 4 && step === 3) return;
    if (next >= 5 && !enoughPermissions) return;
    setMessage("");
    setStep(Math.max(0, Math.min(STEPS.length - 1, next)));
  };

  return <div ref={containerRef} className="mx-auto w-full max-w-xl space-y-5 px-3 pb-16 pt-6 text-slate-900 sm:px-5">
    <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 text-xs font-black"><span className="text-emerald-900">{String(step + 1).padStart(2, "0")} / 06 · {STEPS[step]}</span><span className="text-slate-500">{Math.round((step + 1) * 100 / 6)} %</span></div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-100" role="progressbar" aria-label="Progreso de configuración" aria-valuenow={step + 1} aria-valuemin={0} aria-valuemax={6}><div className="h-full rounded-full bg-emerald-700 transition-all" style={{ width: ((step + 1) / 6 * 100) + "%" }} /></div>
    </div>

    {step === 0 ? <section className="space-y-6">
      <Eyebrow>Bienvenido a SmartGuard</Eyebrow>
      <div className="rounded-[1.5rem] bg-[#123a42] p-6 text-white shadow-lg">
        <Eyebrow light>Todo comienza con un mensaje</Eyebrow>
        <h1 className="text-[1.8rem] font-black leading-tight tracking-tight text-white">¿Alguna vez te ha llegado un mensaje que parece real, pero te hace dudar?</h1>
        <p className="mt-4 text-sm leading-relaxed text-emerald-50">Quizás te prometen un paquete, dicen que tu cuenta será bloqueada o se hacen pasar por tu banco. Te piden actuar de inmediato y, por un momento, no sabes si confiar.</p>
      </div>
      <Section label="Una situación cotidiana" title="¿Te suena familiar?">
        <p className="text-sm leading-relaxed text-slate-600">Los estafadores pueden hacerse pasar por empresas conocidas y crear una sensación de urgencia para que actúes sin verificar.</p>
        <div className="grid grid-cols-3 gap-1.5">
          {([["parcel", "📦", "Un paquete"], ["account", "🔒", "Tu cuenta"], ["bank", "🏦", "Tu banco"]] as const).map(([id, icon, name]) =>
            <button type="button" key={id} aria-pressed={messageKind === id} onClick={() => setMessageKind(id)}
              className={"min-w-0 rounded-xl border px-1 py-3 text-[11px] font-black " + (messageKind === id ? "border-[#155e50] bg-[#155e50] text-white" : "border-emerald-100 bg-white text-emerald-900")}>
              <span className="mb-1 block text-xl" aria-hidden="true">{icon}</span>{name}
            </button>)}
        </div>
        <MessageCard {...MESSAGES[messageKind]} />
        <NoteCard tone="warm">⚠️ Aunque el mensaje parezca venir de una empresa conocida, alguien podría estar intentando hacerse pasar por ella.</NoteCard>
      </Section>
      <Section label="Más común de lo que parece" title="El fraude también puede afectarte a ti.">
        <div className="space-y-2">
          {([
            ["📋", "Más de 640.000 casos de fraude bancario digital", "Reportados en Colombia durante 2025."],
            ["💸", "Más de 350.000 millones de pesos en pérdidas operacionales asociadas a fraude externo", "Reportadas por Bancolombia durante 2025."],
            ["👥", "El 61,1 % de los encuestados conoce a alguien que ha sufrido fraude", "Según un estudio de DataCrédito Experian de 2025."],
          ] as const).map(([icon, text, sub]) =>
            <div key={text} className="flex gap-3 rounded-2xl border border-emerald-100 bg-white p-4 last:bg-emerald-50">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#e4f3e9] text-2xl">{icon}</span>
              <div><p className="text-lg font-black leading-snug text-emerald-950">{text}</p><p className="mt-1 text-xs leading-relaxed text-slate-600">{sub}</p></div>
            </div>)}
        </div>
        <p className="text-[10px] leading-relaxed text-slate-500">Fuentes: Asobancaria · Informe de gestión de Bancolombia 2025 · DataCrédito Experian 2025.</p>
      </Section>
      <Section label="Cuando el riesgo alcanza a quienes quieres" title="¿Y si ese mensaje le llega a alguien que quieres?">
        <p className="text-sm leading-relaxed text-slate-600">Piensa en tu pareja, tu mejor amigo, tu abuela, tu tía o esa persona que siempre ha estado ahí para ti. Un mismo engaño puede afectar a varias personas de tu círculo cercano y provocar pérdidas importantes.</p>
        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-emerald-50 p-1">
          {([["info", "💬 Desinformación"], ["whatsapp", "📱 Robo de WhatsApp"]] as const).map(([id, label]) =>
            <button key={id} type="button" aria-pressed={riskKind === id} onClick={() => setRiskKind(id)}
              className={"rounded-lg px-2 py-3 text-xs font-extrabold " + (riskKind === id ? "bg-white text-emerald-950 shadow-sm" : "text-emerald-700")}>{label}</button>)}
        </div>
        <div className="space-y-3 rounded-2xl border border-emerald-100 bg-white p-4">
          <h3 className="font-black text-emerald-950">{RISKS[riskKind].title}</h3>
          <p className="text-sm leading-relaxed text-slate-600">{RISKS[riskKind].text}</p>
          <VisualFlow icons={RISKS[riskKind].icons} captions={RISKS[riskKind].captions} />
          <NoteCard tone="warm">{RISKS[riskKind].note}</NoteCard>
        </div>
      </Section>
      <Section label="Una respuesta más inteligente" title="Por eso creamos SmartGuard.">
        <div className="space-y-3 rounded-[1.5rem] border border-emerald-200 bg-[#e1f5e9] p-5">
          <p className="text-xs font-black text-emerald-900">🛡️ PROTECCIÓN PERSONAL</p>
          <p className="text-sm leading-relaxed text-emerald-950">Una aplicación que te ayuda a reconocer el riesgo de los enlaces que recibes, consultar sus fuentes y entender qué precauciones tomar, <strong>sin tener que abrir primero una página sospechosa.</strong></p>
          <h3 className="pt-2 text-lg font-black text-emerald-950">¿Cómo funciona?</h3>
          <IconCard icon="📩" title="1. Recibes un enlace.">Puede llegar por SMS, WhatsApp o una aplicación compatible.</IconCard>
          <IconCard icon="🔍" title="2. SmartGuard analiza su riesgo y sus fuentes.">Automáticamente cuando tienes la protección habilitada, o manualmente cuando pegas el enlace.</IconCard>
          <IconCard icon="🚨" title="3. Entiendes qué precauciones tomar.">Ves el nivel de riesgo y las razones de la advertencia antes de visitar una página sospechosa.</IconCard>
        </div>
      </Section>
      <Section label="Una protección que va más allá" title="¿Y qué sucede con las personas que quieres?">
        <div className="space-y-3 rounded-[1.4rem] border border-emerald-100 bg-white p-4">
          <Eyebrow>SmartGuard · Grupos familiares</Eyebrow>
          <h3 className="text-lg font-black leading-snug text-emerald-950">La información compartida puede ayudar a proteger a quienes más quieres.</h3>
          <p className="text-sm leading-relaxed text-slate-600">Crea un grupo privado e invita a tu círculo cercano. Los antecedentes de enlaces de alto riesgo que sus integrantes autoricen compartir podrán ayudar a los demás a reconocer amenazas similares.</p>
          <VisualFlow icons={["👩🏽", "🛡️", "👥"]} captions={["Una persona", "SmartGuard", "Tu grupo"]} />
          <div className="space-y-3">
            <IconCard icon="1️⃣" title="Alguien recibe un enlace.">SmartGuard lo analiza y detecta un posible riesgo alto.</IconCard>
            <IconCard icon="2️⃣" title="El grupo conserva el antecedente.">Si esa persona lo autoriza, se registra información limitada del dominio en el grupo privado.</IconCard>
            <IconCard icon="3️⃣" title="Otra persona recibe un enlace similar.">SmartGuard puede mostrar la coincidencia familiar para ayudarle a tomar precauciones.</IconCard>
          </div>
          <div className="space-y-3 pt-5">
            <Eyebrow>Imagina cómo podría ayudar a tu círculo</Eyebrow>
            <h3 className="text-lg font-black text-emerald-950">Tres historias. Una forma de cuidarse.</h3>
            <p className="text-xs leading-relaxed text-slate-600">Elige a una persona y descubre qué ocurre cuando recibe un mensaje sospechoso.</p>
            <div className="grid grid-cols-3 gap-1.5">
              {([["partner", "💑 Tu pareja"], ["grandma", "👵 Tu abuela"], ["friend", "🧑 Tu amigo"]] as const).map(([id, name]) =>
                <button key={id} type="button" onClick={() => { setPerson(id); setStoryStage(0); }} aria-pressed={person === id}
                  className={"min-w-0 rounded-xl border px-1 py-3 text-[11px] font-black " + (person === id ? "border-[#155e50] bg-[#155e50] text-white" : "border-emerald-100 bg-emerald-50 text-emerald-900")}>{name}</button>)}
            </div>
            <div className="space-y-3 rounded-2xl border border-emerald-100 bg-[#f1f8f2] p-3">
              <div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-2xl">{story.face}</div><div><p className="text-sm font-black text-emerald-950">{story.heading}</p><p className="text-[11px] text-slate-600">Descubre qué ocurrió paso a paso</p></div></div>
              <div className="grid grid-cols-5 gap-1.5" aria-label={"Paso " + (storyStage + 1) + " de 5"}>{[0, 1, 2, 3, 4].map((n) => <span key={n} className={"h-1.5 rounded-full " + (n <= storyStage ? "bg-emerald-600" : "bg-emerald-100")} />)}</div>
              <div><Eyebrow>01 · Llega un mensaje</Eyebrow><MessageCard icon={story.icon} sender={story.sender} text={story.text} url={story.url} /><p className="mt-2 text-xs leading-relaxed text-slate-600">{story.context}</p></div>
              {storyStage >= 1 ? <div><p className="py-1 text-center text-2xl text-emerald-600">↓</p><Eyebrow>02 · SmartGuard analiza el enlace</Eyebrow><DemoNotice title="SmartGuard · Análisis de riesgo"><p className="mb-2 inline-block rounded-lg bg-orange-50 px-2 py-1 font-black text-orange-800">⚠️ Riesgo alto</p><p>{story.analysis}</p></DemoNotice></div> : null}
              {storyStage >= 2 ? <div><p className="py-1 text-center text-2xl text-emerald-600">↓</p><Eyebrow>03 · Su grupo familiar aporta información</Eyebrow><DemoNotice title="👥 Coincidencia familiar">{story.match}</DemoNotice></div> : null}
              {storyStage >= 3 ? <div><p className="py-1 text-center text-2xl text-emerald-600">↓</p><Eyebrow>04 · Toma una decisión</Eyebrow><NoteCard><strong>{story.decision}</strong><span className="mt-1 block">{story.action}</span></NoteCard><div className="mt-3 rounded-2xl bg-[#123b42] p-5 text-center text-white"><p className="text-[10px] font-black tracking-widest text-emerald-200">EL RESULTADO</p><p className="mt-2 text-2xl font-black leading-snug text-white">{story.result}</p><p className="mt-2 text-xs leading-relaxed text-emerald-50">{story.detail}</p></div></div> : null}
              {storyStage >= 4 ? <div><p className="py-1 text-center text-2xl text-emerald-600">↓</p><Eyebrow>05 · ¿Y qué hizo después?</Eyebrow><div className="space-y-2 rounded-2xl bg-white p-3"><p className="text-xs font-black text-emerald-950">💬 Grupo familiar</p><div className="ml-5 rounded-xl rounded-br-sm bg-[#daf3e2] p-3 text-xs leading-relaxed text-emerald-950"><strong className="block">{story.who}</strong>{story.chat}</div><div className="mr-5 rounded-xl rounded-bl-sm bg-[#eef2ed] p-3 text-xs leading-relaxed text-slate-700"><strong className="block">Alguien de tu grupo</strong>{story.answer}</div></div><NoteCard><strong>{story.after}</strong></NoteCard></div> : null}
              {storyStage < 4 ? <button type="button" className="w-full rounded-xl bg-[#155e50] p-3.5 text-xs font-black text-white" onClick={() => setStoryStage((n) => Math.min(4, n + 1))}>{storyStage === 3 ? "¿Y qué hizo después?" : "¿Qué ocurre después?"} →</button> : null}
              {storyStage === 4 ? <div className="rounded-2xl bg-[#123b42] p-5 text-white"><Eyebrow light>La historia continúa</Eyebrow><p className="text-xl font-black leading-snug text-white">Hoy alguien te ayudó a reconocer el riesgo. Mañana podrías ser tú quien ayude a otra persona.</p><p className="mt-3 text-sm leading-relaxed text-emerald-100">Cuando las personas que quieres comparten información sobre enlaces sospechosos, una advertencia puede convertirse en tranquilidad para todos.</p><p className="mt-3 text-lg font-black text-emerald-200">SmartGuard.</p></div> : null}
            </div>
          </div>
        </div>
      </Section>
    </section> : null}

    {step === 1 ? <section className="space-y-5">
      <div className="rounded-[1.5rem] bg-[#123b42] p-6 text-white">
        <Eyebrow light>02 · Funcionalidades</Eyebrow>
        <h1 className="text-[1.6rem] font-black leading-tight text-white">¿Qué funcionalidades tiene SmartGuard?</h1>
        <p className="mt-3 text-sm leading-relaxed text-emerald-50">SmartGuard reúne herramientas para reconocer riesgos antes de visitar una página.</p>
        <div className="mt-5"><VisualFlow icons={["📩", "🛡️", "🧠"]} captions={["Recibes", "Analizamos", "Decides"]} /></div>
      </div>
      <Section label="Explora cada herramienta" title="Toca una función y mira cómo se vería.">
        <div className="grid grid-cols-3 gap-1.5">
          {FEATURES.map((f) => <button key={f.id} type="button" aria-pressed={feature === f.id} onClick={() => setFeature(f.id)} className={"rounded-xl border px-1 py-3 text-[11px] font-black " + (feature === f.id ? "border-[#155e50] bg-[#155e50] text-white" : "border-emerald-100 bg-white text-emerald-900")}><span className="mb-1 block text-xl">{f.icon}</span>{f.label}</button>)}
        </div>
        <div className="space-y-3 rounded-2xl border border-emerald-100 bg-white p-4">
          {feature === "auto" ? <><h3 className="font-black">📲 Una advertencia cuando más la necesitas</h3><p className="text-sm text-slate-600">Estás usando tu celular y llega un mensaje a una aplicación compatible.</p><MessageCard icon="📦" sender="Servicio de entregas" text="Tu paquete está retenido. Confirma tus datos para recibirlo." url="entrega-pendiente.example/confirmar" /><p className="text-center text-2xl text-emerald-600">↓</p><div className="rounded-xl bg-orange-50 p-3 text-xs leading-relaxed text-orange-950"><strong>🛡️ SmartGuard · Riesgo alto</strong><p className="mt-1">Se identificaron indicadores de suplantación. Revisa la advertencia antes de abrir el enlace.</p></div><p className="text-xs leading-relaxed text-slate-600">Con los permisos habilitados, SmartGuard puede analizar enlaces visibles en avisos compatibles y alertarte sin tener que abrir primero la página.</p></> : null}
          {feature === "manual" ? <><h3 className="font-black">🔎 ¿Te enviaron un enlace y tienes dudas?</h3><p className="text-xs text-slate-600">Cópialo, pégalo en Analizar y comprueba el riesgo antes de visitarlo.</p><div className="break-all rounded-xl bg-emerald-50 p-3 text-xs text-emerald-950">verificacion-bancaria.example/acceso</div><button type="button" onClick={() => setManualResult(true)} className="w-full rounded-xl bg-[#155e50] p-3 text-xs font-black text-white">Ver análisis del ejemplo →</button>{manualResult ? <NoteCard tone="warm"><strong>⚠️ Riesgo alto · Posible suplantación</strong><p className="mt-1">El informe muestra las razones y las fuentes para que puedas tomar precauciones.</p></NoteCard> : null}</> : null}
          {feature === "colors" ? <><h3 className="font-black">🚦 Tres niveles fáciles de entender</h3><p className="text-xs text-slate-600">Cada resultado viene acompañado de una explicación. Toca un color.</p><div className="grid grid-cols-3 gap-1.5">{([["red", "🔴 Alto"], ["orange", "🟠 Medio"], ["green", "🟢 Bajo"]] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setColor(id)} aria-pressed={color === id} className={"rounded-xl p-2 text-xs font-black " + (color === id ? "bg-[#155e50] text-white" : "bg-emerald-50 text-emerald-950")}>{label}</button>)}</div><NoteCard tone={color === "green" ? "mint" : "warm"}>{color === "red" ? "Riesgo alto: hay indicadores importantes de amenaza. Evita ingresar datos y verifica por un canal oficial." : color === "orange" ? "Riesgo medio: hay señales que requieren precaución. Confirma la autenticidad antes de entrar." : "Riesgo bajo: no se detectaron alertas relevantes. Aun así, ningún análisis puede garantizar seguridad absoluta."}</NoteCard></> : null}
          {feature === "activity" ? <><h3 className="font-black">🕘 Lo que revisaste, en un solo lugar</h3><p className="text-xs text-slate-600">Consulta resultados anteriores y vuelve a entender las advertencias.</p>{[["🔴", "verificacion-bancaria.example", "Riesgo alto · Hoy"], ["🟠", "oferta-promocion.example", "Precaución · Ayer"], ["🟢", "www.uniandes.edu.co", "Riesgo bajo · Ayer"]].map(([icon, name, subtitle]) => <div key={name} className="flex gap-3 rounded-xl bg-emerald-50 p-3"><span>{icon}</span><div><p className="break-all text-xs font-black">{name}</p><p className="text-[11px] text-slate-600">{subtitle}</p></div></div>)}</> : null}
          {feature === "protection" ? <><h3 className="font-black">📊 Entiende cómo está tu protección</h3><p className="text-xs text-slate-600">Revisa permisos, actividad y mediciones disponibles en tu dispositivo.</p><IconCard icon="🔔" title="Notificaciones">Consulta si Android permite mostrar avisos y leer los enlaces visibles.</IconCard><IconCard icon="⚙️" title="Configuración">Revisa las opciones de segundo plano y batería.</IconCard><IconCard icon="📈" title="Información técnica">Observa el estado y los indicadores que la APK tenga disponibles.</IconCard></> : null}
          {feature === "family" ? <><h3 className="font-black">👥 Los riesgos no tienen que enfrentarse a solas</h3><VisualFlow icons={["🧑", "👩", "👵"]} captions={["Tú", "Tu pareja", "Tu abuela"]} /><p className="text-xs leading-relaxed text-slate-600">Cuando alguien autoriza compartir un antecedente de alto riesgo, puede ayudar al grupo a reconocer el mismo dominio si vuelve a aparecer.</p></> : null}
        </div>
      </Section>
      <NoteCard><strong>Dos maneras de analizar:</strong> manualmente cuando pegas un enlace y automáticamente cuando SmartGuard puede detectarlo con los permisos y la compatibilidad necesarios.</NoteCard>
    </section> : null}

    {step === 2 ? <section className="space-y-5">
      <div className="rounded-[1.5rem] border border-emerald-200 bg-[#e6f5e9] p-6">
        <p className="mb-3 text-4xl" aria-hidden="true">🛡️ 💚 👥</p>
        <Eyebrow>03 · Planes</Eyebrow>
        <h1 className="text-[1.65rem] font-black leading-tight text-emerald-950">¿Qué tipo de plan se adapta a ti?</h1>
        <p className="mt-3 text-sm leading-relaxed text-emerald-900">Comienza gratis, activa la prueba de 15 días o elige Premium individual o familiar.</p>
      </div>
      <Section label="Planes de SmartGuard" title="Escoge cómo quieres comenzar.">
        <div className="grid grid-cols-2 gap-2">
          {([
            ["free", "🌿", "Gratis", "$0", "Analiza enlaces manualmente.", "Inicio y Analizar"],
            ["trial", "✨", "Prueba de 15 días", "15 días", "Explora la protección ampliada.", "5 secciones"],
            ["automatic", "🛡️", "Premium individual", formatMonthlyPriceCOP(AUTOMATIC.monthlyCOP), "Alertas y protección personal.", "5 secciones"],
            ["family", "👨‍👩‍👧‍👦", "Premium familiar", formatMonthlyPriceCOP(FAMILY.monthlyCOP), "Cuidado para tu círculo cercano.", "Hasta 10 integrantes"],
          ] as const).map(([id, icon, title, price, description, benefit]) =>
            <div key={id} className={"flex min-w-0 flex-col rounded-2xl border p-3.5 transition-colors " +
                (selection === id ? "border-emerald-600 bg-[#eaf7ee] shadow-sm" : "border-emerald-100 bg-white")}>
              <button type="button" aria-pressed={selection === id}
                onClick={() => {
                  setSelection(id);
                  if (confirmedPlan !== id) setConfirmedPlan(null);
                  setView("Inicio");
                  window.requestAnimationFrame(() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
                }}
                className="flex flex-1 flex-col items-start text-left" aria-label={"Ver detalles del plan "+title}>
                <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-2xl" aria-hidden="true">{icon}</span>
                <span className="mt-2 block min-h-9 text-[13px] font-black leading-snug text-emerald-950">{title}</span>
                <span className="mt-1 block text-lg font-black leading-tight text-emerald-900">{price}</span>
                <span className="mt-0.5 block text-[10px] font-semibold text-slate-500">{id === "automatic" || id === "family" ? "COP / mes" : "Sin cobro automático"}</span>
                <span className="mt-2 block text-[11px] leading-relaxed text-slate-600">{description}</span>
                <span className="mt-1 block text-[10px] font-extrabold text-emerald-800">{benefit}</span>
                <span className="mt-2 text-[10px] font-bold text-slate-500">Toca para comparar</span>
              </button>
              <button type="button" aria-pressed={confirmedPlan===id}
                onClick={() => {setSelection(id);setConfirmedPlan(id);setView("Inicio");}}
                className={"mt-3 block w-full rounded-xl px-2 py-2.5 text-center text-xs font-black " +
                 (confirmedPlan===id ? "bg-[#155e50] text-white" : "border border-emerald-200 bg-emerald-50 text-emerald-900")}>
                {confirmedPlan===id ? "✓ Elegido" : id==="free"?"Elegir Gratis":"Elegir este plan"}
              </button>
            </div>)}
        </div>
      </Section>
      <section ref={previewRef} className="space-y-3 scroll-mt-20" aria-label="Tu aplicación según el plan seleccionado">
        <Eyebrow>Así queda tu SmartGuard</Eyebrow>
        <h2 className="text-[1.4rem] font-black leading-tight text-emerald-950">Una aplicación que se adapta a tu elección.</h2>
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5">
          <p className="text-sm font-black text-emerald-950">🛡️ {planName} · {visibleViews.length} secciones</p>
          <p className="mt-1 text-xs leading-relaxed text-emerald-900">{selection === "free"
            ? "Tu pantalla mostrará únicamente Inicio y Analizar para consultar enlaces manualmente."
            : selection === "trial"
              ? "Durante la prueba propuesta conocerás Inicio, Analizar, Actividad, Protección y Familia."
              : selection === "automatic"
                ? "Tendrás las cinco secciones, con protección personal. Los grupos compartidos corresponden al plan familiar."
                : "Tendrás las cinco secciones y las opciones para acompañar a tu grupo familiar."}</p>
        </div>
        <div className="overflow-hidden rounded-[1.5rem] border-4 border-[#263f45] bg-white shadow-sm">
          <div className="bg-[#123b42] px-4 py-3 text-sm font-black text-white">
            {view}
            <p className="mt-1 text-[10px] font-normal text-emerald-100">SmartGuard · {planName}</p>
          </div>
          <div className="min-h-56 space-y-3 bg-[#fafbf8] p-4">
            {view === "Inicio" ? <>
              <h3 className="text-base font-black text-emerald-950">Hola, bienvenido a SmartGuard 👋</h3>
              <NoteCard><strong>🛡️ {selection === "free" ? "Tu análisis manual está disponible." : "Tu protección comienza aquí."}</strong><span className="mt-1 block">Consulta tu estado y encuentra las herramientas que necesitas.</span></NoteCard>
              <IconCard icon="🔎" title="¿Recibiste un enlace?">Compruébalo en Analizar antes de abrirlo.</IconCard>
            </> : null}
            {view === "Analizar" ? <>
              <h3 className="text-base font-black text-emerald-950">¿Qué enlace quieres revisar?</h3>
              <div className="rounded-xl border border-emerald-100 bg-white px-3 py-4 text-xs text-slate-600">🔗 Pega aquí el enlace sospechoso</div>
              <NoteCard>🔍 SmartGuard analiza el enlace y te explica las señales de riesgo antes de visitarlo.</NoteCard>
            </> : null}
            {view === "Actividad" ? <>
              <h3 className="text-base font-black text-emerald-950">Tu actividad reciente</h3>
              <IconCard icon="🔴" title="Enlace sospechoso">Advertencia de riesgo alto · Hoy</IconCard>
              <IconCard icon="🟠" title="Enlace por verificar">Precaución recomendada · Ayer</IconCard>
            </> : null}
            {view === "Protección" ? <>
              <h3 className="text-base font-black text-emerald-950">Estado de tu protección</h3>
              <IconCard icon="🔔" title="Permisos y alertas">Consulta el acceso a notificaciones y los avisos de Android.</IconCard>
              <IconCard icon="📊" title="Indicadores del dispositivo">Revisa la información y las métricas disponibles.</IconCard>
            </> : null}
            {view === "Familia" ? <>
              <h3 className="text-base font-black text-emerald-950">Las personas que más quieres</h3>
              <VisualFlow icons={["🧑", "👩", "👵"]} captions={["Tú", "Tu pareja", "Tu abuela"]} />
              <NoteCard>{selection === "automatic"
                ? "Con Premium individual puedes conocer Familia; crear grupos para compartir antecedentes forma parte de Premium Familiar."
                : "Crea o conoce tu grupo privado y comparte antecedentes de riesgo alto únicamente con autorización."}</NoteCard>
            </> : null}
          </div>
          <nav aria-label={"Secciones disponibles en " + planName} className="grid gap-1 border-t border-emerald-100 p-2" style={{ gridTemplateColumns: "repeat(" + visibleViews.length + ", minmax(0,1fr))" }}>
            {visibleViews.map((tab) =>
              <button key={tab.name} type="button" aria-current={view === tab.name ? "page" : undefined}
                onClick={() => setView(tab.name)}
                className={"min-w-0 rounded-lg p-1.5 text-[9px] font-bold leading-snug " +
                  (view === tab.name ? "bg-emerald-100 text-emerald-950" : "text-slate-500")}>
                <span className="mb-1 block text-xl" aria-hidden="true">{VIEW_ICONS[tab.name]}</span>
                {tab.name}
              </button>)}
          </nav>
        </div>
        <p className="text-xs leading-relaxed text-slate-500">La elección muestra la navegación correspondiente al plan. Esta versión todavía no realiza cobros, activa pruebas facturables ni concede suscripciones Premium reales.</p>
      </section>
    </section> : null}

    {step === 3 ? <CommercialDetails
      selection={confirmedPlan || selection}
      onContinue={mode => { setCommercialMode(mode); setMessage(""); setStep(4); }}
    /> : null}

    {step === 4 ? <section className="space-y-5">
      <div className="rounded-[1.5rem] bg-[#123b42] p-6 text-white"><Eyebrow light>05 · Prepara tu celular</Eyebrow><h1 className="text-[1.65rem] font-black leading-tight text-white">Para ayudarte a tiempo, SmartGuard necesita algunos permisos.</h1><p className="mt-3 text-sm leading-relaxed text-emerald-50">Te explicamos para qué sirve cada uno. No necesitas activarlos para analizar un enlace manualmente.</p><div className="mt-5"><VisualFlow icons={["📱", "🔔", "🛡️"]} captions={["Tu Android", "Permites", "Te avisamos"]} /></div></div>
      <Section label="Configuración real de Android" title="Activa lo que quieras utilizar.">
        <IconCard icon="📨" title="1. Acceso a notificaciones"><p>Permite encontrar enlaces visibles en los avisos de aplicaciones compatibles.</p><p className={"mt-1 font-extrabold " + (status?.access ? "text-emerald-700" : "text-slate-600")}>{status?.access ? "✓ Concedido" : "Por configurar"}</p></IconCard>
        <IconCard icon="🔔" title="2. Mostrar avisos de SmartGuard"><p>Permite que Android presente nuestras advertencias de riesgo.</p><p className={"mt-1 font-extrabold " + (status?.notifications ? "text-emerald-700" : "text-slate-600")}>{status?.notifications ? "✓ Concedido" : "Por configurar"}</p></IconCard>
        <IconCard icon="⚙️" title="3. Protección en segundo plano"><p>Puede permanecer disponible mientras utilizas otras aplicaciones, según los ajustes y restricciones de Android.</p><p className={"mt-1 font-extrabold " + (active ? "text-emerald-700" : "text-slate-600")}>{active ? "✓ Protección activa" : "Pendiente de activar"}</p></IconCard>
        <IconCard icon="🔋" title="4. Restricciones de batería (opcional)"><p>Algunos dispositivos limitan tareas en segundo plano. Puedes revisar este ajuste sin conceder acceso a más datos.</p><p className="mt-1 font-extrabold text-slate-600">{battery?.supported === false ? "No requerido en este dispositivo" : battery?.unrestricted ? "✓ Sin restricciones" : "Opcional"}</p></IconCard>
        {commercialMode !== "free" && battery?.supported && !battery.unrestricted ? <button type="button" onClick={() => void batterySettings()} className="w-full rounded-xl border border-emerald-200 bg-white p-3 text-xs font-black text-emerald-900">Revisar ajustes de batería</button> : null}
        <IconCard icon="👥" title="5. Consentimiento familiar (independiente)">Se concede dentro de Familia cuando decidas compartir antecedentes de dominios de alto riesgo.</IconCard>
        <NoteCard>SmartGuard no necesita ser tu aplicación predeterminada de SMS. El permiso para leer notificaciones no autoriza compartir información con otras personas.</NoteCard>
        {commercialMode === "free" ? (
          <label className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-white p-4">
            <input type="checkbox" className="mt-1 size-5 shrink-0 accent-emerald-700" checked={manualAcknowledged} onChange={e => setManualAcknowledged(e.target.checked)}/>
            <span className="text-xs leading-relaxed text-emerald-950"><strong>Continuar con análisis manual.</strong> Entiendo que Gratis no incluye protección automática ni historial Premium.</span>
          </label>
        ) : null}
        {commercialMode !== "free" && !active ? <NoteCard tone="warm"><strong>Permisos insuficientes.</strong> Para finalizar con protección automática Android debe confirmar acceso a notificaciones, avisos y servicio activado. Los ajustes de batería siguen siendo opcionales. Puedes regresar y elegir Gratis.</NoteCard> : null}
        {commercialMode !== "free" ? <label className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><input type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); saveNotificationConsent(window.localStorage, event.target.checked); }} className="mt-1 size-5 shrink-0 accent-emerald-700" /><span className="text-xs leading-relaxed text-emerald-950"><strong>Quiero habilitar la protección automática.</strong><span className="block">Autorizo el uso de notificaciones visibles de aplicaciones compatibles. Puedo revocarlo desde Android.</span></span></label> : null}
        {commercialMode !== "free" && active ? <NoteCard><strong>✓ Tu protección automática está activada.</strong><span className="block">Los permisos necesarios ya están concedidos; no tienes que volver a configurarlos.</span></NoteCard> : commercialMode==="free" ? <NoteCard>El análisis manual de Gratis no requiere permisos. Puedes continuar al resumen después de marcar tu conformidad.</NoteCard> :
          <button type="button" onClick={() => void activate()} disabled={!consent || busy} className="w-full rounded-xl bg-[#155e50] p-3.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Abriendo ajustes…" : "Activar y comprobar protección"}</button>}
        <DemoNotice title="Así puede verse una advertencia">⚠️ Riesgo alto · SmartGuard te informa antes de abrir una página sospechosa.</DemoNotice>
        {commercialMode !== "free" ? <button type="button" disabled={!status?.notifications || demoBusy} onClick={() => void sendExample()} className="w-full rounded-xl border border-emerald-300 bg-white p-3 text-xs font-black text-emerald-900 disabled:cursor-not-allowed disabled:opacity-40"><BellRing className="mr-2 inline size-4" />{demoBusy ? "Enviando…" : "Mostrar una notificación real de prueba"}</button> : null}
        {message ? <p role="status" className="rounded-xl border border-emerald-100 bg-white p-3 text-xs leading-relaxed text-slate-700">{message}</p> : null}
      </Section>
    </section> : null}

    {step === 5 ? <section className="space-y-5">
      <div className="rounded-[1.5rem] border border-emerald-200 bg-[#e2f6e8] p-6 text-center"><p className="text-5xl">🛡️✨</p><Eyebrow>06 · Todo comienza aquí</Eyebrow><h1 className="text-[1.75rem] font-black leading-tight text-emerald-950">¡Ya conoces SmartGuard!</h1><p className="mt-3 text-sm leading-relaxed text-emerald-900">Ahora sabes cómo reconocer enlaces sospechosos y cómo la protección puede acompañarte a ti y a quienes más quieres.</p></div>
      <Section label="Tu configuración" title="Así quedaría tu SmartGuard.">
        <div className="space-y-2 rounded-2xl border border-emerald-100 bg-white p-4">
          <IconCard icon="💳" title={"Plan elegido: " + planName}>{commercialMode === "pending"
            ? "Prueba de 15 días iniciada en Firebase mientras la transferencia se verifica manualmente. Premium pagado todavía no está confirmado."
            : commercialMode === "trial" ? "La prueba fue confirmada por Firebase al avanzar desde los detalles."
            : commercialMode === "active" ? "Tu suscripción Premium vigente fue validada por Firebase al configurar este dispositivo."
            : "Análisis manual gratuito. No se generó ningún cobro ni suscripción."}</IconCard>
          <IconCard icon="🔎" title="Análisis manual">Disponible para comenzar.</IconCard>
          <IconCard icon="🔔" title={active ? "Protección automática activa" : "Protección automática pendiente"}>{active ? "Android confirmó el acceso a las notificaciones y los avisos." : "Puedes activarla después desde Inicio → Configuración."}</IconCard>
          <IconCard icon="👥" title="Tu grupo familiar">La creación y las invitaciones reales se gestionan desde la pestaña Familia cuando tu plan lo permita.</IconCard>
        </div>
      </Section>
      <Section label="Una vista previa de tu inicio" title="Todo listo para comenzar.">
        <div className="overflow-hidden rounded-2xl border-4 border-[#29454a] bg-white">
          <div className="bg-[#123b42] px-4 py-3 text-sm font-black text-white">SmartGuard · Inicio</div>
          <div className="space-y-3 p-4"><NoteCard><strong>🛡️ {active ? "Protección automática disponible" : "Análisis manual disponible"}</strong><p className="mt-1">Revisa un enlace cuando tengas dudas.</p></NoteCard><IconCard icon="🔎" title="¿Tienes un enlace?">Analízalo antes de abrirlo.</IconCard><IconCard icon="🔔" title="Tu configuración">Consulta el estado real de tus permisos de Android.</IconCard></div>
        </div>
      </Section>
      <NoteCard><strong>💚 Un paso importante.</strong> La próxima vez que tengas dudas, recuerda que puedes revisar un enlace antes de visitarlo.</NoteCard>
    </section> : null}

    <nav aria-label="Navegación del recorrido" className="flex items-center justify-between gap-3 border-t border-emerald-100 pt-5">
      <button type="button" onClick={() => changeStep(step - 1)} disabled={step === 0} className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 py-3 text-xs font-black text-emerald-900 disabled:invisible"><ArrowLeft className="size-4" />Anterior</button>
      <span className="text-[11px] font-extrabold text-slate-500">{step + 1} de 6</span>
      {step === 5 ? <button type="button" onClick={() => onComplete("home")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#155e50] px-4 py-3 text-xs font-black text-white">Entrar a SmartGuard <CheckCircle2 className="size-4" /></button> :
        step === 3 ? <span className="max-w-40 text-right text-xs font-semibold text-emerald-800">Confirma tu plan usando el botón de esta pantalla.</span> :
        <button type="button" disabled={(step === 4 && !enoughPermissions) || (step===2 && selection!=="free" && confirmedPlan!==selection)}
          onClick={() => {
            if(step===2 && selection==="free") setConfirmedPlan("free");
            else if(step===2 && confirmedPlan!==selection) return;
            changeStep(step + 1);
          }}
          className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-[#155e50] px-4 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
          {step === 2 ? (selection === "free" ? "Continuar con Gratis" : selection === "trial" ? "Revisar prueba de 15 días" : selection === "automatic" ? "Revisar plan individual" : "Revisar plan familiar") : step === 4 ? "Continuar al resumen" : "Siguiente"}
          <ArrowRight className="size-4" />
        </button>}
    </nav>
  </div>;
}
