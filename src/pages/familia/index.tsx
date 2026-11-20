import { useCallback, useEffect, useMemo, useState } from 'react';
import FamilyInvitationLanding from './invitation-landing';
import { COMMERCIAL_ENABLED, PILOT_CODES, fetchCommercialAccess } from '@/mobile/commercial-client';
import { confirmedFamily } from '@/mobile/commercial-policy';
import { Link } from 'react-router-dom';
import { isAndroidPilot, Protection } from '@/mobile/native';
import {
  ArrowLeft, BellRing, CheckCircle2, Copy, ExternalLink, HeartHandshake,
  Link2, LockKeyhole, LogIn, Plus, RefreshCcw, SearchCheck, ShieldAlert,
  ShieldCheck, ShieldQuestion, Trash2, UserPlus, UsersRound, XCircle,
} from 'lucide-react';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { Button } from '@/components/ui/button';
import { normalizeInput } from '@/lib/link-analysis/normalize-input';
import { checkDestination } from '@/lib/link-analysis/check-destination';
import { buildVerdict } from '@/lib/link-analysis/build-verdict';
import { createConsentedFamilyRiskEvent, MAX_FAMILY_ROOM_MEMBERS, type FamilyRiskEvent } from '@/family/risk-event';
import { relatedFamilyRisks } from '@/family/risk-matching';

type FamilyMember = { nickname: string; shareRisks: boolean; role: 'host' | 'member'; previousUids?:string[] };
type Room = { code: string; name: string; hostUid: string; open: boolean; members: Record<string, FamilyMember> };
type Risk = { id: string; memberUid: string; domain: string; color: 'red'; source: 'manual'|'notification'; createdAt: string|null };
type Client = {
  MAX_MEMBERS: number;
  ensureUser(): Promise<{uid:string;anonymous:boolean}>;
  useHostAccount(email: string, password: string, create?: boolean): Promise<{uid:string;anonymous:boolean}>;
  exitHostAccount(): Promise<void>;
  createFamilyRoom(name:string,nickname:string,shareRisks:boolean):Promise<string>;
  joinFamilyRoom(code:string,nickname:string,shareRisks:boolean):Promise<string>;
  inspectRoom(code:string):Promise<Room>;
  updateMyProfile(code:string,nickname:string,shareRisks:boolean):Promise<void>;
  removeMember(code:string,uid:string):Promise<void>;
  deleteMySharedRisks(code:string):Promise<number>;
  publishRedRisk(code:string,event:{registrableDomain:string;level:'red';source:'manual'}):Promise<string>;
  setRoomOpen(code:string,value:boolean):Promise<void>;
  watchRoom(code:string,callback:(room:Room|null)=>void,fail:(err:Error)=>void):()=>void;
  watchRiskEvents(code:string,callback:(events:Risk[])=>void,fail:(err:Error)=>void):()=>void;
  storedRoomCode():string|null;
  getInvitationCodeFromUrl():string|null;
  normalizeCode(code:string):string|null;
  invitationLink(code:string):string;
  getNativeFamilySession():Promise<{uid:string;refreshToken:string}>;
  forgetRoom():void;
  requestFamilyRecovery(code:string,oldUid:string):Promise<{status:string}>;
  getFamilyRecovery(code:string):Promise<{status:string;oldUid:string}|null>;
  watchFamilyRecoveryRequests(code:string,cb:(items:Array<{id:string;oldUid:string;newUid:string}>)=>void,fail:(e:Error)=>void):()=>void;
  approveFamilyRecovery(code:string,newUid:string):Promise<void>;
};
const loadClient = async ():Promise<Client> => {
  // Public static module imports the preexisting Firebase SDK 13.1.0 from gstatic.
  // SDK not bundled twice; its config is the original public SmartGuard Firebase app.
  const moduleUrl = new URL('/smartguard-family/client.js', window.location.origin).href;
  return (await import(/* @vite-ignore */ moduleUrl)) as Client;
};
const commonCard = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6';
const fieldStyle = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600';
const titleStyle = 'text-xl font-bold tracking-tight text-slate-900';

