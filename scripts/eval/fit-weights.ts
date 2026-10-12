/**
 * Paso 4: ajusta el peso de las señales que sobrevivieron al Paso 3 con una
 * regresión logística simple (descenso de gradiente, sin dependencias),
 * SOLO sobre el conjunto de ENTRENAMIENTO. El conjunto de prueba no se toca.
 *
 * Variables:
 * - X1 esHostingGratuito (estático, sin fuga: no depende de si la página respondió)
 * - X2 marcaAlInicioDeToken (estático)
 * - X3 contrasenaEnDominioSinReputacion (solo si la página respondió — control
 *   de fuga: una página caída nunca puede "tener" o "no tener" contraseña)
 * - X4 otraWebOcultaNormalizada (solo si la página respondió)
 * - X5 puntajeExistente — la suma de pesos de TODAS las demás señales ya
 *   validadas en fases anteriores (Fase 0-2 + hallazgos de producción), que
 *   NO se refitean aquí. Sirve de "regla de tres": el coeficiente de X5 dice
 *   cuántos log-odds aporta 1 punto del sistema actual, y se usa para pasar
 *   los coeficientes de X1-X4 a la misma escala entera 0-3 que ya usa
 *   signals.ts.
 *
 * Ponderación de clase: el entrenamiento tiene 170 phishing y 13 957
 * legítimos (1:82). Sin ponderar, el gradiente lo domina la clase mayoritaria
 * y el modelo no aprende nada de las señales — se pondera cada phishing por
 * el inverso de su frecuencia (igual que recall/precision de las métricas ya
 * usadas en todo el proyecto, no es una técnica nueva).
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseHost } from "tldts";

import { BRANDS } from "../../src/lib/link-analysis/brands";
import { buildVerdict } from "../../src/lib/link-analysis/build-verdict";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const dataDir = join(scriptDir, "data");
const cacheDir = join(dataDir, "cache");
const trainPath = join(dataDir, "datasets", "train.jsonl");

type Candidate = { url: string; label: "phishing" | "legit"; source: string; registrableDomain: string };
type CachedResponse = Record<string, unknown>;

const readJsonl = <T,>(path: string): T[] =>
  existsSync(path) ? readFileSync(path, "utf-8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as T) : [];

const loadCache = (url: string): CachedResponse | null => {
  const p = join(cacheDir, `${createHash("sha256").update(url).digest("hex")}.json`);
  if (!existsSync(p)) return null;
  const parsed = JSON.parse(readFileSync(p, "utf-8")) as { response?: CachedResponse };
  return parsed.response && parsed.response.ok === true ? parsed.response : null;
};

const isPrivateSuffix = (url: string): boolean => {
  try {
    return parseHost(new URL(url).hostname, { allowPrivateDomains: true }).isPrivate === true;
  } catch {
    return false;
  }
};

const BRAND_KEYWORDS = [...new Set(BRANDS.flatMap((b) => b.keywords.map((k) => k.replace(/\s+/g, "").toLowerCase())))];
const isOfficial = (host: string): boolean =>
  BRANDS.some((b) => b.domains.some((d) => host === d || host.endsWith(`.${d}`)));

const brandAtTokenStart = (url: string): boolean => {
  let host = "";
  let path = "";
  try {
    const u = new URL(url);
    host = u.hostname.toLowerCase();
    path = decodeURIComponent(u.pathname + u.search).toLowerCase();
  } catch {
    return false;
  }
  if (isOfficial(host)) return false;
  const tokens = `${host}-${path}`.split(/[^a-z0-9]+/).filter((t) => t.length >= 6);
  return tokens.some((token) => BRAND_KEYWORDS.some((kw) => kw.length >= 6 && token.startsWith(kw) && token !== kw));
};

const normalizeHost = (h: string) => h.replace(/^www\./, "");

const cases = readJsonl<Candidate>(trainPath);

type Row = { label: 0 | 1; x1: number; x2: number; x3: number; x4: number; x5: number };

const rows: Row[] = cases.map((c) => {
  const response = loadCache(c.url);
  const destination = response
    ? {
        checked: true as const,
        reachable: response.reachable === true,
        status: Number(response.status) || 0,
        finalUrl: typeof response.finalUrl === "string" ? response.finalUrl : c.url,
        finalHost: typeof response.finalHost === "string" ? response.finalHost : "",
        redirects: Array.isArray(response.redirects) ? response.redirects.map(String) : [],
        differentHost: response.differentHost === true,
        title: typeof response.title === "string" ? response.title : "",
        hasPasswordField: response.hasPasswordField === true,
        domainAgeDays: response.domainAgeDays == null ? null : Number(response.domainAgeDays),
      }
    : { checked: false as const };
  const baseline = buildVerdict(c.url, destination);

  const isPrivate = isPrivateSuffix(c.url);
  const x1 = isPrivate ? 1 : 0;
  const x2 = brandAtTokenStart(c.url) ? 1 : 0;

  let x3 = 0;
  let x4 = 0;
  let otraWebOcultaWeightInBaseline = 0;
  if (response) {
    const age = response.domainAgeDays == null ? null : Number(response.domainAgeDays);
    x3 = response.hasPasswordField === true && (isPrivate || (age !== null && age < 30)) ? 1 : 0;

    if (response.differentHost === true) {
      let originHost = "";
      try {
        originHost = new URL(c.url).hostname.toLowerCase();
      } catch {
        originHost = "";
      }
      const finalHost = typeof response.finalHost === "string" ? response.finalHost.toLowerCase() : "";
      const wwwApexOnly = originHost !== "" && normalizeHost(originHost) === normalizeHost(finalHost);
      const sameBrandOfficial = isOfficial(originHost) && isOfficial(finalHost);
      x4 = !wwwApexOnly && !sameBrandOfficial ? 1 : 0;
      otraWebOcultaWeightInBaseline = 3; // peso actual, antes de la normalización
    }
  }

  const x5 = baseline.score - otraWebOcultaWeightInBaseline; // puntaje existente, SIN otra-web-oculta
  return { label: c.label === "phishing" ? 1 : 0, x1, x2, x3, x4, x5 };
});

// --- Regresión logística con descenso de gradiente, ponderada por clase ---
const nPos = rows.filter((r) => r.label === 1).length;
const nNeg = rows.filter((r) => r.label === 0).length;
const wPos = (nPos + nNeg) / (2 * nPos);
const wNeg = (nPos + nNeg) / (2 * nNeg);

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

let coefs = [0, 0, 0, 0, 0, 0]; // [b0, b1..b5]
const LR = 0.05;
const L2 = 0.01;
const EPOCHS = 2000;

for (let epoch = 0; epoch < EPOCHS; epoch += 1) {
  const grad = [0, 0, 0, 0, 0, 0];
  for (const r of rows) {
    const z = coefs[0] + coefs[1] * r.x1 + coefs[2] * r.x2 + coefs[3] * r.x3 + coefs[4] * r.x4 + coefs[5] * r.x5;
    const p = sigmoid(z);
    const w = r.label === 1 ? wPos : wNeg;
    const err = w * (p - r.label);
    grad[0] += err;
    grad[1] += err * r.x1;
    grad[2] += err * r.x2;
    grad[3] += err * r.x3;
    grad[4] += err * r.x4;
    grad[5] += err * r.x5;
  }
  const n = rows.length;
  for (let k = 0; k < coefs.length; k += 1) {
    const reg = k === 0 ? 0 : L2 * coefs[k]; // no regularizar el intercepto
    coefs[k] -= (LR * (grad[k] / n + reg));
  }
}

console.log("Coeficientes ajustados (b0, b1..b5):", coefs.map((c) => c.toFixed(4)));
console.log(`Peso 1 punto de 'puntaje existente' (b5, escala de referencia): ${coefs[5].toFixed(4)}`);

const scale = coefs[5];
const rawWeight = (coef: number) => coef / scale;
console.log("\nPesos crudos (antes de redondear/topar):");
console.log("  esHostingGratuito:", rawWeight(coefs[1]).toFixed(2));
console.log("  marcaAlInicioDeToken:", rawWeight(coefs[2]).toFixed(2));
console.log("  contrasenaEnDominioSinReputacion:", rawWeight(coefs[3]).toFixed(2));
console.log("  otraWebOcultaNormalizada:", rawWeight(coefs[4]).toFixed(2));

// --- Escribe el resultado crudo para revisión manual (no es el config final) ---
writeFileSync(
  join(dataDir, "datasets", "fit-weights-raw.json"),
  JSON.stringify({ coefs, nPos, nNeg, wPos, wNeg, rawWeights: {
    esHostingGratuito: rawWeight(coefs[1]),
    marcaAlInicioDeToken: rawWeight(coefs[2]),
    contrasenaEnDominioSinReputacion: rawWeight(coefs[3]),
    otraWebOcultaNormalizada: rawWeight(coefs[4]),
  } }, null, 2),
);
console.log("\nCrudo guardado en data/datasets/fit-weights-raw.json (gitignored, solo para revisión).");
