import { readFileSync } from "node:fs";

export type DatasetLabel = "phishing" | "legit";
export type RiskLevel = "riesgo" | "precaucion" | "sin-senales";

export type DatasetCase = {
  url: string;
  label: DatasetLabel;
  source: string;
  note?: string;
  /**
   * Nivel que DEBE producir el motor para este caso. Cuando está presente,
   * el runner falla (código de salida 1) si el resultado real no coincide:
   * sirve como ancla de regresión, no como medida de precisión/recall.
   * Se deja sin definir en los casos que hoy fallan a propósito (para medir
   * el falso positivo/negativo) hasta que una fase futura los corrija.
   */
  expect?: RiskLevel;
  /**
   * Edad de dominio SIMULADA (días), opcional. El eval offline no puede
   * medirla de verdad (no llama a check-link/RDAP) — cuando está presente,
   * el runner construye un destino simulado `{ checked: true, reachable:
   * true, domainAgeDays }` solo para poder probar las reglas de
   * combinación de `build-verdict.ts`. No mide nada de RDAP real.
   */
  domainAgeDays?: number | null;
  /**
   * Estado de destino SIMULADO, opcional (hallazgo de la prueba en
   * producción, ver docs/CHANGELOG-algoritmo.md). "blocked" inyecta un
   * destino con una respuesta HTTP de bloqueo (403); "unavailable" inyecta
   * un destino sin ninguna respuesta (host que no resuelve, conexión
   * rechazada). Igual que `domainAgeDays`: no mide nada real, solo prueba
   * las reglas de combinación de `build-verdict.ts` offline.
   */
  destinationStatus?: DestinationStatusCase;
  line: number;
};

export type DestinationStatusCase = "blocked" | "unavailable";

const RISK_LEVELS: RiskLevel[] = ["riesgo", "precaucion", "sin-senales"];
const LABELS: DatasetLabel[] = ["phishing", "legit"];
const DESTINATION_STATUS_CASES: DestinationStatusCase[] = ["blocked", "unavailable"];

type RawRow = {
  url?: unknown;
  label?: unknown;
  source?: unknown;
  note?: unknown;
  expect?: unknown;
  domainAgeDays?: unknown;
  destinationStatus?: unknown;
};

const assertString = (value: unknown, field: string, line: number): string => {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${field} invalido en la linea ${line}: se esperaba un texto no vacio`);
  }
  return value;
};

/** Lee un dataset en formato JSONL (un objeto JSON por línea, líneas vacías ignoradas). */
export const loadDataset = (filePath: string): DatasetCase[] => {
  const raw = readFileSync(filePath, "utf-8");
  const cases: DatasetCase[] = [];

  raw.split("\n").forEach((rawLine, index) => {
    const line = index + 1;
    const trimmed = rawLine.trim();
    if (!trimmed) return;

    let parsed: RawRow;
    try {
      parsed = JSON.parse(trimmed) as RawRow;
    } catch (error) {
      throw new Error(`JSON invalido en ${filePath}:${line}: ${String(error)}`);
    }

    const url = assertString(parsed.url, "url", line);
    const label = assertString(parsed.label, "label", line) as DatasetLabel;
    if (!LABELS.includes(label)) {
      throw new Error(`label invalido en la linea ${line}: "${label}" (debe ser phishing|legit)`);
    }
    const source = assertString(parsed.source, "source", line);
    const note = typeof parsed.note === "string" ? parsed.note : undefined;

    let expect: RiskLevel | undefined;
    if (typeof parsed.expect === "string") {
      if (!RISK_LEVELS.includes(parsed.expect as RiskLevel)) {
        throw new Error(`expect invalido en la linea ${line}: "${parsed.expect}"`);
      }
      expect = parsed.expect as RiskLevel;
    }

    let domainAgeDays: number | null | undefined;
    if (parsed.domainAgeDays !== undefined) {
      if (parsed.domainAgeDays !== null && typeof parsed.domainAgeDays !== "number") {
        throw new Error(`domainAgeDays invalido en la linea ${line}: debe ser numero o null`);
      }
      domainAgeDays = parsed.domainAgeDays;
    }

    let destinationStatus: DestinationStatusCase | undefined;
    if (parsed.destinationStatus !== undefined) {
      if (!DESTINATION_STATUS_CASES.includes(parsed.destinationStatus as DestinationStatusCase)) {
        throw new Error(`destinationStatus invalido en la linea ${line}: "${String(parsed.destinationStatus)}"`);
      }
      destinationStatus = parsed.destinationStatus as DestinationStatusCase;
    }

    cases.push({ url, label, source, note, expect, domainAgeDays, destinationStatus, line });
  });

  return cases;
};
