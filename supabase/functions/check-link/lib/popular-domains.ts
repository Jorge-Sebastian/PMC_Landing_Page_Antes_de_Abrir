/** Consulta informativa de la tabla public.popular_domains.
 * Se recibe un dominio YA reducido con Public Suffix List; no se hace
 * matching de subcadenas ni se infiere que un dominio sea oficial o seguro.
 * Fallos de conexión o ausencia de datos son neutros ("none").
 */
export type PopularityTier = "popular" | "none";

type LookupOptions = {
  baseUrl?: string;
  anonKey?: string;
  fetcher?: typeof fetch;
};

const fromEnvironment = (key: string): string | undefined =>
  (globalThis as { Deno?: { env?: { get: (name: string) => string | undefined } } }).Deno?.env?.get(key);

export const lookupPopular = async (
  registrableDomain: string,
  options: LookupOptions = {},
): Promise<PopularityTier> => {
  const domain = registrableDomain.trim().toLowerCase();
  if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(domain)) return "none";

  const baseUrl = options.baseUrl ?? fromEnvironment("SUPABASE_URL");
  const anonKey = options.anonKey ?? fromEnvironment("SUPABASE_ANON_KEY");
  if (!baseUrl || !anonKey) return "none";

  try {
    // PostgREST aplica igualdad sobre la columna PK "domain".
    const endpoint = new URL("/rest/v1/popular_domains", baseUrl);
    endpoint.searchParams.set("select", "domain");
    endpoint.searchParams.set("domain", `eq.${domain}`);
    endpoint.searchParams.set("limit", "1");
    const response = await (options.fetcher ?? fetch)(endpoint.toString(), {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      signal: AbortSignal.timeout(900),
    });
    if (!response.ok) return "none";
    const result: unknown = await response.json();
    // No confiar en coincidencias aproximadas ni en respuestas inesperadas.
    return Array.isArray(result) && result.some(
      (entry) => typeof entry === "object" && entry !== null &&
        "domain" in entry && entry.domain === domain,
    ) ? "popular" : "none";
  } catch {
    return "none";
  }
};
