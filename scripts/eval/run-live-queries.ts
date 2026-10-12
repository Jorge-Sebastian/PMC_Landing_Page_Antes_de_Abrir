/**
 * Consulta check-link (el servidor real) para cada URL "live" del dataset
 * armado por build-realworld-dataset.ts, y cachea cada respuesta con su
 * fecha en data/cache/ (gitignored — nunca se sube). Concurrencia baja y
 * con pausas a propósito, para no saturar el servidor ni los sitios reales
 * que se consultan (muchos son phishing activo; otros son sitios de
 * terceros que no pidieron esto).
 *
 * Nunca se abre ninguna URL en un navegador: solo la consulta el propio
 * check-link, igual que lo haría la app en producción.
 *
 * Uso:
 *   SUPABASE_PUBLISHABLE_KEY=... npx tsx scripts/eval/run-live-queries.ts
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const dataDir = join(scriptDir, "data");
const datasetsDir = join(dataDir, "datasets");
const cacheDir = join(dataDir, "cache");
mkdirSync(cacheDir, { recursive: true });

const ENDPOINT = "https://tzweryoduyrsbvnzjqmb.supabase.co/functions/v1/check-link";
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!KEY) {
  console.error("Falta la variable de entorno SUPABASE_PUBLISHABLE_KEY.");
  process.exit(1);
}

const CONCURRENCY = 3;
const PAUSE_BETWEEN_BATCHES_MS = 400;
const REQUEST_TIMEOUT_MS = 9000; // igual al timeout del cliente real (check-destination.ts)

type Candidate = { url: string; label: string; source: string; registrableDomain: string; liveTier: string };

const readJsonl = (path: string): Candidate[] =>
  existsSync(path)
    ? readFileSync(path, "utf-8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as Candidate)
    : [];

const all = [...readJsonl(join(datasetsDir, "train.jsonl")), ...readJsonl(join(datasetsDir, "test.jsonl"))];
const toQuery = all.filter((c) => c.liveTier === "live");

const cacheKeyFor = (url: string) => createHash("sha256").update(url).digest("hex");

const queryOne = async (candidate: Candidate): Promise<{ ok: boolean; cached: boolean }> => {
  const key = cacheKeyFor(candidate.url);
  const cachePath = join(cacheDir, `${key}.json`);
  if (existsSync(cachePath)) return { ok: true, cached: true };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        apikey: KEY as string,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: candidate.url }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const body = await response.json().catch(() => ({ ok: false, reason: "invalid-json" }));
    writeFileSync(
      cachePath,
      JSON.stringify(
        {
          url: candidate.url,
          label: candidate.label,
          source: candidate.source,
          registrableDomain: candidate.registrableDomain,
          queriedAt: new Date().toISOString(),
          httpStatus: response.status,
          response: body,
        },
        null,
        2,
      ),
    );
    return { ok: true, cached: false };
  } catch (error) {
    writeFileSync(
      cachePath,
      JSON.stringify(
        {
          url: candidate.url,
          label: candidate.label,
          source: candidate.source,
          registrableDomain: candidate.registrableDomain,
          queriedAt: new Date().toISOString(),
          httpStatus: null,
          response: { ok: false, reason: "client-error", error: String(error) },
        },
        null,
        2,
      ),
    );
    return { ok: false, cached: false };
  }
};

const run = async () => {
  console.log(`Consultando ${toQuery.length} URLs (concurrencia ${CONCURRENCY}, pausa ${PAUSE_BETWEEN_BATCHES_MS}ms entre tandas)...`);
  const startedAt = Date.now();
  let done = 0;
  let failed = 0;
  let skippedCached = 0;

  for (let i = 0; i < toQuery.length; i += CONCURRENCY) {
    const batch = toQuery.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((c) => queryOne(c)));
    for (const r of results) {
      done += 1;
      if (!r.ok) failed += 1;
      if (r.cached) skippedCached += 1;
    }
    if (done % 60 < CONCURRENCY) {
      const elapsedS = Math.round((Date.now() - startedAt) / 1000);
      console.log(`  ${done}/${toQuery.length} (fallidas: ${failed}, ya en caché: ${skippedCached}) — ${elapsedS}s transcurridos`);
    }
    await new Promise((resolve) => setTimeout(resolve, PAUSE_BETWEEN_BATCHES_MS));
  }

  const totalS = Math.round((Date.now() - startedAt) / 1000);
  console.log(
    `\nListo: ${done} consultadas, ${failed} fallidas a nivel cliente, ${skippedCached} ya estaban en caché. Tiempo total: ${totalS}s (${Math.round(totalS / 60)} min).`,
  );
};

void run();