function FamilyExperience({ embedded = false, canCreate = true }: { embedded?: boolean; canCreate?: boolean } = {}) {
  const [api,setApi] = useState<Client|null>(null);
  const [uid,setUid] = useState('');
  const [anonymous,setAnonymous] = useState(true);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState('');
  const [error,setError] = useState('');
  const [codeInput,setCodeInput] = useState('');
  const [roomCode,setRoomCode] = useState('');
  const [room,setRoom] = useState<Room|null>(null);
  const [events,setEvents] = useState<Risk[]>([]);
  const [mode,setMode] = useState<'join'|'create'|'recover'>('join');
  const [recoveryList,setRecoveryList] = useState<Room|null>(null);
  const [recoverySelected,setRecoverySelected] = useState('');
  const [recoveryPending,setRecoveryPending] = useState(false);
  const [recoveryRequests,setRecoveryRequests] = useState<Array<{id:string;oldUid:string;newUid:string}>>([]);
  const [roomName,setRoomName] = useState('Mi familia');
  const [nickname,setNickname] = useState('');
  const [consent,setConsent] = useState(false);
  const [selectedMember,setSelectedMember] = useState('all');
  const [manualText,setManualText] = useState('');
  const [analysis,setAnalysis] = useState<{level:string;domain:string;summary:string}|null>(null);
  const [hostEmail,setHostEmail] = useState('');
  const [hostPassword,setHostPassword] = useState('');

  useEffect(() => {
    let active = true;
    const setup = async () => {
      try {
        const bridge = await loadClient();
        const signed = await bridge.ensureUser();
        if (!active) return;
        setApi(bridge);setUid(signed.uid);setAnonymous(signed.anonymous);
        const invitation = bridge.getInvitationCodeFromUrl();
        const remembered = bridge.storedRoomCode();
        if (invitation) { setCodeInput(invitation); setMode('join'); }
        else if (remembered) {
          setCodeInput(remembered);
          const result = await bridge.inspectRoom(remembered);
          if (!active) return;
          if (result.members?.[signed.uid]) setRoomCode(remembered);
        }
      } catch(e) {
        if (active) setError(e instanceof Error ? e.message : 'No se pudo conectar con Firebase.');
      } finally { if (active) setLoading(false); }
    };
    void setup();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!api || !roomCode) return;
    const fail = (e:Error) => setError('No se pudo actualizar la sala: '+e.message);
    const unsubscribeRoom = api.watchRoom(roomCode, current => {
      setRoom(current);
      if (current && uid && !current.members?.[uid]) {
        setError('Tu membresía ya no está activa. Puedes unirte de nuevo si tienes una invitación válida.');
        setRoomCode(''); setEvents([]); api.forgetRoom();
      }
    },fail);
    const unsubscribeEvents = api.watchRiskEvents(roomCode, setEvents, fail);
    return () => {unsubscribeRoom();unsubscribeEvents();};
  },[api,roomCode,uid]);

  const sharingAllowed=room?.members?.[uid]?.shareRisks===true;
  useEffect(()=>{
    if(!isAndroidPilot || !api || !roomCode || !room?.members?.[uid]) return;
    let current=true;
    const connect=async()=>{
      try{
        // Readers remain linked even when they decline to publish their own risks.
        // Native upload stays disabled unless shareRisks is explicitly true.
        const session=await api.getNativeFamilySession();
        if(current)await Protection.firebaseFamilySession({uid:session.uid,refreshToken:session.refreshToken,code:roomCode,share:sharingAllowed});
      }catch{if(current)setError('El historial funciona, pero la sincronización Android Family requiere reconexión.');}
    };
    void connect();
    return ()=>{current=false;};
  },[api,roomCode,uid,sharingAllowed,Boolean(room)]);
  useEffect(()=>{
    if(!api||!roomCode||room?.hostUid!==uid)return;
    return api.watchFamilyRecoveryRequests(roomCode,setRecoveryRequests,
      e=>setError('No se pudieron consultar las solicitudes de reingreso: '+e.message));
  },[api,roomCode,uid,room?.hostUid]);
  const me=room?.members?.[uid];
  const members=useMemo(()=>Object.entries(room?.members||{}).map(([id,m])=>({uid:id,...m})),[room]);
  const selectedEvents=useMemo(()=>selectedMember==='all'?events:events.filter(e=>
    e.memberUid===selectedMember||room?.members?.[selectedMember]?.previousUids?.includes(e.memberUid)),
    [events,selectedMember,room]);
  const historicalNickname=(eventUid:string)=>Object.entries(room?.members||{}).find(
    ([id,m])=>id===eventUid||m.previousUids?.includes(eventUid))?.[1].nickname||'Integrante anterior';
  const isHost=room?.hostUid===uid;
  const memberEvents=useMemo<FamilyRiskEvent[]>(()=>events.map(e=>({
    id:e.id,memberId:e.memberUid,memberNickname:historicalNickname(e.memberUid),
    registrableDomain:e.domain,observedAt:e.createdAt||'',source:e.source,level:'red',
  })),[events,room]);
  const run = async (fn:()=>Promise<void>, metric?:'family_create'|'family_join'|'family_manual') => {
    if (busy) return;
    setBusy(true);setNotice('');setError('');
    const ticket = metric && isAndroidPilot
      ? await Protection.performanceStart({kind:metric}).catch(() => null) : null;
    let success = false;
    try { await fn(); success = true; } catch(e) {setError(e instanceof Error?e.message:'Ocurrió un error.');}
    finally {
      if(ticket) void Protection.performanceStop({ticket:ticket.ticket,success}).catch(()=>{});
      setBusy(false);
    }
  };
  const makeRoom = () => void run(async()=>{
    if (!canCreate) throw new Error('Crear un grupo requiere un plan Familiar propio o una prueba vigente.');
    if (!api) return;
    const code=await api.createFamilyRoom(roomName,nickname,consent);
    setRoomCode(code); setNotice('Sala creada y guardada en Firebase. Ya puedes compartirla.');
  },'family_create');
  const joinRoom = () => void run(async()=>{
    if (!api) return;
    const code=await api.joinFamilyRoom(codeInput,nickname,consent);
    setRoomCode(code);setNotice('Te uniste a una sala persistente.');
  },'family_join');
  const lookupRecovery=()=>void run(async()=>{
    if(!api)return;
    const result=await api.inspectRoom(codeInput);
    setRecoveryList(result);
    setRecoverySelected('');
    setRecoveryPending((await api.getFamilyRecovery(result.code))?.status==='pending');
    if(result.members?.[uid])setRoomCode(result.code);
  });
  const requestRecovery=()=>void run(async()=>{
    if(!api||!recoveryList||!recoverySelected)throw new Error('Selecciona tu perfil anterior.');
    await api.requestFamilyRecovery(recoveryList.code,recoverySelected);
    setRecoveryPending(true);
    setNotice('Solicitud enviada al anfitrión. Tu perfil no se duplicará.');
  });
  const checkRecovery=()=>void run(async()=>{
    if(!api||!recoveryList)return;
    const result=await api.inspectRoom(recoveryList.code);
    if(result.members?.[uid]){
      setRoomCode(result.code);setNotice('Perfil recuperado. ¡Bienvenido de nuevo!');
      window.dispatchEvent(new Event('smartguard:commercial-updated'));
    }else{
      const status=await api.getFamilyRecovery(result.code);
      setRecoveryPending(status?.status==='pending');
      setNotice(status?.status==='pending'?'Esperando aprobación del anfitrión.':
        status?.status==='rejected'?'El anfitrión rechazó la solicitud.':'No hay una recuperación aprobada.');
    }
  });
  const loginHost = (create:boolean) => void run(async()=>{
    if (!api) return;
    const user = await api.useHostAccount(hostEmail,hostPassword,create);
    setUid(user.uid);setAnonymous(user.anonymous);
    setNotice(create?'Cuenta del anfitrión creada. Ya puedes crear tu sala.':'Sesión del anfitrión iniciada.');
  });
  const copy = async (v:string) => {
    try { await navigator.clipboard.writeText(v);setNotice('Copiado al portapapeles.'); }
    catch {setNotice('Selecciona y copia el texto manualmente.');}
  };
  const analyze = () => void run(async()=>{
    if (!room || !api || !me) return;
    setAnalysis(null);
    const normalized = normalizeInput(manualText);
    if (!normalized.ok) {setError('Pega un mensaje que contenga un enlace HTTP o HTTPS válido.');return;}
    const destination = await checkDestination(normalized.url);
    const verdict = buildVerdict(normalized.url,destination);
    const hostname = new URL(normalized.url).hostname;
    setAnalysis({level:verdict.level,domain:hostname,summary:verdict.level==='riesgo'?'El analizador detectó señales de alto riesgo.':verdict.level==='precaucion'?'Hay señales de precaución o comprobaciones incompletas.':'No se detectaron señales suficientes de alto riesgo.'});
    if(verdict.level==='riesgo' && me.shareRisks) {
      const clean=createConsentedFamilyRiskEvent({
        url:normalized.url,memberId:uid,memberNickname:me.nickname,observedAt:new Date().toISOString(),
        source:'manual',level:'red',familySharingAllowed:true,
      });
      if(!clean) {setNotice('El enlace incluye datos privados o no permite compartir el dominio. El análisis quedó local.');return;}
      await api.publishRedRisk(room.code,{registrableDomain:clean.registrableDomain,level:'red',source:'manual'});
      setNotice('Resultado rojo guardado en Firebase y compartido con tu familia.');
    } else if(verdict.level==='riesgo') {
      setNotice('Resultado rojo analizado, pero no compartido: no has autorizado compartir riesgos.');
    } else {
      setNotice('El resultado no es rojo; no se agregó al historial familiar.');
    }
  },'family_manual');
  const related=analysis && analysis.level!=='sin-senales' ? relatedFamilyRisks(analysis.domain,memberEvents,uid).slice(0,5):[];

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    {!embedded ? <SiteHeader /> : null}
    <main>
      <div className="bg-[#0d3440] text-white">
        <div className="section-shell py-10 sm:py-14">
          <Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm text-teal-200 hover:text-white"><ArrowLeft className="size-4"/> Volver a SmartGuard</Link>
          <p className="mb-3 flex items-center gap-2 text-sm font-bold tracking-[0.15em] text-teal-200"><HeartHandshake className="size-5"/> SMARTGUARD FAMILY</p>
          <h1 className="max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">Una familia. Más protección para todos.</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-200">{canCreate?'Crea una sala':'Entra a la sala a la que te invitaron'} de hasta {MAX_FAMILY_ROOM_MEMBERS} personas. Comparte resultados peligrosos con consentimiento y descubre si ese dominio ya apareció en tu familia.</p>
          <p className="mt-3 text-sm text-teal-200">{COMMERCIAL_ENABLED ? "Solo prueba o Premium Familiar vigente · Máximo diez integrantes" : "Piloto gratuito · Los integrantes no necesitan correo ni contraseña"}</p>
        </div>
      </div>
      <div className="section-shell space-y-6 py-8 sm:py-12">
        {error ? <div role="alert" className="flex gap-2 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-900"><XCircle className="mt-0.5 size-5 shrink-0"/>{error}</div>:null}
        {notice ? <div role="status" className="flex gap-2 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm font-medium text-teal-900"><CheckCircle2 className="mt-0.5 size-5 shrink-0"/>{notice}</div>:null}
        {loading ? <div className={commonCard} role="status">Conectando con Firebase…</div> : !roomCode ? <div className="mx-auto max-w-2xl space-y-5">
          <div className={commonCard}>
            <div role="group" aria-label="Elige cómo participar" className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              <button type="button" className={`rounded-lg px-3 py-3 font-semibold ${mode==='join'?'bg-white text-teal-900 shadow-sm':'text-slate-600'}`} onClick={()=>setMode('join')}><LogIn className="mr-2 inline size-4"/>Entrar a una sala</button>
              <button type="button" className={`rounded-lg px-3 py-3 font-semibold ${mode==='recover'?'bg-white text-teal-900 shadow-sm':'text-slate-600'}`} onClick={()=>setMode('recover')}>Ya soy integrante</button>
              {canCreate?<button type="button" className={`col-span-2 rounded-lg px-3 py-3 font-semibold ${mode==='create'?'bg-white text-teal-900 shadow-sm':'text-slate-600'}`} onClick={()=>setMode('create')}><Plus className="mr-2 inline size-4"/>Crear familia</button>:null}
            </div>
            <h2 className={titleStyle}>{mode==='join'?'Entrar con código o enlace':mode==='recover'?'Recuperar mi perfil anterior':'Crear una sala nueva'}</h2>
            <p className="mt-1 text-sm text-slate-600">{mode==='join'?'Un enlace de invitación rellena el código automáticamente.':'La sala quedará guardada en Firebase; no desaparece al borrar caché.'}</p>
            {mode==='recover'?<div className="mt-5 space-y-3">
              <p className="text-sm text-slate-600">Selecciona tu identidad anterior. Solo el anfitrión puede aprobar el reingreso, después de verificar que eres esa persona.</p>
              <label className="block text-sm font-bold">Código de sala<input className={fieldStyle+' mt-1'} value={codeInput} onChange={e=>{setCodeInput(e.target.value);setRecoveryList(null);}} placeholder="SG-XXXXXXXXXXXXXXXX" /></label>
              <Button type="button" disabled={!api||busy||!codeInput.trim()} className="w-full" onClick={lookupRecovery}>Buscar integrantes</Button>
              {recoveryList?<><label className="block text-sm font-bold">Yo ya aparezco como<select className={fieldStyle+' mt-1'} value={recoverySelected} onChange={e=>setRecoverySelected(e.target.value)}>
              <option value="">Selecciona tu nombre anterior</option>
              {Object.entries(recoveryList.members).filter(([id,v])=>id!==recoveryList.hostUid&&v.role==='member').map(([id,v])=><option value={id} key={id}>{v.nickname}</option>)}
              </select></label><Button type="button" className="w-full" disabled={busy||recoveryPending||!recoverySelected} onClick={requestRecovery}>Solicitar recuperar mi perfil</Button>
              {recoveryPending?<p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Solicitud pendiente de aprobación del anfitrión. No consume otro cupo.</p>:null}
              <Button variant="outline" className="w-full" type="button" disabled={busy} onClick={checkRecovery}>Comprobar aprobación</Button></>:null}
            </div>:<form className="mt-5 space-y-4" onSubmit={e=>{e.preventDefault();mode==='join'?joinRoom():makeRoom();}}>
              {mode==='create'?<label className="block space-y-1 text-sm font-medium">Nombre de la familia<input className={fieldStyle} maxLength={48} value={roomName} onChange={e=>setRoomName(e.target.value)} placeholder="Familia López" required /></label>:<label className="block space-y-1 text-sm font-medium">Código de la sala<input className={fieldStyle} value={codeInput} onChange={e=>setCodeInput(e.target.value)} autoComplete="off" placeholder="SG-XXXXXXXXXXXXXXXX" required aria-describedby="family-code-help"/><span id="family-code-help" className="block text-xs text-slate-500">El mismo código sirve para todas las invitaciones.</span></label>}
              <label className="block space-y-1 text-sm font-medium">¿Cómo quieres aparecer en la familia?<input className={fieldStyle} maxLength={48} value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="Ej. Tía Andrea" required /></label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm"><input type="checkbox" className="mt-1 size-5 accent-teal-700" checked={consent} onChange={e=>setConsent(e.target.checked)} /><span>Autorizo compartir con esta familia <strong>únicamente mis resultados rojos</strong> (dominio y fecha, nunca conversación ni URL completa). Puedo revocarlo después.</span></label>
              <Button type="submit" className="w-full bg-teal-800 py-6 text-base hover:bg-teal-900" disabled={busy||!api}>{busy?'Conectando…':mode==='join'?'Unirme a la familia':'Crear sala persistente'}<UserPlus className="ml-2 size-4"/></Button>
            </form>}
            <p className="mt-4 text-xs text-slate-500">El código es una invitación: quien lo tenga puede solicitar entrar mientras haya cupos. Una sala admite un máximo de {MAX_FAMILY_ROOM_MEMBERS} integrantes, incluido el anfitrión.</p>
          </div>
          {mode==='create'&&!(isAndroidPilot&&PILOT_CODES)?<details className={commonCard}>
            <summary className="cursor-pointer font-bold text-slate-900">Opcional: tener una cuenta recuperable de anfitrión</summary>
            <p className="mt-3 text-sm text-slate-600">Los invitados no la necesitan. Si el anfitrión crea la sala anónimamente y borra los datos, perderá sus permisos de administración aunque la sala siga existiendo. Entra con tu cuenta existente antes de crearla para poder recuperarlos.</p>
            <label className="mt-4 block text-sm">Correo electrónico<input type="email" className={fieldStyle} value={hostEmail} onChange={e=>setHostEmail(e.target.value)}/></label>
            <label className="mt-3 block text-sm">Contraseña<input type="password" className={fieldStyle} value={hostPassword} onChange={e=>setHostPassword(e.target.value)} /></label>
            <div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={busy} onClick={()=>loginHost(false)}>Iniciar sesión</Button><Button type="button" variant="outline" disabled={busy} onClick={()=>loginHost(true)}>Crear cuenta</Button></div>
            {!anonymous?<p className="mt-3 text-sm font-medium text-teal-800">Sesión del anfitrión preparada.</p>:null}
          </details>:null}
        </div>:<div className="space-y-6">
          {!room?<div className={commonCard}>Cargando integrantes y eventos…</div>:<>
            <div className={`${commonCard} space-y-4`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-sm font-semibold tracking-wide text-teal-700">TU SALA EN LA NUBE</p><h2 className="mt-1 text-2xl font-black">{room.name}</h2><p className="mt-1 text-sm text-slate-600">{members.length} de {MAX_FAMILY_ROOM_MEMBERS} integrantes · {room.open?'Invitaciones abiertas':'Invitaciones pausadas'}</p></div>
                <span className="flex items-center gap-2 rounded-full bg-teal-100 px-3 py-2 text-sm font-semibold text-teal-900"><ShieldCheck className="size-4"/> Firebase</span>
              </div>
              {isHost&&recoveryRequests.length>0?<div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                <h3 className="font-bold text-amber-950">Reingresos pendientes</h3>
                <p className="mt-1 text-xs text-amber-900">Verifica la identidad fuera de la aplicación. Saber el nombre no demuestra ser su dueño.</p>
                {recoveryRequests.map(q=><div className="mt-3 flex items-center justify-between gap-3" key={q.id}>
                  <span className="text-sm font-semibold">{room.members[q.oldUid]?.nickname||'Perfil no disponible'}</span>
                  <Button size="sm" disabled={busy||!room.members[q.oldUid]} onClick={()=>void run(async()=>{
                    if(!window.confirm('¿Verificaste personalmente la identidad? Se reemplazará el UID anterior sin duplicar el integrante.'))return;
                    await api?.approveFamilyRecovery(room.code,q.newUid);
                    setNotice('Reingreso aprobado.');
                  })}>Aprobar reingreso</Button>
                </div>)}
              </div>:null}
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <input aria-label="Código de sala" value={room.code} className={`${fieldStyle} font-mono tracking-wider`} readOnly />
                <Button variant="outline" onClick={()=>void copy(room.code)}><Copy className="mr-2 size-4"/> Copiar código</Button>
                <Button onClick={()=>void copy(api?.invitationLink(room.code)||'')}><Link2 className="mr-2 size-4"/> Copiar invitación</Button>
              </div>
              <p className="text-xs text-slate-500">Compártelo únicamente con quienes quieras dentro de la sala. La dirección no se publica en un listado.</p>
              {isHost?<div className="flex flex-wrap items-center gap-3 border-t pt-4"><Button variant="outline" disabled={busy} onClick={()=>void run(async()=>{await api?.setRoomOpen(room.code,!room.open);setNotice(room.open?'Invitaciones cerradas.':'Invitaciones habilitadas.');})}>{room.open?'Pausar nuevos ingresos':'Habilitar nuevos ingresos'}</Button><span className="text-xs text-slate-500">Como anfitrión, puedes liberar cupos retirando invitados.</span></div>:null}
            </div>
            <div className="grid items-start gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <section className={commonCard} aria-labelledby="family-members-title">
                <h3 className={titleStyle} id="family-members-title"><UsersRound className="mr-2 inline size-5"/> Integrantes</h3>
                <div className="mt-4 space-y-2">{members.map(member=><div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3" key={member.uid}>
                  <div className="min-w-0"><p className="truncate font-semibold">{member.nickname} {member.uid===uid?'(Tú)':''}</p><p className="text-xs text-slate-500">{member.role==='host'?'Anfitrión':member.shareRisks?'Comparte riesgos rojos':'No comparte riesgos'}</p></div>
                  {isHost && member.uid!==uid?<Button type="button" size="sm" variant="outline" disabled={busy} onClick={()=>void run(async()=>{if(!window.confirm(`¿Retirar a ${member.nickname} de la familia y eliminar sus registros?`))return;await api?.removeMember(room.code,member.uid);setNotice('Miembro retirado y registros eliminados.');})}><Trash2 className="size-4"/><span className="sr-only">Retirar a {member.nickname}</span></Button>:null}
                </div>)}</div>
                <div className="mt-5 border-t pt-4"><label className="flex items-start gap-2 text-sm"><input className="mt-1 size-4 accent-teal-800" type="checkbox" checked={me?.shareRisks??false} onChange={e=>void run(async()=>{if(!api||!me)return;if(!e.target.checked)await api.deleteMySharedRisks(room.code);await api.updateMyProfile(room.code,me.nickname,e.target.checked);setNotice(e.target.checked?'Compartir riesgos rojos activado.':'Consentimiento retirado; se borraron tus eventos compartidos.');})}/><span>Compartir mis resultados rojos en esta sala</span></label>
                {me?.role==='member'?<Button className="mt-4" variant="outline" disabled={busy} onClick={()=>void run(async()=>{if(!window.confirm('¿Salir de la sala y borrar tus resultados compartidos?'))return;if(isAndroidPilot)await Protection.firebaseFamilyStop();await api?.removeMember(room.code,uid);setRoomCode('');setRoom(null);setEvents([]);setNotice('Saliste de la sala. El historial de la familia sigue guardado.');})}>Salir de la sala</Button>:null}
                </div>
              </section>
              <section className={commonCard} aria-labelledby="family-analyze-title">
                <h3 className={titleStyle} id="family-analyze-title"><SearchCheck className="mr-2 inline size-5"/> Analizar enlace manualmente</h3>
                <p className="mt-2 text-sm text-slate-600">Ideal para entrevistas con un solo Android. La detección automática entre teléfonos es una integración aparte.</p>
                <form className="mt-4 space-y-3" onSubmit={e=>{e.preventDefault();analyze();}}>
                  <label htmlFor="family-manual-text" className="block text-sm font-medium">Enlace o mensaje recibido</label>
                  <textarea id="family-manual-text" className={`${fieldStyle} min-h-[110px] resize-y`} value={manualText} onChange={e=>setManualText(e.target.value)} placeholder="Pega un mensaje con un enlace sospechoso..." />
                  <Button className="w-full bg-teal-800 py-6 text-base hover:bg-teal-900" disabled={busy||!manualText.trim()}>{busy?'Analizando…':'Analizar con SmartGuard'}</Button>
                </form>
                {analysis?<div className={`mt-4 rounded-xl border p-4 ${analysis.level==='riesgo'?'border-red-200 bg-red-50':analysis.level==='precaucion'?'border-amber-200 bg-amber-50':'border-teal-200 bg-teal-50'}`}>
                  <p className="flex items-center gap-2 font-bold">{analysis.level==='riesgo'?<ShieldAlert className="size-5 text-red-700"/>:<ShieldQuestion className="size-5 text-slate-600"/>}{analysis.level==='riesgo'?'Enlace peligroso':analysis.level==='precaucion'?'Precaución':'Sin señales de alto riesgo'}</p>
                  <p className="mt-2 break-all text-sm">{analysis.domain}</p><p className="mt-1 text-sm">{analysis.summary}</p>
                  {related.length>0?<div className="mt-3 border-t pt-3"><p className="font-semibold">Contexto de tu familia</p>{related.map(match=><p className="mt-2 text-sm" key={match.eventId}><BellRing className="mr-1 inline size-4"/><strong>{match.memberNickname}:</strong> {match.label} ({match.registrableDomain})</p>)}</div>:null}
                </div>:null}
              </section>
            </div>
            <section className={commonCard} aria-labelledby="family-history-title">
              <div className="flex flex-wrap justify-between gap-3"><div><h3 className={titleStyle} id="family-history-title"><ShieldAlert className="mr-2 inline size-5 text-red-700"/> Historial familiar de enlaces rojos</h3><p className="mt-1 text-sm text-slate-600">Persistente en Firebase · Únicamente integrantes autorizados</p></div><label className="text-sm font-medium">Filtrar por persona<select className="mt-1 block min-w-48 rounded-lg border border-slate-300 bg-white px-3 py-2" value={selectedMember} onChange={e=>setSelectedMember(e.target.value)}><option value="all">Todos</option>{members.map(m=><option key={m.uid} value={m.uid}>{m.nickname}</option>)}</select></label></div>
              {selectedEvents.length===0?<p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Todavía no hay reportes rojos de esta selección. No se crean alertas ficticias.</p>:<div className="mt-5 grid gap-3 md:grid-cols-2">{selectedEvents.map((entry,i)=><article key={entry.id} className="rounded-xl border border-red-100 bg-red-50/60 p-4"><div className="flex items-start justify-between gap-2"><p className="flex items-center gap-1.5 font-semibold text-red-950"><ShieldAlert className="size-4"/>{historicalNickname(entry.memberUid)}</p><span className="text-xs text-red-900">{entry.source==='manual'?'Manual':'Notificación'}</span></div><p className="mt-2 break-all font-mono text-sm">{entry.domain}</p><p className="mt-1 text-xs text-slate-500">{entry.createdAt?new Date(entry.createdAt).toLocaleString('es-CO'):'Sincronizando fecha…'}</p>{events.some((other,j)=>j>i && other.memberUid!==entry.memberUid && other.domain===entry.domain)?<p className="mt-2 flex gap-1.5 text-xs font-semibold text-amber-800"><UsersRound className="size-3.5"/> Mismo dominio reportado por otro integrante</p>:null}</article>)}</div>}
              <p className="mt-4 text-xs text-slate-500">Los registros rojos son resultados del analizador, no una lista global de amenazas verificadas. Nunca compartimos el texto del mensaje ni la URL completa.</p>
            </section>
          </>}
        </div>}
      </div>
    </main>{!embedded ? <SiteFooter /> : null}
  </div>;
}


