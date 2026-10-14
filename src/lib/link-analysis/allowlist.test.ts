import { describe, expect, it } from "vitest";
import catalog from "../../../data/official-domains.json";
import { officialDomainsSource } from "./allowlist";

describe("catálogo oficial versionado", () => {
  it("expone el contrato y la versión del archivo", () => {
    expect(officialDomainsSource.version).toBe(catalog.version);
    expect(officialDomainsSource.brands()).toHaveLength(catalog.brands.length);
  });

  it("compara dominios registrables completos, nunca por terminación o parecido", () => {
    expect(officialDomainsSource.findOfficial("PAYPAL.COM")?.brandName).toBe("PayPal");
    expect(officialDomainsSource.findOfficial("paypal.com.ejemplo.com")).toBeNull();
    expect(officialDomainsSource.findOfficial("roblox.com.mu")).toBeNull();
    expect(officialDomainsSource.findOfficial("no-paypal.com")).toBeNull();
    expect(officialDomainsSource.findOfficial("amazon.co.uk")?.brandName).toBe("Amazon");
  });

  it("no deja mutar el catálogo desde otro consumidor", () => {
    const entries = officialDomainsSource.brands();
    entries[0].domains.splice(0);
    expect(officialDomainsSource.brands()[0].domains).toEqual(catalog.brands[0].domains);
  });
});
