import { describe, expect, it } from "vitest";

import { registrableDomainFor } from "./registrable-domain";

describe("registrableDomainFor", () => {
  it("reduce un host con subdominios a su dominio de dos etiquetas", () => {
    expect(registrableDomainFor("www.paypal.com")).toBe("paypal.com");
    expect(registrableDomainFor("a.b.example.com")).toBe("example.com");
  });

  it("reconoce los sufijos de dos partes más comunes (com.ar, co.uk...)", () => {
    expect(registrableDomainFor("www.bancolombia.com.ar")).toBe("bancolombia.com.ar");
    expect(registrableDomainFor("shop.example.co.uk")).toBe("example.co.uk");
  });

  it("deja igual un dominio que ya es de dos etiquetas", () => {
    expect(registrableDomainFor("example.com")).toBe("example.com");
  });
});
