/**
 * Punto A del Paso 3: de los phishing en hosting gratuito que salieron
 * "sin señales", ¿cuántos tienen otra pista aprovechable (marca en
 * subdominio/ruta, campo de contraseña, título con marca) y cuántos no
 * tienen ninguna? Comparado contra los 29 legítimos de hosting gratuito.
 * Solo lee, no cambia nada.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "tldts";

import { BRANDS } from "../../src/lib/link-analysis/brands";
import { buildVerdict } from "../../src/lib/link-analysis/build-verdict";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const dataDir = join(scriptDir, "data");
const cacheDir = join(dataDir, "cache");
const trainPath = join(dataDir, "datasets", "train.jsonl");

type Candidate = { url: string; label: string; source: string; registrableDomain: string; liveTier: string };
type CachedEntry = { response: Record<string, unknown> };

const readJsonl = <T,>(path: string): T[] =>
  existsSync(path) ? readFileSync(path, "utf-8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as T) : [];

const loadCache = (url: string): CachedEntry | null => {
  const p = join(cacheDir, `${createHash("sha256").update(url).digest("hex")}.json`);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf-8")) as CachedEntry) : null;
};

const isFreeHosting = (url: string): boolean => {
  try {
    return parse(new URL(url).hostname, { allowPrivateDomains: true }).isPrivate === true;
  } catch {
    return false;
  }
};

const BRAND_KEYWORDS = [...new Set(BRANDS.flatMap((b) => b.keywords.map((k) => k.replace(/\s+/g, "").toLowerCase())))];

/** Pista 1: ¿alguna palabra clave de marca aparece en el subdominio o la ruta (exacta o pegada)? */
const hasBrandMention = (url: string): "exacta" | "pegada" | null => {
  let host = "";
  let path = "";
  try {
    const u = new URL(url);
    host = u.hostname.toLowerCase();
    path = decodeURIComponent(u.pathname + u.search).toLowerCase();
  } catch {
    return null;
  }
  const { subdomain } = parse(host, { allowPrivateDomains: true });
  const haystackTokens = `${subdomain ?? ""}-${path}`.split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
  const haystackRaw = `${subdomain ?? ""} ${path}`;
  for (const kw of BRAND_KEYWORDS) {
    if (haystackTokens.includes(kw)) return "exacta";
  }
  for (const kw of BRAND_KEYWORDS) {
    if (kw.length >= 4 && haystackRaw.includes(kw)) return "pegada";
  }
  return null;
};

const cases = readJsonl<Candidate>(trainPath);
const phishing = cases.filter((c) => c.label === "phishing");
const legitFreeHosting = cases.filter((c) => c.label === "legit" && c.source === "hosting-gratuito-manual");

const missedFreeHosting = phishing.filter((c) => {
  if (!isFreeHosting(c.url)) return false;
  const cached = loadCache(c.url);
  const destination = cached && cached.response.ok === true
    ? {
        checked: true,
        reachable: cached.response.reachable === true,
        status: Number(cached.response.status) || 0,
        differentHost: cached.response.differentHost === true,
        title: typeof cached.response.title === "string" ? cached.response.title : "",
        hasPasswordField: cached.response.hasPasswordField === true,
        domainAgeDays: cached.response.domainAgeDays == null ? null : Number(cached.response.domainAgeDays),
      }
    : { checked: false as const };
  const verdict = buildVerdict(c.url, destination);
  return verdict.level === "sin-senales";
});

console.log(`Phishing en hosting gratuito, "sin señales": ${missedFreeHosting.length}`);

const analyze = (c: Candidate) => {
  const cached = loadCache(c.url);
  const brandMention = hasBrandMention(c.url);
  const hasPassword = cached?.response.hasPasswordField === true;
  const title = typeof cached?.response.title === "string" ? cached.response.title : "";
  const titleHasBrand = BRAND_KEYWORDS.some((kw) => title.toLowerCase().includes(kw));
  const hasAnyClue = brandMention !== null || hasPassword || titleHasBrand;
  return { url: c.url, brandMention, hasPassword, titleHasBrand, title, hasAnyClue };
};

const missedAnalysis = missedFreeHosting.map(analyze);
const legitAnalysis = legitFreeHosting.map(analyze);

const count = (arr: ReturnType<typeof analyze>[], pred: (a: ReturnType<typeof analyze>) => boolean) =>
  arr.filter(pred).length;

console.log("\n=== Phishing en hosting gratuito (sin señales hoy) ===");
console.log("Marca en subdominio/ruta (exacta):", count(missedAnalysis, (a) => a.brandMention === "exacta"));
console.log("Marca en subdominio/ruta (pegada a otra palabra):", count(missedAnalysis, (a) => a.brandMention === "pegada"));
console.log("Campo de contraseña:", count(missedAnalysis, (a) => a.hasPassword));
console.log("Título con marca:", count(missedAnalysis, (a) => a.titleHasBrand));
console.log("NINGUNA pista:", count(missedAnalysis, (a) => !a.hasAnyClue));
console.log("Total:", missedAnalysis.length);

console.log("\n=== Legítimos en hosting gratuito (29) — mismas pistas ===");
console.log("Marca en subdominio/ruta (exacta):", count(legitAnalysis, (a) => a.brandMention === "exacta"));
console.log("Marca en subdominio/ruta (pegada):", count(legitAnalysis, (a) => a.brandMention === "pegada"));
console.log("Campo de contraseña:", count(legitAnalysis, (a) => a.hasPassword));
console.log("Título con marca:", count(legitAnalysis, (a) => a.titleHasBrand));
console.log("NINGUNA pista:", count(legitAnalysis, (a) => !a.hasAnyClue));
console.log("Total:", legitAnalysis.length);

console.log("\n--- Detalle de los que SÍ tienen alguna pista (phishing) ---");
for (const a of missedAnalysis.filter((a) => a.hasAnyClue)) {
  console.log(JSON.stringify(a));
}
