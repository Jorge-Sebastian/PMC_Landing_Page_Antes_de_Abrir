/**
 * Paso 3.C: señales candidatas evaluadas con validación cruzada, SOLO sobre
 * el conjunto de ENTRENAMIENTO, usando únicamente campos que ya están en la
 * caché de check-link (status, redirecciones, título, hasPasswordField,
 * edad de dominio). No toca check-link ni pide redespliegue.
 *
 * Para cada candidata: validación cruzada de 5 particiones, fijas por hash
 * de dominio registrable (mismo método que el reparto 70/30, nunca por
 * orden). En cada rotación se eligen los hiperparámetros (peso, umbral)
 * usando las otras 4 particiones y se mide en la partición dejada afuera
 * — así el "mejor peso" no se escoge mirando los mismos datos donde se mide.
 *
 * Control de fuga: los phishing caídos/sin respuesta real (`cached === null`
 * o `response.ok !== true`) se EXCLUYEN de las candidatas que dependen de
 * contenido del destino (título, contraseña, redirección) — nunca se usan
 * como ejemplos de "esto no tiene la pista" solo porque no se pudo consultar.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseHost } from "tldts";

import { BRANDS } from "../../src/lib/link-analysis/brands";
import { buildVerdict } from "../../src/lib/link-analysis/build-verdict";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const dataDir = join(scriptDir, "data");
const cacheDir = join(dataDir, "cache");
const trainPath = join(dataDir, "datasets", "train.jsonl");

const SPLIT_SEED = "antes-de-abrir-2026-10-11-cv";
const N_FOLDS = 5;

type Candidate = {
  url: string;
  label: "phishing" | "legit";
  source: string;
  registrableDomain: string;
  liveTier: "live" | "static-only";
};
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

const cases = readJsonl<Candidate>(trainPath);

type Prepared = {
  c: Candidate;
  response: CachedResponse | null;
  baseline: ReturnType<typeof buildVerdict>;
  fold: number;
  isPrivate: boolean;
};

const isPrivateSuffix = (url: string): boolean => {
  try {
    return parseHost(new URL(url).hostname, { allowPrivateDomains: true }).isPrivate === true;
  } catch {
    return false;
  }
};

const prepared: Prepared[] = cases.map((c) => {
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
  return { c, response, baseline, fold: foldOf(c.registrableDomain), isPrivate: isPrivateSuffix(c.url) };
});

// --- Métricas generales ---
type Metrics = { tp: number; fp: number; tn: number; fn: number; precision: number; recall: number; fpr: number };
const metricsFor = (
  rows: Prepared[],
  flagged: (row: Prepared) => boolean,
): Metrics => {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const row of rows) {
    const isFlagged = flagged(row);
    if (row.c.label === "phishing" && isFlagged) tp += 1;
    else if (row.c.label === "phishing" && !isFlagged) fn += 1;
    else if (row.c.label === "legit" && isFlagged) fp += 1;
    else tn += 1;
  }
  return { tp, fp, tn, fn, precision: tp / (tp + fp) || 0, recall: tp / (tp + fn) || 0, fpr: fp / (fp + tn) || 0 };
};

const fmt = (m: Metrics) =>
  `TP=${m.tp} FP=${m.fp} FN=${m.fn} precision=${(m.precision * 100).toFixed(1)}% recall=${(m.recall * 100).toFixed(1)}% FPR=${(m.fpr * 100).toFixed(2)}%`;

const baselineFlaggedRiesgo = (row: Prepared) => row.baseline.level === "riesgo";
const baselineFlaggedAny = (row: Prepared) => row.baseline.level === "riesgo" || row.baseline.level === "precaucion";

console.log("=== Línea base (igual que analyze-errors.ts) ===");
console.log("[riesgo]        ", fmt(metricsFor(prepared, baselineFlaggedRiesgo)));
console.log("[riesgo+precau.]", fmt(metricsFor(prepared, baselineFlaggedAny)));

/**
 * Para una candidata boolean-por-caso, prueba cada peso de WEIGHT_OPTIONS
 * con validación cruzada de 5 particiones: en cada rotación, elige el peso
 * que maximiza (recall ganado) con una penalización fuerte por FPR ganado,
 * usando las OTRAS 4 particiones; mide ese peso en la partición dejada
 * afuera. Devuelve el promedio de las 5 mediciones de prueba.
 */
const WEIGHT_OPTIONS = [1, 2, 3];

