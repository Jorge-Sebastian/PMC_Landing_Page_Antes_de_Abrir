import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft, ArrowRight, BellRing, Check, CheckCircle2,
  Clock3, Cloud, CreditCard, HeartHandshake, History,
  House, Link2, ScanSearch, Settings2, ShieldAlert,
  ShieldCheck, Smartphone, UsersRound,
  type LucideIcon,
} from "lucide-react";
import { formatMonthlyPriceCOP, PRICING_PLANS } from "@/pages/home/pricing-model";
import { Protection, type ProtectionStatus } from "./native";
import { hasNotificationConsent, saveNotificationConsent } from "./onboarding-state";

type Destination = "home" | "analyze";
type Selection = "none" | "free" | "trial" | "automatic" | "family";
type PaidSelection = "automatic" | "family";

const STEPS = [
  "Bienvenida", "Funciones", "Planes y precios", "Secciones",
  "Tu familia", "Permisos", "Comenzar",
] as const;
const automatic = PRICING_PLANS.find((p) => p.id === "automatic")!;
const family = PRICING_PLANS.find((p) => p.id === "family")!;

function ExplanationCard({ Icon, title, children, tone = "normal" }: {
  Icon: LucideIcon; title: string; children: React.ReactNode;
  tone?: "normal" | "mint";
}) {
  return (
    <div className={"rounded-2xl border p-4 " +
      (tone === "mint" ? "border-teal-200 bg-teal-50" : "border-slate-200 bg-white")}>
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-white text-teal-800 shadow-sm">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <h3 className="font-black text-slate-900">{title}</h3>
      <div className="mt-1 text-sm leading-relaxed text-slate-700">{children}</div>
    </div>
  );
}

function Question({ eyebrow, title, children }: {
  eyebrow: string; title: string; children?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-teal-800">{eyebrow}</p>
      <h1 className="text-[1.7rem] font-black leading-tight text-slate-900 sm:text-3xl">{title}</h1>
      {children ? <div className="text-sm leading-relaxed text-slate-600">{children}</div> : null}
    </div>
  );
}

function ExampleMessage() {
  return (
    <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Ejemplo ilustrativo de mensaje sospechoso">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">EJEMPLO · MENSAJE RECIBIDO</span>
        <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">Ficticio</span>
      </div>
      <div className="ml-auto max-w-[92%] rounded-2xl rounded-br-sm bg-[#DFF3EA] p-4">
        <p className="text-xs font-bold text-slate-700">Mensaje para Tía Sandra</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-900">
          ¡Atención! Tienes un paquete retenido. Confirma tus datos ahora en
          <span className="block break-all font-bold text-[#14676D]">paquete-ejemplo.test/confirmar</span>
        </p>
      </div>
      <p className="text-sm text-slate-600">
        ¿Es una entrega real o alguien está intentando engañarla? No hace falta que Sandra lo averigüe sola.
      </p>
      <div className="flex gap-3 rounded-2xl bg-rose-50 p-3">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-rose-700" />
        <div>
          <p className="text-sm font-black text-rose-950">Ejemplo de alerta de riesgo</p>
          <p className="mt-1 text-xs leading-relaxed text-rose-900">
            SmartGuard puede advertir cuando encuentra señales sospechosas, sin abrir ese enlace por ti.
            Ninguna clasificación es infalible.
          </p>
        </div>
      </div>
    </div>
  );
}

function SampleNotification() {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-[#E7EEF1] p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-bold text-slate-700">
        <span>ASÍ PODRÍA VERSE EN ANDROID</span>
        <span>Ejemplo visual</span>
      </div>
      <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#103640]">
            <ShieldCheck className="size-6 text-teal-200" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black text-slate-900">SmartGuard · Riesgo detectado</p>
            <p className="mt-1 text-xs text-slate-500">Enlace visible en notificación compatible</p>
            <p className="mt-2 text-sm text-slate-700">
              Se detectaron señales de posible suplantación. Evita abrir el enlace y revisa la explicación.
            </p>
          </div>
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-800">
          <ShieldAlert className="size-3.5" /> Riesgo alto · Ejemplo
        </div>
      </div>
      <p className="px-2 pt-3 text-xs text-slate-600">
        El aviso real depende de los permisos de Android, el contenido visible y el resultado del análisis.
      </p>
    </div>
  );
}

