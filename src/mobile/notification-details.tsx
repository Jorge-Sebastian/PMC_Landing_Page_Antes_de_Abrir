import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { safeDomainForFamily } from '@/family/model';
import { DecisionCard } from './decision-card';
import { AnalysisResult } from '@/pages/home/analysis-result';
import { Button } from '@/components/ui/button';
import { Protection, type Detail } from './native';

export function NotificationDetails() {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  useEffect(() => {
    let active = true; let snapshot = '';
    const poll = async () => {
      if (document.hidden) return;
      try { const r = await Protection.openedAnalysis(); const next = JSON.stringify(r.detail); if (active && next !== snapshot) { snapshot = next; setDetail(r.detail); } } catch { /* Retry while foreground. */ }
    };
    void poll(); const timer = window.setInterval(() => void poll(), 1200);
    return () => { active = false; clearInterval(timer); };
  }, []);
  const detailId = detail?.id;
  useEffect(() => { if (detailId !== undefined) document.getElementById('received-heading')?.focus(); }, [detailId]);
  const close = async () => { await Protection.closeAnalysis(); setDetail(null); };
  const recheck = async () => {
    if (!detail || busy || detail.test) return;
    setBusy(true); setError('');
    try { await Protection.recheckAnalysis({ id: detail.id }); const r = await Protection.openedAnalysis(); if (r.detail) setDetail(r.detail); }
    catch { setError('No pudimos completar la comprobación.'); }
    finally { setBusy(false); }
  };
  const report = async (expected: string) => {
    if (!detail || detail.test) return;
    try { await Protection.reportResult({ id: detail.id, expected }); setFeedback('Corrección guardada en este celular. Puedes copiarla desde los ajustes para compartirla con el equipo.'); }
    catch { setFeedback('El resultado ya no está en memoria; no se guardó la corrección.'); }
  };
  if (!detail) return null;
  return <div role="dialog" aria-modal="true" aria-labelledby="received-heading" className="fixed inset-0 z-50 overflow-y-auto bg-background p-4 sm:p-8">
    <div className="mx-auto max-w-3xl space-y-5">
      <p className="text-sm">{detail.test ? 'PRUEBA · ejemplo simulado' : 'Aviso de SmartGuard'}</p>
      <h1 id="received-heading" tabIndex={-1} className="text-2xl outline-none">Análisis del enlace recibido</h1>
      <Button variant="outline" onClick={() => void close()}>Cerrar análisis</Button>
      {detail.pending ? <p role="status">Analizando el enlace. El resultado se actualizará aquí…</p> : null}
      <DecisionCard detail={detail} />
      {detail.verdict ? <AnalysisResult url={detail.url} verdict={detail.verdict} destination={detail.destination ?? { checked: false }} onRestart={() => void close()} /> : <p className="break-all">{detail.url}</p>}
      <p className="text-sm">Comprueba el dominio desde la aplicación oficial o un contacto que ya conozcas. No uses los teléfonos del mensaje sospechoso.</p>
      {!detail.test && !detail.pending && (detail.decision?.color === 'red' || detail.decision?.color === 'orange') ? (
        <Button asChild variant="outline">
          <Link to={safeDomainForFamily(detail.url) ? `/familia?dominio=${encodeURIComponent(safeDomainForFamily(detail.url) || '')}` : '/familia'} onClick={() => void close()}>
            <Users className="size-4" /> Pedir ayuda a mi familia
          </Link>
        </Button>
      ) : null}
      {!detail.test ? <Button disabled={busy || detail.pending} onClick={() => void recheck()}>{busy ? 'Comprobando…' : 'Revisar de nuevo este enlace'}</Button> : null}
      {!detail.test && !detail.pending ? <div className="border-t pt-4 space-y-3"><h2 className="font-semibold">¿Crees que se equivocó?</h2><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void report('legitimate')}>Parece legítimo</Button><Button variant="outline" onClick={() => void report('suspicious')}>Parece una estafa</Button></div><p className="text-sm">Solo se guarda el dominio y tu corrección, sin el mensaje ni los códigos del enlace.</p>{feedback ? <p role="status">{feedback}</p> : null}</div> : null}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  </div>;
}
