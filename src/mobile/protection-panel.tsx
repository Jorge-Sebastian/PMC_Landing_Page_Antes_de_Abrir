import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Protection, type ProtectionStatus } from './native';

export function ProtectionPanel() {
  const [status, setStatus] = useState<ProtectionStatus>();
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const refresh = () => { if (!document.hidden) void Protection.status().then(s => { if (active) setStatus(s); }).catch(() => { if (active) setError('No se pudo consultar la protección.'); }); };
    refresh(); const timer = window.setInterval(refresh, 3000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  const act = async (action: () => Promise<unknown>) => {
    try { setError(''); await action(); setStatus(await Protection.status()); }
    catch { setError('No se pudo completar la acción. Revisa los permisos de SmartGuard.'); }
  };
  return <section className="section-shell py-6" aria-labelledby="protection-heading">
    <div className="rounded-2xl border bg-card p-5 space-y-4">
      <p className="text-xs uppercase tracking-widest">Piloto Android · v0.4.0</p>
      <h2 id="protection-heading" className="text-2xl">Protección de mensajes</h2>
      <p role="status">{!status ? 'Comprobando permisos…' : status.enabled && status.access && status.notifications ? 'Protección activa' : status.enabled ? 'Faltan permisos para mostrar avisos' : 'Protección en pausa'}</p>
      <p className="text-sm text-muted-foreground">Con tu permiso, SmartGuard revisa enlaces de notificaciones de las aplicaciones que elijas. No accede al historial de conversaciones. El texto se analiza en el celular. Los enlaces sin indicios de datos privados se consultan con el servicio de comprobación y Google DNS (solo el dominio). No se envía la conversación ni se guarda su texto. Los resultados recientes permanecen temporalmente en memoria y en sus notificaciones.</p>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1" />Entiendo y autorizo revisar los enlaces de las notificaciones compatibles.</label>
      <div className="flex flex-wrap gap-2">
        <Button disabled={!consent} onClick={() => void act(() => Protection.activate())}>Activar / revisar permisos</Button>
        <Button variant="outline" onClick={() => void act(() => Protection.pause())}>Pausar</Button>
        <Button variant="outline" onClick={() => void act(() => Protection.alertSettings())}>Ajustes de avisos</Button>
      </div>
      <label className="flex gap-3 text-sm"><input type="checkbox" checked={status?.showAll ?? true} onChange={e => void act(() => Protection.setShowAll({ value: e.target.checked }))} />Mostrar también resultados sin señales detectadas</label>
      <p className="text-sm">Enlaces procesados: {status?.processed ?? 0}. El aviso de Mensajes puede aparecer primero. Expande el banner o toca «Ver análisis» para leer los motivos.</p>
      <div className="flex flex-wrap gap-2">{['red','orange','green'].map(level => <Button key={level} variant="outline" size="sm" onClick={() => void act(() => Protection.testBanner({ level }))}>Probar {({ red: 'rojo', orange: 'naranja', green: 'verde' })[level]}</Button>)}</div>
      <fieldset className="space-y-2 border-t pt-4"><legend className="font-semibold">Aplicaciones que puede revisar</legend>
        {[['sms','SMS (aplicación de mensajes)'],['whatsapp','WhatsApp'],['telegram','Telegram'],['signal','Signal'],['messenger','Messenger']].map(([app,label]) => <label key={app} className="flex gap-3 text-sm"><input type="checkbox" checked={status?.apps?.[app] ?? (app === 'sms' || app === 'whatsapp')} onChange={e => void act(() => Protection.setApp({ app, value: e.target.checked }))} />{label}</label>)}
        <p className="text-sm text-muted-foreground">Solo notificaciones cuyo texto incluya un enlace. Si una app oculta el contenido, SmartGuard no puede leerlo. Si Signal es tu app de SMS, también puede entrar por esa selección.</p>
      </fieldset>
      <details className="border-t pt-4"><summary className="cursor-pointer font-semibold">Privacidad, fuentes y resultados recientes</summary><div className="space-y-3 pt-3">
        <p className="text-sm">Reglas: {status?.rulesVersion ?? '0.4.0'}. Se actualizan instalando una nueva versión de SmartGuard.</p>
        <p className="text-sm">Catálogo local, señales del mensaje, destino del enlace y DNS. Fuentes de amenazas: {status?.externalReady ? 'habilitadas para consulta; revisa la cobertura de cada resultado' : 'sin activar; no se afirma que Google Web Risk, VirusTotal o URLhaus hayan revisado el enlace'}.</p>
        <label className="flex gap-3 text-sm"><input type="checkbox" checked={status?.historyEnabled ?? false} onChange={e => void act(() => Protection.setHistory({ value: e.target.checked }))} />Guardar hasta 50 resultados recientes en este celular (solo dominio, fecha y color)</label>
        {status?.historyEnabled && status.history.length ? <ul className="space-y-2">{status.history.map((h,i) => <li key={`${h.date}-${i}`} className="text-sm break-all">{h.color === 'red' ? '🔴' : h.color === 'green' ? '🟢' : '🟠'} {h.domain} · {new Date(h.date).toLocaleString()}</li>)}</ul> : null}
        <p className="text-sm">Correcciones guardadas localmente: {status?.feedbackCount ?? 0}. No se envían automáticamente ni cambian el veredicto.</p>
        <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => void act(() => Protection.exportFeedback())}>Copiar correcciones</Button><Button variant="outline" size="sm" onClick={() => void act(() => Protection.clearHistory())}>Borrar resultados y correcciones</Button></div>
      </div></details>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  </section>;
}
