/**
 * Banco de pruebas del motor de análisis de enlaces.
 *
 * Corre siempre offline: solo el análisis estático (`analyze-url.ts` vía
 * `buildVerdict`), sin red y sin tocar `check-link`. No hay modo `--network`
 * a propósito (decisión del 2026-10-10): la comprobación real del destino se
 * prueba a mano al desplegar, no desde este runner.
 *
 * Uso:
 *   pnpm exec tsx scripts/eval/run.ts [--dataset <ruta>] [--name <nombre>]
 *
 * Código de salida 1 si algún caso con "expect" no coincide con el resultado
 * real (regresión). La falta de coincidencia con "label" (fuera de "expect")
 * solo se reporta en las métricas, no hace fallar la corrida.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildVerdict } from "../../src/lib/link-analysis/build-verdict";
import { normalizeInput } from "../../src/lib/link-analysis/normalize-input";
import { loadDataset } from "./lib/dataset";
import {
  computeAllMetrics,
  findRegressionFailures,
  formatConsoleReport,
  formatMarkdownReport,
  type CaseResult,
} from "./lib/report";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..");

type Args = { dataset: string; name: string };

const parseArgs = (argv: string[]): Args => {
  const args: Args = {
    dataset: join(scriptDir, "data", "seed.jsonl"),
    name: "run",
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--dataset" && argv[i + 1]) {
      args.dataset = resolve(repoRoot, argv[i + 1]);
      i += 1;
    } else if (argv[i] === "--name" && argv[i + 1]) {
      args.name = argv[i + 1];
      i += 1;
    }
  }
  return args;
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
    const verdict = buildVerdict(normalized.url, { checked: false });
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
