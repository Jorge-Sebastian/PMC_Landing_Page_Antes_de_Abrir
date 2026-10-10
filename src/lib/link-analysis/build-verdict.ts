import { officialDomainsSource } from "./allowlist";
import { analyzeLink, splitHost } from "./analyze-url";
import { createSignal } from "./signals";
import type { DestinationCheck, OfficialMatch, RiskLevel, Signal, Verdict } from "./types";

const STRONG_WEIGHT = 3;
const DANGER_SCORE = 6;
const CAUTION_SCORE = 2;

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
      destinationSignals.push(createSignal("destino-no-responde", "destination"));
    }
    const alreadyStrong = linkSignals.some((signal) => signal.weight >= STRONG_WEIGHT);
    if (
      destination.hasPasswordField &&
      (alreadyStrong || destination.differentHost || destinationSignals.length > 0)
    ) {
      destinationSignals.push(createSignal("pide-datos", "destination"));
    }
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
