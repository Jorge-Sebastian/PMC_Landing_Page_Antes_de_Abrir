/**
 * Fuente de dominios oficiales conocidos, usada para el estado informativo
 * "dominio oficial" (nunca significa "seguro", solo que la dirección
 * coincide con un dominio que esa marca declaró como propio).
 *
 * Esta implementación es temporal: envuelve `brands.ts` para que nada se
 * rompa hoy. Martín la sustituirá por una fuente generada desde la base de
 * datos — ver docs/handoff/MARTIN-allowlist.md y el esquema de
 * `data/official-domains.json` en docs/CONTRATO.md. El resto del motor solo
 * depende de la interfaz `OfficialDomainsSource`, no de esta clase.
 */
import { BRANDS } from "./brands";
import type { OfficialMatch } from "./types";

export type BrandEntry = {
  id: string;
  name: string;
  keywords: string[];
  domains: string[];
};

export interface OfficialDomainsSource {
  /** Versión de los datos, para que el reporte/los logs puedan citarla. */
  version: string;
  /**
   * ¿El dominio REGISTRABLE (ya reducido por la Public Suffix List, p. ej.
   * "paypal.com", no "www.paypal.com" ni "paypal") es uno de los oficiales
   * de alguna marca conocida? Comparación siempre exacta contra la lista de
   * dominios de la marca — nunca `includes`/`endsWith` sobre texto libre.
   */
  findOfficial(registrableDomain: string): OfficialMatch | null;
  /** Catálogo completo, para la detección de imitación de marca. */
  brands(): BrandEntry[];
}

const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

class StaticAllowlist implements OfficialDomainsSource {
  version = "static-brands.ts@1";

  brands(): BrandEntry[] {
    return BRANDS.map((brand) => ({
      id: slugify(brand.name),
      name: brand.name,
      keywords: brand.keywords,
      domains: brand.domains,
    }));
  }

  findOfficial(registrableDomain: string): OfficialMatch | null {
    const domain = registrableDomain.toLowerCase();
    for (const brand of BRANDS) {
      if (brand.domains.includes(domain)) {
        return { brandId: slugify(brand.name), brandName: brand.name, officialDomains: brand.domains };
      }
    }
    return null;
  }
}

export const officialDomainsSource: OfficialDomainsSource = new StaticAllowlist();
