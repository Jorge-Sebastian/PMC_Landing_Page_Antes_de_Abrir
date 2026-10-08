/**
 * Extrae el enlace de un texto pegado, que en la práctica suele ser el mensaje
 * completo de WhatsApp, SMS o Instagram copiado sin abrir nada.
 */
const SCHEME_PATTERN = /([a-z][a-z0-9+.-]*):\/\/\S+/i;
const HTTP_URL_PATTERN = /https?:\/\/[^\s<>"'`]+/i;
const BARE_DOMAIN_PATTERN =
  /(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d{2,5})?(?:[/?#][^\s<>"'`]*)?/i;

/** Devuelve el esquema encontrado cuando no es http o https (ftp, javascript…). */
export const findDisallowedScheme = (text: string): string | null => {
  const match = text.match(SCHEME_PATTERN);
  if (!match) return null;
  const scheme = match[1].toLowerCase();
  return scheme === "http" || scheme === "https" ? null : scheme;
};

export const extractUrlCandidate = (text: string): string | null => {
  const withScheme = text.match(HTTP_URL_PATTERN);
  if (withScheme) return withScheme[0];
  const bare = text.match(BARE_DOMAIN_PATTERN);
  return bare ? bare[0] : null;
};

/** Quita la puntuación que suele arrastrar un enlace al final de una frase. */
export const stripTrailingPunctuation = (value: string): string =>
  value.replace(/[.,;:!?)\]}>"'`]+$/g, "");
