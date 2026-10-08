import { extractUrlCandidate, findDisallowedScheme, stripTrailingPunctuation } from "./extract-url";
import { isIpHost } from "./analyze-url";
import type { NormalizedInput } from "./types";

/** Límite compartido con la función de backend que comprueba el destino. */
export const MAX_URL_LENGTH = 2048;

/**
 * Convierte lo que la persona pegó en una dirección analizable. Acepta textos
 * largos (el mensaje completo) y direcciones sin "https://".
 */
export const normalizeInput = (raw: string): NormalizedInput => {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, errorKey: "empty" };

  if (findDisallowedScheme(trimmed)) return { ok: false, errorKey: "scheme" };

  const candidate = extractUrlCandidate(trimmed);
  if (!candidate) return { ok: false, errorKey: "noLink" };

  const cleaned = stripTrailingPunctuation(candidate);
  const assumedHttps = !/^https?:\/\//i.test(cleaned);
  const withScheme = assumedHttps ? `https://${cleaned}` : cleaned;

  if (withScheme.length > MAX_URL_LENGTH) return { ok: false, errorKey: "tooLong" };

  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, errorKey: "scheme" };
    }
    if (!parsed.hostname.includes(".") && !isIpHost(parsed.hostname)) {
      return { ok: false, errorKey: "noLink" };
    }
    return { ok: true, url: parsed.toString(), assumedHttps };
  } catch {
    return { ok: false, errorKey: "noLink" };
  }
};
