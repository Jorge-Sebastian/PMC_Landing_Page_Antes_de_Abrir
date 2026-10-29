/** Conservative privacy gate: never send access/reset links to scanners. */
export function inspectUrlPrivacy(value: string): { sensitive: boolean; reason?: string } {
  let u: URL;
  try { u = new URL(value); } catch { return { sensitive: true, reason: 'Dirección inválida: solo se revisó localmente.' }; }
  if (!['http:', 'https:'].includes(u.protocol)) return { sensitive: true, reason: 'Esta dirección no es una página HTTP o HTTPS.' };
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.localhost') || /^(?:127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host) || /^(?:::1$|f[cd][0-9a-f]{2}:|fe80:)/.test(host)) return { sensitive: true, reason: 'Parece una dirección de red privada; no se compartió externamente.' };
  if (u.username || u.password) return { sensitive: true, reason: 'El enlace incluye credenciales; no se envió a servicios externos.' };
  const secretKey = /^(?:access[_-]?token|refresh[_-]?token|id[_-]?token|token|code|otp|pin|password|passwd|clave|secret|api[_-]?key|key|authorization|auth|session(?:id)?|ticket|sig(?:nature)?|invite(?:[_-]?(?:code|token))?|verification[_-]?code|email|e-?mail|phone|telefono|documento|cedula)$/i;
  if ([...u.searchParams.keys()].some(k => secretKey.test(k))) return { sensitive: true, reason: 'Puede contener datos personales o un código privado; se revisó solo en el celular.' };
  if ([...u.searchParams.values()].some(v => v.length >= 32 && /^[A-Za-z0-9_.-]+$/.test(v) && /[a-zA-Z]/.test(v) && /[0-9]/.test(v))) return { sensitive: true, reason: 'Incluye un identificador largo que podría ser privado; solo se revisó localmente.' };
  const path = decodeURIComponentSafe(u.pathname);
  if (/(?:reset|recover|recupera|verify|verific|invite|magic|confirm|activate|activar)[^/]*\/(?:[^/]{8,})/i.test(path) || /(?:token|code|otp|session|access_token)=/i.test(u.hash))
    return { sensitive: true, reason: 'Parece un enlace privado de acceso, invitación o recuperación; no se compartió con terceros.' };
  // Long opaque path tokens can be one-time bearer credentials, not just query parameters.
  if (path.split('/').some(p => p.length >= 32 && /^[A-Za-z0-9_-]+$/.test(p) && /[0-9]/.test(p) && /[A-Za-z]/.test(p)))
    return { sensitive: true, reason: 'Contiene un identificador privado o un código largo; no se envió a servicios externos.' };
  return { sensitive: false };
}
function decodeURIComponentSafe(s: string) { try { return decodeURIComponent(s); } catch { return s; } }
