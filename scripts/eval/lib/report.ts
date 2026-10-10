import type { DatasetCase, RiskLevel } from "./dataset";

export type CaseResult = {
  case: DatasetCase;
  level: RiskLevel;
  score: number;
  signalIds: string[];
};

export type ThresholdId = "riesgo" | "riesgo+precaucion";

export type ConfusionMatrix = { tp: number; fp: number; tn: number; fn: number };

export type ThresholdMetrics = {
  threshold: ThresholdId;
  matrix: ConfusionMatrix;
  precision: number;
  recall: number;
  falsePositiveRate: number;
};

const THRESHOLDS: ThresholdId[] = ["riesgo", "riesgo+precaucion"];

/** ¿Este nivel cuenta como "alerta" bajo el umbral dado? */
const isFlagged = (level: RiskLevel, threshold: ThresholdId): boolean =>
  threshold === "riesgo" ? level === "riesgo" : level === "riesgo" || level === "precaucion";

const safeDivide = (numerator: number, denominator: number): number =>
  denominator === 0 ? 0 : numerator / denominator;

export const computeMetrics = (results: CaseResult[], threshold: ThresholdId): ThresholdMetrics => {
  const matrix: ConfusionMatrix = { tp: 0, fp: 0, tn: 0, fn: 0 };

  for (const result of results) {
    const flagged = isFlagged(result.level, threshold);
    const isPhishing = result.case.label === "phishing";
    if (isPhishing && flagged) matrix.tp += 1;
    else if (isPhishing && !flagged) matrix.fn += 1;
    else if (!isPhishing && flagged) matrix.fp += 1;
    else matrix.tn += 1;
  }

  return {
    threshold,
    matrix,
    precision: safeDivide(matrix.tp, matrix.tp + matrix.fp),
    recall: safeDivide(matrix.tp, matrix.tp + matrix.fn),
    falsePositiveRate: safeDivide(matrix.fp, matrix.fp + matrix.tn),
  };
};

export const computeAllMetrics = (results: CaseResult[]): ThresholdMetrics[] =>
  THRESHOLDS.map((threshold) => computeMetrics(results, threshold));

export type RegressionFailure = {
  result: CaseResult;
  expected: RiskLevel;
};

export const findRegressionFailures = (results: CaseResult[]): RegressionFailure[] =>
  results
    .filter((result) => result.case.expect && result.case.expect !== result.level)
    .map((result) => ({ result, expected: result.case.expect! }));

const pct = (value: number): string => `${(value * 100).toFixed(1)}%`;

const formatMatrix = (matrix: ConfusionMatrix): string =>
  `TP=${matrix.tp} FP=${matrix.fp} TN=${matrix.tn} FN=${matrix.fn}`;

export const formatConsoleReport = (
  name: string,
  results: CaseResult[],
  metrics: ThresholdMetrics[],
  failures: RegressionFailure[],
): string => {
  const lines: string[] = [];
  lines.push(`\n=== Eval "${name}" — ${results.length} casos ===`);

  for (const m of metrics) {
    lines.push(
      `\n[umbral: ${m.threshold}] ${formatMatrix(m.matrix)}  ` +
        `precision=${pct(m.precision)} recall=${pct(m.recall)} FPR=${pct(m.falsePositiveRate)}`,
    );
  }

  if (failures.length > 0) {
    lines.push(`\n!! ${failures.length} caso(s) de regresion con "expect" incumplido:`);
    for (const failure of failures) {
      lines.push(
        `   línea ${failure.result.case.line} (${failure.result.case.source}): ` +
          `esperado "${failure.expected}", obtenido "${failure.result.level}" — ${failure.result.case.url}`,
      );
    }
  } else {
    lines.push(`\nSin casos de regresion incumplidos.`);
  }

  return lines.join("\n");
};

const groupBySource = (results: CaseResult[]): Map<string, CaseResult[]> => {
  const grouped = new Map<string, CaseResult[]>();
  for (const result of results) {
    const key = result.case.source;
    const bucket = grouped.get(key) ?? [];
    bucket.push(result);
    grouped.set(key, bucket);
  }
  return grouped;
};

