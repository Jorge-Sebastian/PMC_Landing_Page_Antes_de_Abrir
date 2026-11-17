import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { BadgeCheck, ClipboardCopy, CreditCard, RefreshCw, Search, ShieldAlert, ShieldCheck, Users } from 'lucide-react';

type Plan = 'free'|'trial'|'individual'|'family';
type Customer = {
  uid:string;publicId:string;plan:Plan;endsAt:string|null;registered:boolean;
  createdAt:string|null;lastSeenAt:string|null;paid:boolean;trial:boolean;
};
type Detail = Customer & {
  email:string|null;emailVerified:boolean;trialUsed:boolean;
  quality:null|{
    source:string;lastSeenAt:string|null;sevenRecordedDays:number;
    totals:{serviceChecks:number;healthyChecks:number;analysesOk:number;analysesFailed:number;
      alertsRequested:number;alertsPosted:number;eventsGenerated:number;eventsAcked:number};
    recentSample:{count:number;green:number;orange:number;red:number};
    rows:Array<{day:string;apkVersion:string;analysesOk:number;analysesFailed:number;alertsRequested:number;alertsPosted:number}>;
    note:string;
  };
  devices:Array<{id:string;platform:string;apkVersion:string;createdAt:string|null;lastSeenAt:string|null}>;
};
type BusinessClient = {
  signInQuality(email:string,password:string):Promise<unknown>;
  qualityCurrentUser():Promise<string|null>;
  commercialListCustomers(publicId?:string):Promise<{customers:Customer[];hasMore:boolean}>;
  commercialGetCustomer(uid:string):Promise<Detail>;
  commercialGrant(input:Record<string,unknown>):Promise<{endsAt:string;duplicate:boolean}>;
  commercialRevoke(input:Record<string,unknown>):Promise<unknown>;
  commercialIssueCode(input:Record<string,unknown>):Promise<{code:string;redeemBefore:string}>;
};
const load = async ():Promise<BusinessClient> => {
  const url = new URL('/smartguard-quality/client.js',window.location.origin).href;
  return (await import(/* @vite-ignore */ url)) as BusinessClient;
};
const toDate = (value:string|null|undefined) => value ? new Date(value).toLocaleString('es-CO') : 'Sin datos';
const price = {individual:9900,family:19900} as const;
const card = 'rounded-2xl border border-teal-700/50 bg-[#0b2731] p-5';
const input = 'w-full rounded-xl border border-teal-700 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500';
const button = 'rounded-xl border border-teal-500 px-3 py-2.5 text-sm font-bold text-teal-50 disabled:opacity-40';

