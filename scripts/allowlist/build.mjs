/**
 * PR workflow: reviewed TSV -> repeatable SQL seed migration + browser export.
 * After applying the SQL to the team DB, verify the DB export with export-from-db.mjs.
 * Node only; does not need Supabase credentials.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const tsv = readFileSync(resolve(root, "data/catalog.tsv"), "utf8").trimEnd().split(/\r?\n/);
const expected = "brand_id\tbrand_name\tkeywords\tdomain\treview_status\tevidence";
if (tsv.shift() !== expected) throw Error("Cabeceras TSV incorrectas");
const rows = tsv.map((line) => {
  const parts = line.split("\t");
  if (parts.length !== 6) throw Error(`Fila TSV mal formada: ${line}`);
  const [brandId, brandName, keywordText, domain, status, evidence] = parts;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(brandId)) throw Error(`ID no válido: ${brandId}`);
  if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(domain)) throw Error(`Dominio no válido: ${domain}`);
  if (!['verified', 'legacy-pending'].includes(status)) throw Error(`Estado no válido: ${status}`);
  if (status === 'verified' && !evidence.trim()) throw Error(`Falta evidencia: ${domain}`);
  return { brandId, brandName, keywords: keywordText.split("|").filter(Boolean), domain, status, evidence };
});
const brands = new Map();
const seen = new Set();
for (const row of rows) {
  if (seen.has(row.domain)) throw Error(`Dominio duplicado: ${row.domain}`);
  seen.add(row.domain);
  if (!brands.has(row.brandId)) {
    brands.set(row.brandId, { id: row.brandId, name: row.brandName, keywords: row.keywords, domains: [] });
  }
  const brand = brands.get(row.brandId);
  if (brand.name !== row.brandName || JSON.stringify(brand.keywords) !== JSON.stringify(row.keywords)) {
    throw Error(`Marca inconsistente: ${row.brandId}`);
  }
  brand.domains.push(row.domain);
}

const exportPath = resolve(root, "data/official-domains.json");
const oldExport = JSON.parse(readFileSync(exportPath, "utf8"));
const version = process.argv[2] || oldExport.version;
if (Number.isNaN(Date.parse(version))) throw Error(`Versión ISO UTC inválida: ${version}`);
writeFileSync(exportPath, JSON.stringify({ version, brands: [...brands.values()] }, null, 2) + "\n");

const literal = (value) => `'${String(value).replaceAll("'", "''")}'`;
const arrayLiteral = (items) => `ARRAY[${items.map(literal).join(", ")}]::text[]`;
const brandSql = [...brands.values()].map((brand, i) =>
  `(${literal(brand.id)}, ${literal(brand.name)}, ${arrayLiteral(brand.keywords)}, ${i})`).join(",\n  ");
const domainSql = rows.map((row, i) =>
  `(${literal(row.domain)}, ${literal(row.brandId)}, ${literal(row.status)}, ${literal(row.evidence)}, ${i})`).join(",\n  ");
const seed = `-- Generado de data/catalog.tsv; cambios de catálogo requieren revisión por PR.\n` +
  `-- Antes: ejecutar 20261013000100_brand_catalog.sql.\n` +
  `insert into public.brands (id, name, keywords, sort_order) values\n  ${brandSql}\n` +
  `on conflict (id) do update set name = excluded.name, keywords = excluded.keywords, sort_order = excluded.sort_order;\n\n` +
  `insert into public.official_domains (domain, brand_id, review_status, evidence, sort_order) values\n  ${domainSql}\n` +
  `on conflict (domain) do update set brand_id = excluded.brand_id, review_status = excluded.review_status, evidence = excluded.evidence, sort_order = excluded.sort_order;\n`;
// Cada actualización posterior al despliegue inicial crea una migración NUEVA.
const stamp = version.replace(/\D/g, "").slice(0, 14);
const seedName = version === "2026-10-13T00:00:00Z"
  ? "20261013000200_seed_brand_catalog.sql"
  : `${stamp}_seed_brand_catalog.sql`;
writeFileSync(resolve(root, `supabase/migrations/${seedName}`), seed);
console.log(`Catálogo generado: ${brands.size} marcas, ${rows.length} dominios. Versión ${version}.`);