function CommercialFamilyGate({embedded}:{embedded:boolean}) {
  const [canCreate,setCanCreate]=useState(false);
  const [status,setStatus]=useState<'checking'|'allowed'|'denied'|'offline'>('checking');
  const [code,setCode]=useState('');
  const [nickname,setNickname]=useState('');
  const [shareRisks,setShareRisks]=useState(false);
  const [recoverMode,setRecoverMode]=useState(false);
  const [foundRoom,setFoundRoom]=useState<Room|null>(null);
  const [selectedOldUid,setSelectedOldUid]=useState('');
  const [pendingRecovery,setPendingRecovery]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{
    let mounted=true;
    const refresh=async()=>{
      try {
        const access=await fetchCommercialAccess();
        const permitted=confirmedFamily(access);
        if (mounted) {
          setCanCreate((access.ownPlan ?? access.plan)==='trial'||(access.ownPlan ?? access.plan)==='family');
          setStatus(permitted?'allowed':'denied');
        }
        if (!permitted) await Protection.firebaseFamilyStop().catch(()=>{});
      } catch {
        if (mounted) setStatus('offline');
        await Protection.firebaseFamilyStop().catch(()=>{});
      }
    };
    void refresh();
    const focus=()=>{if(!document.hidden)void refresh();};
    window.addEventListener('focus',focus);
    window.addEventListener('smartguard:commercial-updated',focus);
    return()=>{mounted=false;window.removeEventListener('focus',focus);window.removeEventListener('smartguard:commercial-updated',focus);};
  },[]);
  const lookupExisting=async()=>{
    if(busy)return;setBusy(true);setError('');
    try {
      const api=await loadClient();const user=await api.ensureUser();
      const result=await api.inspectRoom(code);setFoundRoom(result);
      setPendingRecovery((await api.getFamilyRecovery(result.code))?.status==='pending');
      if(result.members?.[user.uid]){window.dispatchEvent(new Event('smartguard:commercial-updated'));setStatus('allowed');}
    }catch(e){setError(e instanceof Error?e.message:'No se encontraron integrantes.');}
    finally{setBusy(false);}
  };
  const submitExisting=async()=>{
    if(busy)return;setBusy(true);setError('');
    try{
      if(!foundRoom||!selectedOldUid)throw new Error('Selecciona tu nombre anterior.');
      await (await loadClient()).requestFamilyRecovery(foundRoom.code,selectedOldUid);
      setPendingRecovery(true);
    }catch(e){setError(e instanceof Error?e.message:'No se pudo enviar la solicitud.');}
    finally{setBusy(false);}
  };
  const checkExisting=async()=>{
    if(busy||!foundRoom)return;setBusy(true);setError('');
    try{
      const api=await loadClient();const user=await api.ensureUser();
      const result=await api.inspectRoom(foundRoom.code);
      if(!result.members?.[user.uid]){
        const r=await api.getFamilyRecovery(result.code);
        setPendingRecovery(r?.status==='pending');
        throw new Error(r?.status==='pending'?'Esperando aprobación del anfitrión.':
          r?.status==='rejected'?'La recuperación fue rechazada.':'Todavía no se aprobó tu reingreso.');
      }
      window.dispatchEvent(new Event('smartguard:commercial-updated'));
      const access=await fetchCommercialAccess();
      if(!confirmedFamily(access))throw new Error('El anfitrión no tiene Premium familiar vigente.');
      setStatus('allowed');
    }catch(e){setError(e instanceof Error?e.message:'No se pudo verificar tu perfil.');}
    finally{setBusy(false);}
  };
  const joinInvitedFamily=async()=>{
    if(busy)return;
    setBusy(true);setError('');
    try {
      const client=await loadClient();
      const signed=await client.ensureUser();
      const joined=await client.joinFamilyRoom(code,nickname,shareRisks);
      const room=await client.inspectRoom(joined);
      if(!room.members?.[signed.uid])throw new Error('No aparece tu membresía en Firebase.');
      const access=await fetchCommercialAccess();
      if(!confirmedFamily(access))throw new Error('La sala no dispone de un plan Familiar activo. Consulta con quien te invitó.');
      setCanCreate(false);
      setStatus('allowed');
      window.dispatchEvent(new Event('smartguard:commercial-updated'));
    }catch(e){setError(e instanceof Error?e.message:'No se pudo comprobar esta invitación.');}
    finally{setBusy(false);}
  };
  if(status==='allowed')return <FamilyExperience embedded={embedded} canCreate={canCreate}/>;
  return <section className="mx-auto max-w-2xl space-y-4 p-6 text-slate-900">
    <div className="rounded-2xl border border-teal-200 bg-white p-6">
      <h1 className="text-xl font-black text-teal-950">
        {status==='checking'?'Verificando tu protección familiar…':status==='offline'?'No se pudo verificar tu plan':'Únete a la familia que te invitó'}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        {status==='checking'?'Consultando tu cuenta con Firebase.':
          status==='offline'?'No hay conexión de confianza con Firebase. No activaremos datos compartidos hasta validar la sala.':
          'Una persona que tiene Premium Familiar puede invitarte como integrante sin que debas pagar otra suscripción. Necesitas un código de invitación y una sala vigente.'}
      </p>
      {status!=='checking'?<div className="mt-5 space-y-3 rounded-xl bg-teal-50 p-4">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={recoverMode?'rounded-lg bg-white p-3 text-xs font-bold text-teal-900':'rounded-lg bg-teal-700 p-3 text-xs font-bold text-white'} onClick={()=>{setRecoverMode(false);setFoundRoom(null);setError('');}}>Soy nuevo</button>
          <button type="button" className={recoverMode?'rounded-lg bg-teal-700 p-3 text-xs font-bold text-white':'rounded-lg bg-white p-3 text-xs font-bold text-teal-900'} onClick={()=>{setRecoverMode(true);setError('');}}>Ya soy integrante</button>
        </div>
        <h2 className="text-sm font-black text-teal-950">{recoverMode?'Recuperar mi identidad':'Tengo un código de invitación'}</h2>
        <label className="block text-xs font-bold text-teal-950">Código de sala
          <input className={fieldStyle+' mt-1'} value={code} onChange={e=>setCode(e.target.value)}
            placeholder="SG-XXXXXXXXXXXXXXXX" autoCapitalize="characters" autoComplete="off"/>
        </label>
        {recoverMode?<div className="space-y-3">
          <p className="text-xs text-teal-900">Si ya estás en esta familia, selecciona tu nombre y solicita aprobación del anfitrión. No se crea otro integrante.</p>
          <button type="button" disabled={busy||!code.trim()} onClick={()=>void lookupExisting()} className="w-full rounded-lg border border-teal-300 bg-white px-4 py-3 text-sm font-bold text-teal-950 disabled:opacity-40">Buscar nombres existentes</button>
          {foundRoom?<><label className="block text-xs font-bold text-teal-950">Este era mi perfil<select className={fieldStyle+' mt-1'} value={selectedOldUid} onChange={e=>setSelectedOldUid(e.target.value)}>
            <option value="">Selecciona tu nombre</option>{Object.entries(foundRoom.members).filter(([id,p])=>id!==foundRoom.hostUid&&p.role==='member').map(([id,p])=><option value={id} key={id}>{p.nickname}</option>)}
          </select></label>
          <button type="button" disabled={busy||pendingRecovery||!selectedOldUid} onClick={()=>void submitExisting()} className="w-full rounded-xl bg-teal-800 px-4 py-3 text-sm font-bold text-white disabled:opacity-40">Solicitar recuperar perfil</button>
          {pendingRecovery?<p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-950">Esperando aprobación del anfitrión.</p>:null}
          <button type="button" disabled={busy} onClick={()=>void checkExisting()} className="w-full rounded-xl border border-teal-400 px-4 py-3 text-xs font-bold text-teal-950">Comprobar aprobación</button></>:null}
        </div>:<>
        <label className="block text-xs font-bold text-teal-950">Nombre o apodo
          <input className={fieldStyle+' mt-1'} value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="Cómo te llamarán"/>
        </label>
        <label className="flex items-start gap-2 text-xs leading-relaxed text-teal-950">
          <input className="mt-0.5 size-4 accent-teal-700" type="checkbox" checked={shareRisks}
            onChange={e=>setShareRisks(e.target.checked)}/>
          Autorizo compartir únicamente dominios clasificados en rojo con integrantes de esta sala. Puedo revocarlo.
        </label>
        <button type="button" disabled={busy||!code.trim()||!nickname.trim()} onClick={()=>void joinInvitedFamily()}
          className="w-full rounded-xl bg-teal-800 px-4 py-3 text-sm font-black text-white disabled:opacity-40">
          {busy?'Verificando membresía…':'Ingresar con mi invitación'}
        </button></>
        {error?<p role="alert" className="text-xs font-semibold text-red-800">{error}</p>:null}
      </div>:null}
      <p className="mt-4 text-xs text-slate-600">Crear una familia nueva requiere que su titular tenga una prueba o Premium Familiar vigente. Un código no convierte a nadie en anfitrión.</p>
      <Link to="/" className="mt-4 inline-flex rounded-xl border border-teal-600 px-4 py-3 text-sm font-bold text-teal-900">Volver a Inicio</Link>
    </div>
  </section>;
}

export default function FamilyPage({ embedded = false }: { embedded?: boolean } = {}) {
  // A public invitation is an APK download; membership requires Android.
  if (!isAndroidPilot) return <FamilyInvitationLanding />;
  if (COMMERCIAL_ENABLED) return <CommercialFamilyGate embedded={embedded}/>;
  return <FamilyExperience embedded={embedded} />;
}
