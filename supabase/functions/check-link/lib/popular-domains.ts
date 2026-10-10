/**
 * Qué tan conocido es un dominio registrable, más allá de las marcas
 * catalogadas a mano en `src/lib/link-analysis/brands.ts`.
 *
 * Sin implementar a propósito: Martín lo conectará a una tabla
 * `popular_domains` en Supabase (ver docs/handoff/MARTIN-allowlist.md).
 * Devuelve siempre "none" para no cambiar el comportamiento actual de
 * `check-link` — nada en `index.ts` depende todavía de este resultado.
 *
 * Sin imports externos a propósito, igual que el resto de `lib/`: así se
 * puede testear con vitest fuera de Deno.
 */
export type PopularityTier = "popular" | "none";

// TODO(Martín): consultar la tabla `popular_domains` (o un JSON cacheado
// sincronizado desde ella) por dominio registrable EXACTO. Nunca por
// `includes`/`endsWith` sobre el host completo — el dominio que se pasa
// aquí ya debe venir reducido por la Public Suffix List.
export const lookupPopular = async (registrableDomain: string): Promise<PopularityTier> => {
  void registrableDomain;
  return "none";
};
