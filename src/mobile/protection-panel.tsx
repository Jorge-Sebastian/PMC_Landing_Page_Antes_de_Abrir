import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, CheckCircle2, Clock3, Cloud, ExternalLink, Eye, HeartHandshake, LockKeyhole, Pause, Play, RefreshCcw, ScanSearch, Settings2, Shield, ShieldAlert, ShieldCheck, Smartphone, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Protection, type ProtectionStatus, type DevicePerformanceStatus } from './native';
import { SIMULATED_7_DAYS, SIMULATION_NOTICE, copySimulatedReport, simulatedMean } from './performance-demo';

const CONSENT_KEY = 'smartguard-native-permission-consent-v060';
const INTRO_KEY = 'smartguard-native-welcome-v060';
const TELEMETRY_KEY = 'smartguard-native-statistics-v060';
function getSaved(key: string) { try { return localStorage.getItem(key) === 'yes'; } catch { return false; } }
function save(key:string, allowed:boolean) { try { if (allowed) localStorage.setItem(key, 'yes'); else localStorage.removeItem(key); } catch {} }
const apps = [
  ['sms', 'Mensajes SMS'], ['whatsapp', 'WhatsApp y WhatsApp Business'],
  ['telegram', 'Telegram'], ['signal', 'Signal'], ['messenger', 'Facebook Messenger'],
] as const;
const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6';
const performanceTitles = [
  ['app_ready','Inicio de la aplicación'],
  ['manual_analysis','Análisis manual'],
  ['notification_analysis','Análisis de notificaciones'],
  ['family_create','Crear familia'],
  ['family_join','Unirse a familia'],
  ['family_manual','Análisis familiar'],
  ['family_upload','Sincronizar riesgo familiar'],
] as const;
const formatMs = (n:number) => {
  const ms = Math.round(n || 0);
  return ms >= 1000 ? `${(ms/1000).toLocaleString('es-CO',{maximumFractionDigits:2})} s (${ms.toLocaleString('es-CO')} ms)` : `${ms.toLocaleString('es-CO')} ms`;
};

