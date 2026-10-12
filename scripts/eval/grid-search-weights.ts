/**
 * Paso 4 (corrección, 2026-10-12): búsqueda pequeña de pesos ENTEROS para
 * las señales del Paso 3, con validación cruzada de 5 particiones — no una
 * regresión. Reemplaza fit-weights.ts (sus coeficientes llevaban a
 * hosting-gratuito peso 2, que con CAUTION_SCORE=2 pone a CUALQUIER sitio en
 * hosting gratuito en "precaución" solo por estar ahí — confirmado en los
 * 22 legítimos de hosting gratuito, incluida la landing del propio
 * proyecto. Esa regla se rompe aquí a propósito: wHost y wPass se buscan
 * SOLO en {0,1}, siempre por debajo de cualquier CAUTION_SCORE probado, así
 * que estas señales nunca alertan solas.
 *
 * Variables de la búsqueda: wHost (hosting-gratuito), wToken
 * (marca-al-inicio-de-token), wPass (contrasena-sin-reputacion), wRedirect
 * (otra-web-oculta normalizada), CAUTION_SCORE, DANGER_SCORE. El resto de
 * las señales (ya validadas en Fase 0-2) se queda fijo.
 *
 * En cada rotación de la CV se elige el combo que mejor recall de "riesgo"
 * da sin pasar de 2% de FPR en "riesgo" (objetivo pedido: 1-2%), usando
 * SOLO las otras 4 particiones; se mide ese combo en la partición dejada
 * afuera. El conjunto de prueba no se toca.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildVerdict } from "../../src/lib/link-analysis/build-verdict";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const dataDir = join(scriptDir, "data");
const cacheDir = join(dataDir, "cache");
const trainPath = join(dataDir, "datasets", "train.jsonl");

const SPLIT_SEED = "antes-de-abrir-2026-10-11-cv";
const N_FOLDS = 5;

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

const foldOf = (registrableDomain: string): number => {
  const hash = createHash("sha256").update(`${SPLIT_SEED}:${registrableDomain}`).digest();
  return hash.readUInt32BE(0) % N_FOLDS;
};

// Pesos ACTUALES de las 4 señales variables (todas en 2 hoy) — se usan para
// "restar" su aporte del score ya calculado y dejar el resto ("fixedScore")
// intacto, sin tener que reimplementar las demás señales.
// "marca-al-inicio-de-token" se descartó (rompía casos del seed, ver
// reports/final-paso4.md) — ya no existe como señal, no entra en la rejilla.
const CURRENT_WEIGHTS = {
  "hosting-gratuito": 1,
  "contrasena-sin-reputacion": 1,
  "otra-web-oculta": 1,
} as const;
const VARIABLE_IDS = Object.keys(CURRENT_WEIGHTS) as Array<keyof typeof CURRENT_WEIGHTS>;

const cases = readJsonl<Candidate>(trainPath);

type Row = {
  label: "phishing" | "legit";
  fold: number;
  fixedScore: number;
  hasStrongFixed: boolean;
  hasHost: boolean;
  hasPass: boolean;
  hasRedirect: boolean;
};

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
  const verdict = buildVerdict(c.url, destination);
  const ids = new Set(verdict.signals.map((s) => s.id));
  const hasHost = ids.has("hosting-gratuito");
  const hasPass = ids.has("contrasena-sin-reputacion");
  const hasRedirect = ids.has("otra-web-oculta");
  const subtractedWeight =
    (hasHost ? CURRENT_WEIGHTS["hosting-gratuito"] : 0) +
    (hasPass ? CURRENT_WEIGHTS["contrasena-sin-reputacion"] : 0) +
    (hasRedirect ? CURRENT_WEIGHTS["otra-web-oculta"] : 0);
  const fixedScore = verdict.score - subtractedWeight;
  const hasStrongFixed = verdict.signals.some(
    (s) => s.weight >= 3 && !VARIABLE_IDS.includes(s.id as keyof typeof CURRENT_WEIGHTS),
  );
  return {
    label: c.label,
    fold: foldOf(c.registrableDomain),
    fixedScore,
    hasStrongFixed,
    hasHost,
    hasPass,
    hasRedirect,
  };
});

type Combo = { wHost: number; wPass: number; wRedirect: number; caution: number; danger: number };

const levelFor = (row: Row, combo: Combo): "riesgo" | "precaucion" | "sin-senales" => {
  const score =
    row.fixedScore +
    (row.hasHost ? combo.wHost : 0) +
    (row.hasPass ? combo.wPass : 0) +
    (row.hasRedirect ? combo.wRedirect : 0);
  if (row.hasStrongFixed || score >= combo.danger) return "riesgo";
  if (score >= combo.caution) return "precaucion";
  return "sin-senales";
};

const metricsFor = (subset: Row[], combo: Combo, metric: "riesgo" | "riesgo+precaucion") => {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const row of subset) {
    const level = levelFor(row, combo);
    const flagged = metric === "riesgo" ? level === "riesgo" : level !== "sin-senales";
    if (row.label === "phishing" && flagged) tp += 1;
    else if (row.label === "phishing" && !flagged) fn += 1;
    else if (row.label === "legit" && flagged) fp += 1;
    else tn += 1;
  }
  return { tp, fp, tn, fn, recall: tp / (tp + fn) || 0, fpr: fp / (fp + tn) || 0 };
};

// --- Rejilla: wHost y wPass SOLO en {0,1} (nunca alertan solos, ver arriba) ---
const COMBOS: Combo[] = [];
for (const wHost of [0, 1]) {
  for (const wPass of [0, 1]) {
    for (const wRedirect of [1, 2]) {
      for (const caution of [2, 3]) {
        for (const danger of [3, 4, 5, 6]) {
          COMBOS.push({ wHost, wPass, wRedirect, caution, danger });
        }
      }
    }
  }
}

const FPR_TARGET_MAX = 0.02; // 2%
const FPR_TARGET_MIN = 0.01; // 1%

/** Utilidad para elegir combo en las particiones de entrenamiento de una rotación. */
const scoreCombo = (subset: Row[], combo: Combo) => {
  const m = metricsFor(subset, combo, "riesgo");
  // Prioridad 1: FPR dentro de [1%,2%]. Si ninguno lo logra, el más cercano por debajo de 2%.
  const inRange = m.fpr >= FPR_TARGET_MIN && m.fpr <= FPR_TARGET_MAX;
  const underMax = m.fpr <= FPR_TARGET_MAX;
  const rangeBonus = inRange ? 1000 : underMax ? 500 : 0;
  return { utility: rangeBonus + m.recall * 100 - Math.max(0, m.fpr - FPR_TARGET_MAX) * 10000, m };
};

