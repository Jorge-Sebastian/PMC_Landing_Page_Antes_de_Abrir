import type { DestinationCheck, RiskLevel, Verdict } from "@/lib/link-analysis/types";

/** La incertidumbre cambia la presentación, nunca reduce una alerta del motor. */
export const getResultPresentation = (verdict: Verdict, destination: DestinationCheck) => {
  const incomplete = !destination.checked || destination.looksLikeJsShell === true ||
    destination.reachable === false || (typeof destination.status === "number" && destination.status >= 400);
  const level: RiskLevel = verdict.level === "sin-senales" && incomplete ? "precaucion" : verdict.level;
  return { level, incomplete, uncertain: incomplete && verdict.level !== "riesgo" };
};