export function ProtectionPanel() {
  const [status, setStatus] = useState<ProtectionStatus | null>(null);
  const [screen, setScreen] = useState<'welcome'|'permissions'|'home'>(()=>getSaved(INTRO_KEY)?'home':'welcome');
  const [consent, setConsent] = useState(() => getSaved(CONSENT_KEY));
  const [statsConsent, setStatsConsent] = useState(() => getSaved(TELEMETRY_KEY));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [syncInfo, setSyncInfo] = useState('');
  const [performance, setPerformance] = useState<DevicePerformanceStatus | null>(null);
  const [performanceError, setPerformanceError] = useState('');
  const [performanceMode, setPerformanceMode] = useState<'real'|'demo'>('real');
  const [demoCopyState, setDemoCopyState] = useState('');
  const refreshPerformance = useCallback(async () => {
    try { const current=await Protection.performanceStatus(); setPerformance(current); setPerformanceError(''); }
    catch { setPerformanceError('No se pudieron consultar las métricas locales de esta APK.'); }
  }, []);
  const refresh = useCallback(async () => {
    try { const next = await Protection.status(); setStatus(next); }
    catch { setError('No se pudo consultar el estado de protección.'); }
  }, []);
  useEffect(() => {
    void refreshPerformance();
    const onFocus=()=>{ if(!document.hidden) void refreshPerformance(); };
    window.addEventListener('focus',onFocus);
    return ()=>window.removeEventListener('focus',onFocus);
  },[refreshPerformance]);
  useEffect(() => {
    // Preserve the actual native opt-in state after upgrading from 0.5.9.
    // A new JS localStorage key must NEVER hide an already active background sender.
    void Protection.firebaseBackgroundStatus().then(info=>{
      const active=info.active===true;
      setStatsConsent(active);
      save(TELEMETRY_KEY,active);
      if(active)setSyncInfo('Sincronización de estadísticas del piloto anterior conservada.');
    }).catch(()=>{setSyncInfo('No se pudo consultar el estado de sincronización; revisa los permisos.');});
  },[]);
  useEffect(() => {
    void refresh();
    const update = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', update);
    window.addEventListener('focus', update);
    const interval = window.setInterval(update, 2500);
    return () => { document.removeEventListener('visibilitychange', update); window.removeEventListener('focus', update); window.clearInterval(interval); };
  }, [refresh]);
  const active = Boolean(status?.enabled && status.access && status.notifications);
  const notificationsReady = Boolean(status?.notifications);
  const accessReady = Boolean(status?.access);
  const completedPerms = Number(notificationsReady)+Number(accessReady);
  const action = async (fn:()=>Promise<unknown>, done?:string) => {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await fn(); await refresh(); if(done)setNotice(done); }
    catch(e) { setError(e instanceof Error ? e.message : 'No se pudo completar la operación.'); }
    finally { setBusy(false); }
  };
  const activate = () => void action(async () => {
    if (!consent) throw new Error('Primero debes aceptar revisar las notificaciones compatibles.');
    await Protection.activate();
    // Android settings may open asynchronously. The app refreshes on focus/visibility.
  },'Revisa los permisos en Ajustes. SmartGuard comprobará el resultado automáticamente al regresar.');
  const sharePerformance = (allowed:boolean) => void action(async()=>{
    const next=await Protection.performanceSharing({enabled:allowed});
    setPerformance(next);
    setNotice(!allowed
      ? 'Se revocó el consentimiento y se desactivó el envío futuro de métricas.'
      : next.sharing
        ? 'Envío de métricas técnicas habilitado en Firebase.'
        : 'Consentimiento guardado en este teléfono. No se transmiten métricas: falta registrar Android en Firebase.');
  });
  const copyDemo = async () => {
    try {
      await navigator.clipboard.writeText(copySimulatedReport());
      setDemoCopyState('Copiado con la advertencia SIMULADO incluida.');
    } catch {
      setDemoCopyState('No se pudo copiar. La tabla se puede transcribir indicando que es SIMULADA.');
    }
  };
  const enableTelemetry = (allowed:boolean) => void action(async()=>{
    if (!allowed) {
      await Protection.firebaseBackgroundStop();
      save(TELEMETRY_KEY,false);setStatsConsent(false);
      const module = await import(/* @vite-ignore */ new URL('/smartguard-family/client.js', window.location.origin).href);
      await module.revokeDeviceTelemetry?.();
      setSyncInfo('Estadísticas desactivadas; ya no se enviarán nuevos eventos.');
      return;
    }
    const module = await import(/* @vite-ignore */ new URL('/smartguard-family/client.js', window.location.origin).href);
    const user=await module.enableDeviceTelemetry('0.6.0');
    await Protection.firebaseBackgroundSession({ uid:user.uid,refreshToken:user.refreshToken,colors:true,share:true,version:'0.6.0' });
    save(TELEMETRY_KEY,true);setStatsConsent(true);
    const info=await Protection.firebaseBackgroundStatus();
    setSyncInfo(`Sincronización de estadísticas habilitada · ${info.pending||0} pendientes`);
  });
  return <div className="bg-slate-50 text-slate-900">
    <section className="bg-[#0d3440] text-white"><div className="section-shell py-8 sm:py-12">
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold tracking-[.17em] text-teal-200"><ShieldCheck className="size-5"/> SMARTGUARD · ANDROID 0.6.2</div>
      <h1 className="mt-4 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">Protege a tu familia antes de abrir un enlace.</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-slate-200">Analizamos enlaces visibles en las notificaciones de aplicaciones compatibles. También puedes revisar cualquier enlace manualmente sin registrarte.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link to="/familia" className="inline-flex items-center gap-2 rounded-xl bg-teal-400 px-4 py-3 text-sm font-bold text-slate-950"><UsersRound className="size-4"/> Mi familia</Link>
        <a href="#analizador" className="inline-flex items-center gap-2 rounded-xl border border-teal-100/50 px-4 py-3 text-sm font-bold text-white"><ScanSearch className="size-4"/> Analizar un enlace</a>
      </div>
    </div></section>
    <div className="section-shell space-y-5 py-6">
      {error?<p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">{error}</p>:null}
      {notice?<p role="status" className="rounded-xl border border-teal-300 bg-teal-50 p-4 text-sm text-teal-900">{notice}</p>:null}
      {screen==='welcome'?<section className={card} aria-label="Paso 1 de 2: bienvenida">
        <p className="text-xs font-bold tracking-widest text-teal-700">PASO 1 DE 2 · BIENVENIDA</p>
        <h2 className="mt-2 text-2xl font-black">¿Cómo te cuida SmartGuard?</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4"><BellRing className="size-6 text-teal-700"/><h3 className="mt-2 font-semibold">Detecta</h3><p className="mt-1 text-sm text-slate-600">Encuentra enlaces en notificaciones que Android permita leer.</p></div>
          <div className="rounded-xl bg-slate-50 p-4"><ShieldAlert className="size-6 text-teal-700"/><h3 className="mt-2 font-semibold">Analiza</h3><p className="mt-1 text-sm text-slate-600">Busca señales de suplantación, redirecciones y otros riesgos.</p></div>
          <div className="rounded-xl bg-slate-50 p-4"><HeartHandshake className="size-6 text-teal-700"/><h3 className="mt-2 font-semibold">Comparte</h3><p className="mt-1 text-sm text-slate-600">Si lo autorizas, tu familia puede reconocer dominios rojos repetidos.</p></div>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-slate-600">Para detectar enlaces de notificaciones necesitamos permisos de Android. No guardamos conversaciones completas. El análisis manual no necesita esos permisos ni inicio de sesión.</p>
        <div className="mt-5 flex flex-wrap gap-2"><Button onClick={()=>{setScreen('permissions');save(INTRO_KEY,true);}}>Continuar a permisos</Button><Button variant="outline" onClick={()=>{setScreen('home');save(INTRO_KEY,true);}}>Solo analizar manualmente</Button></div>
      </section>:null}
      {screen==='permissions'?<section className={card} aria-label="Paso 2 de 2: configuración de permisos">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold tracking-widest text-teal-700">PASO 2 DE 2 · PERMISOS</p><p className="text-sm font-semibold">{completedPerms} de 2 autorizaciones concedidas</p></div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-teal-600 transition-all" style={{width:`${completedPerms*50}%`}}/></div>
        <h2 className="mt-4 text-2xl font-black">Activa tu protección</h2>
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4"><span className={accessReady?'text-teal-700':'text-amber-600'}>{accessReady?<CheckCircle2/>:<LockKeyhole/>}</span><div><p className="font-semibold">Acceso a notificaciones</p><p className="text-sm text-slate-600">{accessReady?'Autorizado':'Pendiente en Ajustes de Android'}</p></div></div>
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4"><span className={notificationsReady?'text-teal-700':'text-amber-600'}>{notificationsReady?<CheckCircle2/>:<BellRing/>}</span><div><p className="font-semibold">Mostrar alertas</p><p className="text-sm text-slate-600">{notificationsReady?'Autorizado':'Pendiente en Ajustes de Android'}</p></div></div>
        </div>
        <label className="mt-5 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 size-5 accent-teal-700" checked={consent} onChange={e=>{setConsent(e.target.checked);save(CONSENT_KEY,e.target.checked);}}/><span>Autorizo la lectura local de enlaces visibles en notificaciones compatibles. Puedo desactivarla.</span></label>
        <div className="mt-5 flex flex-wrap gap-2"><Button disabled={!consent||busy} onClick={activate}>Solicitar o comprobar permisos</Button><Button variant="outline" onClick={()=>{setScreen('home');save(INTRO_KEY,true);}}>Ir a SmartGuard</Button></div>
        {active?<p className="mt-4 flex items-center gap-2 text-sm font-semibold text-teal-700"><CheckCircle2 className="size-5"/> Permisos y protección confirmados. Puedes entrar.</p>:<p className="mt-4 text-sm text-amber-800">La protección automática todavía no está activa. Puedes continuar con el analizador manual.</p>}
      </section>:null}
      {screen==='home'?<section className={card} aria-label="Estado de protección">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold tracking-widest text-teal-700">ESTADO DEL DISPOSITIVO</p><h2 className="mt-1 flex items-center gap-2 text-2xl font-black">{active?<ShieldCheck className="text-teal-700"/>:<ShieldAlert className="text-amber-600"/>}{active?'PROTECCIÓN ACTIVA':status?.enabled?'PERMISOS PENDIENTES':'PROTECCIÓN PAUSADA'}</h2></div><Button variant="outline" onClick={()=>setScreen('permissions')}><Settings2 className="mr-2 size-4"/> Configuración</Button></div>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{active?'Revisamos los enlaces de notificaciones autorizadas, incluso cuando no tienes la pantalla de SmartGuard abierta. Android puede limitar el servicio por batería.':'El análisis manual sigue disponible. Para activar las alertas automáticas, completa los permisos de notificaciones.'}</p>
        <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-teal-50 p-4"><p className="text-2xl font-black text-teal-900">{status?.processed??0}</p><p className="text-sm text-teal-800">Enlaces procesados</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-2xl font-black text-slate-800">{active?'2/2':`${completedPerms}/2`}</p><p className="text-sm text-slate-600">Permisos concedidos</p></div></div>
        <div className="mt-4 flex flex-wrap gap-2"><Button disabled={!consent||busy} onClick={activate}><Play className="mr-2 size-4"/> Activar / revisar permisos</Button><Button variant="outline" disabled={busy} onClick={()=>void action(()=>Protection.pause(),'Protección automática pausada.')}><Pause className="mr-2 size-4"/> Pausar</Button><Button variant="outline" disabled={busy} onClick={()=>void action(()=>Protection.alertSettings())}>Avisos de Android</Button></div>
        {!consent?<label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} onChange={e=>{setConsent(e.target.checked);save(CONSENT_KEY,e.target.checked);}} className="mt-1 size-5 accent-teal-700"/> Acepto revisar enlaces de notificaciones compatibles para activar la protección automática.</label>:null}
      </section>:null}
      <section className={card} aria-label="SmartGuard Family"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-lg font-black"><UsersRound className="size-6 text-teal-700"/> SmartGuard Family</p><p className="mt-2 max-w-xl text-sm text-slate-600">Crea o entra a una sala de hasta 20 familiares. Compartirás únicamente resultados rojos si lo autorizas.</p></div><Button asChild><Link to="/familia">Entrar a mi familia</Link></Button></div></section>
      <details className={card}><summary className="cursor-pointer text-lg font-bold">Aplicaciones compatibles</summary><p className="mt-2 text-sm text-slate-600">Elige cuáles pueden activar el análisis al aparecer una notificación con enlaces visibles.</p><div className="mt-4 space-y-2">{apps.map(([app,label])=><label key={app} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={status?.apps?.[app]??(app==='sms'||app==='whatsapp')} onChange={e=>void action(()=>Protection.setApp({app,value:e.target.checked}))} className="size-4 accent-teal-700"/>{label}</label>)}</div><p className="mt-3 text-xs text-slate-500">Si la aplicación oculta el contenido de la notificación, SmartGuard no podrá leerlo.</p></details>
      <details className={card}><summary className="cursor-pointer text-lg font-bold">Historial local y diagnósticos</summary><p className="mt-3 text-sm text-slate-600">Catálogo integrado: {status?.rulesVersion||'comprobando…'} · Comprobaciones remotas: {status?.externalReady?'configuradas':'no configuradas'}.</p><label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 size-4" checked={status?.showAll??true} onChange={e=>void action(()=>Protection.setShowAll({value:e.target.checked}))}/> Mostrar también resultados sin señales</label><label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 size-4" checked={status?.historyEnabled??false} onChange={e=>void action(()=>Protection.setHistory({value:e.target.checked}))}/> Guardar historial local (hasta 50 registros)</label>{status?.historyEnabled && status.history.length>0?<ul className="mt-3 max-h-52 space-y-1 overflow-auto text-sm">{status.history.map((h,i)=><li key={i} className="break-all">{h.color} · {h.domain} · {new Date(h.date).toLocaleString()}</li>)}</ul>:null}<div className="mt-3 flex flex-wrap gap-2">{(['red','orange','green'] as const).map(level=><Button key={level} variant="outline" size="sm" onClick={()=>void action(()=>Protection.testBanner({level}))}>Probar {level}</Button>)}<Button variant="outline" size="sm" onClick={()=>void action(()=>Protection.exportFeedback())}>Copiar correcciones</Button><Button variant="outline" size="sm" onClick={()=>void action(()=>Protection.clearHistory())}>Borrar historial</Button></div></details>
      <details className={card} aria-label="Métricas de rendimiento Android">
        <summary className="cursor-pointer text-lg font-bold">Rendimiento de SmartGuard · métricas y demo de 7 días</summary>
        <p className="mt-3 text-sm text-slate-600">Elige datos reales registrados en este teléfono o un ejemplo de siete días totalmente SIMULADO. Las simulaciones no se suben a Firebase y no sirven como evidencia de PageSpeed o UptimeRobot.</p>
        {performance ? <>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm"><span className="font-semibold">Firebase Performance:</span><span className={performance.sharing?'text-teal-700':'text-amber-700'}>{performance.sharing ? 'Envío real activo' : performance.firebaseReady ? (performance.sharingRequested ? 'Autorización pendiente de activar: pulsa «Activar envío»' : 'Configurado, sin compartir') : performance.sharingRequested ? 'Consentimiento guardado; SIN ENVÍO — falta configurar Android en Firebase' : 'Solo local · falta registrar la aplicación Android en Firebase'}</span></div>
          <label className="mt-4 flex items-start gap-2 text-sm"><input className="mt-1 size-4 accent-teal-700" type="checkbox" checked={performance.sharingRequested} disabled={busy} onChange={e=>sharePerformance(e.target.checked)}/><span>Autorizo compartir con Firebase únicamente tiempos, errores y estadísticas técnicas de esta APK. No se envían enlaces, dominios, mensajes ni datos de la familia.</span></label>
          {performance.firebaseReady && performance.sharingRequested && !performance.sharing ? <Button className="mt-3" disabled={busy} onClick={()=>sharePerformance(true)}>Activar envío a Firebase</Button> : null}
          {!performance.firebaseReady && performance.sharingRequested ? <p className="mt-2 text-sm font-medium text-amber-800">Tu autorización quedó guardada localmente. Aún NO se transmite nada: necesitamos recompilar con la aplicación Android registrada en Firebase. Cuando esté configurada, deberás activar el envío expresamente.</p> : null}
        </> : <p className="mt-3 text-sm text-slate-600">Comprobando instrumentación de Android…</p>}
        <div role="group" aria-label="Origen de las métricas" className="mt-5 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant={performanceMode==='real'?'default':'outline'} aria-pressed={performanceMode==='real'} onClick={()=>setPerformanceMode('real')}>Datos reales del teléfono</Button>
          <Button type="button" size="sm" variant={performanceMode==='demo'?'default':'outline'} aria-pressed={performanceMode==='demo'} onClick={()=>setPerformanceMode('demo')}>DEMO · 7 días SIMULADOS</Button>
        </div>
        {performanceMode==='real' ? <>
          <p className="mt-3 text-sm text-slate-600">Datos reales desde la instalación de esta versión. El p95 usa las últimas 64 mediciones; «ms» significa milisegundos, no microsegundos. El tiempo de inicio es aproximado hasta que aparece la interfaz.</p>
          {performance ? <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {performanceTitles.map(([id,title])=>{const metric=performance.metrics[id];return <div key={id} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="font-semibold text-slate-800">{title}</p><p className="mt-1 text-xl font-black text-teal-800">{metric?.count ? formatMs(metric.averageMs) : 'Sin muestras'}</p><p className="mt-1 text-xs text-slate-600">{metric?.count||0} mediciones · p95: {metric?.count?formatMs(metric.p95Ms):'—'} · errores: {metric?.errors||0}</p></div>})}
          </div> : null}
          {performanceError?<p role="alert" className="mt-3 text-sm text-red-700">{performanceError}</p>:null}
          <Button variant="outline" size="sm" className="mt-4" onClick={()=>void refreshPerformance()}><RefreshCcw className="mr-2 size-4"/> Actualizar métricas reales</Button>
        </> : <section aria-label="Reporte de siete días simulados" className="mt-4 rounded-xl border-2 border-amber-500 bg-amber-50 p-4">
          <p className="text-base font-black text-amber-950">SIMULACIÓN — 7 DÍAS · DATOS INVENTADOS</p>
          <p className="mt-2 text-sm font-medium text-amber-950">{SIMULATION_NOTICE} Período ilustrativo: 30 de octubre al 5 de noviembre de 2026. Nunca se mezclan con métricas reales ni se transmiten a Firebase.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-white p-3"><p className="text-sm text-slate-600">Inicio promedio (simulado)</p><p className="text-xl font-black">{formatMs(simulatedMean('app_ready'))}</p></div>
            <div className="rounded-lg bg-white p-3"><p className="text-sm text-slate-600">Análisis promedio (simulado)</p><p className="text-xl font-black">{formatMs(simulatedMean('manual_analysis'))}</p></div>
            <div className="rounded-lg bg-white p-3"><p className="text-sm text-slate-600">Total análisis simulados</p><p className="text-xl font-black">{SIMULATED_7_DAYS.reduce((sum,day)=>sum+day.analyses,0)}</p></div>
          </div>
          <div role="region" tabIndex={0} aria-label="Tabla de siete días de datos simulados" className="mt-4 overflow-x-auto rounded-lg border border-amber-300 bg-white">
            <table className="min-w-[760px] w-full text-left text-xs sm:text-sm">
              <caption className="px-3 py-2 text-left font-black text-amber-950">TABLA SIMULADA — Valores ilustrativos en milisegundos (ms), nunca resultados observados</caption>
              <thead className="bg-amber-100 text-amber-950"><tr><th scope="col" className="p-2">Fecha</th><th scope="col" className="p-2">Inicio</th><th scope="col" className="p-2">Manual</th><th scope="col" className="p-2">Notificaciones</th><th scope="col" className="p-2">Crear familia</th><th scope="col" className="p-2">Unirse</th><th scope="col" className="p-2">Family</th><th scope="col" className="p-2">Sincronizar</th><th scope="col" className="p-2">Análisis</th><th scope="col" className="p-2">Alertas</th><th scope="col" className="p-2">Errores</th></tr></thead>
              <tbody>{SIMULATED_7_DAYS.map(day=><tr key={day.date} className="border-t border-amber-100"><th scope="row" className="whitespace-nowrap p-2">{day.label}</th><td className="p-2">{day.averagesMs.app_ready}</td><td className="p-2">{day.averagesMs.manual_analysis}</td><td className="p-2">{day.averagesMs.notification_analysis}</td><td className="p-2">{day.averagesMs.family_create}</td><td className="p-2">{day.averagesMs.family_join}</td><td className="p-2">{day.averagesMs.family_manual}</td><td className="p-2">{day.averagesMs.family_upload}</td><td className="p-2">{day.analyses}</td><td className="p-2">{day.familyAlerts}</td><td className="p-2">{day.errors}</td></tr>)}</tbody>
            </table>
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={()=>void copyDemo()}>Copiar resumen SIMULADO</Button>
          {demoCopyState?<p className="mt-2 text-sm" role="status">{demoCopyState}</p>:null}
          <p className="mt-3 text-xs font-semibold text-amber-950">No sustituye el porcentaje de UptimeRobot de 7 días, el informe de PageSpeed ni pruebas con usuarios reales.</p>
        </section>}
      </details>
      <details className={card}><summary className="cursor-pointer text-lg font-bold">Estadísticas anónimas y administrador</summary><p className="mt-3 text-sm text-slate-600">Opción independiente de SmartGuard Family. Comparte únicamente colores, versión y actividad de este dispositivo con el administrador autorizado. No incluye nombres, dominios, mensajes ni URLs.</p><label className="mt-3 flex items-start gap-2 text-sm"><input className="mt-1 size-4 accent-teal-700" type="checkbox" checked={statsConsent} disabled={busy} onChange={e=>enableTelemetry(e.target.checked)}/> Autorizo sincronizar estadísticas anónimas en Firebase.</label>{syncInfo?<p className="mt-3 text-sm text-teal-700">{syncInfo}</p>:null}<a href="https://smartguard-piloto-20261029.web.app/" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-teal-700">Abrir panel Firebase de administración <ExternalLink className="size-3"/></a></details>
    </div>
  </div>;
}
