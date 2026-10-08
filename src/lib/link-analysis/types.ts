/**
 * Tipos compartidos por el analizador de enlaces.
 *
 * Un veredicto nunca afirma que un enlace sea seguro: solo describe las
 * señales encontradas y el nivel de riesgo que suman.
 */
export type RiskLevel = "riesgo" | "precaucion" | "sin-senales";

export type SignalId =
  | "imitacion-marca"
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
};

export type Verdict = {
  level: RiskLevel;
  score: number;
  signals: Signal[];
};

export type InputErrorKey = "empty" | "noLink" | "scheme" | "tooLong";

export type NormalizedInput =
  | { ok: true; url: string; assumedHttps: boolean }
  | { ok: false; errorKey: InputErrorKey };
