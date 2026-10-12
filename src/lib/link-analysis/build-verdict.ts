import { officialDomainsSource } from "./allowlist";
import { analyzeLink, isOfficialHost, splitHost } from "./analyze-url";
import { createSignal } from "./signals";
import type { DestinationCheck, OfficialMatch, RiskLevel, Signal, Verdict } from "./types";

const STRONG_WEIGHT = 3;
/**
 * Bajado de 6 a 3 en el Paso 4 (2026-10-12), con una búsqueda pequeña de
 * enteros + validación cruzada en entrenamiento (scripts/eval/grid-search-weights.ts),
 * NO una regresión: ver reports/final-paso4.md. Con los pesos nuevos del
 * Paso 3 ya puestos, bajar este umbral sube el recall en "riesgo" de 32.4%
 * a 53.5% en entrenamiento con una FPR casi igual (0.30%→0.36%) — la mayoría
 * de los falsos positivos de "riesgo" ya venían de señales fuertes (peso 3)
 * que fuerzan el nivel por separado, no del puntaje acumulado.
 */
const DANGER_SCORE = 3;
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

const normalizeHostForCompare = (host: string): string => host.toLowerCase().replace(/^www\./, "");

/**
 * Paso 4 (2026-10-11, reports/candidatas-paso3c.md): una redirección solo
 * cuenta como "otra web oculta" si de verdad lleva a un sitio distinto. Se
 * descarta cuando es solo una diferencia de "www."/apex, o cuando origen y
 * destino son los dos dominios oficiales conocidos de la misma marca (p. ej.
 * office.com -> login.microsoftonline.com). 10 de 78 redirecciones reales en
 * entrenamiento eran exactamente eso, todas legítimas.
 */
const isRealHiddenRedirect = (originHost: string, finalHost: string): boolean => {
  if (!finalHost) return true;
  if (normalizeHostForCompare(originHost) === normalizeHostForCompare(finalHost)) return false;
  if (isOfficialHost(originHost) && isOfficialHost(finalHost)) return false;
  return true;
};

/**
 * Paso 4: "sin reputación" = vive en un sufijo privado de la PSL (hosting
 * gratuito) o el dominio se registró hace menos de `NEW_DOMAIN_MAX_AGE_DAYS`.
 * `domainAgeDays` nulo/desconocido nunca cuenta como "sin reputación" — la
 * falta de dato no empeora el veredicto.
 */
const isNoReputationHost = (host: string, domainAgeDays: number | null | undefined): boolean => {
  const { isPrivate } = splitHost(host.toLowerCase());
  const isYoung = typeof domainAgeDays === "number" && domainAgeDays < NEW_DOMAIN_MAX_AGE_DAYS;
  return isPrivate || isYoung;
};

export type StaticAnalysis = {
  signals: Signal[];
  officialMatch: OfficialMatch | null;
  /** Host normalizado del enlace escrito (sin mayúsculas). Para comparar contra el destino en `finalizeVerdict`. */
  host: string;
};

/**
 * Parte sin red del análisis: las señales del propio enlace más si el
 * dominio coincide con uno oficial conocido. El resultado no cambia una vez
 * calculado, así que la UI puede mostrarlo al instante y completarlo después
 * con `finalizeVerdict` sin volver a ejecutar `analyzeLink`.
 */
export const analyzeStatic = (url: string): StaticAnalysis => {
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase();
  const signals = analyzeLink(parsed);
  const { registrable } = splitHost(host);
  const officialMatch = officialDomainsSource.findOfficial(registrable);
  return { signals, officialMatch, host };
};

/**
 * Combina las señales de la dirección con lo que se observó al comprobar el
 * destino. Nunca se sube de nivel cuando el destino no pudo comprobarse: la
 * falta de información no vuelve más seguro un enlace.
 */
export const finalizeVerdict = (staticResult: StaticAnalysis, destination: DestinationCheck): Verdict => {
  const linkSignals = staticResult.signals;
  const destinationSignals: Signal[] = [];

  // Error HTTP real (no de bloqueo), decidido al final: ver más abajo, una
  // vez que se sabe si hay alguna otra señal alrededor.
  let isolatedHttpError = false;

  if (destination.checked) {
    const realHiddenRedirect =
      Boolean(destination.differentHost) && isRealHiddenRedirect(staticResult.host, destination.finalHost ?? "");
    if (realHiddenRedirect) {
      destinationSignals.push(createSignal("otra-web-oculta", "destination"));
    }
    if (destination.reachable === false) {
      // Respondió, pero con un error: si ese error tiene forma de bloqueo
      // automático (403, 429...) es neutro (peso 0) sin importar el resto.
      // Cualquier otro error real (p. ej. 404) se decide más abajo, una vez
      // conocidas las demás señales (hallazgo de coordinadora.com).
      if (typeof destination.status === "number" && isBlockingHttpStatus(destination.status)) {
        destinationSignals.push(createSignal("destino-verificacion-bloqueada", "destination"));
      } else {
        isolatedHttpError = true;
      }
    }
    const alreadyStrong = linkSignals.some((signal) => signal.weight >= STRONG_WEIGHT);
    if (
      destination.hasPasswordField &&
      (alreadyStrong || realHiddenRedirect || destinationSignals.length > 0 || isolatedHttpError)
    ) {
      destinationSignals.push(createSignal("pide-datos", "destination"));
    }
    // Se agrega DESPUÉS de "pide-datos" a propósito: si ya se contó ahí, no
    // debe contar otra vez como la "otra señal" que justificaría "pide-datos"
    // (serían la misma observación de contraseña contándose dos veces).
    if (
      destination.hasPasswordField &&
      isNoReputationHost(destination.finalHost || staticResult.host, destination.domainAgeDays)
    ) {
      destinationSignals.push(createSignal("contrasena-sin-reputacion", "destination"));
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

  // Hallazgo de producción (coordinadora.com, 2026-10-11): un error HTTP
  // real y AISLADO (sin ninguna otra señal, ni del enlace ni del destino)
  // no debe sumar nada — muchos sitios reales rechazan la visita
  // automática. La misma lógica que "pide-datos": solo cuenta combinado.
  if (isolatedHttpError) {
    const hasAnyOtherSignal = linkSignals.length > 0 || destinationSignals.length > 0;
    destinationSignals.push(
      createSignal(hasAnyOtherSignal ? "destino-no-responde" : "destino-error-aislado", "destination"),
    );
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
