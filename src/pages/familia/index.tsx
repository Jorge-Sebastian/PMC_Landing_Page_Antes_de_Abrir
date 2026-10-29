import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SignInButton, useSession, useUser } from '@clerk/react';
import {
  AlertTriangle, ArrowRight, BellRing, Check, CheckCheck, ChevronRight, CircleHelp,
  Copy, HeartHandshake, Link2, LockKeyhole, Plus, RefreshCw, Send, ShieldCheck,
  ShieldAlert, Smartphone, Sparkles, UserPlus, Users,
} from 'lucide-react';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { Button } from '@/components/ui/button';
import { makeFamilyApi, type FamilyApi } from '@/family/api';
import {
  demoFamily, invitationLink, parseFamilyDomain,
  type FamilyAlert, type FamilySnapshot,
} from '@/family/model';

const hasClerk = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const shell = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8';

function GuestFamilyLanding({ withAuth = false }: { withAuth?: boolean }) {
  return <div className="min-h-screen bg-background text-foreground">
    <SiteHeader />
    <div className="bg-[#103140] text-white">
      <div className={`${shell} grid items-center gap-8 py-14 md:grid-cols-[1.15fr_0.85fr] md:py-20`}>
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-300/30 bg-teal-300/10 px-4 py-2 text-xs font-semibold tracking-[0.16em] text-teal-200">
            <HeartHandshake className="size-4" /> SMARTGUARD FAMILY
          </span>
          <h1 className="max-w-xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">La seguridad también se cuida en familia.</h1>
          <p className="max-w-lg text-lg text-slate-200">Crea un círculo de confianza para que las personas que quieres puedan pedir ayuda y avisar a quienes eligieron cuando un enlace les genera preocupación.</p>
          <div className="flex flex-wrap gap-3">
            {withAuth ? <SignInButton mode="modal"><Button size="xl" className="bg-teal-300 text-[#103140] hover:bg-teal-200"><Users className="size-4" /> Crear mi familia <ArrowRight className="size-4" /></Button></SignInButton>
              : <Button asChild size="xl" className="bg-teal-300 text-[#103140] hover:bg-teal-200"><Link to="/familia?demo=1">Explorar demostración <ArrowRight className="size-4" /></Link></Button>}
            <Button asChild size="xl" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"><Link to={withAuth?"/familia?demo=1":"/#analizador"}>{withAuth?"Ver demostración interactiva":"Analizar un enlace"}</Link></Button>
          </div>
          <p className="flex items-center gap-2 text-sm text-slate-300"><ShieldCheck className="size-4 text-teal-300" /> El analizador individual continúa funcionando sin registrarse.</p>
        </div>
        <div className="rounded-3xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-sm sm:p-7">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-teal-200"><Users className="size-4" /> TU CÍRCULO DE CONFIANZA</div>
          {[{n:'Abuelo',note:'Puede solicitar ayuda',initial:'A'},{n:'Mamá',note:'Contacto de confianza',initial:'M'},{n:'Tú',note:'Protección individual',initial:'T'}].map((p,i)=><div key={p.n} className="mb-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-3">
            <span className={`grid size-11 place-items-center rounded-2xl font-bold ${i===0?'bg-amber-200 text-amber-900':'bg-teal-100 text-teal-900'}`}>{p.initial}</span>
            <div className="flex-1"><div className="font-semibold">{p.n}</div><div className="text-sm text-slate-300">{p.note}</div></div>
            {i===0?<ShieldAlert className="size-5 text-amber-300"/>:<ShieldCheck className="size-5 text-teal-300"/>}
          </div>)}
          <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-200/10 p-4 text-sm text-amber-100"><BellRing className="mr-2 inline size-4"/> Si alguien solicita ayuda, sus contactos autorizados ven la alerta en SmartGuard.</div>
        </div>
      </div>
    </div>
    <div className={`${shell} grid gap-5 py-12 md:grid-cols-3`}>
      {[{icon:UserPlus,title:'1. Crea tu círculo',body:'Invita a tus familiares con un enlace que caduca y solo puede utilizarse una vez.'},{icon:HeartHandshake,title:'2. Elige quién puede ayudarte',body:'Cada integrante decide a qué personas de confianza desea enviar sus alertas.'},{icon:BellRing,title:'3. Actúa a tiempo',body:'Cuando piden ayuda o continúan después de una advertencia, sus contactos pueden verlo en el panel.'}].map(({icon:Icon,title,body})=><div key={title} className="rounded-2xl border bg-card p-6 shadow-sm"><Icon className="mb-4 size-7 text-teal-700"/><h2 className="mb-2 text-lg font-bold">{title}</h2><p className="leading-relaxed text-muted-foreground">{body}</p></div>)}
    </div>
    {!withAuth?<div className={`${shell} pb-10 text-sm text-muted-foreground`}>La cuenta familiar requiere una conexión de autenticación y una base de datos configuradas. La demostración permite explorar el diseño sin enviar avisos reales.</div>:null}
    <SiteFooter />
  </div>;
}

