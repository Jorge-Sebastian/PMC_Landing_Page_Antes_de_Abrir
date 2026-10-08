/**
 * Reglas que se evalúan sobre la dirección escrita del enlace, sin salir del
 * dispositivo: no se abre nada y no se envía nada a ningún servidor.
 */
import {
  BRANDS,
  DOWNLOAD_EXTENSIONS,
  PRESSURE_WORDS,
  REDIRECT_PARAMS,
  SENSITIVE_WORDS,
  SUSPICIOUS_TLDS,
  URL_SHORTENERS,
} from "./brands";
import { createSignal } from "./signals";
import type { Signal, SignalId } from "./types";

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/** Sufijos de dominio que ocupan dos etiquetas (por ejemplo .com.ar). */
const MULTI_PART_SUFFIXES = new Set([
  "com.ar",
  "com.br",
  "com.mx",
  "com.co",
  "com.pe",
  "com.ec",
  "com.uy",
  "com.ve",
  "com.bo",
  "com.py",
  "com.do",
  "com.gt",
  "com.sv",
  "com.hn",
  "com.ni",
  "com.pa",
  "com.cr",
  "com.es",
  "co.uk",
  "co.nz",
  "org.uk",
  "com.au",
]);

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

/** Separa el host en "nombre principal", terminación y tramos anteriores. */
export const splitHost = (host: string): HostParts => {
  const labels = host.split(".").filter(Boolean);
  if (labels.length <= 1) {
    return { core: labels[0] ?? "", suffix: "", subdomains: [], registrable: host };
  }
  const lastTwo = labels.slice(-2).join(".");
  const suffix = MULTI_PART_SUFFIXES.has(lastTwo) ? lastTwo : labels[labels.length - 1];
  const suffixLength = suffix.split(".").length;
  const core = labels.slice(0, -suffixLength).pop() ?? "";
  const subdomains = labels.slice(0, Math.max(0, labels.length - suffixLength - 1));
  const registrable = core ? `${core}.${suffix}` : suffix;
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

/** ¿El texto se parece lo suficiente a la palabra de una marca conocida? */
const looksLikeKeyword = (value: string, keyword: string): boolean => {
  if (!value || value === keyword) return value === keyword;
  if (value.includes(keyword)) return true;
  if (keyword.length < 4 || Math.abs(value.length - keyword.length) > 2) return false;
  return levenshtein(value, keyword) <= 2;
};

const brandTokens = (value: string) =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);

/** Detecta si la dirección se hace pasar por una empresa o banco conocido. */
export const detectBrandImitation = (
  core: string,
  subdomains: string[],
  pathAndQuery: string,
): boolean => {
  const coreTokens = brandTokens(core);
  const extraTokens = brandTokens(`${subdomains.join("-")}-${pathAndQuery}`);

  return BRANDS.some((brand) =>
    brand.keywords.some((keyword) => {
      const normalized = keyword.replace(/\s+/g, "");
      if (coreTokens.some((token) => token === normalized || looksLikeKeyword(token, normalized))) {
        return true;
      }
      return extraTokens.some((token) => token === normalized);
    }),
  );
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

  if (
    host.includes("xn--") ||
    /[^\u0020-\u007e]/.test(host) ||
    (!ipHost && /[a-z]\d+[a-z]/i.test(core))
  ) {
    found.add("caracteres-enganosos");
  }

  // Las reglas de estructura del dominio no se aplican a direcciones numéricas:
  // una dirección IP siempre tiene varias partes y no imita a ninguna marca.
  if (!ipHost && !isOfficialHost(host) && detectBrandImitation(core, subdomains, pathAndQuery)) {
    found.add("imitacion-marca");
  }

  if (SUSPICIOUS_TLDS.has(suffix.split(".").pop() ?? "")) {
    found.add("dominio-sospechoso");
  }

  if (URL_SHORTENERS.has(registrable) || URL_SHORTENERS.has(host)) {
    found.add("enlace-acortado");
  }

  if (PRESSURE_WORDS.some((word) => haystack.includes(word))) {
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

  // Se evalúa al final: mencionar contraseñas o datos no es una señal por sí
  // solo (un banco real también lo hace), solo junto a algo más sospechoso.
  if (found.size > 0 && SENSITIVE_WORDS.some((word) => haystack.includes(word))) {
    found.add("pide-datos");
  }

  return [...found]
    .map((id) => createSignal(id))
    .sort((left, right) => right.weight - left.weight);
};
