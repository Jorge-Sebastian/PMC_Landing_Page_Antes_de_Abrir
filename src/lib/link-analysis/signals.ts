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
  // Peso bajado de 3 a 2 en el Paso 4 (2026-10-11, reports/candidatas-paso3c.md):
  // de 78 redirecciones reales en entrenamiento, 10 eran solo diferencias de
  // www/apex o saltos entre dos dominios oficiales de la misma marca (esas
  // 10 se filtran antes de llegar aquí, ver build-verdict.ts) y de las 68
  // restantes solo 3 eran phishing real — muy pocas para justificar que esta
  // señal baste por sí sola para "riesgo" (peso 3). Con peso 2 sigue
  // combinando con cualquier otra señal para llegar a "riesgo".
  "otra-web-oculta": {
    title: "Lleva a otra web distinta",
    explanation:
      "Al abrir el enlace se llega a un sitio diferente al que muestra la dirección escrita.",
    weight: 2,
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
  // Desde el hallazgo de coordinadora.com (2026-10-11): esta señal solo
  // suma su peso cuando ya hay otra señal presente (misma lógica que
  // "pide-datos"). Un error HTTP real aislado, sin nada más, se muestra
  // como "destino-error-aislado" (peso 0) en vez de esta.
  "destino-no-responde": {
    title: "El sitio de destino no responde bien",
    explanation:
      "Al comprobar el destino, el sitio contestó con un error o ya no está disponible.",
    weight: 2,
  },
  // Mismo error HTTP que "destino-no-responde", pero SIN ninguna otra señal
  // alrededor: muchos sitios reales (grandes o chicos) devuelven un error
  // al bot de la comprobación sin que eso signifique nada. Peso 0 a
  // propósito: nota informativa, nunca mejora ni empeora el veredicto.
  "destino-error-aislado": {
    title: "El sitio respondió con un error al comprobarlo",
    explanation:
      "Algunos sitios grandes rechazan las visitas automáticas; por sí solo no indica riesgo.",
    weight: 0,
  },
  // Hallazgo de la prueba en producción (g2.com): un sitio real puede
  // bloquear la visita automática (403, 429...) y eso no es, por sí solo,
  // una señal de fraude. Antes se confundía con "destino-no-responde"
  // (peso 2). Peso 0 a propósito: es una nota informativa, nunca mejora ni
  // empeora el veredicto.
  "destino-verificacion-bloqueada": {
    title: "El sitio no permitió la comprobación automática",
    explanation: "Es común en sitios grandes y no indica riesgo por sí solo.",
    weight: 0,
  },
  // Caso distinto al anterior: aquí no hubo ninguna respuesta (el nombre
  // no existe, la conexión fue rechazada o se agotó el tiempo de espera),
  // no un error HTTP real. Peso bajo (1): es un detalle a tener en cuenta,
  // no una señal fuerte por sí sola.
  "destino-inalcanzable": {
    title: "No se pudo contactar al sitio de destino",
    explanation:
      "No llegó ninguna respuesta del sitio (el nombre no existe o la conexión fue rechazada). Puede ser un problema pasajero, pero también es habitual en enlaces que ya no funcionan.",
    weight: 1,
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
  // Las 3 señales siguientes se agregaron en el Paso 4 (2026-10-11) tras
  // sobrevivir la validación cruzada del Paso 3
  // (reports/candidatas-paso3c.md). El peso salió de una regresión
  // logística sobre entrenamiento (scripts/eval/fit-weights.ts), topado a
  // propósito en 2 (nunca fuerza "riesgo" solo) por pedido explícito: el
  // banco de legítimos de hosting gratuito tiene solo 22 ejemplos, muy poco
  // para confiar en un peso más alto sin arriesgar sobreajuste.
  "hosting-gratuito": {
    title: "El sitio vive en un servicio de hosting gratuito",
    explanation:
      "La dirección no es un dominio propio: vive dentro de un servicio gratuito de terceros (como vercel.app, netlify.app o github.io), algo frecuente en páginas fraudulentas armadas rápido.",
    weight: 2,
  },
  // Caso de "netflixcol.vercel.app": el nombre de una marca conocida pegado
  // al inicio de una palabra más larga, en un dominio que no es oficial de
  // esa marca. El peso de la regresión salió inestable (solo 8 ejemplos
  // positivos en todo el entrenamiento) — se revisó cada caso a mano
  // (ver reports/final-paso4.md) antes de fijar el peso en 2.
  "marca-al-inicio-de-token": {
    title: "El nombre de una marca aparece pegado a otra palabra",
    explanation:
      "La dirección empieza con el nombre de una empresa conocida pegado a otro texto (por ejemplo «netflixcol»), en un dominio que no es el oficial de esa marca.",
    weight: 2,
  },
  // Campo de contraseña en un dominio sin reputación (hosting gratuito o
  // registrado hace menos de 30 días). Control de fuga: solo se calcula
  // cuando el destino sí respondió — una página caída nunca "tiene" ni "no
  // tiene" contraseña.
  "contrasena-sin-reputacion": {
    title: "Pide una contraseña en un sitio sin antecedentes",
    explanation:
      "La página pide una contraseña, pero el sitio vive en un hosting gratuito o se registró hace muy poco — ninguna de las dos cosas es normal en un inicio de sesión real.",
    weight: 2,
  },
};

export const createSignal = (id: SignalId, source: SignalSource = "link"): Signal => ({
  id,
  source,
  ...SIGNAL_LIBRARY[id],
});
