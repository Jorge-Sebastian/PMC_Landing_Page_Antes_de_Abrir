/* SmartGuard Admin v0.5.7: server-style monitor with authenticated remote access.
 * DEMO data is never presented as real; local device status comes from Android.
 * No remote telemetry is enabled unless a dedicated SmartGuard backend is configured.
 */
const SGAdminPanelV57 = ({ onBack, onOpenLogin, localStatus }) => {
  const el = x.createElement;
  const auth = A4({ treatPendingAsSignedOut: true });
  const [view, setView] = x.useState('local');
  const [selectedId, setSelectedId] = x.useState('my-device');
  const [remote, setRemote] = x.useState([]);
  const [connection, setConnection] = x.useState('checking');
  const [remoteError, setRemoteError] = x.useState('');
  const [refresh, setRefresh] = x.useState(0);
  const [lastRefresh, setLastRefresh] = x.useState(null);
  const [config, setConfig] = x.useState(null);
  x.useEffect(() => {
    let active = true;
    fetch('/smartguard-telemetry.json', { cache: 'no-store' }).then(async r => r.ok ? await r.json() : null).then(v => {
      if (!active) return;
      const valid = !!(v && /^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(v.url || '') && /^sb_publishable_[A-Za-z0-9_-]+$/.test(v.publishableKey || ''));
      setConfig(valid ? v : null);
      if (!valid) setConnection('unconfigured');
    }).catch(() => { if (active) setConnection('unconfigured'); });
    return () => { active = false; };
  }, []);
  x.useEffect(() => {
    if (!config) return;
    if (!auth.userId) { setConnection('login-required'); setRemote([]); return; }
    let active = true;
    const run = async () => {
      setConnection('checking'); setRemoteError('');
      try {
        if (typeof auth.getToken !== 'function') throw new Error('No está disponible la sesión de cuenta.');
        const token = await auth.getToken();
        if (!token) throw new Error('Inicia sesión para consultar los dispositivos.');
        const headers = { apikey: config.publishableKey, Authorization: 'Bearer ' + token, Accept: 'application/json' };
        const api = config.url + '/rest/v1/';
        const own = await fetch(api + 'sg_admin_accounts?select=subject&subject=eq.' + encodeURIComponent(auth.userId), {headers});
        if (!own.ok) throw new Error('La autorización del administrador no está disponible.');
        const owners = await own.json();
        if (!active) return;
        if (!Array.isArray(owners) || owners.length === 0) { setConnection('forbidden'); setRemote([]); return; }
        const result = await fetch(api + 'sg_device_rollups?select=id,nickname,app_version,last_seen_at,total,green,orange,red&order=last_seen_at.desc&limit=100', {headers});
        if (!result.ok) throw new Error('No se pudieron consultar los dispositivos.');
        const rows = await result.json();
        if (!active) return;
        setRemote(Array.isArray(rows) ? rows.map(v => ({
          id: String(v.id), name: String(v.nickname || 'Dispositivo Android'),
          version: String(v.app_version || 'Desconocida'), seen: v.last_seen_at,
          total: Number(v.total || 0), green: Number(v.green || 0), orange: Number(v.orange || 0), red: Number(v.red || 0)
        })) : []);
        setConnection('connected'); setLastRefresh(Date.now());
      } catch(e) { if (active) { setRemoteError(e?.message || 'No fue posible consultar los datos.'); setConnection('error'); } }
    };
    run();
    const timer = window.setInterval(() => { if (!document.hidden) run(); }, 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, [config, auth.userId, refresh]);
  const now = Date.now();
  const minutes = seen => { const v = seen ? new Date(seen).getTime() : NaN; return Number.isFinite(v) ? Math.max(0, Math.floor((now - v) / 60000)) : null; };
  const connectionStatus = seen => { const m = minutes(seen); return m === null ? 'unknown' : m <= 15 ? 'online' : m <= 1440 ? 'idle' : 'offline'; };
  const history = Array.isArray(localStatus?.history) ? localStatus.history : [];
  const hasHistory = !!localStatus?.historyEnabled;
  const localActive = !!(localStatus?.enabled && localStatus?.access && localStatus?.notifications);
  const mine = {
    id: 'my-device', name: 'ESTE CELULAR', version: '0.5.7-piloto', seen: localStatus?.lastAt || null,
    status: localActive ? 'online' : 'idle', total: Number(localStatus?.processed || 0),
    green: hasHistory ? history.filter(h => h.color === 'green').length : null,
    orange: hasHistory ? history.filter(h => h.color === 'orange').length : null,
    red: hasHistory ? history.filter(h => h.color === 'red').length : null,
    local: true,
  };
  const demos = [
    {id:'demo-01',name:'ANDROID · CASA',version:'0.5.7',minutes:2,total:86,green:58,orange:17,red:11},
    {id:'demo-02',name:'ANDROID · MAMÁ',version:'0.5.7',minutes:4,total:42,green:32,orange:7,red:3},
    {id:'demo-03',name:'ANDROID · PAPÁ',version:'0.5.6',minutes:7,total:75,green:51,orange:15,red:9},
    {id:'demo-04',name:'ANDROID · ABUELO',version:'0.5.6',minutes:12,total:21,green:14,orange:4,red:3},
    {id:'demo-05',name:'ANDROID · TÍA',version:'0.5.5',minutes:78,total:18,green:11,orange:6,red:1},
    {id:'demo-06',name:'ANDROID · PRUEBA',version:'0.5.5',minutes:3500,total:31,green:22,orange:6,red:3},
  ].map(o => ({...o, seen: new Date(now - o.minutes * 60000).toISOString(), status: o.minutes <= 15 ? 'online' : o.minutes <= 1440 ? 'idle' : 'offline'}));
  const showDemo = view === 'demo';
  const devices = showDemo ? demos : view === 'remote' ? remote.map(d => ({...d,status:connectionStatus(d.seen)})) : [mine];
  const total = devices.reduce((n,d) => n + d.total,0);
  const safe = devices.reduce((n,d) => n + (d.green || 0),0);
  const warn = devices.reduce((n,d) => n + (d.orange || 0),0);
  const danger = devices.reduce((n,d) => n + (d.red || 0),0);
  const activeCount = devices.filter(d=>d.status === 'online').length;
  const focused = devices.find(d=>d.id === selectedId) || devices[0] || null;
  const stateName = s => s === 'online' ? 'ACTIVO' : s === 'idle' ? 'INACTIVO' : s === 'offline' ? 'SIN CONEXIÓN' : 'SIN DATOS';
  const badge = (label, state) => el('span',{className:'sga-badge sga-state-' + state},el('span',{className:'sga-led'}),label);
  const count = v => v === null || v === undefined ? '—' : new Intl.NumberFormat('es-CO').format(v);
  const metric = (label,value,tone='neutral') => el('div',{className:'sga-metric sga-metric-'+tone},el('strong',null,count(value)),el('span',null,label));
  const button = (label,fn,variant='outline') => el('button',{type:'button',className:'sga-btn sga-btn-'+variant,onClick:fn},label);
  return el('section',{className:'sg-panel sga-panel',role:'region','aria-label':'Panel administrador SmartGuard'},
    el('div',{className:'sga-top'},button('← PROTECCIÓN',onBack,'ghost'),badge('MONITOR · ALPHA 0.2','idle')),
    el('div',{className:'sga-heading'},el('div',{className:'sga-server-icon'},'▦'),el('div',null,
      el('p',{className:'sga-kicker'},'SMARTGUARD · ADMINISTRADOR'),
      el('h1',null,'Centro de dispositivos.'),
      el('p',{className:'sga-subtitle'},'Actividad, alertas y análisis por instalación.'))),
    el('div',{className:'sga-tabs',role:'group','aria-label':'Fuente de datos'},
      button('MI CELULAR',()=>{setView('local');setSelectedId('my-device');},view==='local'?'active':'outline'),
      button('DISPOSITIVOS',()=>{setView('remote');setSelectedId('');setRefresh(v=>v+1);},view==='remote'?'active':'outline'),
      button('VER DEMO',()=>{setView('demo');setSelectedId('demo-01');},view==='demo'?'active':'outline')),
    showDemo ? el('div',{role:'note',className:'sga-notice sga-warning'},'MODO DEMOSTRACIÓN · Los 6 celulares y todas las cifras de esta pantalla son simulados. No hay datos reales de familiares conectados.') :
      view === 'local' ? el('div',{role:'note',className:'sga-notice'},'DATOS REALES DE ESTE CELULAR · El desglose por color solo se muestra si activaste el historial local. No se están recopilando datos de otros usuarios.') :
      connection === 'unconfigured' ? el('div',{role:'status',className:'sga-notice sga-warning'},'SERVIDOR AÚN NO CONFIGURADO · Necesitamos un proyecto Supabase dedicado a SmartGuard y permisos de administrador para ver la flota real.') :
      connection === 'login-required' ? el('div',{role:'status',className:'sga-notice sga-warning'},'ACCESO RESTRINGIDO · Inicia sesión para consultar la flota. La protección individual sigue funcionando sin cuenta.',el('div',{className:'sga-inline'},button('INICIAR SESIÓN',onOpenLogin,'active'))) :
      connection === 'forbidden' ? el('div',{role:'alert',className:'sga-notice sga-warning'},'ACCESO DENEGADO · Esta cuenta no tiene permisos de administrador. La base de datos protege la información de otros usuarios.') :
      connection === 'error' ? el('div',{role:'alert',className:'sga-notice sga-warning'},'SIN DATOS REMOTOS · '+remoteError) :
      connection === 'checking' ? el('div',{role:'status',className:'sga-notice'},'COMPROBANDO PERMISOS Y DISPOSITIVOS…') :
      el('div',{role:'status',className:'sga-notice'},'SERVIDOR CONECTADO · Última consulta: '+(lastRefresh ? new Date(lastRefresh).toLocaleTimeString('es-CO') : '—')+'. Los estados indican actividad reciente, no conexión permanente.'),
    el('div',{className:'sga-metrics'},metric('DISPOSITIVOS',devices.length),metric('ACTIVOS',activeCount,'green'),metric('ANÁLISIS',total),metric('PELIGROSOS',danger,'red')),
    el('div',{className:'sga-section-title'},el('h2',null,'Red de dispositivos'),badge(showDemo?'EJEMPLOS':view==='local'?'LOCAL':'SERVIDOR',showDemo?'idle':'online')),
    devices.length ? el('div',{className:'sga-devices'},devices.map(d => el('button',{key:d.id,type:'button',className:'sga-device'+(focused?.id===d.id?' sga-device-selected':''),onClick:()=>setSelectedId(d.id), 'aria-pressed':focused?.id===d.id},
      el('div',{className:'sga-device-header'},el('span',{className:'sga-device-icon'},'▣'),badge(stateName(d.status),d.status)),
      el('strong',{className:'sga-device-title'},d.name),
      el('span',{className:'sga-device-sub'},'ANDROID · '+d.version),
      el('div',{className:'sga-device-stats'},el('span',null,count(d.total)+' consultas'),el('span',null,(d.red===null?'—':count(d.red))+' rojas')),
      el('div',{className:'sga-device-footer'},d.local?'ESTE TELÉFONO':minutes(d.seen)===null?'SIN REGISTRO':'ÚLT. ACTIVIDAD HACE '+minutes(d.seen)+' MIN')))) : el('div',{className:'sga-empty'},'Aún no hay dispositivos verificados para mostrar. No se inventarán estadísticas de usuarios.'),
    focused ? el('div',{className:'sga-detail'},
      el('div',{className:'sga-detail-heading'},el('div',null,el('p',{className:'sga-kicker'},'DETALLE INDIVIDUAL'+(showDemo?' · DEMO':'')),el('h2',null,focused.name)),badge(stateName(focused.status),focused.status)),
      el('div',{className:'sga-detail-grid'},metric('SIN SEÑALES',focused.green,'green'),metric('PRECAUCIÓN',focused.orange,'orange'),metric('RIESGO',focused.red,'red'),metric('TOTAL',focused.total)),
      el('p',{className:'sga-caption'},focused.local && !hasHistory ? 'Activa voluntariamente el historial local desde Privacidad para ver el desglose de los últimos resultados. No se envían mensajes ni enlaces.' : focused.local ? 'El desglose cuenta únicamente los resultados recientes conservados en este teléfono; el total corresponde a todos los procesados desde la última limpieza.' : 'Conteos de resultados, no verdades confirmadas de fraude. La vista no contiene textos de conversaciones ni enlaces privados.'),
      el('div',{className:'sga-detail-footer'},el('span',null,'VERSIÓN '+focused.version),el('span',null,focused.local?'DATOS LOCALES':'ÚLTIMA ACTIVIDAD '+(focused.seen ? new Date(focused.seen).toLocaleString('es-CO') : 'DESCONOCIDA')))) : null,
    el('div',{className:'sga-bottom'},button('ACTUALIZAR',()=>setRefresh(v=>v+1),'outline'),button('VOLVER A SMARTGUARD',onBack,'active')),
    el('p',{className:'sga-footnote'},'Estados verdes: actividad reciente o protección local activa. No indican vigilancia continua. El acceso remoto exige autorización de administrador en el servidor.'));
};
