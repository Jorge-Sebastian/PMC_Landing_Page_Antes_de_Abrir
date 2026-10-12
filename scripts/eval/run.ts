/**
 * Banco de pruebas del motor de análisis de enlaces.
 *
 * Por defecto corre offline: solo el análisis estático (`analyze-url.ts`
 * vía `buildVerdict`), sin red y sin tocar `check-link`.
 *
 * Uso:
 *   pnpm exec tsx scripts/eval/run.ts [--data <ruta>] [--name <nombre>] [--network]
 *
 * --data acepta cualquier JSONL con el mismo formato que data/seed.jsonl
 * (por ejemplo un holdout.jsonl con URLs propias, fuera del seed).
 *
 * --network (reactivado 2026-10-11, banco de datos real de OpenPhish/Tranco):
 * en vez de analizar siempre offline, busca para cada URL una respuesta YA
 * CACHEADA de check-link en data/cache/ (ver run-live-queries.ts) y la usa
 * como destino real. Nunca llama a la red él mismo — solo lee la caché que
 * ya se armó por separado. Si una URL no tiene caché (p. ej. el pool
 * estático de 20k), se analiza offline igual que siempre.
 *
 * Código de salida 1 si algún caso con "expect" no coincide con el resultado
 * real (regresión). La falta de coincidencia con "label" (fuera de "expect")
 * solo se reporta en las métricas, no hace fallar la corrida.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildVerdict } from "../../src/lib/link-analysis/build-verdict";
import { normalizeInput } from "../../src/lib/link-analysis/normalize-input";
import type { DestinationCheck, DestinationReason } from "../../src/lib/link-analysis/types";
import { loadDataset } from "./lib/dataset";
import type { DatasetCase } from "./lib/dataset";

import {
  computeAllMetrics,
  findRegressionFailures,
  formatConsoleReport,
  formatMarkdownReport,
  type CaseResult,
} from "./lib/report";

/**
 * El eval offline nunca llama a check-link/RDAP de verdad. Cuando un caso
 * del seed trae `domainAgeDays` y/o `destinationStatus`, se simula un
 * destino ya comprobado solo con esos datos, para poder probar las reglas
 * de combinación de `build-verdict.ts` (ver docs/CHANGELOG-algoritmo.md,
 * Fases 2 y "hallazgos de producción"). Sin esos campos, se analiza igual
 * que siempre: solo la parte estática.
 */
const destinationFor = (datasetCase: DatasetCase): DestinationCheck => {
  if (datasetCase.destinationStatus === "blocked") {
    return { checked: true, reachable: false, status: 403 };
  }
  if (datasetCase.destinationStatus === "unavailable") {
    return { checked: false, reason: "unavailable" };
  }
  if (typeof datasetCase.destinationStatus === "number") {
    const status = datasetCase.destinationStatus;
    return { checked: true, reachable: status >= 200 && status < 400, status };
  }
  if (datasetCase.domainAgeDays !== undefined) {
    return { checked: true, reachable: true, domainAgeDays: datasetCase.domainAgeDays };
  }
  return { checked: false };
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..");
const cacheDir = join(scriptDir, "data", "cache");

type Args = { dataset: string; name: string; network: boolean };

const parseArgs = (argv: string[]): Args => {
  const args: Args = {
    dataset: join(scriptDir, "data", "seed.jsonl"),
    name: "run",
    network: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--data" && argv[i + 1]) {
      args.dataset = resolve(repoRoot, argv[i + 1]);
      i += 1;
    } else if (argv[i] === "--name" && argv[i + 1]) {
      args.name = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--network") {
      args.network = true;
    }
  }
  return args;
};

/**
 * Traduce el payload cacheado de check-link exactamente como lo hace
 * check-destination.ts. Devuelve null si no hay nada cacheado para esa URL.
 */
const destinationFromCache = (url: string): DestinationCheck | null => {
  const cachePath = join(cacheDir, `${createHash("sha256").update(url).digest("hex")}.json`);
  if (!existsSync(cachePath)) return null;
  const cached = JSON.parse(readFileSync(cachePath, "utf-8")) as { response?: Record<string, unknown> };
  const payload = cached.response ?? {};
  if (payload.ok !== true) {
    const reason = typeof payload.reason === "string" ? payload.reason : "unavailable";
    return { checked: false, reason: reason as DestinationReason };
  }
  return {
    checked: true,
    reachable: payload.reachable === true,
    status: Number(payload.status) || 0,
    finalUrl: typeof payload.finalUrl === "string" ? payload.finalUrl : url,
    finalHost: typeof payload.finalHost === "string" ? payload.finalHost : "",
    redirects: Array.isArray(payload.redirects) ? payload.redirects.map(String) : [],
    differentHost: payload.differentHost === true,
    title: typeof payload.title === "string" ? payload.title : "",
    hasPasswordField: payload.hasPasswordField === true,
    domainAgeDays: payload.domainAgeDays === null || payload.domainAgeDays === undefined
      ? null
      : Number(payload.domainAgeDays),
  };
};

const run = () => {
  const args = parseArgs(process.argv.slice(2));
  const cases = loadDataset(args.dataset);

  const results: CaseResult[] = cases.map((datasetCase) => {
    const normalized = normalizeInput(datasetCase.url);
    if (!normalized.ok) {
      throw new Error(
        `linea ${datasetCase.line}: la URL del seed no se pudo normalizar (${normalized.errorKey}): ${datasetCase.url}`,
      );
    }
    const destination = (args.network && destinationFromCache(normalized.url)) || destinationFor(datasetCase);
    const verdict = buildVerdict(normalized.url, destination);
    return {
      case: datasetCase,
      level: verdict.level,
      score: verdict.score,
      signalIds: verdict.signals.map((signal) => signal.id),
    };
  });

  const metrics = computeAllMetrics(results);
  const failures = findRegressionFailures(results);

  console.log(formatConsoleReport(args.name, results, metrics, failures));

  const reportsDir = join(repoRoot, "reports");
  mkdirSync(reportsDir, { recursive: true });

  const jsonPath = join(reportsDir, `${args.name}.json`);
  writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        name: args.name,
        generatedAt: new Date().toISOString(),
        dataset: args.dataset,
        results: results.map((result) => ({
          line: result.case.line,
          url: result.case.url,
          label: result.case.label,
          source: result.case.source,
          expect: result.case.expect ?? null,
          level: result.level,
          score: result.score,
          signals: result.signalIds,
        })),
        metrics,
        regressionFailures: failures.map((failure) => ({
          line: failure.result.case.line,
          url: failure.result.case.url,
          expected: failure.expected,
          actual: failure.result.level,
        })),
      },
      null,
      2,
    ),
  );

  const markdownPath = join(reportsDir, `${args.name}.md`);
  writeFileSync(markdownPath, formatMarkdownReport(args.name, results, metrics, failures));

  console.log(`\nReportes escritos en ${jsonPath} y ${markdownPath}`);

  if (failures.length > 0) {
    process.exitCode = 1;
  }
};

run();
