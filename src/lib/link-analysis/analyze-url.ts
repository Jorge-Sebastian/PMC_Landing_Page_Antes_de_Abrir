/**
 * Reglas que se evalúan sobre la dirección escrita del enlace, sin salir del
 * dispositivo: no se abre nada y no se envía nada a ningún servidor.
 */
import { parse as parseHost } from "tldts";

import {
  BRANDS,
  COMMERCIAL_PRESSURE_WORDS,
  DOWNLOAD_EXTENSIONS,
  REDIRECT_PARAMS,
  SENSITIVE_WORDS,
  STRONG_PRESSURE_WORDS,
  SUSPICIOUS_TLDS,
  URL_SHORTENERS,
} from "./brands";
import { createSignal } from "./signals";
import type { Signal, SignalId } from "./types";

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

export const isIpHost = (host: string): boolean => IPV4.test(host.replace(/^\[|\]$/g, ""));

const decodeSafely = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export type HostParts = {
  core: string;
  suffix: string;
  subdomains: string[];
  registrable: string;
};

/**
 * Separa el host usando la Public Suffix List real (vía `tldts`), con
 * dominios privados activados: `x.web.app` y `y.github.io` cuentan como
 * dominios registrables distintos entre sí, no como "un subdominio de
 * web.app/github.io". Antes esto se hacía con una lista manual de sufijos
 * de dos partes (`com.ar`, `co.uk`...) que no cubría la mayoría de los
 * ccTLD reales ni el hosting gratuito.
 */
export const splitHost = (host: string): HostParts => {
  if (isIpHost(host)) {
    return { core: host, suffix: "", subdomains: [], registrable: host };
  }
  const parsed = parseHost(host, { allowPrivateDomains: true });
  const registrable = parsed.domain ?? host;
  const suffix = parsed.publicSuffix ?? "";
  const core =
    suffix && registrable.length > suffix.length
      ? registrable.slice(0, registrable.length - suffix.length - 1)
      : registrable;
  const subdomains = (parsed.subdomain ?? "").split(".").filter(Boolean);
  return { core, suffix, subdomains, registrable };
};

/** Un dominio oficial conocido nunca se marca como imitación. */
export const isOfficialHost = (host: string): boolean =>
  BRANDS.some((brand) => brand.domains.some((domain) => host === domain || host.endsWith(`.${domain}`)));

const levenshtein = (left: string, right: string): number => {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let lastDiagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const current = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        lastDiagonal + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
      lastDiagonal = current;
    }
  }
  return previous[right.length];
};

/** Pares de caracteres que se usan para imitar visualmente a otro. */
const CONFUSABLE_DIGRAPHS: Array<[RegExp, string]> = [
  [/rn/g, "m"],
  [/vv/g, "w"],
];

/** Dígitos/símbolos que suelen reemplazar a una letra parecida. */
const CONFUSABLE_LEET_MAP: Record<string, string> = {
  "0": "o",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
};

/**
 * Variantes de un token tras deshacer sustituciones visuales típicas
 * (`0`→`o`, `rn`→`m`, `vv`→`w`, y `1` que puede representar tanto `l` como
 * `i`). Solo transforma los caracteres que de verdad aparecen en el token:
 * una palabra sin dígitos ni "rn"/"vv" sale sin cambios, así que nunca se
 * inventan coincidencias con palabras comunes que ya se escriben con
 * l/i/o normales (ese era el bug de la versión anterior, basada en
 * Levenshtein sin restricciones).
 */
const confusableVariants = (token: string): string[] => {
  let base = token;
  for (const [pattern, replacement] of CONFUSABLE_DIGRAPHS) base = base.replace(pattern, replacement);
  const mapped = base
    .split("")
    .map((char) => CONFUSABLE_LEET_MAP[char] ?? char)
    .join("");
  if (!mapped.includes("1")) return [mapped];
  return [mapped.replace(/1/g, "l"), mapped.replace(/1/g, "i")];
};

export type BrandMatchKind = "exact" | "confusable" | "levenshtein";

/**
 * ¿Este token cuenta como la misma palabra que la marca? En orden:
 * 1. Coincidencia exacta.
 * 2. Exacta tras normalizar confusables (`paypa1` → `paypal`).
 * 3. Como último recurso, una coincidencia aproximada MUY restringida:
 *    distancia de Levenshtein exactamente 1, solo para tokens de 6+ letras,
 *    y solo si token y marca comparten la primera letra. Esto evita que una
 *    palabra común del idioma (`looking`) choque con una marca (`booking`)
 *    por pura casualidad de edición — nunca se acepta distancia 2.
 */
const matchKeyword = (token: string, keyword: string): BrandMatchKind | null => {
  if (!token || !keyword) return null;
  if (token === keyword) return "exact";
  if (confusableVariants(token).includes(keyword)) return "confusable";
  if (
    token.length >= 6 &&
    token[0] === keyword[0] &&
    Math.abs(token.length - keyword.length) <= 1 &&
    levenshtein(token, keyword) === 1
  ) {
    return "levenshtein";
  }
  return null;
};

/**
 * Tokeniza por dos vías combinadas: una conserva los dígitos pegados a la
 * palabra (para detectar sustituciones tipo `amaz0n`→`amazon` vía
 * confusables), la otra corta también por dígitos (para separar una marca
 * de un sufijo o prefijo numérico, p. ej. `paypal2024` → `paypal`).
 */
const tokenize = (value: string): string[] => {
  const lower = value.toLowerCase();
  const withDigits = lower.split(/[^a-z0-9]+/).filter((token) => token.length >= 3);
  const alphaOnly = lower.split(/[^a-z]+/).filter((token) => token.length >= 3);
  return [...new Set([...withDigits, ...alphaOnly])];
};

