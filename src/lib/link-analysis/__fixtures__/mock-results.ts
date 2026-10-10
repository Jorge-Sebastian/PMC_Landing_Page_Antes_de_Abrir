/**
 * Resultados simulados para construir la UI sin depender del motor real ni
 * del backend. Pensado para Jorge (ver docs/handoff/JORGE-front.md): cada
 * estado corresponde a algo que `AnalysisResult` tiene que saber mostrar,
 * incluidos estados de las Fases 2 y 3 que el motor todavía no produce de
 * verdad hoy — por eso son datos simulados, no una llamada al motor.
 *
 * Ningún estado se llama "seguro": "dominio-oficial" es informativo, nunca
 * una afirmación de seguridad (ver docs/CONTRATO.md).
 */
import { createSignal } from "../signals";
import type { DestinationCheck, OfficialMatch, Verdict } from "../types";

export type MockResultState =
  | "riesgo-imitacion-marca"
  | "precaucion"
  | "sin-senales"
  | "dominio-oficial"
  | "destino-no-comprobado-timeout"
  | "cascaron-spa"
  | "host-final-distinto";

export type MockResult = {
  url: string;
  verdict: Verdict;
  destination: DestinationCheck;
};

const bancolombiaOfficialMatch: OfficialMatch = {
  brandId: "bancolombia",
  brandName: "Bancolombia",
  officialDomains: ["bancolombia.com", "sucursalvirtual.com.co", "grupobancolombia.com"],
};

const RESULTS: Record<MockResultState, MockResult> = {
  "riesgo-imitacion-marca": {
    url: "https://bancolombia-actualizacion.com/verifica",
    verdict: {
      level: "riesgo",
      score: 5,
      signals: [createSignal("imitacion-marca"), createSignal("pide-datos")],
      officialMatch: null,
    },
    destination: { checked: false },
  },

  precaucion: {
    url: "http://bit.ly/3xK9z1",
    verdict: {
      level: "precaucion",
      score: 4,
      signals: [createSignal("enlace-acortado"), createSignal("sin-conexion-segura")],
      officialMatch: null,
    },
    destination: { checked: false },
  },

  "sin-senales": {
    url: "https://noticias-locales-hoy.com/seccion/deportes",
    verdict: { level: "sin-senales", score: 0, signals: [], officialMatch: null },
    destination: {
      checked: true,
      reachable: true,
      status: 200,
      finalUrl: "https://noticias-locales-hoy.com/seccion/deportes",
      finalHost: "noticias-locales-hoy.com",
      redirects: [],
      differentHost: false,
      title: "Deportes — Noticias Locales Hoy",
      hasPasswordField: false,
    },
  },

  /**
   * Estado informativo: el dominio coincide con uno oficial conocido. NO es
   * un nivel de riesgo nuevo ni una afirmación de seguridad — se muestra
   * junto al nivel normal ("sin-senales" aquí), no en lugar de él.
   */
  "dominio-oficial": {
    url: "https://www.bancolombia.com/personas",
    verdict: { level: "sin-senales", score: 0, signals: [], officialMatch: bancolombiaOfficialMatch },
    destination: { checked: false },
  },

  "destino-no-comprobado-timeout": {
    url: "https://sitio-lento-de-ejemplo.com/promo",
    verdict: {
      level: "precaucion",
      score: 2,
      signals: [createSignal("palabras-de-presion")],
      officialMatch: null,
    },
    destination: { checked: false, reason: "unavailable" },
  },

  /**
   * Fase 3: el HTML del destino es un cascarón de SPA (poco texto, muchos
   * scripts) — no se pudo ver el contenido real, así que la UI no debe
   * decir "sin señales" como si lo hubiera revisado.
   */
  "cascaron-spa": {
    url: "https://app-de-verificacion-bancaria.com/login",
    verdict: {
      level: "precaucion",
      score: 3,
      signals: [createSignal("subdominios-extranos")],
      officialMatch: null,
    },
    destination: {
      checked: true,
      reachable: true,
      status: 200,
      finalUrl: "https://app-de-verificacion-bancaria.com/login",
      finalHost: "app-de-verificacion-bancaria.com",
      redirects: [],
      differentHost: false,
      title: "",
      hasPasswordField: false,
      looksLikeJsShell: true,
    },
  },

  "host-final-distinto": {
    url: "https://promo-exclusiva.rebrand.ly/oferta",
    verdict: {
      level: "riesgo",
      score: 5,
      signals: [createSignal("otra-web-oculta", "destination"), createSignal("enlace-acortado")],
      officialMatch: null,
    },
    destination: {
      checked: true,
      reachable: true,
      status: 200,
      finalUrl: "https://capturadatos-promo.xyz/formulario",
      finalHost: "capturadatos-promo.xyz",
      redirects: ["https://capturadatos-promo.xyz/formulario"],
      differentHost: true,
      title: "Formulario de verificación",
      hasPasswordField: true,
    },
  },
};

export const getMockResult = (state: MockResultState): MockResult => RESULTS[state];

export const MOCK_RESULT_STATES: MockResultState[] = Object.keys(RESULTS) as MockResultState[];
