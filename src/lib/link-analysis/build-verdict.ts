import { officialDomainsSource } from "./allowlist";
import { analyzeLink, splitHost } from "./analyze-url";
import { createSignal } from "./signals";
import type { DestinationCheck, OfficialMatch, RiskLevel, Signal, Verdict } from "./types";

const STRONG_WEIGHT = 3;
const DANGER_SCORE = 6;
const CAUTION_SCORE = 2;
/**
 * Umbral de "dominio nuevo" (Fase 2, vía RDAP). Peso de la señal fijado en
 * `signals.ts` a 2 a propósito: un dominio de menos de 30 días por sí solo
 * nunca debe pasar de "precaución" (podría ser un negocio real recién
 * lanzado). Combinado con una señal fuerte ya existente (p. ej. imitación
 * de marca), el nivel sigue en "riesgo" — pero eso ya ocurre por el peso de
 * esa otra señal, no por esta regla.
 */
const NEW_DOMAIN_MAX_AGE_DAYS = 30;

/**
 * Hallazgo de la prueba en producción (g2.com, 2026-10-10): muchos sitios
 * reales bloquean la visita automática del backend con uno de estos
 * códigos. No es, por sí solo, una señal de riesgo — antes se confundía
 * con "el sitio contestó con un error" (`destino-no-responde`, peso 2).
 */
const BLOCKING_HTTP_STATUSES = new Set([401, 403, 405, 406, 429, 451]);
const isBlockingHttpStatus = (status: number): boolean =>
  BLOCKING_HTTP_STATUSES.has(status) || (status >= 500 && status < 600);

export type StaticAnalysis = {
  signals: Signal[];
  officialMatch: OfficialMatch | null;
};

/**
 * Parte sin red del análisis: las señales del propio enlace más si el
 * dominio coincide con uno oficial conocido. El resultado no cambia una vez
 * calculado, así que la UI puede mostrarlo al instante y completarlo después
 * con `finalizeVerdict` sin volver a ejecutar `analyzeLink`.
 */
export const analyzeStatic = (url: string): StaticAnalysis => {
  const parsed = new URL(url);
  const signals = analyzeLink(parsed);
  const { registrable } = splitHost(parsed.hostname.toLowerCase());
  const officialMatch = officialDomainsSource.findOfficial(registrable);
  return { signals, officialMatch };
};

/**
 * Combina las señales de la dirección con lo que se observó al comprobar el
 * destino. Nunca se sube de nivel cuando el destino no pudo comprobarse: la
 * falta de información no vuelve más seguro un enlace.
 */
export const finalizeVerdict = (staticResult: StaticAnalysis, destination: DestinationCheck): Verdict => {
  const linkSignals = staticResult.signals;
  const destinationSignals: Signal[] = [];

  if (destination.checked) {
    if (destination.differentHost) {
      destinationSignals.push(createSignal("otra-web-oculta", "destination"));
    }
    if (destination.reachable === false) {
      // Respondió, pero con un error: si ese error tiene forma de bloqueo
      // automático (403, 429...) es neutro (peso 0); cualquier otro error
      // real (p. ej. 404) sigue contando como antes (peso 2).
      if (typeof destination.status === "number" && isBlockingHttpStatus(destination.status)) {
        destinationSignals.push(createSignal("destino-verificacion-bloqueada", "destination"));
      } else {
        destinationSignals.push(createSignal("destino-no-responde", "destination"));
      }
    }
    const alreadyStrong = linkSignals.some((signal) => signal.weight >= STRONG_WEIGHT);
    if (
      destination.hasPasswordField &&
      (alreadyStrong || destination.differentHost || destinationSignals.length > 0)
    ) {
      destinationSignals.push(createSignal("pide-datos", "destination"));
    }
  }

  // No respondió en absoluto (no "checked", y específicamente por falta de
  // conexión/resolución, no porque la entrada fuera inválida o un host
  // bloqueado a propósito): distinto del caso de arriba, donde sí hubo una
  // respuesta HTTP aunque fuera de error.
  if (!destination.checked && destination.reason === "unavailable") {
    destinationSignals.push(createSignal("destino-inalcanzable", "destination"));
  }

  // Independiente de `checked`: RDAP puede responder aunque el sitio no
  // haya sido alcanzable por HTTP (o viceversa). `null`/`undefined` =
  // nunca se pudo saber la edad — no agrega nada, nunca mejora el veredicto.
  if (
    typeof destination.domainAgeDays === "number" &&
    destination.domainAgeDays < NEW_DOMAIN_MAX_AGE_DAYS
  ) {
    destinationSignals.push(createSignal("dominio-nuevo", "destination"));
  }

  const signals = [...linkSignals, ...destinationSignals].sort(
    (left, right) => right.weight - left.weight,
  );
  const score = signals.reduce((total, signal) => total + signal.weight, 0);
  const hasStrongSignal = signals.some((signal) => signal.weight >= STRONG_WEIGHT);

  const level: RiskLevel =
    hasStrongSignal || score >= DANGER_SCORE
      ? "riesgo"
      : score >= CAUTION_SCORE
        ? "precaucion"
        : "sin-senales";

  return { level, score, signals, officialMatch: staticResult.officialMatch };
};

/**
 * Atajo que mantiene la API anterior: calcula la parte estática y la
 * combina con el destino en un solo paso. `link-analyzer.tsx` puede seguir
 * usando esta función sin cambios; el resultado en dos tiempos
 * (`analyzeStatic` + `finalizeVerdict`) es para cuando la UI quiera mostrar
 * las señales del enlace antes de que termine la comprobación del destino.
 */
export const buildVerdict = (url: string, destination: DestinationCheck): Verdict =>
  finalizeVerdict(analyzeStatic(url), destination);