export type BrandMatchOrigin = "core" | "subdomain" | "path";

export type BrandMatch = {
  brandName: string;
  keyword: string;
  origin: BrandMatchOrigin;
  kind: BrandMatchKind;
};

/**
 * Detecta si la dirección se hace pasar por una empresa o banco conocido.
 * Revisa el dominio (`core`), el subdominio y la ruta por separado: una
 * coincidencia en el dominio es la más grave (`imitacion-marca`); una
 * coincidencia solo en el subdominio es el patrón "marca.com.sitio-falso.xyz"
 * (`marca-en-subdominio`, en analyzeLink); una coincidencia solo en la ruta
 * sigue contando como `imitacion-marca` hoy, aunque es la más propensa a
 * falsos positivos (p. ej. un artículo de noticias que menciona la marca en
 * el slug) — ver limitación conocida en docs/CHANGELOG-algoritmo.md.
 */
export const findBrandMatch = (
  core: string,
  subdomains: string[],
  pathAndQuery: string,
): BrandMatch | null => {
  const tokensByOrigin: Array<[BrandMatchOrigin, string[]]> = [
    ["core", tokenize(core)],
    ["subdomain", tokenize(subdomains.join("-"))],
    ["path", tokenize(pathAndQuery)],
  ];

  for (const brand of BRANDS) {
    for (const keyword of brand.keywords) {
      const normalized = keyword.replace(/\s+/g, "");
      for (const [origin, tokens] of tokensByOrigin) {
        for (const token of tokens) {
          const kind = matchKeyword(token, normalized);
          if (kind) return { brandName: brand.name, keyword, origin, kind };
        }
      }
    }
  }
  return null;
};

export const analyzeLink = (url: URL): Signal[] => {
  const host = url.hostname.toLowerCase();
  const { core, suffix, subdomains, registrable } = splitHost(host);
  const pathAndQuery = decodeSafely(`${url.pathname} ${url.search}`).toLowerCase();
  const haystack = `${host} ${pathAndQuery}`;
  const found = new Set<SignalId>();
  const ipHost = isIpHost(host);

  if (ipHost) {
    found.add("direccion-numerica");
  }

  if (host.includes("xn--") || /[^\u0020-\u007e]/.test(host)) {
    found.add("caracteres-enganosos");
  }

  // Las reglas de estructura del dominio no se aplican a direcciones numéricas:
  // una dirección IP siempre tiene varias partes y no imita a ninguna marca.
  const brandMatch = !ipHost && !isOfficialHost(host) ? findBrandMatch(core, subdomains, pathAndQuery) : null;
  if (brandMatch) {
    found.add(brandMatch.origin === "subdomain" ? "marca-en-subdominio" : "imitacion-marca");
    // Solo si la coincidencia dependió de deshacer una sustitución visual
    // (amaz0n, g00gle...) cuenta también como "caracteres engañosos": una
    // marca exacta con dígitos de fábrica (faceb00k, ya catalogada así en
    // brands.ts) no necesita esta señal extra, la de imitación ya alcanza.
    if (brandMatch.kind === "confusable") {
      found.add("caracteres-enganosos");
    }
  }

  if (SUSPICIOUS_TLDS.has(suffix.split(".").pop() ?? "")) {
    found.add("dominio-sospechoso");
  }

  if (URL_SHORTENERS.has(registrable) || URL_SHORTENERS.has(host)) {
    found.add("enlace-acortado");
  }

  if (STRONG_PRESSURE_WORDS.some((word) => haystack.includes(word))) {
    found.add("palabras-de-presion");
  }

  const lastSegment = url.pathname.split("/").filter(Boolean).pop() ?? "";
  const extension = lastSegment.includes(".") ? lastSegment.split(".").pop()!.toLowerCase() : "";
  if (DOWNLOAD_EXTENSIONS.includes(extension)) {
    found.add("archivo-descarga");
  }

  if (url.protocol === "http:") {
    found.add("sin-conexion-segura");
  }

  if (!ipHost && subdomains.length >= 2) {
    found.add("subdominios-extranos");
  }

  const hiddenRedirect = [...url.searchParams.entries()].some(
    ([key, value]) => REDIRECT_PARAMS.includes(key.toLowerCase()) && /^https?:\/\//i.test(value),
  );
  const unusualPort = Boolean(url.port) && url.port !== "80" && url.port !== "443";
  if (Boolean(url.username) || unusualPort || hiddenRedirect) {
    found.add("direccion-manipulada");
  }

  const encodedCount = (url.href.match(/%[0-9a-f]{2}/gi) ?? []).length;
  if (url.href.length > 120 || encodedCount >= 6) {
    found.add("direccion-muy-larga");
  }

  const hyphenCount = (core.match(/-/g) ?? []).length;
  const digitCount = (core.match(/\d/g) ?? []).length;
  if (!ipHost && (core.length > 30 || hyphenCount >= 3 || digitCount >= 5)) {
    found.add("direccion-poco-habitual");
  }

  // Ambas reglas se evalúan al final, con la misma lógica: una palabra de
  // comercio normal o una mención a contraseñas/datos no es una señal por sí
  // sola (una tienda o un banco reales también las usan), solo cuentan junto
  // a algo ya sospechoso.
  if (found.size > 0 && COMMERCIAL_PRESSURE_WORDS.some((word) => haystack.includes(word))) {
    found.add("palabras-de-presion");
  }

  if (found.size > 0 && SENSITIVE_WORDS.some((word) => haystack.includes(word))) {
    found.add("pide-datos");
  }

  return [...found]
    .map((id) => createSignal(id))
    .sort((left, right) => right.weight - left.weight);
};
