/**
 * Construye el cuerpo de la respuesta exitosa de check-link, y decide qué
 * edad de dominio usar. Pura y sin imports externos a propósito: es la
 * pieza que `index.ts` no puede exponer a un test directo (ejecuta
 * `Deno.serve` al importarse), así que toda la lógica que vale la pena
 * testear vive aquí, no ahí.
 */
import type { RdapResult } from "./rdap.ts";

export const normalizeHost = (host: string) => host.toLowerCase().replace(/^www\./, "");

export const extractTitle = (html: string): string => {
  const match = html.match(/<title[^>]*>([\s\S]{0,200}?)<\/title>/i);
  if (!match) return "";
  return match[1].replace(/\s+/g, " ").trim().slice(0, 160);
};

export const hasPasswordField = (html: string): boolean => /type\s*=\s*["']?password/i.test(html);

export type FollowRedirectsOutcome = {
  currentUrl: string;
  status: number;
  redirects: string[];
  html: string;
};

export type CheckLinkSuccessBody = {
  ok: true;
  reachable: boolean;
  status: number;
  finalUrl: string;
  finalHost: string;
  redirects: string[];
  differentHost: boolean;
  title: string;
  hasPasswordField: boolean;
  /** null = no se pudo saber (RDAP sin servidor para el TLD, 404, timeout, fecha rara). */
  domainAgeDays: number | null;
};

/**
 * ¿La edad de qué dominio hay que usar: la del host original, o la del
 * host final (si las redirecciones llevaron a un dominio registrable
 * distinto)? Es la edad del destino FINAL la que importa — a dónde
 * termina llegando la persona —, no la del enlace que escribió. Pura:
 * `lookupFinal` se inyecta para poder testear sin red real (y para no
 * repetir la consulta cuando el dominio no cambió).
 */
export const resolveDomainAge = async (
  initialRegistrable: string,
  finalRegistrable: string,
  initialAge: RdapResult,
  lookupFinal: (registrableDomain: string) => Promise<RdapResult>,
): Promise<RdapResult> =>
  finalRegistrable === initialRegistrable ? initialAge : await lookupFinal(finalRegistrable);

/**
 * Cuerpo de la respuesta exitosa. Un fallo de RDAP (domainAge.ok === false)
 * nunca quita ni oculta ningún otro campo: solo pone `domainAgeDays` en
 * `null`. Esta función es precisamente la que garantiza eso — es un solo
 * objeto literal, no hay ninguna rama que dependa de `domainAge.ok` para
 * decidir si devolver el resto de los datos.
 */
export const buildSuccessBody = (
  initialHost: string,
  finalUrl: string,
  outcome: Pick<FollowRedirectsOutcome, "status" | "redirects" | "html">,
  domainAge: RdapResult,
): CheckLinkSuccessBody => {
  const finalHost = new URL(finalUrl).hostname;
  return {
    ok: true,
    reachable: outcome.status >= 200 && outcome.status < 400,
    status: outcome.status,
    finalUrl,
    finalHost,
    redirects: outcome.redirects,
    differentHost: normalizeHost(finalHost) !== normalizeHost(initialHost),
    title: extractTitle(outcome.html),
    hasPasswordField: hasPasswordField(outcome.html),
    domainAgeDays: domainAge.ok ? domainAge.ageDays : null,
  };
};
