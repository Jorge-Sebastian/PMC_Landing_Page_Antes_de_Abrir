import type { Signal, SignalId, SignalSource } from "./types";

/**
 * Catálogo de señales con el texto que ve la persona usuaria.
 *
 * El texto vive aquí y no en los ficheros de idioma porque los identificadores
 * son dinámicos: el proyecto i18n de la plantilla exige claves literales.
 */
type SignalDefinition = Omit<Signal, "id" | "source">;

export const SIGNAL_LIBRARY: Record<SignalId, SignalDefinition> = {
  "imitacion-marca": {
    title: "Posible imitación de una página conocida",
    explanation:
      "Aparece el nombre de una empresa, un banco o una red social conocida, pero la dirección real no es la suya.",
    weight: 3,
  },
  "marca-en-subdominio": {
    title: "La marca aparece en el subdominio, no en el sitio real",
    explanation:
      "El nombre de una empresa, un banco o una red social conocida aparece como parte del subdominio, pero el sitio al que lleva de verdad es otro distinto.",
    weight: 3,
  },
  "caracteres-enganosos": {
    title: "Uso de caracteres engañosos",
    explanation:
      "La dirección usa letras o símbolos parecidos a otros para confundirte, por ejemplo cambiando una letra por un número.",
    weight: 3,
  },
  "direccion-numerica": {
    title: "Dirección numérica en lugar de un nombre",
    explanation:
      "El enlace usa números en lugar del nombre del sitio. Es algo habitual en páginas fraudulentas.",
    weight: 3,
  },
  "pide-datos": {
    title: "El enlace menciona contraseñas o datos bancarios",
    explanation:
      "La dirección incluye palabras relacionadas con contraseñas, cuentas o datos de tu banco o de tu tarjeta.",
    weight: 3,
  },
  "archivo-descarga": {
    title: "El enlace descarga un archivo",
    explanation:
      "El enlace termina en un archivo que se instalaría en tu teléfono o en tu computadora.",
    weight: 3,
  },
  "otra-web-oculta": {
    title: "Lleva a otra web distinta",
    explanation:
      "Al abrir el enlace se llega a un sitio diferente al que muestra la dirección escrita.",
    weight: 3,
  },
  "dominio-sospechoso": {
    title: "Dominio sospechoso",
    explanation:
      "La terminación de la dirección se usa con mucha frecuencia en páginas falsas.",
    weight: 2,
  },
  "enlace-acortado": {
    title: "Enlace acortado",
    explanation:
      "Es un enlace corto: no se puede ver a qué sitio lleva de verdad hasta abrirlo.",
    weight: 2,
  },
  "palabras-de-presion": {
    title: "Palabras que buscan alarmarte o prometerte algo",
    explanation:
      "El enlace usa palabras como «bloqueado», «urgente», «premio» o «suspendido», muy típicas de los mensajes fraudulentos.",
    weight: 2,
  },
  "sin-conexion-segura": {
    title: "Conexión no segura",
    explanation:
      "El enlace no empieza por https://, así que la información que enviaras viajaría sin protección.",
    weight: 2,
  },
  "subdominios-extranos": {
    title: "Dirección con demasiadas partes",
    explanation:
      "La dirección tiene muchos tramos antes del nombre principal. Es una forma habitual de imitar a un sitio conocido.",
    weight: 2,
  },
  "destino-no-responde": {
    title: "El sitio de destino no responde bien",
    explanation:
      "Al comprobar el destino, el sitio contestó con un error o ya no está disponible.",
    weight: 2,
  },
  "direccion-manipulada": {
    title: "Dirección manipulada",
    explanation:
      "La dirección esconde a dónde va de verdad, con símbolos como «@» o con datos que redirigen a otro sitio.",
    weight: 2,
  },
  "direccion-muy-larga": {
    title: "Dirección muy larga y difícil de leer",
    explanation:
      "La dirección es inusualmente larga o está llena de símbolos, algo poco común en los sitios oficiales.",
    weight: 1,
  },
  "direccion-poco-habitual": {
    title: "Dirección poco habitual",
    explanation:
      "La dirección mezcla muchos guiones, números o palabras raras, algo que casi nunca aparece en un sitio oficial.",
    weight: 1,
  },
  "dominio-nuevo": {
    title: "El dominio se registró hace muy poco",
    explanation:
      "El sitio al que lleva este enlace se registró hace menos de un mes. Los sitios fraudulentos suelen usar dominios recién creados que se abandonan después de la campaña.",
    // Peso bajo a propósito: un dominio nuevo por sí solo nunca pasa de
    // "precaución" (podría ser un negocio real recién lanzado). Solo sube a
    // "riesgo" combinado con otra señal fuerte (p. ej. imitación de marca),
    // que ya alcanza ese nivel por su cuenta.
    weight: 2,
  },
};

export const createSignal = (id: SignalId, source: SignalSource = "link"): Signal => ({
  id,
  source,
  ...SIGNAL_LIBRARY[id],
});
