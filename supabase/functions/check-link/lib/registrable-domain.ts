/**
 * Dominio registrable aproximado, usado SOLO para decidir qué dominio
 * consultar en RDAP (`rdap.ts`) — no para parsear señales de riesgo, eso
 * ya lo hace `tldts` en el motor del cliente (`src/lib/link-analysis/analyze-url.ts`).
 *
 * Lista corta de sufijos de dos partes, no la Public Suffix List completa.
 * Decisión explícita (Fase 2, 2026-10-10): no hay forma de probar en este
 * entorno de desarrollo que `tldts` cargue bien en el runtime de Deno de
 * las Supabase Edge Functions (no hay Deno instalado aquí para verificarlo,
 * y la función se despliega por separado — ver docs/CHANGELOG-algoritmo.md).
 * Antes de arriesgar una dependencia sin verificar en producción, se usa
 * esta lista fija corta, igual que la que tenía el motor del cliente antes
 * de la Fase 1. Si en algún momento se confirma que `npm:tldts` carga bien
 * en ese runtime, esto se puede reemplazar sin cambiar la firma de
 * `registrableDomainFor`.
 */
const TWO_PART_SUFFIXES = new Set([
  "com.ar",
  "com.br",
  "com.mx",
  "com.co",
  "com.pe",
  "com.ec",
  "com.uy",
  "com.ve",
  "com.bo",
  "com.py",
  "com.do",
  "com.gt",
  "com.sv",
  "com.hn",
  "com.ni",
  "com.pa",
  "com.cr",
  "com.es",
  "co.uk",
  "co.nz",
  "org.uk",
  "com.au",
  "co.in",
]);

export const registrableDomainFor = (host: string): string => {
  const labels = host
    .toLowerCase()
    .split(".")
    .filter(Boolean);
  if (labels.length <= 2) return labels.join(".");
  const lastTwo = labels.slice(-2).join(".");
  const take = TWO_PART_SUFFIXES.has(lastTwo) ? 3 : 2;
  return labels.slice(-take).join(".");
};
