import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/react';
import { Link } from 'react-router-dom';
import { Activity, ArrowLeft, Database, Laptop, RefreshCcw, ShieldCheck, Smartphone } from 'lucide-react';
import { isAndroidPilot, Protection, type ProtectionStatus } from '@/mobile/native';
import { AuthControls } from '@/components/auth/auth-controls';
import { activityState, demoDevices, monitorTotals, type MonitorDevice } from './monitor-model';
import './admin-dashboard.css';

type Mode = 'local' | 'remote' | 'demo';
type RemoteState = 'unconfigured' | 'loading' | 'login-required' | 'forbidden' | 'ready' | 'error';
const backendURL = import.meta.env.VITE_SMARTGUARD_TELEMETRY_URL as string | undefined;
const backendKey = import.meta.env.VITE_SMARTGUARD_TELEMETRY_PUBLISHABLE_KEY as string | undefined;
const configured = !!(backendURL && /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(backendURL) && backendKey?.startsWith('sb_publishable_'));
const numeric = (value: number | null | undefined) => value == null ? '—' : new Intl.NumberFormat('es-CO').format(value);
const label = { online:'ACTIVO',idle:'INACTIVO',offline:'SIN CONEXIÓN',unknown:'SIN DATOS' } as const;

function Monitor({ getToken, userId }: { getToken?: () => Promise<string | null>; userId?: string | null }) {
  const [mode, setMode] = useState<Mode>(isAndroidPilot ? 'local' : 'demo');
  const [local, setLocal] = useState<ProtectionStatus | null>(null);
  const [remote, setRemote] = useState<MonitorDevice[]>([]);
  const [remoteState, setRemoteState] = useState<RemoteState>(configured ? 'loading' : 'unconfigured');
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!isAndroidPilot) return;
    let alive = true;
    const load = async () => { try { const s = await Protection.status(); if (alive) setLocal(s); } catch { /* no native plugin outside Android */ } };
    void load();
    const timer = setInterval(() => { if (!document.hidden) void load(); }, 15_000);
    return () => { alive = false; clearInterval(timer); };
  }, []);
  const loadRemote = useCallback(async () => {
    if (!configured) { setRemoteState('unconfigured'); return; }
    if (!userId || !getToken) { setRemoteState('login-required'); return; }
    setRemoteState('loading'); setError('');
    try {
      const token = await getToken();
      if (!token) { setRemoteState('login-required'); return; }
      const headers = { apikey: backendKey!, Authorization: `Bearer ${token}` };
      const url = backendURL! + '/rest/v1/';
      const check = await fetch(url + 'sg_admin_accounts?select=subject&subject=eq.' + encodeURIComponent(userId), { headers });
      if (!check.ok) throw new Error('No se pudo verificar el acceso de administrador.');
      const admins: unknown = await check.json();
      if (!Array.isArray(admins) || admins.length === 0) { setRemoteState('forbidden'); setRemote([]); return; }
      const response = await fetch(url + 'sg_device_rollups?select=id,nickname,app_version,last_seen_at,total,green,orange,red&order=last_seen_at.desc&limit=100', {headers});
      if (!response.ok) throw new Error('No fue posible consultar los dispositivos.');
      const rows: Array<Record<string, unknown>> = await response.json();
      setRemote(rows.map(row => ({
        id: String(row.id),name: String(row.nickname || 'Android'),version:String(row.app_version || 'desconocida'),
        seen:row.last_seen_at ? String(row.last_seen_at) : null,
        total:Number(row.total || 0),green:Number(row.green || 0),orange:Number(row.orange || 0),red:Number(row.red || 0),
      })));
      setRemoteState('ready');
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al consultar el servidor.');setRemoteState('error'); }
  }, [getToken,userId]);
  useEffect(() => {
    if (mode !== 'remote') return;
    void loadRemote();
    const timer = window.setInterval(() => { if (!document.hidden) void loadRemote(); }, 60_000);
    return () => clearInterval(timer);
  },[loadRemote,mode,refresh]);
  const history = local?.historyEnabled ? (local.history || []) : [];
  const localActive = !!(local?.enabled && local?.access && local?.notifications);
  const myDevice: MonitorDevice = {
    id:'local',name:'ESTE CELULAR',version:'Android · código fuente',seen:local?.lastAt || null,total:local?.processed || 0,
    green:local?.historyEnabled ? history.filter(x=>x.color==='green').length : null,
    orange:local?.historyEnabled ? history.filter(x=>x.color==='orange').length : null,
    red:local?.historyEnabled ? history.filter(x=>x.color==='red').length : null,
    local:true,protectionEnabled:localActive,
  };
  const devices = useMemo(() => mode==='demo' ? demoDevices() : mode==='local' ? [myDevice] : remote,
    // Local status changes periodically, no cached device list across different modes.
    [mode, local, remote]);
  const totals=monitorTotals(devices);
  const selected=devices.find(d=>d.id===selectedId) || devices[0];
  const deviceState = (d:MonitorDevice) => d.local ? (d.protectionEnabled ? 'online' : 'idle') : activityState(d.seen);
  const metric = (name:string,count:number | null,color='neutral') => <div className={'sga-metric sga-metric-'+color}><strong>{numeric(count)}</strong><span>{name}</span></div>;
  return <div className="sga-panel sg-panel">
    <div className="sga-top"><Link className="sga-btn sga-btn-ghost" to="/"><ArrowLeft className="inline size-4"/> PROTECCIÓN</Link><span className="sga-badge"><span className="sga-led"/> MONITOR · ALPHA 0.2</span></div>
    <div className="sga-heading"><div className="sga-server-icon"><Laptop/></div><div><p className="sga-kicker">SMARTGUARD · ADMINISTRADOR</p><h1>Centro de dispositivos.</h1><p className="sga-subtitle">Actividad, alertas y análisis por instalación.</p></div></div>
    <div className="sga-tabs">
      {isAndroidPilot && <button className={'sga-btn sga-btn-'+(mode==='local'?'active':'outline')} onClick={()=>{setMode('local');setSelectedId('');}}>MI CELULAR</button>}
      <button className={'sga-btn sga-btn-'+(mode==='remote'?'active':'outline')} onClick={()=>{setMode('remote');setSelectedId('');}}>DISPOSITIVOS</button>
      <button className={'sga-btn sga-btn-'+(mode==='demo'?'active':'outline')} onClick={()=>{setMode('demo');setSelectedId('');}}>VER DEMO</button>
      <button className="sga-btn sga-btn-outline" onClick={()=>setRefresh(n=>n+1)}><RefreshCcw className="inline size-3"/> ACTUALIZAR</button>
    </div>
    {mode==='demo' ? <p className="sga-notice sga-warning" role="note">MODO DEMOSTRACIÓN · Estos dispositivos y estadísticas son ficticios. No representan personas conectadas.</p> : mode==='local' ? <p className="sga-notice">DATOS LOCALES DE ESTE TELÉFONO. No estamos recopilando información de otros usuarios.</p> : <div className="sga-notice" role="status">
      {remoteState==='unconfigured' ? 'SERVIDOR PENDIENTE · Se necesita un proyecto Supabase exclusivo de SmartGuard.' :
       remoteState==='login-required' ? 'INICIA SESIÓN · El acceso al monitor remoto requiere una cuenta administradora.' :
       remoteState==='forbidden' ? 'ACCESO DENEGADO · Tu cuenta no tiene permisos para ver otros dispositivos.' :
       remoteState==='loading' ? 'VERIFICANDO PERMISOS Y DISPOSITIVOS…' :
       remoteState==='error' ? error : 'CONECTADO · Los estados representan actividad reciente, no una conexión permanente.'}
      {remoteState==='login-required' ? <div className="sga-inline"><AuthControls/></div> : null}
    </div>}
    <div className="sga-metrics">{metric('DISPOSITIVOS',totals.devices)}{metric('ACTIVOS',totals.active,'green')}{metric('ANÁLISIS',totals.analyses)}{metric('PELIGROSOS',totals.red,'red')}</div>
    <div className="sga-section-title"><h2>Red de dispositivos</h2><span className="sga-badge"><span className="sga-led"/>{mode==='demo'?'EJEMPLOS':mode==='local'?'LOCAL':'SERVIDOR'}</span></div>
    <div className="sga-devices">{devices.map(d => {const st=deviceState(d);return <button key={d.id} className={'sga-device'+(selected?.id===d.id?' sga-device-selected':'')} onClick={()=>setSelectedId(d.id)} aria-pressed={selected?.id===d.id}>
      <div className="sga-device-header"><span className="sga-device-icon"><Smartphone className="size-5"/></span><span className={'sga-badge sga-state-'+st}><span className="sga-led"/>{label[st]}</span></div>
      <strong className="sga-device-title">{d.name}</strong><span className="sga-device-sub">ANDROID · {d.version}</span>
      <div className="sga-device-stats"><span>{numeric(d.total)} consultas</span><span>{numeric(d.red)} rojas</span></div>
      <span className="sga-device-footer">{d.local?'ESTE TELÉFONO':d.seen?'ÚLTIMA ACTIVIDAD: '+new Date(d.seen).toLocaleString('es-CO'):'SIN DATOS'}</span>
    </button>;})}</div>
    {!devices.length ? <p className="sga-empty">No hay dispositivos verificados. No mostraremos números inventados.</p> : null}
    {selected && <div className="sga-detail"><div className="sga-detail-heading"><div><p className="sga-kicker">DETALLE INDIVIDUAL {mode==='demo'?'· DEMO':''}</p><h2>{selected.name}</h2></div><span className={'sga-badge sga-state-'+deviceState(selected)}><span className="sga-led"/>{label[deviceState(selected)]}</span></div>
      <div className="sga-detail-grid">{metric('SIN SEÑALES',selected.green,'green')}{metric('PRECAUCIÓN',selected.orange,'orange')}{metric('RIESGO',selected.red,'red')}{metric('TOTAL',selected.total)}</div>
      <p className="sga-caption">{selected.local && !local?.historyEnabled ? 'El total es real; para obtener el desglose por colores activa voluntariamente el historial local.' : 'Un resultado sin señales no garantiza que el enlace sea seguro. Las cifras no contienen textos de mensajes ni URLs completas.'}</p>
      <div className="sga-detail-footer"><span>VERSIÓN {selected.version}</span><span>{selected.local?'DATOS LOCALES':'ÚLTIMA ACTIVIDAD '+(selected.seen ? new Date(selected.seen).toLocaleString('es-CO'):'DESCONOCIDA')}</span></div>
    </div>}
    <div className="sga-bottom"><Link to="/" className="sga-btn sga-btn-active">VOLVER A SMARTGUARD</Link><span className="sga-caption"><Database className="inline size-3"/> Datos protegidos por cuenta</span></div>
    <p className="sga-footnote"><ShieldCheck className="inline size-3"/> Los indicadores verdes muestran actividad reciente o protección local activa, no vigilancia continua. El acceso remoto exige permisos verificados en el servidor.</p>
  </div>;
}

function WithClerk() {
  const { userId, getToken } = useAuth();
  return <Monitor userId={userId} getToken={getToken}/>;
}
export default function AdminPage() {
  return <div className="min-h-screen bg-[#071c26] px-3 py-4 sm:px-6 sm:py-9">
    <div className="mx-auto max-w-5xl">{import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ? <WithClerk/> : <Monitor/>}</div>
  </div>;
}