export default function CommercialPanel() {
  const [api,setApi] = useState<BusinessClient|null>(null);
  const [adminEmail,setAdminEmail] = useState('');
  const [email,setEmail] = useState(''),[password,setPassword] = useState('');
  const [rows,setRows] = useState<Customer[]>([]);
  const [selected,setSelected] = useState<Detail|null>(null);
  const [query,setQuery] = useState(''),[reason,setReason] = useState('Activacion comercial verificada');
  const [plan,setPlan] = useState<'individual'|'family'>('individual');
  const [source,setSource] = useState<'admin'|'payment'>('admin');
  const [reference,setReference] = useState(''),[bankVerified,setBankVerified] = useState(false);
  const [code,setCode] = useState('');
  const [notice,setNotice] = useState(''),[busy,setBusy] = useState(false),[hasMore,setHasMore]=useState(false);
  useEffect(()=>{
    let mounted=true;
    void load().then(async client=>{
      if(!mounted)return;
      setApi(client);
      const current=await client.qualityCurrentUser();
      if(mounted&&current)setAdminEmail(current);
    }).catch(err=>{if(mounted)setNotice(err instanceof Error?err.message:'Firebase no disponible.');});
    return()=>{mounted=false;};
  },[]);
  const refresh = useCallback(async(client:BusinessClient, id='')=>{
    setBusy(true);setNotice('');
    try {
      const result=await client.commercialListCustomers(id.trim().toUpperCase());
      setRows(result.customers);setHasMore(result.hasMore);
      if(selected){
        const current=result.customers.find(x=>x.uid===selected.uid);
        if(current)setSelected(await client.commercialGetCustomer(current.uid));
        else if(id.trim())setSelected(null);
      }
    } catch(err){setNotice(err instanceof Error?err.message:'Error consultando usuarios.');}
    finally {setBusy(false);}
  },[selected]);
  useEffect(()=>{if(api&&adminEmail)void refresh(api);/* Initial admin session only. */},[api,adminEmail]); // eslint-disable-line react-hooks/exhaustive-deps
  const login=async(e:FormEvent)=>{
    e.preventDefault();if(!api)return;
    setBusy(true);setNotice('');
    try{await api.signInQuality(email,password);setAdminEmail(email);setPassword('');}
    catch(err){setNotice(err instanceof Error?err.message:'No autorizado.');}
    finally{setBusy(false);}
  };
  const inspect=async(uid:string)=>{
    if(!api)return;
    setBusy(true);setNotice('');
    try{setSelected(await api.commercialGetCustomer(uid));setCode('');}
    catch(err){setNotice(err instanceof Error?err.message:'No fue posible abrir la cuenta.');}
    finally{setBusy(false);}
  };
  const args=():Record<string,unknown>=>{
    if(!selected)throw new Error('Selecciona un usuario real.');
    if(reason.trim().length<8)throw new Error('Indica un motivo de al menos ocho caracteres.');
    const result:Record<string,unknown>={uid:selected.uid,plan,reason:reason.trim(),operationId:crypto.randomUUID().replace(/-/g,''),source};
    if(source==='payment'){
      if(!bankVerified)throw new Error('Verifica la transferencia en tu aplicación bancaria ANTES de aprobar.');
      if(reference.trim().length<6)throw new Error('Introduce la referencia bancaria verificada.');
      result.bankVerified=true;result.paymentReference=reference.trim();result.amountCOP=price[plan];
    }
    return result;
  };
  const act=async(action:'grant'|'revoke'|'code')=>{
    if(!api||!selected)return;setBusy(true);setNotice('');setCode('');
    try{
      const options=args();
      if(action==='grant'){
        const answer=await api.commercialGrant(options);
        setNotice(answer.duplicate?'Esta operación ya estaba registrada.':'Plan activado en Firebase hasta '+toDate(answer.endsAt));
      } else if(action==='code'){
        if(source!=='payment')throw new Error('La emisión de códigos exige una transferencia comprobada.');
        const answer=await api.commercialIssueCode(options);
        setCode(answer.code);
        setNotice('Código emitido. Cópialo y envíalo únicamente al correo verificado del comprador.');
      } else {
        await api.commercialRevoke({uid:selected.uid,reason:reason.trim(),operationId:crypto.randomUUID().replace(/-/g,'')});
        setNotice('Acceso de pago revocado en Firebase.');
      }
      setSelected(await api.commercialGetCustomer(selected.uid));
      const list=await api.commercialListCustomers(query.trim().toUpperCase());
      setRows(list.customers);setHasMore(list.hasMore);
      setBankVerified(false);setReference('');
    }catch(err){setNotice(err instanceof Error?err.message:'Error al administrar suscripción.');}
    finally{setBusy(false);}
  };
  return <section className={card+' mt-8 text-white'} aria-label="Usuarios y suscripciones comerciales">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-extrabold uppercase tracking-widest text-teal-300">SmartGuard · Administración comercial</p>
        <h2 className="mt-2 text-2xl font-black">Usuarios, pagos y planes reales</h2>
        <p className="mt-2 text-sm text-slate-300">Firebase es la autoridad. Las activaciones requieren un administrador verificado.</p></div>
      <ShieldCheck className="size-8 text-teal-200"/>
    </div>
    {!adminEmail ? <form onSubmit={e=>void login(e)} className="mt-5 grid gap-3 rounded-xl border border-teal-600/50 p-4 sm:grid-cols-3">
      <label className="space-y-1 text-xs font-semibold">Correo administrador<input className={input} type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label className="space-y-1 text-xs font-semibold">Contraseña<input className={input} type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
      <button className={button+' self-end'} disabled={busy||!api} type="submit">Iniciar sesión</button>
    </form>:<div className="mt-4 space-y-4">
      <p className="flex items-center gap-2 text-xs text-teal-200"><BadgeCheck className="size-4"/> Sesión Firebase: {adminEmail}</p>
      <form onSubmit={e=>{e.preventDefault();if(api)void refresh(api,query)}} className="flex flex-wrap items-end gap-2">
        <label className="min-w-[220px] flex-1 space-y-1 text-xs font-semibold">Buscar ID público SmartGuard
          <input className={input} placeholder="SG-... (vacío = últimos usuarios)" value={query} onChange={e=>setQuery(e.target.value)}/></label>
        <button className={button} disabled={!api||busy} type="submit"><Search className="mr-1 inline size-4"/> Buscar</button>
        <button className={button} type="button" disabled={!api||busy} onClick={()=>api&&void refresh(api,query)}><RefreshCw className="mr-1 inline size-4"/> Actualizar</button>
      </form>
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ['Usuarios consultados',String(rows.length)],
          ['Premium individual',String(rows.filter(x=>x.plan==='individual').length)],
          ['Premium familiar',String(rows.filter(x=>x.plan==='family').length)],
          ['Pruebas vigentes',String(rows.filter(x=>x.plan==='trial').length)]
        ].map(([name,count])=><div key={name} className="rounded-xl border border-teal-800 bg-[#143d43] p-3"><strong className="text-2xl">{count}</strong><p className="mt-1 text-xs text-slate-300">{name}</p></div>)}
      </div>
      {hasMore?<p className="text-xs text-amber-200">Vista parcial: máximo 100 usuarios. Usa el ID para localizar a una persona específica.</p>:null}
      <div className="overflow-x-auto rounded-xl border border-teal-700/50">
        <table className="w-full min-w-[650px] text-left text-xs">
          <thead className="bg-teal-900/50 text-teal-100"><tr><th className="p-3">Identificador</th><th>Plan efectivo</th><th>Última actividad</th><th>Vencimiento</th><th>Acción</th></tr></thead>
          <tbody>{rows.map(u=><tr key={u.uid} className="border-t border-teal-800">
            <td className="p-3 font-mono">{u.publicId}</td><td>{u.plan}</td><td>{toDate(u.lastSeenAt)}</td><td>{toDate(u.endsAt)}</td>
            <td><button className={button+' !px-2 !py-1'} onClick={()=>void inspect(u.uid)} type="button">Abrir ficha</button></td>
          </tr>)}</tbody>
        </table>
        {!rows.length?<p className="p-5 text-sm text-slate-300">No se encontraron usuarios reales con ese filtro.</p>:null}
      </div>
      {selected?<div className="rounded-xl border border-teal-500/50 bg-[#143940] p-4">
        <h3 className="flex items-center gap-2 text-lg font-black"><Users className="size-5"/> {selected.publicId}</h3>
        <p className="mt-2 break-all font-mono text-xs text-teal-200">UID: {selected.uid}</p>
        <p className="mt-2 text-xs text-slate-300">Correo: {selected.emailVerified?selected.email:'No verificado'} · Plan: {selected.plan} · Vence: {toDate(selected.endsAt)} · Prueba utilizada: {selected.trialUsed?'Sí':'No'}</p>
        <p className="mt-2 text-xs text-slate-300">Dispositivos vinculados: {selected.devices.length}. Última actividad: {toDate(selected.lastSeenAt)}.</p>
        <div className="mt-4 rounded-xl border border-teal-700/60 bg-[#0b2c35] p-4">
          <h4 className="text-sm font-black text-white">Resultados técnicos de este usuario</h4>
          {selected.quality ? <>
            <p className="mt-2 text-xs text-teal-200">Firebase con consentimiento · {selected.quality.sevenRecordedDays} fechas con registros · Última actividad de telemetría: {toDate(selected.quality.lastSeenAt)}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['Análisis OK',selected.quality.totals.analysesOk],
                ['Análisis fallidos',selected.quality.totals.analysesFailed],
                ['Alertas publicadas',selected.quality.totals.alertsPosted],
                ['Alertas requeridas',selected.quality.totals.alertsRequested],
                ['Verdes (muestra)',selected.quality.recentSample.green],
                ['Naranjas (muestra)',selected.quality.recentSample.orange],
                ['Rojos (muestra)',selected.quality.recentSample.red],
                ['Total en muestra',selected.quality.recentSample.count]
              ].map(([name,value])=><div key={String(name)} className="rounded-lg bg-white/5 p-2">
                <p className="text-lg font-bold">{value}</p><p className="mt-1 text-[10px] text-slate-300">{name}</p>
              </div>)}
            </div>
            <p className="mt-2 text-xs text-slate-400">{selected.quality.note}</p>
            {selected.quality.rows.length>0?<div className="mt-3 overflow-x-auto"><table className="w-full min-w-[440px] text-left text-xs">
              <thead><tr className="text-teal-200"><th>Día</th><th>Análisis OK</th><th>Fallidos</th><th>Alertas OK</th></tr></thead>
              <tbody>{selected.quality.rows.map(d=><tr key={d.day} className="border-t border-white/10">
                <td className="py-2">{d.day}</td><td>{d.analysesOk}</td><td>{d.analysesFailed}</td><td>{d.alertsPosted}/{d.alertsRequested}</td>
              </tr>)}</tbody>
            </table></div>:null}
          </>:<p className="mt-2 text-xs text-slate-300">SIN DATOS COMPARTIDOS. La cuenta no tiene telemetría remota autorizada o no hay información disponible. No se estiman resultados.</p>}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-semibold">Tipo de Premium
            <select className={input} value={plan} onChange={e=>setPlan(e.target.value as 'individual'|'family')}><option value="individual">Premium individual · $9.900</option><option value="family">Premium familiar · $19.900</option></select></label>
          <label className="space-y-1 text-xs font-semibold">Modalidad
            <select className={input} value={source} onChange={e=>setSource(e.target.value as 'admin'|'payment')}><option value="admin">Activación administrativa autorizada</option><option value="payment">Transferencia verificada en banco</option></select></label>
        </div>
        <label className="mt-3 block space-y-1 text-xs font-semibold">Motivo o referencia interna
          <input className={input} value={reason} onChange={e=>setReason(e.target.value)}/></label>
        {source==='payment'?<div className="mt-3 space-y-2 rounded-xl border border-amber-600/50 bg-amber-950/20 p-3">
          <label className="block space-y-1 text-xs font-semibold">Referencia de transferencia bancaria<input className={input} value={reference} onChange={e=>{setReference(e.target.value);setBankVerified(false)}} placeholder="Referencia real de la operación"/></label>
          <label className="flex items-start gap-2 text-xs leading-relaxed"><input type="checkbox" className="mt-1 size-4" checked={bankVerified} onChange={e=>setBankVerified(e.target.checked)}/>
            He comprobado personalmente en la cuenta bancaria el ingreso de {new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(price[plan])}. No me baso únicamente en el comprobante enviado.</label>
        </div>:null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button className={button+' border-teal-300 bg-teal-800'} disabled={busy||!selected.emailVerified||(source==='payment'&&!bankVerified)} onClick={()=>void act('grant')}><CreditCard className="mr-1 inline size-4"/> Activar o renovar 30 días</button>
          <button className={button} disabled={busy||!selected.emailVerified||source!=='payment'||!bankVerified} onClick={()=>void act('code')}>Emitir código único</button>
          <button className={button+' border-red-700 text-red-100'} disabled={busy} onClick={()=>void act('revoke')}><ShieldAlert className="mr-1 inline size-4"/> Revocar</button>
        </div>
        {code?<div className="mt-4 rounded-xl bg-emerald-100 p-3 text-teal-950">
          <p className="text-xs font-bold">Código emitido. Solo se muestra durante esta sesión de administración.</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><code className="font-mono text-sm font-black">{code}</code>
          <button className="rounded-lg border border-teal-700 px-2 py-1 text-xs font-bold" onClick={()=>void navigator.clipboard.writeText(code)}><ClipboardCopy className="mr-1 inline size-4"/> Copiar</button></div>
        </div>:null}
      </div>:null}
    </div>}
    {notice?<p className="mt-4 rounded-xl border border-teal-600 bg-teal-900/50 p-3 text-sm" role="status">{notice}</p>:null}
    <p className="mt-4 text-xs text-slate-400">Sin conexión, credenciales o funciones desplegadas, ninguna acción fingirá activar usuarios. Este panel no sustituye la verificación bancaria.</p>
  </section>;
}
