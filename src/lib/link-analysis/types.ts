/**
 * Tipos compartidos por el analizador de enlaces.
 *
 * Un veredicto nunca afirma que un enlace sea seguro: solo describe las
 * señales encontradas y el nivel de riesgo que suman.
 */
export type RiskLevel = "riesgo" | "precaucion" | "sin-senales";

export type SignalId =
  | "imitacion-marca"
  | "marca-en-subdominio"
  | "caracteres-enganosos"
  | "direccion-numerica"
  | "pide-datos"
  | "archivo-descarga"
  | "otra-web-oculta"
  | "dominio-sospechoso"
  | "enlace-acortado"
  | "palabras-de-presion"
  | "sin-conexion-segura"
  | "subdominios-extranos"
  | "destino-no-responde"
  | "direccion-manipulada"
  | "direccion-muy-larga"
  | "direccion-poco-habitual";

export type SignalSource = "link" | "destination";

export type Signal = {
  id: SignalId;
  title: string;
  explanation: string;
  /** 3 = señal fuerte, 2 = señal media, 1 = detalle poco habitual. */
  weight: 1 | 2 | 3;
  source: SignalSource;
  /** Datos de apoyo para una presentación más precisa (p. ej. qué marca). */
  params?: Record<string, unknown>;
};

/**
 * Coincidencia con un dominio oficial conocido. Un dominio oficial NUNCA
 * implica que el enlace sea seguro: solo informa que la dirección que se
 * analizó coincide con uno de los dominios que esa marca declaró como
 * propios. Lo calcula `allowlist.ts` (ver docs/CONTRATO.md).
 */
export type OfficialMatch = {
  brandId: string;
  brandName: string;
  officialDomains: string[];
};

export type DestinationReason =
  | "unavailable"
  | "blocked-host"
  | "invalid"
  | "unsupported-scheme"
  | "too-long";

export type DestinationCheck = {
  /** false cuando no pudimos comprobar el destino (red, bloqueo o entrada inválida). */
  checked: boolean;
  reason?: DestinationReason;
  reachable?: boolean;
  status?: number;
  finalUrl?: string;
  finalHost?: string;
  redirects?: string[];
  differentHost?: boolean;
  title?: string;
  hasPasswordField?: boolean;
  // --- Campos aditivos del contrato de Fase 2/3 (ver docs/CONTRATO.md) ---
  /** Edad del dominio final en días vía RDAP. `null` = no se pudo saber (neutro, nunca mejora el veredicto). */
  domainAgeDays?: number | null;
  /** Host de `<form action>` cuando difiere del host final. */
  formActionHost?: string | null;
  /** Nombres/ids/autocomplete de campos sensibles encontrados (password, cvv, otp, clave, token, pin). */
  sensitiveFields?: string[];
  /** El HTML parece un cascarón de SPA (poco texto, muchos scripts): no se pudo ver el contenido real. */
  looksLikeJsShell?: boolean;
  /** Qué tan conocido es el dominio FINAL, calculado en el backend (ver supabase/functions/check-link/lib). */
  allowlist?: {
    tier: "official" | "popular" | "none";
    brand?: { id: string; name: string; officialDomains: string[] };
  };
};

/**
 * Estado del destino para la UI, derivado de `DestinationCheck` sin agregar
 * un campo nuevo que pueda desincronizarse de `checked`/`reason`.
 */
export type DestinationStatus =
  | { kind: "pending" }
  | { kind: "checked" }
  | { kind: "unchecked"; reason?: DestinationReason };

export const getDestinationStatus = (
  destination: DestinationCheck | null | undefined,
): DestinationStatus => {
  if (!destination) return { kind: "pending" };
  return destination.checked ? { kind: "checked" } : { kind: "unchecked", reason: destination.reason };
};

export type Verdict = {
  level: RiskLevel;
  score: number;
  signals: Signal[];
  /** Null cuando el dominio analizado no coincide con ninguna marca oficial conocida. */
  officialMatch?: OfficialMatch | null;
};

export type InputErrorKey = "empty" | "noLink" | "scheme" | "tooLong";

export type NormalizedInput =
  | { ok: true; url: string; assumedHttps: boolean }
  | { ok: false; errorKey: InputErrorKey };
