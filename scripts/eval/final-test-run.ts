/**
 * Paso 5 — UNA sola corrida sobre el conjunto de prueba CONGELADO. No se
 * reajusta nada después de ver el resultado (ver reports/final.md).
 *
 * Para volver a correrlo, antes hay que regenerar el snapshot del motor
 * anterior a esta iniciativa (no se deja commiteado a propósito, para no
 * duplicar código fuente viejo en el repo):
 *   mkdir -p scripts/eval/_baseline-src
 *   for f in brands types signals analyze-url build-verdict allowlist; do
 *     git show cf6e3ab:src/lib/link-analysis/$f.ts > scripts/eval/_baseline-src/$f.ts
 *   done
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseHost } from "tldts";

import { buildVerdict as buildVerdictNow } from "../../src/lib/link-analysis/build-verdict";
// @ts-expect-error -- snapshot congelado del motor ANTES de esta iniciativa (commit cf6e3ab), solo para comparar.
import { buildVerdict as buildVerdictBaseline } from "./_baseline-src/build-verdict";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const dataDir = join(scriptDir, "data");
const cacheDir = join(dataDir, "cache");
const testPath = join(dataDir, "datasets", "test.jsonl");

type Candidate = { url: string; label: "phishing" | "legit"; source: string; registrableDomain: string };
type CachedResponse = Record<string, unknown>;

const readJsonl = <T,>(path: string): T[] =>
  existsSync(path) ? readFileSync(path, "utf-8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as T) : [];

const loadCache = (url: string): CachedResponse | null => {
  const p = join(cacheDir, `${createHash("sha256").update(url).digest("hex")}.json`);
  if (!existsSync(p)) return null;
  const parsed = JSON.parse(readFileSync(p, "utf-8")) as { response?: CachedResponse };
  return parsed.response ?? null;
};

const isPrivateSuffix = (url: string): boolean => {
  try {
    return parseHost(new URL(url).hostname, { allowPrivateDomains: true }).isPrivate === true;
  } catch {
    return false;
  }
};

const cases = readJsonl<Candidate>(testPath);

const destinationFromResponse = (response: CachedResponse | null) => {
  if (!response || response.ok !== true) return { checked: false as const };
  return {
    checked: true as const,
    reachable: response.reachable === true,
    status: Number(response.status) || 0,
    finalUrl: typeof response.finalUrl === "string" ? response.finalUrl : "",
    finalHost: typeof response.finalHost === "string" ? response.finalHost : "",
    redirects: Array.isArray(response.redirects) ? response.redirects.map(String) : [],
    differentHost: response.differentHost === true,
    title: typeof response.title === "string" ? response.title : "",
    hasPasswordField: response.hasPasswordField === true,
    domainAgeDays: response.domainAgeDays == null ? null : Number(response.domainAgeDays),
  };
};

type Row = {
  c: Candidate;
  response: CachedResponse | null;
  now: ReturnType<typeof buildVerdictNow>;
  base: ReturnType<typeof buildVerdictBaseline>;
};

const rows: Row[] = cases.map((c) => {
  const response = loadCache(c.url);
  const destination = destinationFromResponse(response);
  return {
    c,
    response,
    now: buildVerdictNow(c.url, destination),
    base: buildVerdictBaseline(c.url, destination),
  };
});

// --- Matriz de confusión + IC de Wilson (95%) ---
const wilson = (successes: number, total: number): [number, number] => {
  if (total === 0) return [0, 0];
  const z = 1.96;
  const p = successes / total;
  const denom = 1 + (z * z) / total;
  const center = p + (z * z) / (2 * total);
  const margin = z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total));
  return [(center - margin) / denom, (center + margin) / denom];
};

const confusion = (rs: Row[], pick: (r: Row) => "riesgo" | "precaucion" | "sin-senales", metric: "riesgo" | "riesgo+precaucion") => {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const r of rs) {
    const level = pick(r);
    const flagged = metric === "riesgo" ? level === "riesgo" : level !== "sin-senales";
    if (r.c.label === "phishing" && flagged) tp += 1;
    else if (r.c.label === "phishing" && !flagged) fn += 1;
    else if (r.c.label === "legit" && flagged) fp += 1;
    else tn += 1;
  }
  const recall = tp / (tp + fn) || 0;
  const precision = tp / (tp + fp) || 0;
  const fpr = fp / (fp + tn) || 0;
  const [rLo, rHi] = wilson(tp, tp + fn);
  const [fLo, fHi] = wilson(fp, fp + tn);
  return { tp, fp, tn, fn, recall, precision, fpr, recallCI: [rLo, rHi], fprCI: [fLo, fHi] };
};

const pct = (n: number) => (n * 100).toFixed(1) + "%";
const fmtCI = (ci: [number, number]) => `[${pct(ci[0])}, ${pct(ci[1])}]`;

console.log("=== PASO 5 — conjunto de prueba (congelado), motor ACTUAL ===");
for (const m of ["riesgo", "riesgo+precaucion"] as const) {
  const c = confusion(rows, (r) => r.now.level, m);
  console.log(`[${m}] TP=${c.tp} FP=${c.fp} TN=${c.tn} FN=${c.fn} precision=${pct(c.precision)} recall=${pct(c.recall)} (IC95 ${fmtCI(c.recallCI)}) FPR=${pct(c.fpr)} (IC95 ${fmtCI(c.fprCI)})`);
}

console.log("\n=== Línea base (motor antes de esta iniciativa, commit cf6e3ab) ===");
for (const m of ["riesgo", "riesgo+precaucion"] as const) {
  const c = confusion(rows, (r) => r.base.level, m);
  console.log(`[${m}] TP=${c.tp} FP=${c.fp} TN=${c.tn} FN=${c.fn} precision=${pct(c.precision)} recall=${pct(c.recall)} (IC95 ${fmtCI(c.recallCI)}) FPR=${pct(c.fpr)} (IC95 ${fmtCI(c.fprCI)})`);
}

// --- Desgloses ---
const hostingLegit = rows.filter((r) => r.c.label === "legit" && isPrivateSuffix(r.c.url));
const coLegit = rows.filter(
  (r) => r.c.label === "legit" && (r.c.registrableDomain.endsWith(".co") || r.c.registrableDomain.endsWith(".com.co")),
);
const phishingDead = rows.filter((r) => r.c.label === "phishing" && (!r.response || r.response.ok !== true));
const phishingLive = rows.filter((r) => r.c.label === "phishing" && r.response && r.response.ok === true);

const levelCounts = (rs: Row[]) => {
  const counts = { "sin-senales": 0, precaucion: 0, riesgo: 0 };
  for (const r of rs) counts[r.now.level] += 1;
  return counts;
};

console.log("\n=== Desgloses (motor actual) ===");
console.log(`Legítimos hosting gratuito (${hostingLegit.length}):`, levelCounts(hostingLegit));
console.log(`Legítimos .co/.com.co (${coLegit.length}):`, levelCounts(coLegit));
console.log(`Phishing caído/sin respuesta (${phishingDead.length}):`, levelCounts(phishingDead));
console.log(`Phishing que respondió (${phishingLive.length}):`, levelCounts(phishingLive));

// --- Categorización de lo no detectado (igual que analyze-errors.ts) ---
const categorize = (r: Row): string => {
  let host = "";
  try {
    host = new URL(r.c.url).hostname.toLowerCase();
  } catch {
    return "url-invalida";
  }
  if (isPrivateSuffix(r.c.url)) return "hosting-gratuito";
  if (!r.response || r.response.ok !== true) return "pagina-caida-o-sin-respuesta";
  const title = typeof r.response.title === "string" ? r.response.title : "";
  const reachable = r.response.reachable === true;
  if (reachable && title.trim() === "") return "posible-cascaron-js-o-revisar";
  return "revisar-manualmente";
};

const missed = rows.filter((r) => r.c.label === "phishing" && r.now.level === "sin-senales");
const partial = rows.filter((r) => r.c.label === "phishing" && r.now.level === "precaucion");
const byCategory = new Map<string, number>();
for (const r of missed) {
  const cat = categorize(r);
  byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1);
}
console.log(`\n=== No detectado (sin-señales): ${missed.length} / ${rows.filter((r) => r.c.label === "phishing").length} (+ ${partial.length} solo en precaución) ===`);
for (const [cat, n] of byCategory) console.log(`  ${cat}: ${n} (${((n / missed.length) * 100).toFixed(1)}%)`);

// --- Falsos positivos por señal ---
const falsePositives = rows.filter((r) => r.c.label === "legit" && r.now.level !== "sin-senales");
const fpBySignal = new Map<string, number>();
for (const r of falsePositives) {
  const key = r.now.signals.map((s) => s.id).join("+") || "(ninguna)";
  fpBySignal.set(key, (fpBySignal.get(key) ?? 0) + 1);
}
console.log(`\n=== Falsos positivos: ${falsePositives.length} / ${rows.filter((r) => r.c.label === "legit").length} ===`);
for (const [sig, n] of [...fpBySignal.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${sig}: ${n}`);

console.log("\n=== Ejemplos: no detectado (revisar-manualmente) ===");
for (const r of missed.filter((r) => categorize(r) === "revisar-manualmente").slice(0, 4)) {
  console.log(" ", r.c.url, "| title:", JSON.stringify(r.response?.title ?? ""));
}
console.log("\n=== Ejemplos: FP imitacion-marca ===");
for (const r of falsePositives.filter((r) => r.now.signals.map((s)=>s.id).join("+") === "imitacion-marca").slice(0, 6)) {
  console.log(" ", r.c.url);
}
console.log("\n=== Ejemplos: FP dominio-sospechoso ===");
for (const r of falsePositives.filter((r) => r.now.signals.map((s)=>s.id).join("+") === "dominio-sospechoso").slice(0, 4)) {
  console.log(" ", r.c.url);
}
console.log("\n=== .co/.com.co en riesgo ===");
for (const r of coLegit.filter((r) => r.now.level === "riesgo")) {
  console.log(" ", r.c.url, r.now.signals.map((s)=>s.id));
}
