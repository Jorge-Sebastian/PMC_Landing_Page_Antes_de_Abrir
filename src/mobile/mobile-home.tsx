import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, ArrowRight, BellRing, Check, CheckCircle2, ChevronDown,
  FlaskConical, HeartHandshake, History, House, LockKeyhole,
  ScanSearch, Settings2, Shield, ShieldCheck, UsersRound,
  type LucideIcon,
} from "lucide-react";
import { formatMonthlyPriceCOP, PRICING_PLANS } from "@/pages/home/pricing-model";
import { ProtectionPanel } from "./protection-panel";
import { CommercialRedemption } from "./commercial-redemption";
import { COMMERCIAL_ENABLED, type CommercialAccess } from "./commercial-client";
import { confirmedPremium, confirmedFamily } from "./commercial-policy";
import {
  PREVIEW_SCENARIOS, scenarioTitle, visibleTabs,
  type AccessScenario, type MobileTab,
} from "./access-navigation";
import type { ProtectionStatus } from "./native";

const DETAILS: Record<MobileTab, { title:string; body:string; Icon:LucideIcon }> = {
  home: {title:"Inicio", body:"Estado y cuenta", Icon:House},
  analyze: {title:"Analizar", body:"Consulta manual", Icon:ScanSearch},
  activity: {title:"Actividad", body:"Historial de enlaces", Icon:History},
  protection: {title:"Protección", body:"Métricas y estadísticas", Icon:ShieldCheck},
  family: {title:"Familia", body:"Riesgos compartidos", Icon:UsersRound},
};
const paid=PRICING_PLANS.filter((p)=>p.id!=="free");

