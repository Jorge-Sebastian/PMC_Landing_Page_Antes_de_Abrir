import { officialDomainsSource } from './allowlist';
import { splitHost } from './analyze-url';

export type MessageFinding = { id: string; title: string; explanation: string; weight: number };
/** Only generic findings leave this function. The message itself is never returned. */
export function analyzeMessage(message: string, url: string): MessageFinding[] {
  const text = message.slice(0, 16384).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  // Exclude URLs from natural-language matching (paths often contain login/payment words).
  const body = text.replace(/https?:\/\/\S+/g, ' ');
  const findings: MessageFinding[] = [];
  const urgency = /(?:urgente|inmediatamente|ultima oportunidad|ultim[oa] aviso|hoy mismo|en (?:\d+|pocos) minutos|sera bloquead|suspend(?:er|id)|evita(?:r)? (?:el )?bloqueo)/.test(body);
  const secrets = /(?:envia|comparte|ingresa|introduce|confirma|verifica|actualiza|valida)[\s\S]{0,55}(?:contrasena|clave|codigo(?: de (?:seguridad|verificacion))?|cvv|pin|otp|datos (?:bancarios|de tu tarjeta))/.test(body)
    && !/(?:no|nunca|jamas)\s+(?:te\s+)?(?:pediremos|pidas|compartas|envies|ingreses|solicitaremos)/.test(body);
  const payment = /(?:paga|pague|pagar|pago pendiente|deuda|multa|transferencia|consigna|consignacion|cobro)/.test(body);
  const prize = /(?:ganaste|has ganado|eres (?:el )?ganador|reclama tu premio|premio gratis)/.test(body);
  if (urgency) findings.push({ id: 'message-pressure', title: 'El mensaje genera presión', explanation: 'Usa urgencia, bloqueo o suspensión para que actúes rápidamente. Esto también puede ocurrir en avisos legítimos.', weight: 1 });
  if (secrets) findings.push({ id: 'message-secrets', title: 'Solicita claves, códigos o datos sensibles', explanation: 'Detectamos una solicitud de datos sensibles en el texto. Confírmala desde una aplicación o contacto oficial.', weight: 2 });
  if (payment && urgency) findings.push({ id: 'message-payment', title: 'Pide un pago con urgencia', explanation: 'La combinación de pago y presión merece comprobación independiente antes de transferir dinero.', weight: 1 });
  if (prize) findings.push({ id: 'message-prize', title: 'Anuncia un premio', explanation: 'Confirma que participaste y verifica quién lo ofrece antes de entregar datos o pagar.', weight: 1 });
  let host = ''; try { host = new URL(url).hostname; } catch { return findings; }
  const official = officialDomainsSource.findOfficial(splitHost(host).registrable);
  // A company name in an article is not impersonation: require a direct account/action claim.
  const actionable = /(?:tu cuenta|su cuenta|somos|te informa|le informa|actualiza|valida|verifica|confirma|bloque|suspend)/.test(body);
  if (actionable) for (const brand of officialDomainsSource.brands()) {
    const mentions = brand.keywords.some(k => k.length >= 4 && new RegExp(`(?:^|[^a-z0-9])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^a-z0-9])`, 'i').test(body));
    if (mentions && official?.brandId !== brand.id) {
      findings.push({ id: 'message-brand', title: `Menciona a ${brand.name}, pero lleva a otra dirección`, explanation: `El enlace lleva a ${host}. Puede existir un proveedor legítimo no catalogado; confirma desde la aplicación de ${brand.name}.`, weight: 2 });
      break;
    }
  }
  return findings;
}