function FamilyAuthEntry() {
  const { isLoaded, isSignedIn, session } = useSession();
  const { user } = useUser();
  const api = useMemo(() => makeFamilyApi(async () => session?.getToken() ?? null), [session]);
  if (!isLoaded) return <div className="p-10 text-center" role="status">Verificando tu cuenta…</div>;
  if (!isSignedIn) return <GuestFamilyLanding withAuth />;
  return <FamilyBoard mode="live" api={api} defaultNickname={user?.firstName || user?.username || 'Familiar'} />;
}

type BoardProps = { mode: 'live'|'demo'; api?: FamilyApi; defaultNickname: string };

function FamilyBoard({mode,api,defaultNickname}:BoardProps) {
  const isDemo = mode === 'demo';
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [inviteToken,setInviteToken] = useState(() => {
    try {
      return window.sessionStorage.getItem('smartguard-family-pending-invite')
        || new URLSearchParams(window.location.hash.replace(/^#/, '')).get('invitacion')
        || params.get('invitacion') || '';
    } catch { return params.get('invitacion') || ''; }
  });
  const domain = parseFamilyDomain(params.get('dominio'));
  const [snapshot,setSnapshot] = useState<FamilySnapshot>(isDemo ? structuredClone(demoFamily) : {families:[]});
  const [selectedId,setSelectedId] = useState('');
  const [loading,setLoading] = useState(!isDemo);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [newName,setNewName] = useState('Mi familia');
  const [nickname,setNickname] = useState(defaultNickname);
  const [inviteLink,setInviteLink] = useState('');
  const [showCreate,setShowCreate] = useState(false);
  const [joinNickname,setJoinNickname] = useState(defaultNickname);
  const [demoInvited,setDemoInvited] = useState(false);
  const [showWarningAction,setShowWarningAction] = useState(false);

  const reload = useCallback(async (showBusy = false) => {
    if (!api || isDemo) return;
    if (showBusy) setLoading(true);
    try {
      const data = await api.snapshot();
      setSnapshot(data);
      setError('');
    } catch(e) {
      setError(e instanceof Error ? e.message : 'No pudimos cargar las familias.');
    } finally { if (showBusy) setLoading(false); }
  },[api,isDemo]);
  useEffect(()=>{ if(!isDemo) void reload(true); },[isDemo,reload]);
  useEffect(()=>{
    if(isDemo) return;
    const tick=()=>{ if(!document.hidden) void reload(false); };
    const timer=window.setInterval(tick,10000);
    return ()=>window.clearInterval(timer);
  },[isDemo,reload]);
  useEffect(()=>{
    if(inviteToken){
      const next=new URL(window.location.href); next.searchParams.delete('invitacion');
      if(next.hash.startsWith('#invitacion=')) next.hash='';
      window.history.replaceState(window.history.state,'',next.pathname+next.search+next.hash);
    }
  },[inviteToken]);

  const family = snapshot.families.find(f=>f.id===selectedId) || snapshot.families[0];
  const recipients = family?.members.filter(m=>m.trusted_by_me && !m.is_me) || [];
  // Real inbox: only recipient=current user. The snapshot also contains alerts the
  // current user sent, but those are displayed separately as outgoing events.
  const myId = family?.members.find(m=>m.is_me)?.user_id || 'demo-self';
  const received = (family?.alerts || []).filter(a=>a.recipient_id === myId);
  const outgoing = (family?.alerts || []).filter(a=>a.actor_id === myId && a.recipient_id !== myId);
  const unread = received.filter(a=>!a.acknowledged_at).length;

  const perform = async (action:string,payload:Record<string,unknown>={})=>{
    setError(''); setNotice(''); setBusy(true);
    try{
      if(isDemo){
        const active = family?.id || 'familia-demo';
        if(action==='create'){
          const id='demo-familia-'+Date.now();
          setSnapshot(s=>({families:[...s.families,{id,name:String(payload.name),role:'owner',created_at:new Date().toISOString(),invites_sent:0,invites_accepted:0,members:[{user_id:'demo-self',nickname:String(payload.nickname),role:'owner',is_me:true,trusted_by_me:false}],alerts:[]}]}));
          setSelectedId(id);setShowCreate(false);setNotice('Familia de demostración creada. Los datos no salen de esta página.');
        } else if(action==='invite'){
          setSnapshot(s=>({families:s.families.map(f=>f.id===active?{...f,invites_sent:f.invites_sent+1}:f)}));
          setInviteLink(invitationLink(window.location.origin,'demo-'+Date.now(),true));
          setDemoInvited(true);setNotice('Invitación de demostración generada. No sirve para invitar cuentas reales.');
        } else if(action==='demo-accept'){
          setSnapshot(s=>({families:s.families.map(f=>f.id===active?{...f,invites_accepted:f.invites_accepted+1,members:[...f.members,{user_id:'demo-nuevo-'+Date.now(),nickname:'Nuevo familiar',role:'member',is_me:false,trusted_by_me:false}]}:f)}));
          setDemoInvited(false);setNotice('Aceptación simulada. En producción la otra persona deberá iniciar sesión y aceptar.');
        } else if(action==='trust'){
          setSnapshot(s=>({families:s.families.map(f=>f.id===active?{...f,members:f.members.map(m=>m.user_id===payload.trusted_user_id?{...m,trusted_by_me:payload.enabled===true}:m)}:f)}));
          setNotice('Consentimiento actualizado en la demostración.');
        } else if(action==='demo-incoming'){
          setSnapshot(s=>({families:s.families.map(f=>f.id===active?{...f,alerts:[{id:'alerta-'+Date.now(),actor_id:'demo-abuelo',recipient_id:'demo-self',event_type:'continued_after_warning',origin:'client_reported',domain:'pagina-de-prueba.test',created_at:new Date().toISOString(),acknowledged_at:null},...f.alerts]}:f)}));
          setNotice('Alerta de ejemplo recibida. Ninguna notificación real se ha enviado.');
        } else if(action==='ack'){
          setSnapshot(s=>({families:s.families.map(f=>f.id===active?{...f,alerts:f.alerts.map(a=>a.id===payload.alert_id?{...a,acknowledged_at:new Date().toISOString()}:a)}:f)}));
          setNotice('Alerta de demostración revisada.');
        } else if(action==='alert'){
          setNotice('En una familia real, se enviaría un aviso a tus contactos de confianza. Esta es solo una simulación.');
        } else if(action==='leave'){
          setSnapshot(s=>({families:s.families.filter(f=>f.id!==active)}));setSelectedId('');setNotice('Círculo de demostración eliminado.');
        } else if(action==='join'){
          setNotice('Esta invitación de demostración no vincula cuentas reales.');
        }
      } else if(api) {
        const r=await api.operation(action,payload) as Record<string,unknown>;
        if(action==='invite'){
          const token=String(r?.token||'');
          if(!/^[0-9a-f]{64}$/.test(token)) throw new Error('La invitación no tiene un token válido.');
          setInviteLink(invitationLink(window.location.origin,token));
          setNotice('Invitación privada creada. Caduca en 72 horas y solo puede aceptarse una vez.');
        } else if(action==='alert'){
          const sent=Number(r?.sent||0);
          setNotice(sent>0?`Aviso disponible para ${sent} contacto${sent===1?'':'s'} de confianza. No se envía un SMS.`:'No se envió ningún aviso. Primero asigna al menos un contacto de confianza.');
        } else if(action==='join'){
          setNotice('¡Invitación aceptada! Ya formas parte del círculo familiar.');
          setInviteToken('');
          try { window.sessionStorage.removeItem('smartguard-family-pending-invite'); } catch { /* storage may be unavailable */ }
        } else {
          setNotice('Cambios guardados en tu círculo familiar.');
        }
        await reload();
        if(action==='create')setShowCreate(false);
      } else throw new Error('No se ha configurado la conexión familiar.');
    } catch(e){setError(e instanceof Error?e.message:'No se pudo guardar el cambio.');}
    finally{setBusy(false);}
  };

  const create = () => void perform('create',{name:newName.trim(),nickname:nickname.trim()});
  const join = () => void perform('join',{token:inviteToken,nickname:joinNickname.trim()});
  const send = (event_type:'help_requested'|'continued_after_warning') => {
    if(!family)return;
    void perform('alert',{family_id:family.id,event_type,domain});
    setShowWarningAction(false);
  };
  const displayName = (id:string) => family?.members.find(m=>m.user_id===id)?.nickname || 'Un familiar';

  return <div className="min-h-screen bg-[#f6fafb] text-foreground">
    <SiteHeader />
    {isDemo?<div className="border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-950">MODO DEMOSTRACIÓN · Datos ficticios · No se envían alertas ni invitaciones reales</div>:null}
    <section className="relative overflow-hidden bg-[#103140] text-white">
      <div className="absolute -right-28 -top-32 size-96 rounded-full bg-teal-400/10 blur-3xl" aria-hidden="true"/>
      <div className={`${shell} relative flex flex-wrap items-center justify-between gap-6 py-9 sm:py-11`}>
        <div className="max-w-2xl space-y-3">
          <p className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-teal-200"><HeartHandshake className="size-4"/> SMARTGUARD FAMILY</p>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Quienes más quieres, mejor acompañados.</h1>
          <p className="text-sm leading-relaxed text-slate-200 sm:text-base">Una red de confianza para acompañar a tus familiares ante enlaces sospechosos, sin leer sus conversaciones ni controlar sus teléfonos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"><Link to="/#analizador"><ShieldCheck className="size-4"/> Analizar un enlace</Link></Button>
          <Button onClick={()=>void reload(true)} disabled={busy||isDemo} variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"><RefreshCw className="size-4"/> Actualizar</Button>
        </div>
      </div>
    </section>
    <main className={`${shell} space-y-6 py-8 sm:py-10`}>
      {error?<div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"><AlertTriangle className="mt-0.5 size-4 shrink-0"/>{error}</div>:null}
      {notice?<div role="status" className="flex items-start gap-2 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900"><Check className="mt-0.5 size-4 shrink-0"/>{notice}</div>:null}
      {loading?<p role="status" className="rounded-xl border bg-white p-6">Consultando tus círculos familiares…</p>:null}

      {inviteToken?<section className="rounded-2xl border-2 border-teal-300 bg-white p-5 shadow-sm sm:p-6" aria-label="Aceptar invitación">
        <div className="mb-3 flex items-center gap-2 text-lg font-bold"><UserPlus className="size-5 text-teal-700"/> Te invitaron a una familia</div>
        <p className="mb-3 text-sm text-muted-foreground">Acepta solamente si conoces a quien te invitó. Al unirte no compartirás alertas hasta que elijas a tus contactos de confianza.</p>
        <div className="flex flex-wrap items-end gap-3"><label className="grid min-w-[200px] flex-1 gap-1 text-sm font-medium">Cómo quieres que te llamen<input className="rounded-xl border bg-white p-3" maxLength={60} value={joinNickname} onChange={e=>setJoinNickname(e.target.value)}/></label>
        <Button onClick={join} disabled={busy||joinNickname.trim().length<2} className="h-12">Aceptar invitación <ArrowRight className="size-4"/></Button></div>
      </section>:null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {snapshot.families.length>1?<label className="text-sm font-semibold">Círculo <select aria-label="Seleccionar familia" value={family?.id||''} onChange={e=>setSelectedId(e.target.value)} className="ml-2 rounded-xl border bg-white px-3 py-2">{snapshot.families.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>:null}
          {snapshot.families.length===1?<span className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-bold"><Users className="size-4 text-teal-700"/>{family?.name}</span>:null}
        </div>
        <Button variant="outline" onClick={()=>setShowCreate(v=>!v)}><Plus className="size-4"/> Nuevo círculo</Button>
      </div>
      {(showCreate||!family)&&<section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Crear un círculo familiar</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tú decides a quién invitar. Cada miembro conserva el control de sus alertas.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="grid gap-1 text-sm font-medium">Nombre del círculo<input value={newName} onChange={e=>setNewName(e.target.value)} maxLength={64} className="h-12 rounded-xl border px-3" placeholder="Por ejemplo, Familia Gómez"/></label>
          <label className="grid gap-1 text-sm font-medium">Tu nombre en el grupo<input value={nickname} onChange={e=>setNickname(e.target.value)} maxLength={60} className="h-12 rounded-xl border px-3"/></label>
          <Button className="h-12" onClick={create} disabled={busy||newName.trim().length<3||nickname.trim().length<2}>Crear familia</Button>
        </div>
      </section>}

      {family?<>
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric icon={<Users className="size-5"/>} value={String(family.members.length)} title="Integrantes" subtitle="Círculo privado y voluntario"/>
          <Metric icon={<BellRing className="size-5"/>} value={String(unread)} title="Alertas por revisar" subtitle="Solo las dirigidas a ti"/>
          <Metric icon={<UserPlus className="size-5"/>} value={`${family.invites_accepted}/${family.invites_sent}`} title="Invitaciones aceptadas" subtitle="Así crece la protección familiar"/>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6" aria-labelledby="members-title">
            <div className="flex items-center justify-between gap-3"><div><h2 id="members-title" className="text-xl font-bold">Personas de tu círculo</h2><p className="mt-1 text-sm text-muted-foreground">Cada persona elige si quiere avisarte o recibir tu ayuda.</p></div><Users className="size-6 text-teal-700"/></div>
            <div className="mt-5 space-y-3">
              {family.members.map((member,i)=><div key={member.user_id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-[#f8fbfc] p-3 sm:p-4">
                <span className={`grid size-11 shrink-0 place-items-center rounded-xl text-lg font-extrabold ${i%2===0?'bg-teal-100 text-teal-900':'bg-amber-100 text-amber-900'}`}>{member.nickname.slice(0,1).toUpperCase()}</span>
                <div className="min-w-0 flex-1"><p className="font-bold">{member.nickname} {member.is_me?<span className="ml-1 text-xs font-medium text-muted-foreground">(Tú)</span>:null}</p><p className="text-xs text-muted-foreground">{member.role==='owner'?'Responsable del círculo':'Integrante protegido'}</p></div>
                {member.is_me?<span className="flex items-center gap-1 text-xs text-teal-800"><ShieldCheck className="size-4"/> Tú decides</span>
                  :<Button size="sm" className={member.trusted_by_me?'bg-teal-700 text-white hover:bg-teal-800':''} variant={member.trusted_by_me?'default':'outline'} disabled={busy} onClick={()=>void perform('trust',{family_id:family.id,trusted_user_id:member.user_id,enabled:!member.trusted_by_me})}>
                    {member.trusted_by_me?<CheckCheck className="size-4"/>:<HeartHandshake className="size-4"/>}
                    {member.trusted_by_me?'Contacto de confianza':'Elegir contacto'}
                  </Button>}
              </div>)}
            </div>
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-teal-50 p-3 text-sm text-teal-900"><LockKeyhole className="mt-0.5 size-4 shrink-0"/> Solo las personas que selecciones recibirán tus alertas. Ser responsable del grupo no da acceso a conversaciones privadas.</p>
          </section>
          <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6" aria-labelledby="invite-title">
            <div className="flex items-start gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[#e0f4f1] text-teal-800"><UserPlus className="size-6"/></span><div><h2 id="invite-title" className="text-xl font-bold">Invita a alguien importante</h2><p className="mt-1 text-sm text-muted-foreground">La protección familiar crece cuando cada integrante trae a otra persona.</p></div></div>
            <ol className="mt-6 space-y-4 text-sm">
              {[['1','Generas una invitación privada'],['2','La compartes con un familiar'],['3','La persona acepta y entra'],['4','Puede invitar a alguien más']].map(([n,label])=><li key={n} className="flex items-center gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-teal-100 font-bold text-teal-800">{n}</span>{label}</li>)}
            </ol>
            <Button className="mt-6 w-full" disabled={busy||family.members.length>=10} onClick={()=>void perform('invite',{family_id:family.id})}><Send className="size-4"/> Generar invitación</Button>
            {inviteLink?<div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-3"><p className="mb-2 text-xs font-bold text-teal-800">{isDemo?'ENLACE DE DEMOSTRACIÓN':'INVITACIÓN DE UN SOLO USO · 72 HORAS'}</p><input readOnly aria-label="Enlace de invitación" className="w-full rounded-lg border bg-white p-2 text-xs" value={inviteLink} onFocus={e=>e.target.select()}/><Button size="sm" variant="outline" className="mt-2 w-full" onClick={()=>{void navigator.clipboard?.writeText(inviteLink).then(()=>setNotice('Enlace copiado al portapapeles.')).catch(()=>setNotice('Selecciona y copia el enlace de la casilla.'));}}><Copy className="size-4"/> Copiar invitación</Button>
              {isDemo&&demoInvited?<Button size="sm" variant="outline" className="mt-2 w-full" onClick={()=>void perform('demo-accept')}>Simular aceptación del familiar</Button>:null}
            </div>:null}
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">La invitación no permite ver los mensajes de nadie. Cada familiar acepta y configura sus propios permisos.</p>
          </section>
        </div>
        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6" aria-labelledby="help-title">
            <div className="flex items-center gap-2"><HeartHandshake className="size-6 text-teal-700"/><h2 id="help-title" className="text-xl font-bold">Pide ayuda antes de abrir</h2></div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Si un enlace te preocupa, avisa a tus contactos de confianza. También puedes comunicar que estás pensando continuar a pesar de una advertencia de SmartGuard.</p>
            {domain?<p className="mt-3 flex items-center gap-2 rounded-xl border bg-slate-50 p-3 text-sm"><Link2 className="size-4"/><span className="break-all font-semibold">Dominio analizado: {domain}</span></p>:null}
            <div className="mt-4 rounded-xl bg-[#eff9f6] p-3 text-sm text-teal-900">Avisarías a: <strong>{recipients.length?recipients.map(m=>m.nickname).join(', '):'ningún contacto todavía'}</strong></div>
            <Button disabled={busy||recipients.length===0} className="mt-4 w-full" onClick={()=>send('help_requested')}><BellRing className="size-4"/> Solicitar ayuda familiar</Button>
            <Button disabled={busy||recipients.length===0} variant="outline" className="mt-2 w-full" onClick={()=>setShowWarningAction(v=>!v)}><AlertTriangle className="size-4"/> Avisar que podría continuar</Button>
            {showWarningAction?<div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><strong>Importante:</strong> esta opción informa a tus contactos de que estás considerando continuar después de una advertencia. No abre el enlace y no demuestra que lo hayas abierto desde otra aplicación.<Button size="sm" className="mt-3 w-full" onClick={()=>send('continued_after_warning')} disabled={busy}>Confirmar y avisar a mis contactos</Button></div>:null}
            <p className="mt-3 text-xs text-muted-foreground">Los avisos aparecen en el panel familiar; por ahora no son llamadas, SMS ni notificaciones automáticas del sistema.</p>
            {isDemo?<Button onClick={()=>void perform('demo-incoming')} variant="outline" className="mt-4 w-full border-dashed"><Sparkles className="size-4"/> Simular alerta entrante del abuelo</Button>:null}
          </section>
          <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6" aria-labelledby="alerts-title">
            <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><BellRing className="size-6 text-teal-700"/><h2 id="alerts-title" className="text-xl font-bold">Alertas que necesitan atención</h2></div><span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-900">{unread} nueva{unread===1?'':'s'}</span></div>
            {received.length===0?<div className="mt-5 rounded-xl border border-dashed p-8 text-center"><ShieldCheck className="mx-auto mb-3 size-9 text-teal-700"/><p className="font-semibold">Todo tranquilo por ahora</p><p className="mt-1 text-sm text-muted-foreground">Cuando un familiar te elija como contacto y pida ayuda, verás su aviso aquí.</p></div>
              :<div className="mt-5 max-h-[420px] space-y-3 overflow-auto">{received.map(alert=><AlertItem key={alert.id} alert={alert} actor={displayName(alert.actor_id)} disabled={busy} onAcknowledge={()=>void perform('ack',{family_id:family.id,alert_id:alert.id})}/>)}</div>}
            {outgoing.length>0?<p className="mt-5 text-xs text-muted-foreground">También has enviado {outgoing.length} aviso{outgoing.length===1?'':'s'} a tus contactos de confianza.</p>:null}
          </section>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t py-4 text-xs text-muted-foreground"><span className="inline-flex items-center gap-2"><LockKeyhole className="size-4"/> Sin acceso a chats, mensajes privados ni navegación ajena.</span><button type="button" onClick={()=>{if(window.confirm('¿Quieres salir de esta familia? Si eres responsable, solo puedes hacerlo cuando no hay otros integrantes.'))void perform('leave',{family_id:family.id});}} className="flex items-center gap-1 underline underline-offset-2">Salir de este círculo <ChevronRight className="size-4"/></button></div>
      </>:null}
      {!family&&!showCreate&&!loading?<div className="rounded-2xl border border-dashed bg-white p-10 text-center"><Users className="mx-auto mb-3 size-12 text-teal-700"/><h2 className="text-xl font-bold">Crea tu primer círculo familiar</h2><p className="mt-2 text-muted-foreground">La protección individual no necesita cuenta. Para activar la protección compartida, crea un círculo.</p><Button className="mt-5" onClick={()=>setShowCreate(true)}><Plus className="size-4"/> Crear familia</Button></div>:null}
      <div className="rounded-2xl border bg-white p-4 text-sm text-muted-foreground"><CircleHelp className="mr-2 inline size-4"/> Esta primera etapa permite registrar eventos de ayuda o intención de continuar dentro de SmartGuard. No detecta automáticamente aperturas externas en WhatsApp, SMS u otras aplicaciones.</div>
    </main>
    <SiteFooter/>
  </div>;
}

function Metric({icon,value,title,subtitle}:{icon:React.ReactNode;value:string;title:string;subtitle:string}){
  return <div className="flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-sm"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-teal-100 text-teal-800">{icon}</span><div><div className="text-2xl font-black text-[#103140]">{value}</div><div className="font-semibold">{title}</div><div className="text-xs text-muted-foreground">{subtitle}</div></div></div>;
}

function AlertItem({alert,actor,disabled,onAcknowledge}:{alert:FamilyAlert;actor:string;disabled:boolean;onAcknowledge:()=>void}){
  const isWarning=alert.event_type==='continued_after_warning';
  return <article className={`rounded-xl border p-4 ${alert.acknowledged_at?'border-slate-200 bg-slate-50':'border-amber-300 bg-amber-50'}`}>
    <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-amber-700"><ShieldAlert className="size-5"/></span><div className="flex-1"><div className="font-bold text-slate-900">{actor} {isWarning?'podría continuar hacia un enlace sospechoso':'solicitó tu ayuda'}</div><p className="mt-1 text-sm text-slate-700">{isWarning?'Avisó desde SmartGuard que estaba considerando continuar después de una advertencia.':'Quiere ayuda para decidir qué hacer con un enlace.'}</p>
      {alert.domain?<div className="mt-2 break-all text-xs text-slate-600">Dominio: {alert.domain}</div>:null}
      <p className="mt-2 text-xs text-slate-500">{new Date(alert.created_at).toLocaleString('es-CO')} · Evento informado desde SmartGuard, no apertura externa verificada</p>
      <div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-teal-800"><Smartphone className="mr-1 inline size-3"/> Comunícate directamente con él o ella</span>
      {!alert.acknowledged_at?<Button size="sm" onClick={onAcknowledge} disabled={disabled}><Check className="size-3"/> Marcar atendida</Button>:<span className="inline-flex items-center gap-1 text-xs text-slate-500"><CheckCheck className="size-3"/> Atendida</span>}</div>
    </div></div>
  </article>;
}

export default function FamilyPage(){
  const demo = new URLSearchParams(window.location.search).get('demo')==='1';
  return demo?<FamilyBoard mode="demo" defaultNickname="Tú"/>:hasClerk?<FamilyAuthEntry/>:<GuestFamilyLanding/>;
}
