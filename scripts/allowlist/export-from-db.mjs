/**
 * Exporta el catálogo desplegado a JSON para el análisis estático del navegador.
 * Requiere clave service_role SOLO en entorno local; nunca se sube al repo.
 */
import { writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const baseUrl = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!baseUrl?.startsWith("https://") || !key) {
  throw Error("Faltan SUPABASE_URL (https://...) y SUPABASE_SERVICE_ROLE_KEY en el entorno");
}
const fetchRows = async (table, query) => {
  const url = new URL(`/rest/v1/${table}?${query}`, baseUrl);
  const response = await fetch(url, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw Error(`REST ${table} (${response.status}): ${await response.text()}`);
  return await response.json();
};
// Hasta 1000 filas por petición en el proyecto: paginar si el catálogo crece.
const allRows = async (table, fields) => {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const batch = await fetchRows(table, `select=${fields}&order=sort_order.asc&limit=500&offset=${offset}`);
    rows.push(...batch);
    if (batch.length < 500) break;
  }
  return rows;
};
const [dbBrands, dbDomains] = await Promise.all([
  allRows("brands", "id,name,keywords,sort_order"),
  allRows("official_domains", "domain,brand_id,sort_order"),
]);
const brands = dbBrands.map((brand) => ({
  id: brand.id,
  name: brand.name,
  keywords: brand.keywords,
  domains: dbDomains.filter((item) => item.brand_id === brand.id).map((item) => item.domain),
}));
const output = resolve(root, "data/official-domains.json");
const existing = JSON.parse(readFileSync(output, "utf8"));
const version = process.env.CATALOG_VERSION ?? existing.version;
writeFileSync(output, JSON.stringify({ version, brands }, null, 2) + "\n");
console.log(`Exportadas ${brands.length} marcas, ${dbDomains.length} dominios desde Supabase`);
