import { useMemo, useState } from 'react';
import { ArrowLeft, ClipboardCopy, Download, ShieldCheck, Smartphone, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';

const DOWNLOAD = '/downloads/SmartGuard-Family-v0.6.0-Alpha.apk';
const INVITATION = /^SG-[A-HJ-NP-Z2-9]{16}$/;

/** Public invitation is a download handoff, not a web group membership form.
 * Existing /familia#codigo=... links remain valid after this deployment.
 */
export default function FamilyInvitationLanding() {
  const code = useMemo(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const value = (params.get('codigo') || new URLSearchParams(window.location.search).get('codigo') || '').toUpperCase();
    return INVITATION.test(value) ? value : null;
  }, []);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!code) return;
    try { await navigator.clipboard.writeText(code); setCopied(true); }
    catch { setCopied(false); }
  };
  return <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
    <SiteHeader />
    <main className="flex-1">
      <section className="bg-[#103a42] px-4 py-14 text-white">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-900"><UsersRound size={31}/></div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-200">SmartGuard Family</p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">{code ? '¡Te invitaron a protegerse en familia!' : 'Protege a quienes más quieres'}</h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-emerald-50">
            {code ? 'Alguien quiere que formes parte de su grupo privado de SmartGuard.' : 'Los grupos familiares de SmartGuard se utilizan desde la aplicación Android.'}
            {' '}Descarga SmartGuard y continúa allí: no necesitas unirte desde esta página.
          </p>
        </div>
      </section>
      <section className="mx-auto w-full max-w-xl space-y-6 px-4 py-9">
        {code ? <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">Tu código de invitación</p>
          <p className="mt-2 break-all font-mono text-xl font-black text-teal-900">{code}</p>
          <p className="mt-3 text-sm text-slate-600">Guárdalo. Lo necesitarás para entrar a tu familia desde SmartGuard si Android no recupera automáticamente la invitación.</p>
          <button type="button" onClick={()=>void copy()} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-teal-300 px-4 py-2 text-sm font-bold text-teal-900">
            <ClipboardCopy size={16}/> {copied ? 'Código copiado' : 'Copiar código'}
          </button>
        </div> : null}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3"><Smartphone className="size-7 text-teal-700"/><h2 className="text-xl font-black">Descarga SmartGuard para Android</h2></div>
          <p className="text-sm leading-relaxed text-slate-600">1. Descarga e instala la APK en tu teléfono Android.</p>
          <p className="text-sm leading-relaxed text-slate-600">2. Abre la aplicación y termina la configuración.</p>
          <p className="text-sm leading-relaxed text-slate-600">3. En Familia, selecciona «Entrar a una sala» y pega tu código de invitación.</p>
          <a href={DOWNLOAD} download className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-800 px-5 py-3 text-center text-sm font-black text-white hover:bg-teal-900">
            <Download size={18}/> Descargar SmartGuard (APK)
          </a>
          <p className="text-xs text-slate-500">Android 8.0 o posterior. La descarga actual corresponde a la versión piloto publicada; verifica la versión antes de actualizarla.</p>
          <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm leading-relaxed text-emerald-950">
            <ShieldCheck className="mt-0.5 size-5 shrink-0"/> Solo en la app puedes aceptar la invitación y autorizar qué antecedentes de riesgo compartir.
          </div>
        </div>
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-teal-800"><ArrowLeft size={16}/> Volver a SmartGuard</Link>
      </section>
    </main>
    <SiteFooter />
  </div>;
}