export function MobileHome({
  scenario, status, onOpenTab, onChooseScenario, onRepeatGuide, openSettingsRequest, commercialAccess, availableTabs,
}: {
  scenario:AccessScenario;
  status:ProtectionStatus | null;
  onOpenTab:(tab:MobileTab)=>void;
  onChooseScenario:(scenario:AccessScenario)=>void;
  onRepeatGuide:()=>void;
  openSettingsRequest:number;
  commercialAccess?:CommercialAccess|null;
  availableTabs?:readonly MobileTab[];
}) {
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [experimentsOpen,setExperimentsOpen]=useState(false);
  const [plansOpen,setPlansOpen]=useState(false);
  const preview=scenario!=="real";
  const fullAccess=preview ? (scenario==="trial"||scenario==="premium") : !COMMERCIAL_ENABLED || confirmedPremium(commercialAccess||null);
  const active=Boolean(status?.enabled&&status.access&&status.notifications);
  const tabs=availableTabs || visibleTabs(scenario);
  useEffect(()=>{if(openSettingsRequest>0)setSettingsOpen(true);},[openSettingsRequest]);

  return (
    <div className="section-shell mx-auto max-w-4xl space-y-6 pb-12 pt-7">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#103640] p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-teal-300/10 blur-2xl" aria-hidden="true"/>
        <div className="relative">
          <p className="text-xs font-black uppercase tracking-[.16em] text-teal-200">TU SMARTGUARD</p>
          <div className="mt-4 flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              {!preview&&active?<ShieldCheck className="size-8 text-teal-200"/>:<Shield className="size-8 text-teal-200"/>}
            </div>
            <div>
              <h1 className="text-3xl font-black leading-tight">
                {preview ? scenario==="expired" ? "La prueba terminó" : fullAccess ? "Protección Premium" : "Acceso gratuito" :
                 active ? "Protección automática activa" : "Análisis manual disponible"}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">
                {preview
                  ? "Estás viendo una simulación de acceso. Los pagos, tus permisos y tus datos reales no cambian."
                  : active
                    ? "SmartGuard está habilitado para revisar enlaces visibles en notificaciones compatibles."
                    : "Puedes analizar enlaces cuando quieras. La detección automática todavía no está activada en este teléfono."}
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-teal-100">
              {preview ? "ESCENARIO: "+scenarioTitle(scenario) : "Estado comprobado en Android"}
            </span>
            {!preview && active ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-300/20 px-3 py-2 text-xs font-bold text-teal-100">
                <CheckCircle2 className="size-4"/> Alertas habilitadas
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {!preview ? (
        <section className="grid grid-cols-2 gap-3" aria-label="Datos de protección">
          <div className="rounded-2xl border bg-white p-5">
            <div className="flex items-center gap-2"><Activity className="size-5 text-teal-700"/><p className="text-xs font-bold text-slate-600">Análisis procesados</p></div>
            <p className="mt-3 text-4xl font-black tabular-nums text-slate-900">{status?.processed??"—"}</p>
            <p className="mt-1 text-xs text-slate-500">Registrados por Android</p>
          </div>
          <div className="rounded-2xl border bg-white p-5">
            <div className="flex items-center gap-2"><BellRing className="size-5 text-teal-700"/><p className="text-xs font-bold text-slate-600">Notificaciones</p></div>
            <p className="mt-3 text-xl font-black text-slate-900">{!status?"Por verificar":active?"Activas":"Pendientes"}</p>
            <p className="mt-2 text-xs text-slate-500">Estado real de permisos</p>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2"><FlaskConical className="size-5 text-amber-800"/><p className="font-black text-amber-950">Simulación de vistas</p></div>
          <p className="mt-2 text-sm text-amber-900">
            {fullAccess?"Con Prueba o Premium aparecen las cinco vistas.":"Con acceso Gratis, Vencido o Invitado se muestran solo Inicio y Analizar."}
            Ninguna función de pago se desbloquea en el servidor.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <HeartHandshake className="mt-1 size-6 shrink-0 text-teal-800"/>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-teal-700">LA FAMILIA ES NUESTRA RAZÓN DE SER</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">Que nadie tenga que decidir solo ante un enlace sospechoso</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Una notificación de paquete, una supuesta alerta bancaria o un enlace extraño puede llegarle a cualquier familiar.
              SmartGuard analiza señales de riesgo y permite compartir antecedentes rojos dentro de un grupo autorizado.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              No abrimos los enlaces por ti ni sabemos si alguien hizo clic. Solo se comparte con tu autorización la información limitada de resultados rojos.
            </p>
          </div>
        </div>
      </section>

      {COMMERCIAL_ENABLED && !preview && !confirmedFamily(commercialAccess||null) ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex gap-3"><UsersRound className="mt-1 size-6 shrink-0 text-teal-800"/>
            <div><h2 className="font-black text-teal-950">¿Te invitaron a un grupo familiar?</h2>
              <p className="mt-2 text-sm leading-relaxed text-teal-900">Ingresa con el código que recibiste. Si quien te invitó tiene Premium Familiar vigente, tu puesto está incluido sin pagar otra suscripción.</p>
            </div>
          </div>
          <Link to="/familia" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-teal-800 px-4 py-3 text-sm font-black text-white">
            Unirme con mi código de familia
          </Link>
        </section>
      ) : null}

      <section className="space-y-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-teal-700">ENCUENTRA TODO FÁCILMENTE</p>
          <h2 className="mt-1 text-xl font-black text-slate-900">Tus secciones</h2>
          <p className="mt-1 text-sm text-slate-600">Cada vista tiene su tarea. Selecciona la que necesitas desde aquí o desde abajo.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tabs.map((id)=>{
            const item=DETAILS[id];
            return (
              <button key={id} type="button" onClick={()=>onOpenTab(id)}
                className="rounded-2xl border bg-white p-4 text-left shadow-sm transition-colors hover:border-teal-300">
                <item.Icon className="size-6 text-teal-800"/>
                <span className="mt-3 block font-black text-slate-900">{item.title}</span>
                <span className="mt-1 block text-xs text-slate-600">{item.body}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-teal-200 bg-white">
        <div className="border-b border-teal-100 bg-teal-50 p-5">
          <p className="text-xs font-black uppercase tracking-wider text-teal-800">PLAN Y BENEFICIOS</p>
          <h2 className="mt-1 text-xl font-black text-slate-900">¿Qué puedes hacer con SmartGuard?</h2>
          <p className="mt-2 text-sm text-slate-600">
            {preview ? fullAccess?"Estás viendo el aspecto de una experiencia Premium.":"El acceso gratuito conserva el análisis manual." :
              COMMERCIAL_ENABLED ? "Plan verificado por Firebase: "+(commercialAccess?.plan||"Gratis pendiente de comprobación")+". Los planes pagados requieren aprobación administrativa." : "La versión piloto todavía no comprueba ni cobra suscripciones. Puedes probar las funciones disponibles."}
          </p>
        </div>
        <div className="space-y-3 p-5">
          <div className="flex items-start gap-3">
            <Check className="mt-1 size-5 shrink-0 text-teal-700"/>
            <div><p className="font-bold">Análisis manual gratuito</p><p className="text-sm text-slate-600">Pega un enlace en Analizar para consultar su riesgo.</p></div>
          </div>
          <div className="flex items-start gap-3">
            {fullAccess?<Check className="mt-1 size-5 shrink-0 text-teal-700"/>:<LockKeyhole className="mt-1 size-5 shrink-0 text-slate-400"/>}
            <div><p className="font-bold">Protección automática</p><p className="text-sm text-slate-600">Avisos sobre enlaces detectables en notificaciones compatibles.</p></div>
          </div>
          <div className="flex items-start gap-3">
            {fullAccess?<Check className="mt-1 size-5 shrink-0 text-teal-700"/>:<LockKeyhole className="mt-1 size-5 shrink-0 text-slate-400"/>}
            <div><p className="font-bold">Familia, actividad y estadísticas</p><p className="text-sm text-slate-600">{COMMERCIAL_ENABLED && commercialAccess?.plan==="individual" ? "Tu historial y métricas están incluidos. También puedes unirte a una familia que te invite, aunque crear una requiere Familiar." : "Grupos y antecedentes rojos autorizados, historial y mediciones del teléfono."}</p></div>
          </div>
          {!fullAccess?(
            <div className="rounded-xl bg-teal-50 p-4 text-sm text-teal-900">
              Si más adelante eliges Premium, podrías disfrutar protección automática y funciones familiares sin cambiar de aplicación.
            </div>
          ):null}
          <button type="button" onClick={()=>setPlansOpen((v)=>!v)} aria-expanded={plansOpen}
            className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-bold">
            Conocer precios y prueba de 15 días <ChevronDown className={"size-4 "+(plansOpen?"rotate-180":"")}/>
          </button>
          {plansOpen?(
            <div className="space-y-3 rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-semibold">Gratis: $0 · Análisis manual</p>
              {paid.map((p)=>(
                <p key={p.id} className="text-sm text-slate-700">
                  <strong>{p.id==="family"?"Familiar":"Individual"}:</strong> {formatMonthlyPriceCOP(p.monthlyCOP)} COP/mes, propuesta de 15 días de prueba.
                </p>
              ))}
              <p className="text-xs leading-relaxed text-slate-500">
                Los precios siguen en validación. No hay cobro automático, checkout real ni contador de prueba activo en esta APK.
              </p>
            </div>
          ):null}
        </div>
      </section>

      {!preview?(
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <button type="button" onClick={()=>setSettingsOpen((v)=>!v)}
            aria-expanded={settingsOpen} className="flex w-full items-center justify-between gap-3 p-5 text-left">
            <span className="flex items-center gap-3">
              <Settings2 className="size-5 text-teal-800"/>
              <span><span className="block font-black">Configuración y permisos</span>
                <span className="mt-1 block text-xs text-slate-600">Control de Android, avisos, batería, privacidad y diagnósticos</span></span>
            </span>
            <ChevronDown className={"size-5 shrink-0 "+(settingsOpen?"rotate-180":"")}/>
          </button>
          {settingsOpen?(
            <div className="border-t border-slate-100">
              <div className="p-4">
                <p className="text-sm font-bold">¿Necesitas recordar cómo funciona cada permiso?</p>
                <button type="button" onClick={onRepeatGuide}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold">
                  Revisar explicación paso a paso <ArrowRight className="size-4"/>
                </button>
              </div>
              <CommercialRedemption/>
              <ProtectionPanel automaticAllowed={fullAccess} familyAllowed={!COMMERCIAL_ENABLED||confirmedFamily(commercialAccess||null)}/>
            </div>
          ):null}
        </section>
      ):null}

      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-4" aria-label="Experimentos de interfaz">
        <button type="button" onClick={()=>setExperimentsOpen((v)=>!v)}
          aria-expanded={experimentsOpen} className="flex w-full items-center justify-between gap-3 text-left text-sm font-bold text-slate-600">
          <span className="flex items-center gap-2"><FlaskConical className="size-4"/> Experimentos · Probar vistas</span>
          <ChevronDown className={"size-4 "+(experimentsOpen?"rotate-180":"")}/>
        </button>
        {experimentsOpen?(
          <div className="mt-4 space-y-3 border-t pt-4">
            <p className="text-xs text-slate-600">Son escenarios visuales; nunca conceden Premium real ni modifican pagos o permisos.</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PREVIEW_SCENARIOS.map((item)=>(
                <button key={item.id} type="button" onClick={()=>onChooseScenario(item.id)}
                  aria-pressed={scenario===item.id}
                  className={"rounded-xl border p-3 text-left "+(scenario===item.id?"border-teal-600 bg-teal-50":"border-slate-200 bg-slate-50")}>
                  <span className="block text-sm font-black">{item.title}</span>
                  <span className="mt-1 block text-xs text-slate-600">{item.description}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={()=>onChooseScenario("real")}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white">
              Salir de pruebas · Aplicación real
            </button>
          </div>
        ):null}
      </section>
    </div>
  );
}
