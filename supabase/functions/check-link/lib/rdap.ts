/**
 * Edad de un dominio vía RDAP, con el bootstrap de IANA para encontrar el
 * servidor RDAP correcto por TLD. Sin imports externos a propósito, para
 * poder testear toda la lógica fuera de Deno (vitest/Node — `fetch` es
 * global en ambos entornos, así que `fetchImpl` se puede simular sin tocar
 * nada global).
 *
 * Solo se consulta el dominio REGISTRABLE (ver `registrable-domain.ts`),
 * nunca la URL completa ni un subdominio: es lo mínimo necesario para saber
 * hace cuánto existe ese dominio, sin filtrar la ruta ni los parámetros que
 * escribió la persona.
 */

export type RdapFailureReason =
  | "no-rdap-server"
  | "not-found"
  | "no-registration-event"
  | "invalid-date"
  | "unavailable";

export type RdapResult = { ok: true; ageDays: number } | { ok: false; reason: RdapFailureReason };

type RdapBootstrapRegistry = { services?: unknown };

/** ¿A qué URL base de RDAP hay que preguntarle por este TLD? `null` si el bootstrap no lo cubre. */
export const findRdapBaseUrl = (registry: RdapBootstrapRegistry | null, tld: string): string | null => {
  if (!registry || !Array.isArray(registry.services)) return null;
  for (const service of registry.services) {
    if (!Array.isArray(service) || service.length < 2) continue;
    const [tlds, urls] = service as [unknown, unknown];
    if (!Array.isArray(tlds) || !Array.isArray(urls) || urls.length === 0) continue;
    if (tlds.includes(tld)) {
      const base = String(urls[0]);
      return base.endsWith("/") ? base : `${base}/`;
    }
  }
  return null;
};

/** Extrae la edad en días a partir del cuerpo JSON de una respuesta RDAP de dominio. */
export const parseRegistrationAge = (rdapBody: unknown, now: Date = new Date()): RdapResult => {
  if (!rdapBody || typeof rdapBody !== "object") {
    return { ok: false, reason: "no-registration-event" };
  }
  const events = (rdapBody as { events?: unknown }).events;
  if (!Array.isArray(events)) return { ok: false, reason: "no-registration-event" };

  const registration = events.find(
    (event): event is { eventAction: string; eventDate: unknown } =>
      Boolean(event) &&
      typeof event === "object" &&
      (event as { eventAction?: unknown }).eventAction === "registration",
  );
  if (!registration || typeof registration.eventDate !== "string") {
    return { ok: false, reason: "no-registration-event" };
  }

  const registeredAt = new Date(registration.eventDate);
  if (Number.isNaN(registeredAt.getTime())) {
    return { ok: false, reason: "invalid-date" };
  }

  const diffMs = now.getTime() - registeredAt.getTime();
  if (diffMs < 0) return { ok: false, reason: "invalid-date" };

  return { ok: true, ageDays: Math.floor(diffMs / (24 * 60 * 60 * 1000)) };
};

export type FetchLike = typeof fetch;

const BOOTSTRAP_URL = "https://data.iana.org/rdap/dns.json";
const BOOTSTRAP_TTL_MS = 24 * 60 * 60 * 1000;

let bootstrapCache: RdapBootstrapRegistry | null = null;
let bootstrapCachedAt = 0;

/** Solo para tests: fuerza a que la próxima llamada vuelva a pedir el bootstrap. */
export const resetRdapBootstrapCacheForTests = () => {
  bootstrapCache = null;
  bootstrapCachedAt = 0;
};

const getBootstrap = async (
  fetchImpl: FetchLike,
  timeoutMs: number,
): Promise<RdapBootstrapRegistry | null> => {
  const now = Date.now();
  if (bootstrapCache && now - bootstrapCachedAt < BOOTSTRAP_TTL_MS) return bootstrapCache;
  try {
    const response = await fetchImpl(BOOTSTRAP_URL, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return bootstrapCache;
    bootstrapCache = (await response.json()) as RdapBootstrapRegistry;
    bootstrapCachedAt = now;
    return bootstrapCache;
  } catch {
    return bootstrapCache;
  }
};

/**
 * Edad del dominio registrable vía RDAP. Nunca lanza: cualquier fallo (sin
 * servidor RDAP para el TLD, 404, timeout, fecha rara) devuelve
 * `{ ok: false, reason }`, que el motor trata siempre como "no se sabe" —
 * nunca como un enlace más confiable.
 */
export const lookupDomainAge = async (
  registrableDomain: string,
  options: { fetchImpl?: FetchLike; timeoutMs?: number } = {},
): Promise<RdapResult> => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 3000;
  const tld = registrableDomain.split(".").pop() ?? "";

  const registry = await getBootstrap(fetchImpl, timeoutMs);
  const baseUrl = findRdapBaseUrl(registry, tld);
  if (!baseUrl) return { ok: false, reason: "no-rdap-server" };

  try {
    const response = await fetchImpl(`${baseUrl}domain/${registrableDomain}`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 404) return { ok: false, reason: "not-found" };
    if (!response.ok) return { ok: false, reason: "unavailable" };
    const body = await response.json();
    return parseRegistrationAge(body);
  } catch {
    return { ok: false, reason: "unavailable" };
  }
};