const scoreWithExtra = (row: Prepared, fires: boolean, weight: number) => {
  const extra = fires ? weight : 0;
  const hasStrong = row.baseline.signals.some((s) => s.weight >= 3) || weight >= 3 && fires;
  const score = row.baseline.score + extra;
  const level = hasStrong || score >= 6 ? "riesgo" : score >= 2 ? "precaucion" : "sin-senales";
  return level;
};

const evaluateCandidate = (
  name: string,
  fires: (row: Prepared) => boolean,
  applicable: (row: Prepared) => boolean = () => true,
) => {
  const rows = prepared.filter(applicable);
  const phishingWithClue = rows.filter((r) => r.c.label === "phishing" && fires(r)).length;
  const legitWithClue = rows.filter((r) => r.c.label === "legit" && fires(r)).length;
  console.log(`\n--- Candidata: ${name} ---`);
  console.log(`Aplica a ${rows.length} casos (${rows.filter((r)=>r.c.label==="phishing").length} phishing, ${rows.filter((r)=>r.c.label==="legit").length} legítimos)`);
  console.log(`Dispara en: ${phishingWithClue} phishing, ${legitWithClue} legítimos`);

  for (const metric of ["riesgo", "riesgo+precaucion"] as const) {
    const baseFlag = metric === "riesgo" ? baselineFlaggedRiesgo : baselineFlaggedAny;
    const heldOutResults: Metrics[] = [];
    for (let testFold = 0; testFold < N_FOLDS; testFold += 1) {
      const trainRows = rows.filter((r) => r.fold !== testFold);
      const testRows = rows.filter((r) => r.fold === testFold);
      // Elegir el mejor peso mirando SOLO las particiones de entrenamiento de esta rotación.
      let bestWeight = WEIGHT_OPTIONS[0];
      let bestScore = -Infinity;
      for (const w of WEIGHT_OPTIONS) {
        const m = metricsFor(trainRows, (row) => {
          const newLevel = scoreWithExtra(row, fires(row), w);
          return metric === "riesgo" ? newLevel === "riesgo" : newLevel !== "sin-senales";
        });
        const base = metricsFor(trainRows, baseFlag);
        const recallGain = m.recall - base.recall;
        const fprCost = m.fpr - base.fpr;
        const utility = recallGain - fprCost * 5; // penaliza 5x más fuerte el FPR ganado
        if (utility > bestScore) {
          bestScore = utility;
          bestWeight = w;
        }
      }
      const testMetric = metricsFor(testRows, (row) => {
        const newLevel = scoreWithExtra(row, fires(row), bestWeight);
        return metric === "riesgo" ? newLevel === "riesgo" : newLevel !== "sin-senales";
      });
      heldOutResults.push(testMetric);
    }
    const base = metricsFor(rows, baseFlag);
    const avgRecall = heldOutResults.reduce((s, m) => s + m.recall, 0) / N_FOLDS;
    const avgFpr = heldOutResults.reduce((s, m) => s + m.fpr, 0) / N_FOLDS;
    const avgTp = heldOutResults.reduce((s, m) => s + m.tp, 0);
    const avgFp = heldOutResults.reduce((s, m) => s + m.fp, 0);
    console.log(
      `[${metric}] base: recall=${(base.recall * 100).toFixed(1)}% FPR=${(base.fpr * 100).toFixed(2)}% | con candidata (CV, 5 pliegues, suma de TP/FP en los pliegues de prueba): TP=${avgTp} FP=${avgFp} recall=${(avgRecall * 100).toFixed(1)}% FPR=${(avgFpr * 100).toFixed(2)}%`,
    );
  }
};

// --- Candidata 1: esHostingGratuito (sufijo privado de la PSL) ---
evaluateCandidate("esHostingGratuito", (row) => row.isPrivate);

// --- Candidata 2: marca al inicio de un token de 6+ letras, dominio no oficial ---
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
evaluateCandidate("marca-al-inicio-de-token (6+ letras)", (row) => brandAtTokenStart(row.c.url));

