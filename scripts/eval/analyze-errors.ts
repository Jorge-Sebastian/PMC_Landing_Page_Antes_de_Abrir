/**
 * Análisis de errores del Paso 2 — SOLO sobre el conjunto de entrenamiento
 * (train.jsonl). El conjunto de prueba no se toca aquí.
 *
 * Corre el motor actual (con destino real cuando hay caché de check-link,
 * offline si no) y vuelca:
 * - matriz de confusión / precisión / recall / FPR,
 * - cada phishing no detectado (nivel "sin-senales"), con una categoría
 *   heurística de por qué se escapó,
 * - cada falso positivo (legítimo que no quedó en "sin-senales"), con la
 *   señal que lo causó.
 *
 * La categorización heurística es un primer corte, no la palabra final:
 * las categorías que necesitan juicio humano ("marca no listada", "marca
 * pegada a otra palabra") se revisan a mano sobre la salida de este
 * script antes de escribir reports/analisis-errores.md.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "tldts";

import { buildVerdict } from "../../src/lib/link-analysis/build-verdict";
import type { DestinationCheck, DestinationReason } from "../../src/lib/link-analysis/types";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const dataDir = join(scriptDir, "data");
const cacheDir = join(dataDir, "cache");
const trainPath = join(dataDir, "datasets", "train.jsonl");

type Candidate = {
  url: string;
  label: "phishing" | "legit";
  source: string;
  registrableDomain: string;
  liveTier: "live" | "static-only";
};

type CachedEntry = {
  queriedAt: string;
  httpStatus: number | null;
  response: Record<string, unknown>;
};

const readJsonl = <T,>(path: string): T[] =>
  existsSync(path)
    ? readFileSync(path, "utf-8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as T)
    : [];

const loadCache = (url: string): CachedEntry | null => {
  const cachePath = join(cacheDir, `${createHash("sha256").update(url).digest("hex")}.json`);
  if (!existsSync(cachePath)) return null;
  return JSON.parse(readFileSync(cachePath, "utf-8")) as CachedEntry;
};

const destinationFromCache = (cached: CachedEntry): DestinationCheck => {
  const payload = cached.response;
  if (payload.ok !== true) {
    const reason = typeof payload.reason === "string" ? payload.reason : "unavailable";
    return { checked: false, reason: reason as DestinationReason };
  }
  return {
    checked: true,
    reachable: payload.reachable === true,
    status: Number(payload.status) || 0,
    finalUrl: typeof payload.finalUrl === "string" ? payload.finalUrl : "",
    finalHost: typeof payload.finalHost === "string" ? payload.finalHost : "",
    redirects: Array.isArray(payload.redirects) ? payload.redirects.map(String) : [],
    differentHost: payload.differentHost === true,
    title: typeof payload.title === "string" ? payload.title : "",
    hasPasswordField: payload.hasPasswordField === true,
    domainAgeDays:
      payload.domainAgeDays === null || payload.domainAgeDays === undefined ? null : Number(payload.domainAgeDays),
  };
};

const cases = readJsonl<Candidate>(trainPath);

type Result = Candidate & {
  level: string;
  score: number;
  signals: string[];
  cached: CachedEntry | null;
};

const results: Result[] = cases.map((c) => {
  const cached = loadCache(c.url);
  const destination = cached ? destinationFromCache(cached) : { checked: false };
  const verdict = buildVerdict(c.url, destination);
  return { ...c, level: verdict.level, score: verdict.score, signals: verdict.signals.map((s) => s.id), cached };
});

// --- Matriz de confusión ---
const isFlagged = (level: string, threshold: "riesgo" | "riesgo+precaucion") =>
  threshold === "riesgo" ? level === "riesgo" : level === "riesgo" || level === "precaucion";

const confusion = (threshold: "riesgo" | "riesgo+precaucion") => {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const r of results) {
    const flagged = isFlagged(r.level, threshold);
    if (r.label === "phishing" && flagged) tp += 1;
    else if (r.label === "phishing" && !flagged) fn += 1;
    else if (r.label === "legit" && flagged) fp += 1;
    else tn += 1;
  }
  const precision = tp / (tp + fp) || 0;
  const recall = tp / (tp + fn) || 0;
  const fpr = fp / (fp + tn) || 0;
  return { threshold, tp, fp, tn, fn, precision, recall, fpr };
};

console.log("=== Matriz de confusión (entrenamiento) ===");
for (const t of ["riesgo", "riesgo+precaucion"] as const) {
  const m = confusion(t);
  console.log(
    `[${t}] TP=${m.tp} FP=${m.fp} TN=${m.tn} FN=${m.fn} precision=${(m.precision * 100).toFixed(1)}% recall=${(m.recall * 100).toFixed(1)}% FPR=${(m.fpr * 100).toFixed(1)}%`,
  );
}

// --- Phishing no detectado (nivel "sin-senales") ---
const missed = results.filter((r) => r.label === "phishing" && r.level === "sin-senales");
const partial = results.filter((r) => r.label === "phishing" && r.level === "precaucion");

const categorize = (r: Result): string => {
  let host = "";
  try {
    host = new URL(r.url).hostname.toLowerCase();
  } catch {
    return "url-invalida";
  }
  const parsed = parse(host, { allowPrivateDomains: true });
  if (parsed.isPrivate) return "hosting-gratuito";
  if (r.cached && r.cached.response.ok !== true) return "pagina-caida-o-sin-respuesta";
  if (!r.cached) return "no-consultada"; // no debería pasar para liveTier=live
  const title = typeof r.cached.response.title === "string" ? r.cached.response.title : "";
  const reachable = r.cached.response.reachable === true;
  if (reachable && title.trim() === "") return "posible-cascaron-js-o-revisar";
  return "revisar-manualmente"; // marca no listada / marca pegada / sin señal en la dirección: necesita lectura humana
};

const missedByCategory = new Map<string, Result[]>();
for (const r of missed) {
  const cat = categorize(r);
  const bucket = missedByCategory.get(cat) ?? [];
  bucket.push(r);
  missedByCategory.set(cat, bucket);
}

console.log(`\n=== Phishing no detectado: ${missed.length} / ${results.filter((r) => r.label === "phishing").length} (+ ${partial.length} solo en precaucion) ===`);
for (const [cat, bucket] of missedByCategory) {
  console.log(`\n[${cat}] ${bucket.length} caso(s) (${((bucket.length / missed.length) * 100).toFixed(1)}%)`);
  for (const r of bucket.slice(0, 5)) {
    console.log(`  - ${r.url} | reachable=${r.cached?.response.reachable} title="${r.cached?.response.title ?? ""}"`);
  }
}

// --- Falsos positivos (legítimo que no quedó en sin-senales) ---
const falsePositives = results.filter((r) => r.label === "legit" && r.level !== "sin-senales");
const fpBySignal = new Map<string, Result[]>();
for (const r of falsePositives) {
  const key = r.signals.join("+") || "(sin señales?)";
  const bucket = fpBySignal.get(key) ?? [];
  bucket.push(r);
  fpBySignal.set(key, bucket);
}

console.log(`\n=== Falsos positivos (legítimo no en sin-senales): ${falsePositives.length} / ${results.filter((r) => r.label === "legit").length} ===`);
for (const [sig, bucket] of [...fpBySignal.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n[${sig}] ${bucket.length} caso(s)`);
  for (const r of bucket.slice(0, 5)) console.log(`  - ${r.url} (${r.source})`);
}

// --- Dump completo para revisión manual ---
writeFileSync(
  join(dataDir, "datasets", "error-analysis-raw.json"),
  JSON.stringify(
    {
      confusionRiesgo: confusion("riesgo"),
      confusionAmbos: confusion("riesgo+precaucion"),
      missed: missed.map((r) => ({ url: r.url, category: categorize(r), cached: r.cached?.response ?? null })),
      partial: partial.map((r) => ({ url: r.url, signals: r.signals, cached: r.cached?.response ?? null })),
      falsePositives: falsePositives.map((r) => ({ url: r.url, source: r.source, level: r.level, signals: r.signals })),
    },
    null,
    2,
  ),
);
console.log(`\nVolcado completo en ${join(dataDir, "datasets", "error-analysis-raw.json")} para revisión manual.`);
