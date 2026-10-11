/**
 * Arma el banco de datos real (OpenPhish + Tranco + hosting gratuito
 * verificado a mano) y lo divide en entrenamiento/prueba por dominio
 * registrable, ANTES de consultar check-link. No descarga nada (eso lo
 * hace quien corre este script a mano con curl, ver
 * docs/CHANGELOG-algoritmo.md) ni llama a la red: solo lee los archivos
 * crudos ya descargados en data/raw/ y data/free-hosting-manual.jsonl.
 *
 * Datos crudos y el dataset etiquetado NUNCA se suben a git (ver
 * .gitignore): el feed de OpenPhish es de uso no comercial y no se
 * redistribuye, y Tranco es una lista de un tercero. Solo el hash del
 * conjunto de prueba queda en el repositorio.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "tldts";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const dataDir = join(scriptDir, "data");
const rawDir = join(dataDir, "raw");
const datasetsDir = join(dataDir, "datasets");
mkdirSync(datasetsDir, { recursive: true });

const PHISHING_CAP = 1500;
const STATIC_POOL_CAP = 20000; // señales sin red: pueden usar hasta 20k, no cuestan nada
const LIVE_GENERAL_COUNT = 600;
const LIVE_CO_COUNT = 200;
const TRAIN_FRACTION = 0.7;
const SPLIT_SEED = "antes-de-abrir-2026-10-11"; // fija, para que el split sea reproducible

type Label = "phishing" | "legit";
type Source = "openphish" | "tranco-general" | "hosting-gratuito-manual" | "tranco-co";
type LiveTier = "live" | "static-only";

type Candidate = {
  url: string;
  label: Label;
  source: Source;
  registrableDomain: string;
  liveTier: LiveTier;
};

const toUrl = (domainOrUrl: string): string =>
  domainOrUrl.startsWith("http://") || domainOrUrl.startsWith("https://")
    ? domainOrUrl
    : `https://${domainOrUrl}`;

const registrableOf = (urlOrHost: string): string | null => {
  let host = urlOrHost;
  try {
    host = new URL(toUrl(urlOrHost)).hostname;
  } catch {
    return null;
  }
  const parsed = parse(host, { allowPrivateDomains: true });
  return parsed.domain ?? null;
};

/**
 * ¿Entrenamiento o prueba? Depende SOLO de una función fija (hash con
 * semilla) del dominio registrable — nunca del orden en que se descargó
 * ni de cuántos dominios hay en total. Así se puede agregar más URLs del
 * feed otro día sin mezclar entrenamiento con prueba: un dominio que ya
 * cayó en "prueba" sigue en "prueba" sin importar qué tan grande crezca
 * el resto del dataset.
 */
const splitBucketOf = (registrableDomain: string): "train" | "test" => {
  const hash = createHash("sha256").update(`${SPLIT_SEED}:${registrableDomain}`).digest();
  const value = hash.readUInt32BE(0) / 0x100000000; // determinista, en [0, 1)
  return value < TRAIN_FRACTION ? "train" : "test";
};

// --- 1. Phishing (OpenPhish) ---
const openphishPath = join(rawDir, "openphish-feed.txt");
if (!existsSync(openphishPath)) {
  throw new Error(`No se encontró ${openphishPath}. Descargar primero (ver CHANGELOG).`);
}
const phishingUrls = readFileSync(openphishPath, "utf-8")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .slice(0, PHISHING_CAP);

const phishingCandidates: Candidate[] = [];
for (const url of phishingUrls) {
  const registrableDomain = registrableOf(url);
  if (!registrableDomain) continue; // URL mal formada, se descarta y se cuenta aparte
  phishingCandidates.push({ url, label: "phishing", source: "openphish", registrableDomain, liveTier: "live" });
}

// --- 2. Tranco (general + .co/.com.co) ---
const trancoPath = join(rawDir, "top-1m.csv");
if (!existsSync(trancoPath)) {
  throw new Error(`No se encontró ${trancoPath}. Descargar primero (ver CHANGELOG).`);
}
const trancoRows = readFileSync(trancoPath, "utf-8")
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [rankStr, domain] = line.split(",");
    return { rank: Number(rankStr), domain: domain?.trim().toLowerCase() ?? "" };
  })
  .filter((row) => row.domain);

const staticPoolRows = trancoRows.filter((row) => row.rank <= STATIC_POOL_CAP);
const coRows = trancoRows.filter((row) => {
  const suffix = parse(row.domain, { allowPrivateDomains: true }).publicSuffix ?? "";
  return suffix === "co" || suffix === "com.co";
});

const liveGeneralRows = staticPoolRows.slice(0, LIVE_GENERAL_COUNT);
const liveCoRows = coRows.slice(0, LIVE_CO_COUNT);