// --- Candidata 3: título contra marca en host no oficial ---
const titleHasBrandOnNonOfficialHost = (row: Prepared): boolean => {
  if (!row.response) return false;
  let host = "";
  try {
    host = new URL(row.c.url).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (isOfficial(host)) return false;
  const title = typeof row.response.title === "string" ? row.response.title.toLowerCase() : "";
  if (!title) return false;
  return BRAND_KEYWORDS.some((kw) => kw.length >= 4 && title.includes(kw));
};
evaluateCandidate(
  "titulo-vs-marca (host no oficial)",
  titleHasBrandOnNonOfficialHost,
  (row) => row.response !== null,
);

// --- Candidata 4: campo de contraseña en dominio sin reputación ---
const passwordOnNoReputationDomain = (row: Prepared): boolean => {
  if (!row.response || row.response.hasPasswordField !== true) return false;
  const age = row.response.domainAgeDays == null ? null : Number(row.response.domainAgeDays);
  return row.isPrivate || (age !== null && age < 30);
};
evaluateCandidate(
  "contrasena-en-dominio-sin-reputacion",
  passwordOnNoReputationDomain,
  (row) => row.response !== null,
);

// --- Candidata 5: transposición de letras adyacentes (faecbook) ---
const damerauLevenshtein1 = (a: string, b: string): boolean => {
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) {
    // Transposición: exactamente un par de letras adyacentes intercambiadas,
    // resto idéntico.
    let diffs: number[] = [];
    for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) diffs.push(i);
    if (diffs.length === 2 && diffs[1] === diffs[0] + 1) {
      return a[diffs[0]] === b[diffs[1]] && a[diffs[1]] === b[diffs[0]];
    }
    return false;
  }
  return false;
};
const tokenizeSimple = (value: string): string[] =>
  value.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 6);

const transposedBrand = (url: string): boolean => {
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
  const tokens = [...tokenizeSimple(host), ...tokenizeSimple(path)];
  return tokens.some((token) =>
    BRAND_KEYWORDS.some((kw) => kw.length >= 6 && token[0] === kw[0] && damerauLevenshtein1(token, kw)),
  );
};
evaluateCandidate("transposicion-de-letras (faecbook)", (row) => transposedBrand(row.c.url));

