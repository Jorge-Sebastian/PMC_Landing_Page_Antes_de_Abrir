import { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCopy, Gift, RefreshCw, ShieldCheck } from 'lucide-react';
import { COMMERCIAL_ENABLED, fetchCommercialAccess, redeemCommercialCode, type CommercialAccess } from './commercial-client';

const idMask = (value:string) => value; // Public lookup alias, not a secret.
const date = (value:string|null) => value ? new Date(value).toLocaleDateString('es-CO') : 'Sin vencimiento';
export function CommercialRedemption() {
  const [access,setAccess]=useState<CommercialAccess|null>(null);
  const [code,setCode]=useState(''),[notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const update=async()=>{
    setBusy(true);
    try {
      setAccess(await fetchCommercialAccess());setNotice('');
    }catch(e){setNotice(e instanceof Error?e.message:'No se pudo consultar el plan.');}
    finally{setBusy(false);}
  };
  useEffect(()=>{if(COMMERCIAL_ENABLED)void update();},[]);
  const redeem=async()=>{
    const candidate=code.trim().toUpperCase();
    if(!/^SGP-[0-9A-F]{24}$/.test(candidate)){setNotice('Ingresa el código SGP- recibido por correo.');return;}
    setBusy(true);setNotice('');
    try {
      const current=await redeemCommercialCode(candidate);
      setAccess(current);setCode('');
      setNotice('¡Activación confirmada! '+current.plan+' hasta '+date(current.endsAt)+'.');
      window.dispatchEvent(new Event('smartguard:commercial-updated'));
    }catch(e){setNotice(e instanceof Error?e.message:'No se pudo redimir el código.');}
    finally{setBusy(false);}
  };
  return <section className="space-y-4 border-t border-emerald-100 p-4" aria-label="Mi plan y código Premium">
    <div className="flex items-center gap-2"><ShieldCheck className="size-5 text-emerald-800"/><h3 className="font-black text-emerald-950">Mi plan de SmartGuard</h3></div>
    {!COMMERCIAL_ENABLED ? <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-950">
      La activación comercial no está habilitada en esta versión piloto. Ningún código puede activar Premium hasta desplegar el servidor validado.
    </p> : <>
      {access?<div className="rounded-xl bg-emerald-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Plan verificado en Firebase</p>
        <p className="mt-1 text-xl font-black capitalize text-emerald-950">{access.plan}</p>
        <p className="mt-1 text-xs text-emerald-900">Válido hasta: {date(access.endsAt)} · Prueba utilizada: {access.trialUsed?'Sí':'No'}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-emerald-950"><strong>ID: {idMask(access.publicId)}</strong>
          <button type="button" className="rounded-lg border border-emerald-300 px-2 py-1" onClick={()=>void navigator.clipboard.writeText(access.publicId)}><ClipboardCopy className="mr-1 inline size-3"/> Copiar ID</button>
        </div>
      </div>:<p className="text-xs text-slate-600">Consultando tu cuenta y suscripción…</p>}
      <button type="button" disabled={busy} className="flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-950 disabled:opacity-50" onClick={()=>void update()}><RefreshCw size={14}/> Actualizar estado</button>
      <div className="rounded-xl border border-emerald-200 bg-white p-3">
        <label className="block text-xs font-bold text-emerald-950" htmlFor="sg-redeem-code">¿Recibiste un código Premium por correo?</label>
        <input id="sg-redeem-code" className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-sm text-slate-900" type="text" value={code} onChange={e=>setCode(e.target.value)} placeholder="SGP-XXXXXXXXXXXXXXXXXXXXXXXX" autoCapitalize="characters" autoComplete="off"/>
        <button type="button" className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#155e50] px-4 py-3 text-sm font-black text-white disabled:opacity-40" disabled={busy||!access} onClick={()=>void redeem()}><Gift size={17}/> Redimir código</button>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">Cada código se redime una sola vez y únicamente en la cuenta a la que fue asignado. El resultado se valida en Firebase.</p>
      </div>
    </>}
    {notice?<p className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-950" role="status"><CheckCircle2 className="mt-0.5 size-4 shrink-0"/>{notice}</p>:null}
  </section>;
}
