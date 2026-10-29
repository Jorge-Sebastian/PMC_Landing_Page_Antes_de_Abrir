import { describe, expect, it } from "vitest";
import spanish from "../../../public/locales/es.json";
import { formatMonthlyPriceCOP, PRICING_PLANS } from "./pricing-model";

describe("SmartGuard pricing transparency", () => {
  it("keeps manual web analysis free without a registration or checkout gate", () => {
    expect(PRICING_PLANS[0]).toMatchObject({
      id: "free",
      monthlyCOP: 0,
      availability: "available",
      destination: "#analizador",
    });
  });

  it("distinguishes automatic individual coverage from a family subscription", () => {
    expect(PRICING_PLANS.map((plan) => plan.id)).toEqual([
      "free", "automatic", "family",
    ]);
    expect(PRICING_PLANS[1].monthlyCOP).toBe(9900);
    expect(PRICING_PLANS[1].members).toBe(1);
    expect(PRICING_PLANS[2].monthlyCOP).toBe(19900);
    expect(PRICING_PLANS[2].members).toBe(5);
  });

  it("does not activate future trials, paid plans or payment destinations", () => {
    for (const plan of PRICING_PLANS) {
      expect(plan.destination).toMatch(/^#[a-z-]+$/);
      expect(plan.features.length).toBeGreaterThan(0);
      if (plan.monthlyCOP > 0) {
        expect(plan.availability).toBe("planned");
        expect(plan.trialDays).toBe(15);
      }
    }
  });

  it("has Spanish copy for every plan feature and essential price label", () => {
    const translations = spanish as Record<string, string>;
    const ids = ["free", "automatic", "family"] as const;
    for (const plan of PRICING_PLANS) {
      for (const key of plan.features) expect(translations[key]).toBeTruthy();
    }
    for (const id of ids) {
      for (const suffix of ["name", "description", "action", "footnote"]) {
        expect(translations["pricing." + id + "." + suffix]).toBeTruthy();
      }
    }
    expect(translations["pricing.commercialNotice"]).toContain("aún no están habilitados");
    expect(translations["pricing.pilotNotice"]).toContain("no se cobra");
  });

  it("formats proposed Colombian prices clearly", () => {
    expect(formatMonthlyPriceCOP(0)).toBe("$0");
    expect(formatMonthlyPriceCOP(9900)).toBe("$9.900");
    expect(formatMonthlyPriceCOP(19900)).toBe("$19.900");
    expect(() => formatMonthlyPriceCOP(-1)).toThrow();
  });
});
