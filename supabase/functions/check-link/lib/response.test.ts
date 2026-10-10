import { describe, expect, it, vi } from "vitest";

import { buildSuccessBody, resolveDomainAge } from "./response";
import type { RdapResult } from "./rdap";

describe("resolveDomainAge", () => {
  it("caso acortador: usa la edad del host FINAL, no la del original, cuando el destino es otro dominio", async () => {
    // Acortador viejo (bit.ly, registrado hace años) que redirige a un
    // dominio de phishing registrado hace 2 días: la señal "dominio-nuevo"
    // debe reflejar el destino, no el acortador.
    const oldInitialAge: RdapResult = { ok: true, ageDays: 3000 };
    const newFinalAge: RdapResult = { ok: true, ageDays: 2 };
    const lookupFinal = vi.fn().mockResolvedValue(newFinalAge);

    const result = await resolveDomainAge("bit.ly", "phishing-site.tk", oldInitialAge, lookupFinal);

    expect(result).toEqual(newFinalAge);
    expect(lookupFinal).toHaveBeenCalledWith("phishing-site.tk");
    expect(lookupFinal).toHaveBeenCalledTimes(1);
  });

  it("no repite la consulta cuando el host final es el mismo dominio registrable", async () => {
    const initialAge: RdapResult = { ok: true, ageDays: 100 };
    const lookupFinal = vi.fn();

    const result = await resolveDomainAge("example.com", "example.com", initialAge, lookupFinal);

    expect(result).toEqual(initialAge);
    expect(lookupFinal).not.toHaveBeenCalled();
  });
});

describe("buildSuccessBody", () => {
  const baseOutcome = { status: 200, redirects: [], html: "<title>Hola</title>" };

  it("un fallo de RDAP deja domainAgeDays en null, pero el resto de los campos (redirects, título, etc.) se devuelven igual", () => {
    const rdapFailure: RdapResult = { ok: false, reason: "unavailable" };
    const body = buildSuccessBody(
      "example.com",
      "https://example.com/pagina",
      { ...baseOutcome, redirects: ["https://example.com/pagina"] },
      rdapFailure,
    );

    expect(body.domainAgeDays).toBeNull();
    expect(body.ok).toBe(true);
    expect(body.reachable).toBe(true);
    expect(body.status).toBe(200);
    expect(body.redirects).toEqual(["https://example.com/pagina"]);
    expect(body.title).toBe("Hola");
    expect(body.hasPasswordField).toBe(false);
    expect(body.finalHost).toBe("example.com");
  });

  it("una edad de dominio válida se refleja en domainAgeDays sin afectar ningún otro campo", () => {
    const body = buildSuccessBody("example.com", "https://example.com/pagina", baseOutcome, {
      ok: true,
      ageDays: 5,
    });
    expect(body.domainAgeDays).toBe(5);
    expect(body.title).toBe("Hola");
  });
});