// --- Candidata 6: otra-web-oculta normalizada (www/apex y mismo-brand) ---
const normalizeHost = (h: string) => h.replace(/^www\./, "");
const otraWebOcultaNormalizada = (row: Prepared): boolean => {
  if (!row.response || row.response.differentHost !== true) return false;
  let originHost = "";
  try {
    originHost = new URL(row.c.url).hostname.toLowerCase();
  } catch {
    return true;
  }
  const finalHost = typeof row.response.finalHost === "string" ? row.response.finalHost.toLowerCase() : "";
  if (normalizeHost(originHost) === normalizeHost(finalHost)) return false; // solo www/apex
  const originOfficial = isOfficial(originHost);
  const finalOfficial = isOfficial(finalHost);
  if (originOfficial && finalOfficial) return false; // redirige entre dominios oficiales de alguna marca
  return true; // sigue siendo "otra web oculta" de verdad
};
// Para esta candidata, "fires" reemplaza la lógica actual (no se suma, se compara distinto):
{
  const rows = prepared.filter((r) => r.response !== null && r.response.differentHost === true);
  console.log(`\n--- Candidata: otra-web-oculta normalizada (reemplaza la regla actual) ---`);
  console.log(`Casos con differentHost=true en caché: ${rows.length} (${rows.filter((r) => r.c.label === "phishing").length} phishing, ${rows.filter((r) => r.c.label === "legit").length} legítimos)`);
  const stillFlagged = rows.filter(otraWebOcultaNormalizada);
  const nowCleared = rows.filter((r) => !otraWebOcultaNormalizada(r));
  console.log(`Se limpia (antes contaba peso 3 siempre, ahora no cuenta nada): ${nowCleared.length} (${nowCleared.filter((r) => r.c.label === "phishing").length} phishing, ${nowCleared.filter((r) => r.c.label === "legit").length} legítimos)`);
  console.log(`Sigue contando como señal real: ${stillFlagged.length} (${stillFlagged.filter((r) => r.c.label === "phishing").length} phishing, ${stillFlagged.filter((r) => r.c.label === "legit").length} legítimos)`);
  // Peso elegido con CV igual que las demás candidatas, pero probando también peso 0 (es decir, "sigue contando, pero el peso correcto podría ser menor a 3")
  const WEIGHT_OPTS_6 = [0, 1, 2, 3];
  for (const metric of ["riesgo", "riesgo+precaucion"] as const) {
    const baseFlag = metric === "riesgo" ? baselineFlaggedRiesgo : baselineFlaggedAny;
    const heldOut: Metrics[] = [];
    for (let testFold = 0; testFold < N_FOLDS; testFold += 1) {
      const trainRows = rows.filter((r) => r.fold !== testFold);
      const testRows = rows.filter((r) => r.fold === testFold);
      let bestWeight = 3;
      let bestUtility = -Infinity;
      for (const w of WEIGHT_OPTS_6) {
        const m = metricsFor(trainRows, (row) => {
          if (!otraWebOcultaNormalizada(row)) {
            // Se "limpia": recomputar el veredicto SIN el peso 3 de otra-web-oculta.
            const scoreWithoutSignal = row.baseline.score - (row.baseline.signals.some((s) => s.id === "otra-web-oculta") ? 3 : 0);
            const hasStrongWithout = row.baseline.signals.some((s) => s.weight >= 3 && s.id !== "otra-web-oculta");
            const level = hasStrongWithout || scoreWithoutSignal >= 6 ? "riesgo" : scoreWithoutSignal >= 2 ? "precaucion" : "sin-senales";
            return metric === "riesgo" ? level === "riesgo" : level !== "sin-senales";
          }
          const scoreWithW = row.baseline.score - 3 + w; // reemplaza el peso 3 original por w
          const hasStrongWithW = row.baseline.signals.some((s) => s.weight >= 3 && s.id !== "otra-web-oculta") || w >= 3;
          const level = hasStrongWithW || scoreWithW >= 6 ? "riesgo" : scoreWithW >= 2 ? "precaucion" : "sin-senales";
          return metric === "riesgo" ? level === "riesgo" : level !== "sin-senales";
        });
        const base = metricsFor(trainRows, baseFlag);
        const utility = (m.recall - base.recall) - (m.fpr - base.fpr) * 5;
        if (utility > bestUtility) {
          bestUtility = utility;
          bestWeight = w;
        }
      }
      const testM = metricsFor(testRows, (row) => {
        if (!otraWebOcultaNormalizada(row)) {
          const scoreWithoutSignal = row.baseline.score - (row.baseline.signals.some((s) => s.id === "otra-web-oculta") ? 3 : 0);
          const hasStrongWithout = row.baseline.signals.some((s) => s.weight >= 3 && s.id !== "otra-web-oculta");
          const level = hasStrongWithout || scoreWithoutSignal >= 6 ? "riesgo" : scoreWithoutSignal >= 2 ? "precaucion" : "sin-senales";
          return metric === "riesgo" ? level === "riesgo" : level !== "sin-senales";
        }
        const scoreWithW = row.baseline.score - 3 + bestWeight;
        const hasStrongWithW = row.baseline.signals.some((s) => s.weight >= 3 && s.id !== "otra-web-oculta") || bestWeight >= 3;
        const level = hasStrongWithW || scoreWithW >= 6 ? "riesgo" : scoreWithW >= 2 ? "precaucion" : "sin-senales";
        return metric === "riesgo" ? level === "riesgo" : level !== "sin-senales";
      });
      heldOut.push(testM);
    }
    const base = metricsFor(rows, baseFlag);
    const avgTp = heldOut.reduce((s, m) => s + m.tp, 0);
    const avgFp = heldOut.reduce((s, m) => s + m.fp, 0);
    const avgRecall = heldOut.reduce((s, m) => s + m.recall, 0) / N_FOLDS;
    const avgFpr = heldOut.reduce((s, m) => s + m.fpr, 0) / N_FOLDS;
    console.log(
      `[${metric}] base (dentro de este subconjunto): recall=${(base.recall * 100).toFixed(1)}% FPR=${(base.fpr * 100).toFixed(2)}% | normalizada (CV): TP=${avgTp} FP=${avgFp} recall=${(avgRecall * 100).toFixed(1)}% FPR=${(avgFpr * 100).toFixed(2)}%`,
    );
  }
}

// --- Candidata 7: edad de dominio, sensibilidad al umbral ---
{
  const rows = prepared.filter((r) => r.response && r.response.domainAgeDays != null);
  console.log(`\n--- Candidata: edad de dominio — sensibilidad al umbral ---`);
  console.log(`Casos con domainAgeDays conocido en caché: ${rows.length} (${rows.filter((r) => r.c.label === "phishing").length} phishing, ${rows.filter((r) => r.c.label === "legit").length} legítimos)`);
  const ages = rows.map((r) => ({ label: r.c.label, age: Number(r.response!.domainAgeDays) }));
  for (const threshold of [7, 14, 30, 60, 90]) {
    const phishingYoung = ages.filter((a) => a.label === "phishing" && a.age < threshold).length;
    const legitYoung = ages.filter((a) => a.label === "legit" && a.age < threshold).length;
    const totalPhishing = ages.filter((a) => a.label === "phishing").length;
    const totalLegit = ages.filter((a) => a.label === "legit").length;
    console.log(
      `  umbral <${threshold}d: phishing jóvenes ${phishingYoung}/${totalPhishing} (${((phishingYoung/totalPhishing)*100||0).toFixed(1)}%) | legítimos jóvenes ${legitYoung}/${totalLegit} (${((legitYoung/totalLegit)*100||0).toFixed(1)}%)`,
    );
  }
}
