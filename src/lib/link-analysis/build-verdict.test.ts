import { describe, expect, it } from "vitest";

import { buildVerdict } from "./build-verdict";
import type { DestinationCheck } from "./types";

const notChecked: DestinationCheck = { checked: false };

describe("buildVerdict — reglas de combinación", () => {
  it("un dominio oficial nunca se marca como imitación, incluso con una ruta sospechosa", () => {
    const verdict = buildVerdict("https://www.paypal.com/login/verify-account", notChecked);
    expect(verdict.level).toBe("sin-senales");
    expect(verdict.signals.map((s) => s.id)).not.toContain("imitacion-marca");
  });

  it("una sola señal fuerte (peso 3) basta para 'riesgo' aunque el puntaje total sea menor que el umbral de peligro", () => {
    const verdict = buildVerdict("http://45.12.8.3/", notChecked);
    expect(verdict.score).toBeLessThan(6);
    expect(verdict.level).toBe("riesgo");
  });

  it("varias señales de peso 2 sin ninguna de peso 3 también llegan a 'riesgo' si la suma alcanza el umbral", () => {
    // subdominios-extranos (2) + dominio-sospechoso (2) + palabras-de-presion (2) = 6
    const verdict = buildVerdict("http://a.b.tienda-envios.xyz/envio-gratis", notChecked);
    expect(verdict.signals.every((s) => s.weight < 3)).toBe(true);
    expect(verdict.score).toBeGreaterThanOrEqual(6);
    expect(verdict.level).toBe("riesgo");
  });

  it("un destino no comprobado (checked:false) no agrega ninguna señal de destino", () => {
    const verdict = buildVerdict("https://noticias-locales-hoy.com/articulo", notChecked);
    expect(verdict.signals.filter((s) => s.source === "destination")).toHaveLength(0);
    expect(verdict.level).toBe("sin-senales");
  });

  it("un campo de contraseña por sí solo, sin otra señal y en el mismo host, no agrega 'pide-datos'", () => {
    const destination: DestinationCheck = {
      checked: true,
      reachable: true,
      status: 200,
      differentHost: false,
      hasPasswordField: true,
    };
    const verdict = buildVerdict("https://noticias-locales-hoy.com/login", destination);
    expect(verdict.signals.map((s) => s.id)).not.toContain("pide-datos");
    expect(verdict.level).toBe("sin-senales");
  });

  it("un campo de contraseña combinado con un host final distinto sí agrega 'pide-datos' y sube a 'riesgo'", () => {
    const destination: DestinationCheck = {
      checked: true,
      reachable: true,
      status: 200,
      differentHost: true,
      hasPasswordField: true,
    };
    const verdict = buildVerdict("https://noticias-locales-hoy.com/login", destination);
    const ids = verdict.signals.map((s) => s.id);
    expect(ids).toContain("otra-web-oculta");
    expect(ids).toContain("pide-datos");
    expect(verdict.level).toBe("riesgo");
  });
});