const heldOutRiesgo: ReturnType<typeof metricsFor>[] = [];
const heldOutAmbos: ReturnType<typeof metricsFor>[] = [];
const chosenCombos: Combo[] = [];

for (let testFold = 0; testFold < N_FOLDS; testFold += 1) {
  const trainRows = rows.filter((r) => r.fold !== testFold);
  const testRows = rows.filter((r) => r.fold === testFold);

  let best = COMBOS[0];
  let bestUtility = -Infinity;
  for (const combo of COMBOS) {
    const { utility } = scoreCombo(trainRows, combo);
    if (utility > bestUtility) {
      bestUtility = utility;
      best = combo;
    }
  }
  chosenCombos.push(best);
  heldOutRiesgo.push(metricsFor(testRows, best, "riesgo"));
  heldOutAmbos.push(metricsFor(testRows, best, "riesgo+precaucion"));
}

console.log("Combo elegido en cada rotación de la CV (con las otras 4 particiones):");
chosenCombos.forEach((c, i) => console.log(`  pliegue de prueba ${i}:`, JSON.stringify(c)));

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
const tpR = sum(heldOutRiesgo.map((m) => m.tp));
const fpR = sum(heldOutRiesgo.map((m) => m.fp));
const fnR = sum(heldOutRiesgo.map((m) => m.fn));
const tpA = sum(heldOutAmbos.map((m) => m.tp));
const fpA = sum(heldOutAmbos.map((m) => m.fp));
const fnA = sum(heldOutAmbos.map((m) => m.fn));
console.log(`\n[riesgo] CV (suma de pliegues de prueba): TP=${tpR} FP=${fpR} FN=${fnR} recall=${((tpR/(tpR+fnR))*100).toFixed(1)}% FPR=${((fpR/(fpR+sum(heldOutRiesgo.map(m=>m.tn))))*100).toFixed(2)}%`);
console.log(`[riesgo+precaucion] CV: TP=${tpA} FP=${fpA} FN=${fnA} recall=${((tpA/(tpA+fnA))*100).toFixed(1)}% FPR=${((fpA/(fpA+sum(heldOutAmbos.map(m=>m.tn))))*100).toFixed(2)}%`);

// --- Combo final: elegido con TODO el entrenamiento (no una rotación), para producción ---
let finalCombo = COMBOS[0];
let finalUtility = -Infinity;
for (const combo of COMBOS) {
  const { utility } = scoreCombo(rows, combo);
  if (utility > finalUtility) {
    finalUtility = utility;
    finalCombo = combo;
  }
}
const finalRiesgo = metricsFor(rows, finalCombo, "riesgo");
const finalAmbos = metricsFor(rows, finalCombo, "riesgo+precaucion");
console.log("\n=== Combo final (todo el entrenamiento) ===");
console.log(JSON.stringify(finalCombo));
console.log(`[riesgo] TP=${finalRiesgo.tp} FP=${finalRiesgo.fp} recall=${(finalRiesgo.recall*100).toFixed(1)}% FPR=${(finalRiesgo.fpr*100).toFixed(2)}%`);
console.log(`[riesgo+precaucion] TP=${finalAmbos.tp} FP=${finalAmbos.fp} recall=${(finalAmbos.recall*100).toFixed(1)}% FPR=${(finalAmbos.fpr*100).toFixed(2)}%`);

// --- Verificación explícita del requisito del usuario ---
const hostingLegit = cases
  .map((c, i) => ({ c, row: rows[i] }))
  .filter(({ c }) => c.label === "legit" && c.source === "hosting-gratuito-manual");
const stillFlagged = hostingLegit.filter(({ row }) => levelFor(row, finalCombo) !== "sin-senales");
console.log(`\nLegítimos hosting-gratuito que siguen fuera de "sin-señales" con el combo final: ${stillFlagged.length} / ${hostingLegit.length}`);
for (const { c, row } of stillFlagged) console.log(" ", c.url, "->", levelFor(row, finalCombo));

writeFileSync(
  join(dataDir, "datasets", "grid-search-result.json"),
  JSON.stringify({ finalCombo, finalRiesgo, finalAmbos, chosenCombos }, null, 2),
);
console.log("\nGuardado en data/datasets/grid-search-result.json (gitignored, para revisión).");
