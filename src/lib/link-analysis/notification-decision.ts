import type { DestinationCheck, Verdict } from './types';
import type { MessageFinding } from './message-analysis';

export type SourceCheck = { name: string; status: 'clear' | 'match' | 'unavailable' | 'not-configured' | 'skipped'; checkedAt?: string; expiresAt?: string; threat?: string };
export type Reputation = { checks: SourceCheck[] };
export type ExtraChecks = { reputation?: Reputation; dns?: 'exists' | 'not-found' | 'unavailable'; cached?: boolean; checkedAt?: number };
export type Decision = { color: 'red' | 'orange' | 'green'; title: string; summary: string; recommendation: string; checks: string[]; coverage: string };

export function decideNotification(verdict: Verdict, destination: DestinationCheck | undefined, message: MessageFinding[], privacy: { sensitive: boolean; reason?: string }, extra: ExtraChecks = {}): Decision {
  const sources = extra.reputation?.checks ?? [];
  const matched = sources.find(s => s.status === 'match');
  const sourceCoverage = sources.filter(s => s.status === 'clear' || s.status === 'match').map(s => s.name);
  const checks = ['Dirección y catálogo local', ...(message.length ? ['Señales del mensaje: análisis local'] : []), ...(destination?.checked ? ['Respuesta del destino'] : []), ...(extra.dns && extra.dns !== 'unavailable' ? ['Consulta DNS'] : []), ...sourceCoverage];
  const coverage = sourceCoverage.length ? `Fuentes de amenazas consultadas: ${sourceCoverage.join(', ')}.` : 'Sin consulta confirmada a fuentes externas de amenazas.';
  const base = { checks, coverage };
  if (matched) return { ...base, color: 'red', title: 'No lo abras', summary: `Reportado por ${matched.name}${matched.threat ? `: ${matched.threat}` : '.'}`, recommendation: 'Evita el enlace. Comprueba la solicitud desde una aplicación o contacto oficial.' };
  if (verdict.level === 'riesgo') {
    const strongest = verdict.signals.find(s => s.weight >= 3) ?? verdict.signals.find(s => s.weight > 0);
    return { ...base, color: 'red', title: 'No lo abras', summary: strongest?.title ?? 'Encontramos varias señales fuertes de engaño.', recommendation: 'Confirma la solicitud por un canal que ya conozcas antes de continuar.' };
  }
  // Message patterns are warnings, never proof of fraud on their own.
  const weight = message.reduce((n, s) => n + s.weight, 0);
  if (verdict.level === 'precaucion' || weight >= 2) return { ...base, color: 'orange', title: 'Ten precaución', summary: weight >= 2 ? (message.find(s => s.id === 'message-brand' || s.id === 'message-secrets') ?? message[0]).title : verdict.signals.find(s => s.weight > 0)?.title ?? 'Confirma el origen antes de abrir.', recommendation: 'Revisa la solicitud en la aplicación oficial; no entregues claves ni hagas pagos desde este mensaje.' };
  if (privacy.sensitive) return { ...base, color: 'orange', title: 'Ten precaución', summary: 'Es un enlace privado: confirma que esperabas recibirlo.', recommendation: privacy.reason ?? 'No compartimos este enlace con servicios externos.' };
  if (extra.dns === 'not-found') return { ...base, color: 'orange', title: 'Ten precaución', summary: 'El dominio no se encontró en la consulta DNS.', recommendation: 'Revisa si la dirección está bien escrita y confirma el enlace con quien lo envió.' };
  if (destination?.status === 404 || destination?.status === 410) return { ...base, color: 'orange', title: 'Ten precaución', summary: destination.status === 410 ? 'La página fue retirada según su servidor.' : 'El servidor no encontró esa página.', recommendation: 'Solicita un enlace actualizado; esto no demuestra que el sitio sea una estafa.' };
  const blocked = destination?.status && [401,403,405,406,429,451].includes(destination.status);
  if (!destination?.checked || destination.reachable !== true || destination.looksLikeJsShell || blocked || sources.some(s => s.status === 'unavailable'))
    return { ...base, color: 'orange', title: 'Ten precaución', summary: blocked ? 'El sitio restringe la revisión automática.' : destination?.looksLikeJsShell ? 'La página no dejó ver su contenido completo.' : 'Confirma el origen antes de abrir este enlace.', recommendation: 'Las comprobaciones quedaron limitadas. Entra desde la aplicación oficial o confirma con quien te lo envió.' };
  if (weight || verdict.signals.some(s => s.weight > 0)) return { ...base, color: 'orange', title: 'Ten precaución', summary: message[0]?.title ?? verdict.signals.find(s => s.weight > 0)?.title ?? 'Hay detalles que conviene revisar.', recommendation: 'Confirma que esperabas este mensaje antes de continuar.' };
  return { ...base, color: 'green', title: 'Sin alertas', summary: 'No encontramos señales de riesgo en las comprobaciones realizadas.', recommendation: 'No es una garantía de seguridad. Confirma el contexto si te pide datos o un pago.' };
}
