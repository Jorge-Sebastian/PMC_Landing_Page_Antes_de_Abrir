import { analyzeLink } from "./analyze-url";
import { createSignal } from "./signals";
import type { DestinationCheck, RiskLevel, Signal, Verdict } from "./types";

const STRONG_WEIGHT = 3;
const DANGER_SCORE = 6;
const CAUTION_SCORE = 2;

/**
 * Combina las señales de la dirección con lo que se observó al comprobar el
 * destino. Nunca se sube de nivel cuando el destino no pudo comprobarse: la
 * falta de información no vuelve más seguro un enlace.
 */
export const buildVerdict = (url: string, destination: DestinationCheck): Verdict => {
  const linkSignals = analyzeLink(new URL(url));
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

  return { level, score, signals };
};
