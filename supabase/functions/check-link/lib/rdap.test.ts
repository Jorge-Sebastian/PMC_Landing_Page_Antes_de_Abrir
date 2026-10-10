import { beforeEach, describe, expect, it, vi } from "vitest";

import { findRdapBaseUrl, lookupDomainAge, parseRegistrationAge, resetRdapBootstrapCacheForTests } from "./rdap";

const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe("parseRegistrationAge", () => {
  it("calcula la edad en días a partir de un evento 'registration' válido", () => {
    const now = new Date("2026-10-10T00:00:00Z");
    const body = { events: [{ eventAction: "registration", eventDate: "2026-09-10T00:00:00Z" }] };
    const result = parseRegistrationAge(body, now);
    expect(result).toEqual({ ok: true, ageDays: 30 });
  });

  it("devuelve 'invalid-date' con una fecha de registro que no se puede parsear", () => {
    const body = { events: [{ eventAction: "registration", eventDate: "no-es-una-fecha" }] };
    expect(parseRegistrationAge(body)).toEqual({ ok: false, reason: "invalid-date" });
  });

  it("devuelve 'no-registration-event' cuando la respuesta no tiene ningún evento de registro", () => {
    expect(parseRegistrationAge({ events: [{ eventAction: "expiration", eventDate: "2026-01-01" }] })).toEqual({
      ok: false,
      reason: "no-registration-event",
    });
    expect(parseRegistrationAge({})).toEqual({ ok: false, reason: "no-registration-event" });
    expect(parseRegistrationAge(null)).toEqual({ ok: false, reason: "no-registration-event" });
  });
});

describe("findRdapBaseUrl", () => {
  const registry = { services: [[["com", "net"], ["https://rdap.verisign.com/com/v1/"]]] };

  it("encuentra la URL base cuando el TLD está en el bootstrap", () => {
    expect(findRdapBaseUrl(registry, "com")).toBe("https://rdap.verisign.com/com/v1/");
  });

  it("devuelve null cuando el TLD no tiene servidor RDAP en el bootstrap", () => {
    expect(findRdapBaseUrl(registry, "xyz")).toBeNull();
    expect(findRdapBaseUrl(null, "com")).toBeNull();
  });
});

describe("lookupDomainAge (fetch simulado)", () => {
  beforeEach(() => {
    resetRdapBootstrapCacheForTests();
  });

  const bootstrapBody = { services: [[["com"], ["https://rdap.example-registry.com/"]]] };

  it("devuelve la edad cuando el bootstrap y la consulta RDAP funcionan", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(bootstrapBody))
      .mockResolvedValueOnce(
        jsonResponse({ events: [{ eventAction: "registration", eventDate: "2020-01-01T00:00:00Z" }] }),
      );
    const result = await lookupDomainAge("example.com", { fetchImpl });
    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("devuelve 'not-found' cuando el servidor RDAP responde 404", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(bootstrapBody))
      .mockResolvedValueOnce(jsonResponse(null, 404));
    const result = await lookupDomainAge("dominio-inexistente.com", { fetchImpl });
    expect(result).toEqual({ ok: false, reason: "not-found" });
  });

  it("devuelve 'no-rdap-server' cuando el TLD no está en el bootstrap", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse(bootstrapBody));
    const result = await lookupDomainAge("sitio.xyz", { fetchImpl });
    expect(result).toEqual({ ok: false, reason: "no-rdap-server" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("devuelve 'unavailable' si la consulta al servidor RDAP falla o expira (timeout), aunque el bootstrap sí funcionó", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(bootstrapBody))
      .mockRejectedValueOnce(new Error("timeout"));
    const result = await lookupDomainAge("sitio.com", { fetchImpl });
    expect(result).toEqual({ ok: false, reason: "unavailable" });
  });

  it("devuelve 'no-rdap-server' (no 'unavailable') si ni siquiera el bootstrap de IANA responde", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
    const result = await lookupDomainAge("sitio.com", { fetchImpl });
    expect(result).toEqual({ ok: false, reason: "no-rdap-server" });
  });
});