// --- 3. Hosting gratuito: lista manual verificada (ver free-hosting-manual.md) ---
const freeHostingPath = join(dataDir, "free-hosting-manual.jsonl");
const freeHostingUrls: string[] = existsSync(freeHostingPath)
  ? readFileSync(freeHostingPath, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map((line) => (JSON.parse(line) as { url: string }).url)
  : [];

// Dominios de infraestructura (acortadores, hosting barato) que hoy alojan
// TAMBIÉN una URL de phishing reportada: ambiguos por dominio, no por
// campaña. Se excluyen del lado legítimo (queda solo en el lado phishing,
// que tiene la evidencia directa: la URL concreta reportada).
const phishingDomainsForExclusion = new Set(
  phishingUrls.map((url) => registrableOf(url)).filter((d): d is string => Boolean(d)),
);

const legitCandidates: Candidate[] = [];
const seenLegitDomains = new Set<string>();
const excludedForOverlap: string[] = [];

const pushLegit = (domain: string, source: Source, liveTier: LiveTier) => {
  const registrableDomain = registrableOf(domain);
  if (!registrableDomain || seenLegitDomains.has(registrableDomain)) return; // dedupe
  if (phishingDomainsForExclusion.has(registrableDomain)) {
    excludedForOverlap.push(registrableDomain);
    return;
  }
  seenLegitDomains.add(registrableDomain);
  legitCandidates.push({ url: toUrl(domain), label: "legit", source, registrableDomain, liveTier });
};

// Primero las que SÍ se consultan por red (para que, si una también cae en el
// pool estático, quede marcada "live" y no se pierda la consulta planeada).
for (const row of liveGeneralRows) pushLegit(row.domain, "tranco-general", "live");
for (const url of freeHostingUrls) pushLegit(url, "hosting-gratuito-manual", "live");
for (const row of liveCoRows) pushLegit(row.domain, "tranco-co", "live");
const liveLegitCount = legitCandidates.length;

// Después el resto del pool estático (hasta 20k), sin red.
for (const row of staticPoolRows) pushLegit(row.domain, "tranco-general", "static-only");

const uniqueExcludedForOverlap = [...new Set(excludedForOverlap)];

// --- 4. Split 70/30 por dominio registrable, función fija (ver splitBucketOf) ---
const allCandidates = [...phishingCandidates, ...legitCandidates];
const uniqueDomains = [...new Set(allCandidates.map((c) => c.registrableDomain))];

const trainDomains = new Set<string>();
const testDomains = new Set<string>();
for (const domain of uniqueDomains) {
  (splitBucketOf(domain) === "train" ? trainDomains : testDomains).add(domain);
}

const trainSet = allCandidates.filter((c) => trainDomains.has(c.registrableDomain));
const testSet = allCandidates.filter((c) => testDomains.has(c.registrableDomain));

writeFileSync(join(datasetsDir, "train.jsonl"), trainSet.map((c) => JSON.stringify(c)).join("\n") + "\n");
writeFileSync(join(datasetsDir, "test.jsonl"), testSet.map((c) => JSON.stringify(c)).join("\n") + "\n");

const testDomainsSorted = [...testDomains].sort();
const testHash = createHash("sha256").update(testDomainsSorted.join("\n")).digest("hex");
const testManifest = {
  seed: SPLIT_SEED,
  splitMethod: "sha256(seed + ':' + dominioRegistrable), determinista por dominio (no depende del orden de descarga)",
  trainFraction: TRAIN_FRACTION,
  totalRegistrableDomains: uniqueDomains.length,
  testRegistrableDomainCount: testDomains.size,
  testCaseCount: testSet.length,
  testSetSha256: testHash,
  downloadDate: existsSync(join(rawDir, "download-date.txt"))
    ? readFileSync(join(rawDir, "download-date.txt"), "utf-8").trim()
    : null,
  builtAt: new Date().toISOString(),
};
writeFileSync(join(dataDir, "test-set.hash.json"), JSON.stringify(testManifest, null, 2) + "\n");

// --- 5. Conteo de lo que haría falta consultar por red, SIN consultarlo ---
const liveQueryCandidates = allCandidates.filter((c) => c.liveTier === "live");

const summary = {
  phishing: {
    total: phishingCandidates.length,
    descartadasPorUrlInvalida: phishingUrls.length - phishingCandidates.length,
  },
  legit: {
    poolEstatico20k: legitCandidates.filter((c) => c.liveTier === "static-only").length + liveLegitCount,
    paraConsultaPorRed: {
      general: legitCandidates.filter((c) => c.source === "tranco-general" && c.liveTier === "live").length,
      hostingGratuitoManual: legitCandidates.filter((c) => c.source === "hosting-gratuito-manual").length,
      coYComCo: legitCandidates.filter((c) => c.source === "tranco-co").length,
      total: liveLegitCount,
    },
  },
  excluidosPorAmbiguedadDominio: uniqueExcludedForOverlap,
  split: {
    dominiosRegistrablesTotales: uniqueDomains.length,
    entrenamiento: trainSet.length,
    prueba: testSet.length,
  },
  consultasPorRedNecesarias: liveQueryCandidates.length,
};

console.log(JSON.stringify(summary, null, 2));
