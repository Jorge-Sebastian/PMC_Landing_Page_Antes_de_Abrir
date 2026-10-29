/**
 * Pricing proposals, not an active subscription checkout.
 *
 * Keep the free web analyzer live. Existing APK pilots are not paywalled:
 * enforcement of paid tiers only starts after we implement subscriptions,
 * verified entitlement checks and a consent-based onboarding flow.
 */
export type PricingPlanId = "free" | "automatic" | "family";

export type PricingPlan = {
  id: PricingPlanId;
  monthlyCOP: number;
  members: number;
  trialDays: number;
  availability: "available" | "planned";
  destination: "#analizador" | "#android" | "#familia-beneficios";
  features: readonly string[];
};

export const PRICING_PLANS: readonly PricingPlan[] = [
  {
    id: "free",
    monthlyCOP: 0,
    members: 1,
    trialDays: 0,
    availability: "available",
    destination: "#analizador",
    features: [
      "pricing.free.feature1",
      "pricing.free.feature2",
      "pricing.free.feature3",
      "pricing.free.feature4",
    ],
  },
  {
    id: "automatic",
    monthlyCOP: 9900,
    members: 1,
    trialDays: 15,
    availability: "planned",
    destination: "#android",
    features: [
      "pricing.automatic.feature1",
      "pricing.automatic.feature2",
      "pricing.automatic.feature3",
      "pricing.automatic.feature4",
    ],
  },
  {
    id: "family",
    monthlyCOP: 19900,
    members: 5,
    trialDays: 15,
    availability: "planned",
    destination: "#familia-beneficios",
    features: [
      "pricing.family.feature1",
      "pricing.family.feature2",
      "pricing.family.feature3",
      "pricing.family.feature4",
    ],
  },
] as const;

export function formatMonthlyPriceCOP(value: number): string {
  if (!Number.isFinite(value) || value < 0) throw new Error("Invalid monthly price");
  return "$" + new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(value);
}
