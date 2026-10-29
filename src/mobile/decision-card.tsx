import type { Detail } from './native';

const palette = {
  red: 'border-red-600 bg-red-50 text-red-950',
  orange: 'border-orange-500 bg-orange-50 text-orange-950',
  green: 'border-green-600 bg-green-50 text-green-950',
};
export function DecisionCard({ detail }: { detail: Detail }) {
  const d = detail.decision;
  if (!d) return null;
  const reputation = Array.isArray(detail.extra?.reputation?.checks) ? detail.extra.reputation.checks : [];
  return <section className={`rounded-2xl border-2 p-5 space-y-3 ${palette[d.color]}`}>
    <h2 className="text-2xl font-bold">{d.color === 'green' ? '✓' : d.color === 'red' ? '⛔' : '⚠'} {d.title}</h2>
    <p className="text-lg">{d.summary}</p>
    <p>{d.recommendation}</p>
    {detail.privacy?.sensitive ? <p className="font-medium">Privacidad: {detail.privacy.reason}</p> : null}
    {detail.messageSignals?.length ? <div className="space-y-3"><h3 className="font-semibold">Qué encontramos en el mensaje</h3>{detail.messageSignals.map(s => <div key={s.id}><p className="font-semibold">{s.title}</p><p>{s.explanation}</p></div>)}</div> : null}
    <details className="text-sm"><summary className="cursor-pointer font-semibold">Qué comprobaciones hicimos</summary>
      <ul className="mt-3 list-disc pl-5">{(d.checks ?? []).map(c => <li key={c}>{c}</li>)}</ul>
      <p className="mt-3">{d.coverage}</p>
      {reputation.map(s => <p key={s.name}>{s.name}: {({ clear: 'sin reportes encontrados', match: 'amenaza reportada', unavailable: 'consulta no completada', 'not-configured': 'sin activar', skipped: 'omitida por privacidad' })[s.status]}{s.checkedAt ? ` · ${new Date(s.checkedAt).toLocaleString()}` : ''}</p>)}
      {detail.extra?.checkedAt ? <p>Consulta: {new Date(detail.extra.checkedAt).toLocaleString()}{detail.extra.cached ? ' · resultado reciente reutilizado' : ''}</p> : null}
    </details>
  </section>;
}