function StepLine({ number, title, children }: {
  number: number; title: string; children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#103640] text-sm font-black text-white">{number}</div>
      <div>
        <h3 className="font-black text-slate-900">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{children}</p>
      </div>
    </div>
  );
}

function PermissionRow({ Icon, title, active, description, caution }: {
  Icon: LucideIcon; title: string; active: boolean | null;
  description: string; caution: string;
}) {
  return (
    <div className={"rounded-2xl border p-4 " +
      (active ? "border-teal-200 bg-teal-50" : "border-slate-200 bg-white")}>
      <div className="flex items-center gap-3">
        <Icon className="size-5 shrink-0 text-teal-800" />
        <div className="min-w-0 flex-1">
          <p className="font-black text-slate-900">{title}</p>
          <p className="mt-1 text-xs text-slate-600">{description}</p>
        </div>
        <span className={"shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold " +
          (active ? "bg-teal-100 text-teal-900" : "bg-slate-100 text-slate-600")}>
          {active === null ? "Por verificar" : active ? "Concedido ✓" : "Pendiente"}
        </span>
      </div>
      <p className="mt-3 border-t border-slate-200/70 pt-3 text-xs leading-relaxed text-slate-600">{caution}</p>
    </div>
  );
}

export function MobileOnboarding({ onComplete }: {
  onComplete: (destination: Destination) => void;
}) {
  const [step, setStep] = useState(0);
  const [selection, setSelection] = useState<Selection>("none");
  const [navigationPreview, setNavigationPreview] = useState<"free" | "full">("full");
  const [receipt, setReceipt] = useState<PaidSelection | null>(null);
  const [status, setStatus] = useState<ProtectionStatus | null>(null);
  const [battery, setBattery] = useState<{supported:boolean;unrestricted:boolean} | null>(null);
  const [consent, setConsent] = useState(() => hasNotificationConsent(window.localStorage));
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [message, setMessage] = useState("");
  const active = Boolean(status?.enabled && status.access && status.notifications);
  const tabNames = [
    {name:"Inicio", Icon:House, extra:false, text:"Tu estado, tu plan y tus ajustes."},
    {name:"Analizar", Icon:ScanSearch, extra:false, text:"Pega enlaces sin pagar."},
    {name:"Actividad", Icon:History, extra:true, text:"Historial de análisis guardados."},
    {name:"Protección", Icon:ShieldCheck, extra:true, text:"Métricas y actividad del dispositivo."},
    {name:"Familia", Icon:UsersRound, extra:true, text:"Grupo e historial de riesgos compartidos."},
  ];

  const refresh = useCallback(async () => {
    const results = await Promise.allSettled([
      Protection.status(),
      Protection.batteryOptimizationStatus(),
    ]);
    if (results[0].status === "fulfilled") setStatus(results[0].value);
    if (results[1].status === "fulfilled") setBattery(results[1].value);
  }, []);

  useEffect(() => {
    void refresh();
    const onReturn = () => { if (!document.hidden) void refresh(); };
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [refresh]);

  const activate = async () => {
    if (active) return;
    if (!consent) {
      setMessage("Primero marca la autorización. La detección automática es opcional y puedes seguir sin ella.");
      return;
    }
    setBusy(true); setMessage("");
    try {
      await Protection.activate();
      await refresh();
      setMessage("Regresa desde Ajustes a SmartGuard. Comprobaremos los permisos y el botón se marcará como completado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No pudimos abrir los ajustes. Puedes continuar con el analizador manual.");
    } finally { setBusy(false); }
  };
  const openBattery = async () => {
    try { await Protection.batterySettings(); setMessage("Ajusta la batería solo si lo consideras necesario. Al regresar comprobaremos el estado."); }
    catch { setMessage("No se pudieron abrir los ajustes de batería en este teléfono."); }
  };
  const sendExample = async () => {
    if (!status?.notifications) {
      setMessage("Permite que SmartGuard muestre notificaciones para recibir un aviso de prueba.");
      return;
    }
    setDemoBusy(true); setMessage("");
    try {
      await Protection.testBanner({level:"riesgo"});
      setMessage("Enviamos un aviso de demostración. No analizamos ningún enlace real y no se compartió con tu familia.");
    } catch { setMessage("Este teléfono no pudo mostrar el aviso de prueba. Usa el ejemplo visual de arriba."); }
    finally { setDemoBusy(false); }
  };
  const next = () => { setMessage(""); setStep((n) => Math.min(STEPS.length-1,n+1)); };
  const back = () => { setMessage(""); setStep((n) => Math.max(0,n-1)); };
  const selectTrial = () => {setSelection("trial");setReceipt(null);setNavigationPreview("full");};
  const selectFree = () => {setSelection("free");setReceipt(null);setNavigationPreview("free");};
  const simulatePayment = (plan: PaidSelection) => {
    setSelection(plan);setReceipt(plan);setNavigationPreview("full");
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 pb-12 pt-7">
      <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-500">
        <span>{step+1} / {STEPS.length} · {STEPS[step]}</span>
        <span>{Math.round((step+1)/STEPS.length*100)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar"
        aria-label="Progreso de bienvenida" aria-valuemin={0} aria-valuemax={STEPS.length} aria-valuenow={step+1}>
        <div className="h-full rounded-full bg-teal-600 transition-all" style={{width:((step+1)/STEPS.length*100)+"%"}} />
      </div>

      {step===0 ? (
        <section className="space-y-5">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#103640] p-7 text-white shadow-xl">
            <div className="absolute -right-10 -top-12 size-48 rounded-full bg-teal-300/10 blur-2xl" aria-hidden="true" />
            <span className="inline-flex items-center gap-2 rounded-full bg-teal-300/15 px-3 py-2 text-xs font-bold text-teal-100">
              <HeartHandshake className="size-4" /> Bienvenido a SmartGuard Family
            </span>
            <p className="mt-6 text-xs font-bold uppercase tracking-[.15em] text-teal-200">UNA DUDA QUE TODOS HEMOS TENIDO</p>
            <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">¿A tu mamá, tu abuela o tu tía les ha llegado un enlace extraño?</h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-200">
              Un mensaje habla de un paquete, una cuenta bloqueada o un premio. Parece urgente.
              ¿Cómo sabe tu familia si es real? No debería tener que decidir a ciegas.
            </p>
          </div>
          <ExampleMessage />
          <ExplanationCard Icon={ShieldCheck} title="Para eso creamos SmartGuard Family" tone="mint">
            Revisamos enlaces sospechosos y explicamos las señales de riesgo. Con tu autorización,
            tu grupo familiar puede reconocer dominios peligrosos que ya aparecieron antes.
            <strong> La idea es cuidarse entre todos, no abrir primero para descubrir si era una trampa.</strong>
          </ExplanationCard>
          <div className="rounded-2xl border bg-white p-4">
            <p className="text-sm font-black text-slate-900">¿Por qué confiar en la información?</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              SmartGuard combina señales técnicas de enlaces, dominios y redirecciones cuando las comprobaciones están disponibles.
              Te mostramos razones y niveles de precaución en lugar de prometer seguridad absoluta.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Somos un producto piloto de protección frente a enlaces sospechosos; no estamos afiliados a bancos ni reemplazamos sus canales oficiales.
            </p>
          </div>
        </section>
      ) : null}

      {step===1 ? (
        <section className="space-y-5">
          <Question eyebrow="DESCUBRE LO QUE PUEDES HACER" title="¿Cómo te ayuda SmartGuard en tu vida diaria?">
            Hay funciones para consultar un enlace cuando quieras y otras para recibir ayuda sin tener que copiarlo.
          </Question>
          <ExplanationCard Icon={Link2} title="1 · Analizar enlaces manualmente">
            ¿Te llegó un mensaje extraño? Copia el enlace, abre la pestaña <strong>Analizar</strong>, pégalo y consulta las señales de riesgo.
            <strong> Esta función es gratuita.</strong>
          </ExplanationCard>
          <ExplanationCard Icon={BellRing} title="2 · Detectar enlaces en notificaciones" tone="mint">
            Si das permiso, SmartGuard revisa enlaces visibles en notificaciones de aplicaciones compatibles y te muestra un aviso de riesgo.
            <strong> No hace falta abrir primero el enlace sospechoso.</strong>
          </ExplanationCard>
          <SampleNotification />
          <ExplanationCard Icon={UsersRound} title="3 · Protegerse en familia">
            Crea o únete a un grupo mediante invitación. Si autorizas compartir tus resultados de riesgo alto,
            el grupo podrá consultar dominios peligrosos ya registrados y reconocer coincidencias.
          </ExplanationCard>
          <div className="grid grid-cols-2 gap-3">
            <ExplanationCard Icon={History} title="Actividad">Revisa análisis que el dispositivo haya guardado.</ExplanationCard>
            <ExplanationCard Icon={ShieldCheck} title="Protección">Consulta cuántos enlaces se procesaron y las métricas disponibles.</ExplanationCard>
          </div>
          <p className="rounded-2xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
            Los avisos dependen de lo que Android permita ver, de los permisos y de las señales detectadas.
            Una alerta no demuestra por sí sola que un sitio sea malicioso.
          </p>
        </section>
      ) : null}

      {step===2 ? (
        <section className="space-y-4">
          <Question eyebrow="PLANES SIN SORPRESAS" title="¿Cuánto cuesta y qué incluye cada plan?">
            Puedes seguir analizando enlaces sin pagar. La protección automática y las funciones familiares forman parte de la propuesta Premium.
          </Question>
          <div className="rounded-2xl border bg-white p-4">
            <div className="flex justify-between gap-2">
              <p className="font-black">Gratis para siempre</p><p className="text-xl font-black">$0</p>
            </div>
            <p className="mt-2 text-sm text-slate-600">Inicio y análisis manual de enlaces. No necesitas tarjeta ni registro.</p>
            <button type="button" onClick={selectFree}
              className={"mt-4 w-full rounded-xl border px-4 py-3 text-sm font-bold " + (selection==="free"?"border-teal-700 bg-teal-50 text-teal-900":"border-slate-300")}>
              {selection==="free"?"✓ Opción gratuita seleccionada":"Quiero continuar gratis"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[automatic,family].map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4">
                <p className="text-xs font-black uppercase text-teal-800">{plan.id==="family"?"Premium familiar":"Premium individual"}</p>
                <p className="mt-2 text-2xl font-black">{formatMonthlyPriceCOP(plan.monthlyCOP)}</p>
                <p className="text-xs text-slate-600">COP/mes · precio propuesto</p>
                <p className="mt-3 text-sm text-slate-700">{plan.id==="family"?"Un titular y hasta 20 integrantes en la propuesta.":"Protección automática para una persona."}</p>
                <button type="button" onClick={() => simulatePayment(plan.id as PaidSelection)}
                  className="mt-4 w-full rounded-xl bg-[#103640] px-3 py-3 text-xs font-bold text-white">
                  <CreditCard className="mr-1 inline size-4" /> Simular pago
                </button>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-teal-200 bg-white p-4">
            <div className="flex gap-3">
              <Clock3 className="size-6 shrink-0 text-teal-800" />
              <div>
                <p className="font-black">¿Quieres probar todas las funciones durante 15 días?</p>
                <p className="mt-2 text-sm text-slate-600">
                  Es la experiencia de prueba propuesta para SmartGuard. Puedes explorar cómo sería, sin poner una tarjeta.
                </p>
              </div>
            </div>
            <button type="button" onClick={selectTrial}
              className={"mt-4 w-full rounded-xl px-4 py-3 text-sm font-bold " + (selection==="trial"?"bg-teal-100 text-teal-900":"bg-teal-700 text-white")}>
              {selection==="trial"?"✓ Prueba visual seleccionada":"Explorar prueba de 15 días"}
            </button>
          </div>
          {receipt ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4" role="status">
              <p className="flex items-center gap-2 font-black text-amber-950"><CheckCircle2 className="size-5" /> Pago de demostración completado</p>
              <p className="mt-2 text-sm text-amber-900">
                Elegiste {receipt==="family"?"Premium familiar":"Premium individual"}.
                Esto es una <strong>simulación: no se efectuó un cobro ni se activó una suscripción real</strong>.
              </p>
            </div>
          ) : null}
          {selection==="trial" ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              La prueba de 15 días todavía no tiene un contador real en esta APK. Esta opción permite conocer el recorrido, no iniciar un periodo facturable.
            </p>
          ) : null}
          <p className="text-xs leading-relaxed text-slate-500">
            No se cobra nada automáticamente al finalizar una prueba en esta versión. Para un cobro real se necesitará un proceso de contratación y una confirmación explícita.
          </p>
        </section>
      ) : null}

      {step===3 ? (
        <section className="space-y-5">
          <Question eyebrow="TODO EN SU LUGAR" title="¿Dónde encuentro cada función?">
            Es una sola aplicación. En la parte inferior aparecen las secciones disponibles según el tipo de acceso.
          </Question>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-200 p-1">
            <button type="button" onClick={() => setNavigationPreview("free")}
              aria-pressed={navigationPreview==="free"}
              className={"rounded-xl p-3 text-sm font-bold " + (navigationPreview==="free"?"bg-white text-slate-900 shadow-sm":"text-slate-600")}>
              Vista gratuita
            </button>
            <button type="button" onClick={() => setNavigationPreview("full")}
              aria-pressed={navigationPreview==="full"}
              className={"rounded-xl p-3 text-sm font-bold " + (navigationPreview==="full"?"bg-white text-slate-900 shadow-sm":"text-slate-600")}>
              Prueba / Premium
            </button>
          </div>
          <div className="space-y-3">
            {tabNames.filter((t) => navigationPreview==="full"||!t.extra).map(({name,Icon,text}) => (
              <div key={name} className="flex items-center gap-3 rounded-2xl border bg-white p-4">
                <div className="flex size-10 items-center justify-center rounded-xl bg-teal-50">
                  <Icon className="size-5 text-teal-800" />
                </div>
                <div><p className="font-black text-slate-900">{name}</p><p className="mt-1 text-xs text-slate-600">{text}</p></div>
              </div>
            ))}
          </div>
          {navigationPreview==="free" ? (
            <p className="rounded-xl bg-teal-50 p-4 text-sm text-teal-900">
              Con Gratis puedes analizar manualmente siempre. Si después decides contratar, podrás acceder a más herramientas sin cambiar de aplicación.
            </p>
          ) : (
            <p className="rounded-xl bg-teal-50 p-4 text-sm text-teal-900">
              Con Prueba o Premium, la propuesta incluye las cinco secciones. La protección familiar permite acompañar a quienes reciben enlaces sospechosos.
            </p>
          )}
          <p className="text-xs text-slate-500">
            Esta comparación es una vista de demostración. El bloqueo real por suscripción todavía no está habilitado en la Beta.
          </p>
        </section>
      ) : null}

      {step===4 ? (
        <section className="space-y-4">
          <Question eyebrow="EL CORAZÓN DE SMARTGUARD" title="¿Cómo nos cuidamos entre familiares?">
            Cuando a Tía Sandra le llega un enlace peligroso, su familia puede tener una señal más para estar alerta.
            No se trata de vigilar conversaciones, sino de compartir información limitada y útil.
          </Question>
          <StepLine number={1} title="Llega un enlace">
            Android muestra una notificación compatible con un enlace visible, o alguien pega un enlace para analizarlo manualmente.
          </StepLine>
          <StepLine number={2} title="SmartGuard lo revisa">
            El análisis busca señales de riesgo. No hace falta abrir el enlace ni visitarlo para hacer la comprobación.
          </StepLine>
          <StepLine number={3} title="¿Salió rojo y autorizaste compartir?">
            Únicamente con tu permiso, se guarda en el historial privado de tu familia el dominio registrable, la fecha, el origen y quién lo reportó.
          </StepLine>
          <StepLine number={4} title="Tu familia puede reconocerlo">
            Cuando otro familiar recibe o analiza un dominio coincidente o parecido, SmartGuard puede mostrar ese antecedente como contexto.
            Una coincidencia no convierte automáticamente un enlace en malicioso.
          </StepLine>
          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
            <p className="flex gap-2 font-black text-teal-950"><Cloud className="size-5 shrink-0"/> ¿Qué se guarda en la nube?</p>
            <p className="mt-2 text-sm leading-relaxed text-teal-950">
              Solo los datos limitados de riesgos rojos que autorizas a compartir con tu grupo.
              <strong> No publicamos la conversación completa, ni la URL completa, ni almacenamos si abriste o hiciste clic en el enlace.</strong>
            </p>
            <p className="mt-3 text-xs text-teal-800">
              Los miembros del grupo requieren una invitación; los datos se consultan con autenticación y permisos. Evita compartir el código con personas ajenas.
            </p>
          </div>
          <p className="rounded-xl border bg-white p-4 text-sm text-slate-600">
            Puedes revocar el consentimiento familiar desde la sección Familia. El permiso para leer notificaciones y el permiso para compartir resultados familiares son independientes.
          </p>
        </section>
      ) : null}

      {step===5 ? (
        <section className="space-y-4">
          <Question eyebrow="CONFIGURACIÓN EXPLICADA SIN COMPLICACIONES" title="¿Qué permisos necesita SmartGuard y para qué sirven?">
            No tienes que concederlos para analizar un enlace manualmente. Si quieres avisos automáticos, sí debemos pedirle a Android que nos deje detectar y mostrar enlaces visibles en notificaciones compatibles.
          </Question>
          <SampleNotification />
          <button type="button" onClick={() => void sendExample()}
            disabled={!status?.notifications||demoBusy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#103640] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600">
            <BellRing className="size-4" />
            {demoBusy?"Mostrando ejemplo…":"Mostrar una notificación real de prueba"}
          </button>
          {!status?.notifications ? <p className="text-xs text-slate-600">Cuando permitas mostrar alertas, podrás enviar una notificación de prueba. La tarjeta anterior siempre es solo ilustrativa.</p> : null}
          <div className="space-y-3">
            <PermissionRow Icon={ScanSearch} title="1. Leer notificaciones compatibles" active={status?.access??null}
              description="Para encontrar enlaces visibles en avisos de SMS, WhatsApp u otras apps compatibles."
              caution="¿Qué NO significa? No convierte a SmartGuard en tu app de SMS ni le permite entrar a todos tus chats. Android sí puede mostrar contenido de notificaciones: por eso debes conceder este acceso conscientemente." />
            <PermissionRow Icon={BellRing} title="2. Mostrar notificaciones de SmartGuard" active={status?.notifications??null}
              description="Para mostrarte las advertencias de riesgo en tu teléfono."
              caution="¿Qué NO hace? No envía mensajes a otras personas ni publica tus resultados familiares por sí solo." />
            <PermissionRow Icon={Smartphone} title="3. Funcionamiento en segundo plano" active={active}
              description="El servicio puede detectar notificaciones compatibles mientras usas otras apps, siempre que esté habilitado."
              caution="¿Por qué? Para no obligarte a abrir SmartGuard cada vez. Android puede suspender servicios por batería; ningún teléfono garantiza detección permanente." />
            <PermissionRow Icon={Settings2} title="4. Restricciones de batería (opcional)"
              active={battery?.supported===false ? true : battery?.supported ? battery.unrestricted : null}
              description="En algunos teléfonos, quitar restricciones ayuda a mantener el servicio funcionando."
              caution="No es un permiso para leer más datos ni es obligatorio. El fabricante puede limitar tareas en segundo plano incluso si cambias este ajuste." />
          </div>
          {battery?.supported && !battery.unrestricted ? (
            <button type="button" onClick={() => void openBattery()}
              className="w-full rounded-xl border border-teal-300 bg-white px-4 py-3 text-sm font-bold text-teal-900">
              Revisar ajustes de batería (opcional)
            </button>
          ) : null}
          <div className="rounded-2xl border bg-white p-4">
            <p className="font-black text-slate-900">¿Debes poner SmartGuard como aplicación predeterminada de SMS?</p>
            <p className="mt-2 text-sm text-slate-600">No. SmartGuard no necesita reemplazar tu app de mensajes para analizar enlaces visibles en las notificaciones compatibles.</p>
          </div>
          <label className="flex items-start gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm leading-relaxed text-teal-950">
            <input type="checkbox" checked={consent} className="mt-1 size-5 shrink-0 accent-teal-700"
              onChange={(event) => {setConsent(event.target.checked);saveNotificationConsent(window.localStorage,event.target.checked);}} />
            <span><strong>Quiero activar la protección automática.</strong> Autorizo que SmartGuard revise enlaces visibles en las notificaciones de aplicaciones compatibles. Puedo retirar este permiso desde Android.</span>
          </label>
          {active ? (
            <div className="flex items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-4" role="status">
              <CheckCircle2 className="size-7 shrink-0 text-teal-700" />
              <div><p className="font-black text-teal-950">Protección automática activada</p>
                <p className="mt-1 text-xs text-teal-800">Los permisos necesarios ya están concedidos. No tienes que volver a configurarlos.</p></div>
            </div>
          ) : (
            <button type="button" disabled={!consent||busy} onClick={() => void activate()}
              className="w-full rounded-xl bg-teal-800 px-4 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
              {busy?"Comprobando Android…":"Activar y comprobar protección"}
            </button>
          )}
          <p className="text-xs leading-relaxed text-slate-600">
            Si aceptas en Ajustes, vuelve a SmartGuard: los indicadores se actualizarán y los permisos concedidos aparecerán en verde.
            Si prefieres no activarlos, continúa y utiliza el análisis manual.
          </p>
          {message ? <p role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">{message}</p> : null}
        </section>
      ) : null}

      {step===6 ? (
        <section className="space-y-5">
          <div className="rounded-[2rem] bg-[#103640] p-7 text-white">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-teal-300/15">
              {active?<ShieldCheck className="size-8 text-teal-200"/>:<ShieldAlert className="size-8 text-amber-200"/>}
            </div>
            <p className="mt-6 text-xs font-bold uppercase tracking-wider text-teal-200">TU SMARTGUARD ESTÁ LISTO</p>
            <h1 className="mt-2 text-3xl font-black">{active?"Tu protección automática está activada":"Puedes comenzar con el análisis manual"}</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">
              {active
                ?"Android concedió los permisos y el servicio está habilitado. Recuerda que la recepción de alertas depende de las notificaciones compatibles."
                :"No hace falta activar notificaciones para consultar manualmente enlaces. Si después quieres detección automática, vuelve a Inicio → Configuración."}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-black text-slate-900">¿Qué opción elegiste para conocer los planes?</p>
            <p className="mt-2 text-sm text-slate-600">
              {selection==="free"?"Continuar gratis con Inicio y Analizar.":
                selection==="trial"?"Explorar cómo sería la prueba de 15 días completos.":
                selection==="automatic"?"Simulación de compra: Premium individual.":
                selection==="family"?"Simulación de compra: Premium familiar.":
                "Todavía no elegiste una opción. Puedes continuar gratis."}
            </p>
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
              La Beta actual aún no activa ni cobra planes ni inicia un contador real de 15 días.
              Las pantallas comerciales son una demostración, no una suscripción.
            </p>
          </div>
          <ExplanationCard Icon={HeartHandshake} title="¿Qué nos gustaría que recuerdes?" tone="mint">
            SmartGuard te permite tomar decisiones con más contexto y ayudar a tu familia a reconocer enlaces de riesgo.
            Si compartes información familiar, lo haces solo con tu autorización.
          </ExplanationCard>
        </section>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-5">
        <button type="button" disabled={step===0} onClick={back}
          className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 disabled:opacity-0">
          <ArrowLeft className="size-4" /> Atrás
        </button>
        <div className="flex flex-wrap justify-end gap-2">
          {step===0 ? (
            <button type="button" onClick={() => onComplete("analyze")}
              className="rounded-xl border border-slate-300 px-3 py-3 text-sm font-bold text-slate-700">
              Solo quiero analizar
            </button>
          ) : null}
          {step===STEPS.length-1 ? (
            <button type="button" onClick={() => onComplete("home")}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-800 px-5 py-3 font-black text-white">
              Entrar a SmartGuard <Check className="size-4"/>
            </button>
          ) : (
            <button type="button" onClick={next}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-800 px-5 py-3 font-black text-white">
              Siguiente <ArrowRight className="size-4"/>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
