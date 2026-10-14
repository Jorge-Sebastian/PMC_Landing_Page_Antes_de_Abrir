/** Importa un CSV Tranco rank,domain en popular_domains (máximo 10.000).
 * Es una FUENTE de popularidad, nunca un criterio de oficialidad o seguridad.
 * Ejecutar DESPUÉS de la migración y solo con la service_role en entorno local.
 */
import { readFileSync } from "node:fs";
import { parse } from "tldts";
const [filename] = process.argv.slice(2);
const base = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!filename || !base?.startsWith("https://") || !key) {
  throw Error("Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/allowlist/import-popular.mjs lista-tranco.csv");
}
const rows = readFileSync(filename, "utf8").trim().split(/\r?\n/);
const found = new Map();
for (const line of rows) {
  const parts = line.replace(/^\uFEFF/, "").split(",");
  if (parts.length < 2 || !/^\d+$/.test(parts[0])) continue;
  const rank = Number(parts[0]);
  if (rank > 10000) break;
  const domain = parse(parts[1].trim().toLowerCase(), { allowPrivateDomains: true }).domain;
  if (domain && !found.has(domain)) found.set(domain, { domain, rank, source: "tranco" });
}
if (!found.size) throw Error("El CSV no tiene filas válidas en formato rank,domain");
const endpoint = new URL("/rest/v1/popular_domains?on_conflict=domain", base);
const items = [...found.values()];
for (let i = 0; i < items.length; i += 200) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(items.slice(i, i + 200)),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw Error(`Error al importar (${response.status}): ${await response.text()}`);
}
console.log(`Se cargaron ${items.length} dominios registrables populares (no significa que sean oficiales ni seguros).`);
