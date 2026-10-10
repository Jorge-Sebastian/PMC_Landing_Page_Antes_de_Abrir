import { describe, expect, it } from "vitest";

import { analyzeLink } from "./analyze-url";

const signalsFor = (url: string) => analyzeLink(new URL(url)).map((s) => s.id);

describe("analyzeLink — matching de marca (Fase 1)", () => {
  it("una palabra común a distancia de Levenshtein 1 de una marca, pero con otra primera letra, no se marca como imitación", () => {
    // 'cooking' vs 'booking': distancia 1, pero 'c' !== 'b'.
    expect(signalsFor("https://cooking-with-clara.com/recetas")).not.toContain("imitacion-marca");
  });

  it("una palabra común a distancia de Levenshtein 1 que SÍ comparte la primera letra con la marca sigue marcándose (riesgo residual aceptado)", () => {
    // 'goggle' vs 'google': distancia 1, ambas empiezan con 'g'.
    expect(signalsFor("https://goggle-eyed-crafts.com/manualidades")).toContain("imitacion-marca");
  });

  it("una sustitución visual (amaz0n) se detecta vía normalización de confusables, no por substring", () => {
    const signals = signalsFor("http://amaz0n-shop.com/orders/confirmar");
    expect(signals).toContain("imitacion-marca");
    expect(signals).toContain("caracteres-enganosos");
  });

  it("un dominio que solo CONTIENE el texto de una marca como substring ('pineapple') ya no se marca como imitación", () => {
    expect(signalsFor("https://pineapple-recipes.com/postres")).not.toContain("imitacion-marca");
  });

  it("la marca en el subdominio de un dominio registrable ajeno dispara 'marca-en-subdominio', no 'imitacion-marca'", () => {
    const signals = signalsFor("https://bancolombia.com.verifica-cuenta.xyz/login");
    expect(signals).toContain("marca-en-subdominio");
    expect(signals).not.toContain("imitacion-marca");
  });

  it("una palabra comercial normal ('envio', 'descuento') sola, sin ninguna otra señal, no dispara 'palabras-de-presion'", () => {
    expect(signalsFor("https://empresalogistica.com/envio/seguimiento?id=1")).toHaveLength(0);
  });

  it("un TLD usado hoy por negocios reales (.fit, .beauty) ya no se marca como dominio sospechoso", () => {
    expect(signalsFor("https://ironwill.fit/entrenamiento")).not.toContain("dominio-sospechoso");
    expect(signalsFor("https://bellasalon.beauty/citas")).not.toContain("dominio-sospechoso");
  });

  it("un hosting gratuito (x.web.app) cuenta como dominio registrable propio, no se confunde con otro tenant del mismo hosting", () => {
    expect(signalsFor("https://mi-portafolio-real.web.app/trabajo")).toHaveLength(0);
  });
});
