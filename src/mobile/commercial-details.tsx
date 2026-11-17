import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, ClipboardCopy, CreditCard, Mail, ShieldCheck } from 'lucide-react';
import {
  COMMERCIAL_ENABLED, beginCommercialTrial, fetchCommercialAccess,
  type CommercialAccess,
} from './commercial-client';

type Plan = 'free'|'trial'|'automatic'|'family';
type ContinueMode = 'free'|'trial'|'pending'|'active';
const BANK_KEY = '1011097783';
const RECEIPTS_EMAIL = 'dkek195@gmail.com';
const AMOUNTS = { automatic:9900, family:19900 } as const;

const label = (kind:Plan) => kind==='automatic'?'Premium individual':kind==='family'?'Premium familiar':kind==='trial'?'Prueba de 15 días':'Gratis';
const price = (cop:number) => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(cop);
const field='w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-slate-900';
const primary='inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#155e50] px-4 py-3 text-center text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40';

export function CommercialDetails({selection,onContinue}:{selection:Plan;onContinue:(mode:ContinueMode)=>void}) {
  const [access,setAccess] = useState<CommercialAccess|null>(null);
  const [busy,setBusy] = useState(false),[notice,setNotice] = useState('');
  const [email,setEmail] = useState(''),[password,setPassword] = useState(''),[verifiedEmail,setVerifiedEmail] = useState<string|null>(null);
  const paid=selection==='automatic'||selection==='family';
  const amount=paid?AMOUNTS[selection]:0;
  useEffect(()=>{
    if(!COMMERCIAL_ENABLED || selection==='free')return;
    let live=true;
    void (async()=>{
      try {
        const state=await fetchCommercialAccess();
        const url=new URL('/smartguard-family/client.js',window.location.origin).href;
        const auth=await import(/* @vite-ignore */ url) as {currentVerifiedEmail():Promise<string|null>};
        const verified=await auth.currentVerifiedEmail();
        if(live){setAccess(state);setVerifiedEmail(verified);setNotice('');}
      }catch(err){if(live)setNotice(err instanceof Error?err.message:'No se pudo consultar Firebase.');}
    })();
    return()=>{live=false;};
  },[selection]);
  const connectEmail=async(e:FormEvent,create:boolean)=>{
    e.preventDefault();setBusy(true);setNotice('');
    try{
      const url=new URL('/smartguard-family/client.js',window.location.origin).href;
      const auth=await import(/* @vite-ignore */ url) as {
        useHostAccount(email:string,password:string,create?:boolean):Promise<unknown>;
        currentVerifiedEmail():Promise<string|null>;
      };
      await auth.useHostAccount(email,password,create);
      const verified=await auth.currentVerifiedEmail();
      setVerifiedEmail(verified);
      setAccess(await fetchCommercialAccess());
      setNotice(verified?'Correo verificado correctamente.':create
        ?'Te enviamos un enlace de verificación. Ábrelo desde tu correo y vuelve para comprobarlo.'
        :'Verifica tu correo antes de activar la prueba o recibir Premium.');
      setPassword('');
    }catch(err){setNotice(err instanceof Error?err.message:'No se pudo vincular el correo.');}
    finally{setBusy(false);}
  };
  const passwordRecovery=async()=>{
    if(!email.trim()){setNotice('Escribe tu correo antes de recuperar la contraseña.');return;}
    setBusy(true);setNotice('');
    try{
      const url=new URL('/smartguard-family/client.js',window.location.origin).href;
      const auth=await import(/* @vite-ignore */ url) as {resetSmartGuardPassword(email:string):Promise<unknown>};
      await auth.resetSmartGuardPassword(email);
      setNotice('Si ese correo está registrado, recibirás las instrucciones para recuperar tu contraseña.');
    }catch(err){setNotice(err instanceof Error?err.message:'No se pudo tramitar la recuperación.');}
    finally{setBusy(false);}
  };
  const resendVerification=async()=>{
    setBusy(true);setNotice('');
    try{
      const url=new URL('/smartguard-family/client.js',window.location.origin).href;
      const auth=await import(/* @vite-ignore */ url) as {resendSmartGuardVerification():Promise<{alreadyVerified?:boolean}>};
      const result=await auth.resendSmartGuardVerification();
      setNotice(result.alreadyVerified?'Tu correo ya está verificado.':'Te enviamos un nuevo enlace de verificación.');
    }catch(err){setNotice(err instanceof Error?err.message:'No pudimos reenviar el correo.');}
    finally{setBusy(false);}
  };
  const confirmVerification=async()=>{
    setBusy(true);setNotice('');
    try{
      const url=new URL('/smartguard-family/client.js',window.location.origin).href;
      const auth=await import(/* @vite-ignore */ url) as {currentVerifiedEmail():Promise<string|null>};
      const verified=await auth.currentVerifiedEmail();setVerifiedEmail(verified);
      setAccess(await fetchCommercialAccess());
      setNotice(verified?'Correo verificado. Ya puedes continuar.':'Aún no aparece como verificado. Revisa tu correo y vuelve a intentarlo.');
    }catch(err){setNotice(err instanceof Error?err.message:'No se pudo verificar el correo.');}
    finally{setBusy(false);}
  };
  const continueTrial=async()=>{
    if(!COMMERCIAL_ENABLED){setNotice('La prueba real aun no esta conectada en este despliegue.');return;}
    if(!verifiedEmail){setNotice('Vincula y verifica tu correo antes de activar la prueba.');return;}
    setBusy(true);setNotice('');
    try{
      let current=access||await fetchCommercialAccess();
      // A returning subscriber must not be forced to start a trial or
      // choose Gratis just to finish first-run setup on a new installation.
      if(current.paid){
        setAccess(current);onContinue('active');return;
      }
      if(!current.trialUsed){current=await beginCommercialTrial();}
      if(current.plan==='trial'){
        setAccess(current);onContinue(paid?'pending':'trial');
      }else{
        setAccess(current);
        setNotice(current.paid?'Ya tienes una suscripción Premium activa. Continúa desde tu plan vigente.':
          'Tu prueba de 15 días ya se utilizó. Puedes continuar con Gratis mientras se revisa el pago.');
      }
    }catch(err){setNotice(err instanceof Error?err.message:'No se pudo activar la prueba.');}
    finally{setBusy(false);}
  };
  const reportReceipt = async () => {
    if (!verifiedEmail || !access?.publicId) {setNotice('Verifica tu correo e ID antes de registrar tu comprobante.');return;}
    setBusy(true);setNotice('');
    try {
      const url=new URL('/smartguard-family/client.js',window.location.origin).href;
      const api=await import(/* @vite-ignore */ url) as {
        reportSmartGuardPaymentRequest(plan:'individual'|'family'):Promise<{alreadyOpen:boolean;status:string}>;
      };
      const result=await api.reportSmartGuardPaymentRequest(selection==='automatic'?'individual':'family');
      setNotice(result.alreadyOpen?
        'Ya tenías una solicitud registrada. Sigue pendiente de verificación bancaria.':
        'Solicitud registrada como pendiente. Esto NO confirma que el correo se envió ni que el dinero ingresó. El administrador deberá verificarlo.');
    }catch(err){setNotice(err instanceof Error?err.message:'No fue posible registrar la solicitud.');}
    finally{setBusy(false);}
  };
  const mailSubject='Activación SmartGuard · '+label(selection);
  const mailBody='Plan solicitado: '+label(selection)+'\nValor transferido: '+price(amount)+
    '\nID SmartGuard: '+(access?.publicId||'[ID pendiente]')+
    '\nCorreo asociado: '+(verifiedEmail||'[Correo pendiente]')+
    '\n\nAdjunto el comprobante de transferencia a la llave '+BANK_KEY+
    '. Solicito la activación del plan.\n';
  const emailLink='mailto:'+RECEIPTS_EMAIL+'?subject='+encodeURIComponent(mailSubject)+'&body='+encodeURIComponent(mailBody);
  const copy=async(value:string)=>{
    try{await navigator.clipboard.writeText(value);setNotice('Texto copiado.');}
    catch{setNotice('No fue posible copiar. Selecciona el texto manualmente.');}
  };
  return <section className="space-y-5">
    <div className="rounded-[1.5rem] border border-emerald-200 bg-[#e5f5e9] p-6">
      <p className="mb-3 text-4xl">{paid?'🛡️':selection==='trial'?'✨':'🌿'}</p>
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800">04 · Detalles adicionales</p>
      <h1 className="mt-2 text-[1.6rem] font-black leading-tight text-emerald-950">{label(selection)}</h1>
      <p className="mt-3 text-sm leading-relaxed text-emerald-900">
        {selection==='free'?'Utiliza el análisis manual sin pagar una mensualidad.':
          selection==='trial'?'Prueba todas las funciones Premium durante 15 días. No habrá cobros automáticos.':
          selection==='automatic'?'Protección personal, historial y alertas. No incluye crear grupos familiares.':
          'Protección completa y un grupo privado de hasta 10 integrantes, incluido el titular.'}
      </p>
    </div>
    {selection==='free'?<>
      <div className="rounded-xl border border-emerald-100 bg-white p-4 text-sm leading-relaxed text-slate-700">Inicio y Analizar están disponibles. Actividad, Protección automática y grupos familiares requieren una opción ampliada.</div>
      <button type="button" className={primary} onClick={()=>onContinue('free')}>Continuar con Gratis <ArrowRight size={17}/></button>
    </>:<>
      {paid?<div className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-lg font-black text-emerald-950"><CreditCard size={20}/> ¿Cómo pagar?</h2>
        <p className="text-sm text-slate-600">Realiza la transferencia de un mes desde tu banco y guarda el comprobante.</p>
        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900">Valor del plan · 30 días</p>
          <strong className="mt-2 block text-2xl text-emerald-950">{price(amount)}</strong>
          <p className="mt-4 text-[10px] font-extrabold uppercase tracking-wider text-emerald-900">Llave para transferir</p>
          <strong className="mt-2 block break-all font-mono text-2xl text-emerald-950">{BANK_KEY}</strong>
          <button type="button" className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-400 px-3 py-2 text-sm font-bold text-emerald-950" onClick={()=>void copy(BANK_KEY)}>
            <ClipboardCopy size={17}/> Copiar llave
          </button>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <h3 className="text-sm font-black text-slate-900">Envía el comprobante por correo</h3>
          <p className="mt-2 break-all font-bold text-emerald-800">{RECEIPTS_EMAIL}</p>
          <p className="mt-2 text-xs text-slate-600">Indica plan, valor e ID SmartGuard. Adjunta tú mismo el comprobante antes de enviar.</p>
          <p className="mt-2 text-xs text-slate-700">Tu ID: <strong>{access?.publicId||'Conectando con Firebase…'}</strong></p>
          <a className={primary+' mt-3'} href={verifiedEmail&&access?.publicId?emailLink:undefined} aria-disabled={!verifiedEmail||!access?.publicId} onClick={e=>{if(!verifiedEmail||!access?.publicId){e.preventDefault();setNotice('Verifica el correo y registra tu ID antes de preparar el mensaje.');}}}>
            <Mail size={17}/> Preparar correo con mi ID
          </a>
          <button type="button" className="mt-2 w-full rounded-xl border border-emerald-300 p-2 text-xs font-bold text-emerald-950" onClick={()=>void copy(mailBody)}>Copiar texto del correo</button>
          <button type="button" className="mt-2 w-full rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-black text-emerald-950 disabled:opacity-40"
            disabled={busy||!COMMERCIAL_ENABLED} onClick={()=>void reportReceipt()}>
            Ya envié mi comprobante · Registrar solicitud pendiente
          </button>
          <p className="mt-2 text-[11px] text-slate-500">El registro solo refleja lo que declaras. No envía el correo, no comprueba el comprobante y no activa Premium.</p>
        </div>
        <p className="text-xs leading-relaxed text-slate-600">El administrador activará Premium después de comprobar que la transferencia ingresó a su cuenta bancaria. Un comprobante por sí solo no activa el pago.</p>
      </div>:null}
      {COMMERCIAL_ENABLED?<div className="space-y-3 rounded-2xl border border-emerald-100 bg-white p-4">
        <h2 className="text-base font-black text-emerald-950">Identidad recuperable</h2>
        {verifiedEmail?<p className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-900">✓ Correo verificado: {verifiedEmail}</p>:<>
          <p className="text-xs leading-relaxed text-slate-600">Vincula un correo para conservar el plan al cambiar de celular. Si vienes de invitado, se conservará tu UID.</p>
          <form className="space-y-2" onSubmit={e=>void connectEmail(e,true)}>
            <input className={field} value={email} type="email" required onChange={e=>setEmail(e.target.value)} placeholder="Tu correo electrónico" aria-label="Correo de cuenta"/>
            <input className={field} value={password} type="password" minLength={8} required onChange={e=>setPassword(e.target.value)} placeholder="Contraseña de SmartGuard (mínimo 8)" aria-label="Contraseña de cuenta"/>
            <div className="grid grid-cols-2 gap-2">
              <button className="rounded-xl bg-[#155e50] p-3 text-xs font-bold text-white disabled:opacity-50" type="submit" disabled={busy}>Crear / vincular</button>
              <button className="rounded-xl border border-emerald-200 p-3 text-xs font-bold text-emerald-900 disabled:opacity-50" type="button" disabled={busy} onClick={()=>void connectEmail({preventDefault() {}} as FormEvent,false)}>Ya tengo cuenta</button>
            </div>
          </form>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="rounded-xl border border-emerald-200 p-3 text-xs font-bold text-emerald-900 disabled:opacity-40" disabled={busy} onClick={()=>void resendVerification()}>Reenviar verificación</button>
            <button type="button" className="rounded-xl border border-emerald-200 p-3 text-xs font-bold text-emerald-900 disabled:opacity-40" disabled={busy} onClick={()=>void passwordRecovery()}>Olvidé mi contraseña</button>
          </div>
          <button type="button" className="w-full rounded-xl border border-emerald-200 p-3 text-xs font-bold text-emerald-900" disabled={busy} onClick={()=>void confirmVerification()}>Ya confirmé mi correo · Comprobar</button>
        </>}
      </div>:<div className="rounded-xl bg-amber-50 p-4 text-xs text-amber-950">La activación comercial real permanece deshabilitada hasta desplegar y validar el servidor. La maqueta no concede Premium.</div>}
      {paid?<div className="rounded-2xl border border-emerald-200 bg-[#e4f5e9] p-5">
        <h2 className="text-lg font-black text-emerald-950">Mientras verificamos tu pago</h2>
        <p className="mt-2 text-sm leading-relaxed text-emerald-900">Puedes continuar con los días disponibles de tu prueba gratuita de 15 días. No se reinicia al enviar un comprobante.</p>
        <button type="button" className={primary+' mt-4'} disabled={busy||!COMMERCIAL_ENABLED} onClick={()=>void continueTrial()}>
          Continuar con mi prueba de 15 días <ArrowRight size={17}/>
        </button>
      </div>:<button type="button" className={primary} disabled={busy||!COMMERCIAL_ENABLED} onClick={()=>void continueTrial()}>
        {busy?'Comprobando…':'Activar mi prueba real de 15 días'} <ArrowRight size={17}/>
      </button>}
      {access?.paid && verifiedEmail ? <button type="button" className={primary} onClick={()=>onContinue('active')}>
        Ya tengo Premium vigente · Continuar <ArrowRight size={17}/>
      </button> : null}
      {access?.trialUsed && access.plan==='free'?<button type="button" className="w-full rounded-xl border border-emerald-300 bg-white p-3 text-xs font-bold text-emerald-950" onClick={()=>onContinue('free')}>Mi prueba ya venció · Continuar con Gratis</button>:null}
    </>}
    {notice?<p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">{notice}</p>:null}
  </section>;
}
