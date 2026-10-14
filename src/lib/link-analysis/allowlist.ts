/**
 * Catálogo local versionado. Se exporta de la tabla Supabase y se incluye
 * en el build para que el análisis estático funcione incluso sin conexión.
 * "Oficial" es informativo, nunca equivale a "seguro".
 */
import catalog from "../../../data/official-domains.json";
import type { OfficialMatch } from "./types";

export type BrandEntry = {
  id: string;
  name: string;
  keywords: string[];
  domains: string[];
};

export interface OfficialDomainsSource {
  version: string;
  findOfficial(registrableDomain: string): OfficialMatch | null;
  brands(): BrandEntry[];
}

class ExportedAllowlist implements OfficialDomainsSource {
  readonly version = catalog.version;
  private readonly entries: BrandEntry[] = catalog.brands;
  private readonly byDomain = new Map<string, BrandEntry>(
    this.entries.flatMap((brand) => brand.domains.map((domain) => [domain, brand] as const)),
  );

  brands(): BrandEntry[] {
    return this.entries.map((brand) => ({ ...brand, keywords: [...brand.keywords], domains: [...brand.domains] }));
  }

  findOfficial(registrableDomain: string): OfficialMatch | null {
    const brand = this.byDomain.get(registrableDomain.toLowerCase());
    return brand
      ? { brandId: brand.id, brandName: brand.name, officialDomains: [...brand.domains] }
      : null;
  }
}

export const officialDomainsSource: OfficialDomainsSource = new ExportedAllowlist();