export const formatMarkdownReport = (
  name: string,
  results: CaseResult[],
  metrics: ThresholdMetrics[],
  failures: RegressionFailure[],
): string => {
  const simulatedAgeCount = results.filter((r) => r.case.domainAgeDays !== undefined).length;
  const simulatedStatusCount = results.filter((r) => r.case.destinationStatus !== undefined).length;

  const lines: string[] = [];
  lines.push(`# Reporte de evaluación: ${name}`);
  lines.push("");
  lines.push(`Generado: ${new Date().toISOString()}`);
  lines.push(
    `Casos evaluados: ${results.length} (análisis estático offline; nunca se llama a check-link/RDAP de verdad).`,
  );
  if (simulatedAgeCount > 0) {
    lines.push("");
    lines.push(
      `> **${simulatedAgeCount} caso(s) usan \`domainAgeDays\` simulado** (destino falso con esa única edad, ` +
        "sin ningún otro dato de destino) para probar las reglas de combinación de `build-verdict.ts` " +
        "(imitación de marca + dominio nuevo, dominio nuevo solo). **Estas cifras prueban las reglas, no " +
        "miden RDAP real** — el runner nunca consulta un servidor RDAP.",
    );
  }
  if (simulatedStatusCount > 0) {
    lines.push("");
    lines.push(
      `> **${simulatedStatusCount} caso(s) usan \`destinationStatus\` simulado** ("blocked" = respuesta HTTP ` +
        '403 falsa, "unavailable" = sin ninguna respuesta falsa) para probar que un bloqueo automático o un ' +
        "host sin respuesta, cada uno por sí solo, no producen `precaucion`. **Tampoco miden nada real** — " +
        "nunca se llama a `check-link`.",
    );
  }
  lines.push("");
  lines.push("## Matriz de confusión y métricas");
  lines.push("");
  lines.push("| Umbral | TP | FP | TN | FN | Precisión | Recall | Tasa de falsos positivos |");
  lines.push("|---|---|---|---|---|---|---|---|");
  for (const m of metrics) {
    lines.push(
      `| ${m.threshold} | ${m.matrix.tp} | ${m.matrix.fp} | ${m.matrix.tn} | ${m.matrix.fn} | ` +
        `${pct(m.precision)} | ${pct(m.recall)} | ${pct(m.falsePositiveRate)} |`,
    );
  }
  lines.push("");
  lines.push(
    "> `riesgo`: solo el nivel más alto cuenta como alerta. `riesgo+precaucion`: ambos niveles cuentan como alerta.",
  );
  lines.push("");

  lines.push("## Casos de regresión (`expect`)");
  lines.push("");
  if (failures.length === 0) {
    lines.push("Todos los casos con `expect` definido coinciden con el resultado real.");
  } else {
    lines.push(`${failures.length} caso(s) no coinciden con el nivel esperado:`);
    lines.push("");
    lines.push("| Línea | Fuente | Esperado | Obtenido | URL |");
    lines.push("|---|---|---|---|---|");
    for (const failure of failures) {
      lines.push(
        `| ${failure.result.case.line} | ${failure.result.case.source} | ${failure.expected} | ` +
          `${failure.result.level} | \`${failure.result.case.url}\` |`,
      );
    }
  }
  lines.push("");

  lines.push("## Detalle por categoría (`source`)");
  lines.push("");
  lines.push("| Fuente | Casos | Niveles obtenidos |");
  lines.push("|---|---|---|");
  for (const [source, bucket] of groupBySource(results)) {
    const counts = { riesgo: 0, precaucion: 0, "sin-senales": 0 } as Record<RiskLevel, number>;
    for (const result of bucket) counts[result.level] += 1;
    lines.push(
      `| ${source} | ${bucket.length} | riesgo=${counts.riesgo}, precaucion=${counts.precaucion}, ` +
        `sin-senales=${counts["sin-senales"]} |`,
    );
  }
  lines.push("");

  lines.push("## Todos los casos");
  lines.push("");
  lines.push("| Línea | Etiqueta | Nivel | Puntaje | Señales | Nota |");
  lines.push("|---|---|---|---|---|---|");
  for (const result of results) {
    lines.push(
      `| ${result.case.line} | ${result.case.label} | ${result.level} | ${result.score} | ` +
        `${result.signalIds.join(", ") || "—"} | ${result.case.note ?? "—"} |`,
    );
  }
  lines.push("");

  return lines.join("\n");
};
