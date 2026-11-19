/**
 * Navigation contract for the Android app.
 * This model is also used for read-only visual scenarios. It is NOT a payment
 * entitlement provider; the backend must verify entitlements before any paywall.
 */
export type AccessScenario = "real" | "trial" | "premium" | "free" | "expired" | "invited";
export type MobileTab = "home" | "analyze" | "activity" | "protection" | "family";

export const ALL_TABS: readonly MobileTab[] = [
  "home", "analyze", "activity", "protection", "family",
] as const;

export const BASIC_TABS: readonly MobileTab[] = ["home", "analyze"] as const;

export const PREVIEW_SCENARIOS: ReadonlyArray<{
  id: Exclude<AccessScenario, "real">;
  title: string;
  description: string;
}> = [
  { id: "trial", title: "Prueba de 15 dias", description: "Las cinco vistas disponibles" },
  { id: "premium", title: "Premium", description: "Las cinco vistas disponibles" },
  { id: "free", title: "Gratuito", description: "Solo Inicio y Analizar" },
  { id: "expired", title: "Prueba vencida", description: "Solo Inicio y Analizar" },
  { id: "invited", title: "Invitado sin Premium", description: "Solo Inicio y Analizar" },
];

export function visibleTabs(scenario: AccessScenario): readonly MobileTab[] {
  return scenario === "free" || scenario === "expired" || scenario === "invited"
    ? BASIC_TABS
    : ALL_TABS;
}

export function scenarioTitle(scenario: AccessScenario): string {
  if (scenario === "real") return "Aplicacion real";
  return PREVIEW_SCENARIOS.find((item) => item.id === scenario)?.title || "Vista previa";
}

export function canOpenTab(scenario: AccessScenario, tab: MobileTab): boolean {
  return visibleTabs(scenario).includes(tab);
}
