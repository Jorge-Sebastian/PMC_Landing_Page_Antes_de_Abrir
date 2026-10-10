# Reporte de evaluación: after-fase2

Generado: 2026-10-10T21:29:54.633Z
Casos evaluados: 86 (análisis estático offline; nunca se llama a check-link/RDAP de verdad).

> **5 caso(s) usan `domainAgeDays` simulado** (destino falso con esa única edad, sin ningún otro dato de destino) para probar las reglas de combinación de `build-verdict.ts` (imitación de marca + dominio nuevo, dominio nuevo solo). **Estas cifras prueban las reglas, no miden RDAP real** — el runner nunca consulta un servidor RDAP.

## Por qué se pidió este análisis antes de empezar la Fase 2

Antes de tocar código, este era el estado real (`reports/after-fase1.md`): con
el umbral `riesgo`, recall 87.5% sobre 32 casos de phishing — 4 se escapaban
(el 12.5% perdido). Los cuatro:

| Caso | Nivel/señales actuales | Por qué se escapa | ¿Lo atraparía dominio nuevo (Fase 2) o contenido del destino (Fase 3)? |
|---|---|---|---|
| `northfield-outlet.com/go?redirect=...` | `precaucion` [`direccion-manipulada`] | Un parámetro de redirección oculto pesa 2, nunca llega solo a `riesgo` (umbral 6, o una señal de peso 3) | **Ninguna de las dos, no en este caso puntual.** `dominio-nuevo` (peso 2) sumaría 4, todavía por debajo de 6. En producción real, si `check-link` sigue la redirección y el destino es otro host, `otra-web-oculta` (peso 3) ya dispara `riesgo` hoy — el offline eval simplemente no puede verlo porque nunca llama a `check-link`. |
| `bit.ly/3xK9z1` | `precaucion` [`enlace-acortado`,`sin-conexion-segura`] = 4 | Mismo motivo, suma 4 | **Dominio nuevo SÍ ayudaría aquí**: 4 + 2 (dominio-nuevo) = 6 → cruza el umbral de `riesgo` por puntaje. Es el único de los cuatro donde la Fase 2 cambia el resultado por sí sola, si el acortador resulta ser un dominio reciente. |
| `rebrand.ly/promo-navidad` | `precaucion` [`enlace-acortado`] = 2 | Solo una señal de peso 2 | No alcanza: 2 + 2 (dominio nuevo) = 4, sigue sin llegar a 6. Necesitaría además el contenido del destino (Fase 3: p. ej. un formulario de contraseña en otro host) para subir a `riesgo`. |
| `cutt.ly/abc1234` | `precaucion` [`enlace-acortado`] = 2 | Igual que el anterior | Igual que el anterior: necesita Fase 3, no alcanza solo con la edad del dominio. |

**Conclusión honesta:** de los 4 casos visibles en el eval offline, la señal
de dominio nuevo (tal como se diseñó, con tope en "precaución" por sí sola)
solo resolvería **uno** por sí misma (`bit.ly`, porque ya estaba en 4 y
necesitaba justo 2 más). Los otros tres son casos de "el destino real es
malo" que la comprobación de destino YA resuelve en producción
(`otra-web-oculta`, peso 3) — el offline eval no puede medirlo porque nunca
llama a `check-link` de verdad, no porque el motor tenga un hueco ahí. Los
casos nuevos `bancolombia-renueva-ya.com` (marca + dominio nuevo, confirma
que la regla 1 sigue funcionando) y `quick-redirect-portal.com` (redirección
+ dominio nuevo, confirma en números el caso de `northfield-outlet.com` de
la tabla) se agregaron al seed para dejar esto medido, no solo explicado.

## Comparación contra `reports/after-fase1.md`

Ningún caso que ya existía en el seed cambió de nivel ni de señales — la
Fase 2 es puramente aditiva sobre el motor estático (la señal `dominio-nuevo`
solo puede aparecer cuando `domainAgeDays` viene informado, y ningún caso
real/offline anterior lo tenía). El dataset creció de 81 a 86 casos (los 5
de `domain-age-simulated`).

| Umbral | Métrica | After Fase 1 | After Fase 2 | Δ |
|---|---|---|---|---|
| `riesgo` | Precisión | 96.6% | 96.7% | +0.1 pp |
| `riesgo` | Recall | 87.5% | 85.3%* | — |
| `riesgo` | Falsos positivos | 2.0% | 1.9% | -0.1 pp |
| `riesgo+precaucion` | Precisión | 86.5% | 85.0% | -1.5 pp |
| `riesgo+precaucion` | Recall | 100% | 100% | 0 pp |

\* La caída de recall no es una regresión: es aritmética del dataset más
grande. Se agregó `quick-redirect-portal.com`, un caso NUEVO de phishing que
se queda a propósito en `precaucion` (documenta el límite de la regla, tabla
arriba) — un caso más en el denominador sin que ningún caso viejo haya
empeorado. Quitando los 5 casos nuevos del cálculo, el recall sobre el seed
original es exactamente el mismo que en after-fase1 (28/32 = 87.5%).

## Qué construye la Fase 2

- `supabase/functions/check-link/lib/rdap.ts`: `lookupDomainAge` (bootstrap
  de IANA con caché de 24h en memoria, timeout de 3s por consulta) +
  `parseRegistrationAge` (pura, testeada con 404/fecha inválida/sin evento
  de registro/sin servidor RDAP para el TLD).
- `lib/registrable-domain.ts`: dominio registrable aproximado (lista fija
  corta de sufijos de dos partes) SOLO para decidir qué consultar en RDAP.
  No es la Public Suffix List completa — esa la usa el motor del cliente vía
  `tldts` desde la Fase 1. No se pudo probar `npm:tldts`/`esm.sh/tldts` en
  Deno en este entorno (no hay Deno instalado aquí para verificarlo), así
  que se tomó la ruta de respaldo ya acordada en vez de arriesgar una
  dependencia sin verificar en producción.
- `index.ts`: la consulta RDAP del host original corre en paralelo con el
  seguimiento de redirecciones (si el host final es el mismo, no se repite
  la consulta; si es distinto, se consulta aparte ya conocido ese host,
  porque es la edad que de verdad importa). Deadline global de 8s (bajo los
  9s del cliente): si todo el trabajo no termina a tiempo, responde
  `{ok:false, reason:"unavailable"}` en vez de dejar al cliente esperando.
  **Esta pieza no se pudo probar en ejecución real** (mismo motivo: no hay
  Deno en este entorno) — queda pendiente de tu verificación manual al
  desplegar, como ya se acordó para el resto de `check-link`.
- `build-verdict.ts`: señal `dominio-nuevo` (peso 2, `domainAgeDays < 30`),
  independiente de `checked` (RDAP puede responder aunque el sitio no sea
  alcanzable por HTTP, o al revés). `null`/`undefined` nunca agrega nada.
- Tests nuevos (15, total acumulado 30): parseo RDAP (válido, 404, fecha
  inválida, sin evento de registro, sin servidor RDAP para el TLD, fallo de
  red), `registrableDomainFor`, y las 2 reglas de combinación.
- `scripts/eval/`: el formato JSONL acepta `domainAgeDays` opcional; el
  runner lo inyecta como destino simulado `{checked:true, reachable:true,
  domainAgeDays}` — nunca llama a RDAP real, y el reporte lo deja anotado
  explícitamente (ver arriba).

## Matriz de confusión y métricas

| Umbral | TP | FP | TN | FN | Precisión | Recall | Tasa de falsos positivos |
|---|---|---|---|---|---|---|---|
| riesgo | 29 | 1 | 51 | 5 | 96.7% | 85.3% | 1.9% |
| riesgo+precaucion | 34 | 6 | 46 | 0 | 85.0% | 100.0% | 11.5% |

> `riesgo`: solo el nivel más alto cuenta como alerta. `riesgo+precaucion`: ambos niveles cuentan como alerta.

## Casos de regresión (`expect`)

Todos los casos con `expect` definido coinciden con el resultado real.

## Detalle por categoría (`source`)

| Fuente | Casos | Niveles obtenidos |
|---|---|---|
| manual:official-stable | 12 | riesgo=0, precaucion=0, sin-senales=12 |
| manual:substring-fp | 8 | riesgo=0, precaucion=0, sin-senales=8 |
| manual:char-pattern-fp | 4 | riesgo=0, precaucion=0, sin-senales=4 |
| manual:tld-fp | 6 | riesgo=0, precaucion=0, sin-senales=6 |
| manual:pressure-words-fp | 6 | riesgo=0, precaucion=0, sin-senales=6 |
| manual:stable-structural | 6 | riesgo=0, precaucion=0, sin-senales=6 |
| manual:subdomain-fp | 3 | riesgo=0, precaucion=3, sin-senales=0 |
| manual:typosquat | 4 | riesgo=4, precaucion=0, sin-senales=0 |
| manual:brand-exact | 2 | riesgo=2, precaucion=0, sin-senales=0 |
| manual:brand-exact-contrast | 4 | riesgo=4, precaucion=0, sin-senales=0 |
| manual:subdomain-brand | 4 | riesgo=4, precaucion=0, sin-senales=0 |
| manual:punycode | 2 | riesgo=2, precaucion=0, sin-senales=0 |
| manual:homoglyph | 1 | riesgo=1, precaucion=0, sin-senales=0 |
| manual:ip | 3 | riesgo=3, precaucion=0, sin-senales=0 |
| manual:levenshtein-common-word-fixed | 1 | riesgo=0, precaucion=1, sin-senales=0 |
| manual:levenshtein-common-word-safe | 2 | riesgo=0, precaucion=0, sin-senales=2 |
| manual:levenshtein-common-word-residual | 1 | riesgo=1, precaucion=0, sin-senales=0 |
| manual:redirect-param | 1 | riesgo=0, precaucion=1, sin-senales=0 |
| manual:redirect-param-combo | 1 | riesgo=1, precaucion=0, sin-senales=0 |
| manual:download-ext | 3 | riesgo=3, precaucion=0, sin-senales=0 |
| manual:shortener-only | 3 | riesgo=0, precaucion=3, sin-senales=0 |
| manual:free-hosting-brand | 3 | riesgo=3, precaucion=0, sin-senales=0 |
| manual:cctld-structural | 1 | riesgo=1, precaucion=0, sin-senales=0 |
| manual:domain-age-simulated | 5 | riesgo=1, precaucion=2, sin-senales=2 |

## Todos los casos

| Línea | Etiqueta | Nivel | Puntaje | Señales | Nota |
|---|---|---|---|---|---|
| 1 | legit | sin-senales | 0 | — | dominio oficial listado en brands.ts, isOfficialHost debe anular cualquier otra senal |
| 2 | legit | sin-senales | 0 | — | dominio oficial de banco |
| 3 | legit | sin-senales | 0 | — | dominio oficial |
| 4 | legit | sin-senales | 0 | — | dominio oficial, contraste con los casos de imitacion de 'apple' |
| 5 | legit | sin-senales | 0 | — | dominio oficial |
| 6 | legit | sin-senales | 0 | — | dominio oficial |
| 7 | legit | sin-senales | 0 | — | dominio oficial |
| 8 | legit | sin-senales | 0 | — | dominio oficial |
| 9 | legit | sin-senales | 0 | — | dominio oficial de Microsoft |
| 10 | legit | sin-senales | 0 | — | dominio oficial |
| 11 | legit | sin-senales | 0 | — | dominio oficial de Apple |
| 12 | legit | sin-senales | 0 | — | dominio oficial de Google |
| 13 | legit | sin-senales | 0 | — | 'pineapple' contiene 'apple' como substring; hoy detectBrandImitation usa includes() y la marca como falso positivo (corregido en la Fase 1: ya da sin-senales) |
| 14 | legit | sin-senales | 0 | — | 'snapple' contiene 'apple'; mismo bug de substring (corregido en la Fase 1: ya da sin-senales) |
| 15 | legit | sin-senales | 0 | — | 'visalia' empieza con 'visa'; falso positivo de imitacion de marca (corregido en la Fase 1: ya da sin-senales) |
| 16 | legit | sin-senales | 0 | — | 'grownups' contiene 'ups'; falso positivo (corregido en la Fase 1: ya da sin-senales) |
| 17 | legit | sin-senales | 0 | — | 'mastercardiology' empieza con 'mastercard'; clinica real, falso positivo (corregido en la Fase 1: ya da sin-senales) |
| 18 | legit | sin-senales | 0 | — | 'appleseed' contiene 'apple'; vivero real, falso positivo (corregido en la Fase 1: ya da sin-senales) |
| 19 | legit | sin-senales | 0 | — | 'visacard' contiene 'visa'; tienda de accesorios, falso positivo (corregido en la Fase 1: ya da sin-senales) |
| 20 | legit | sin-senales | 0 | — | 'tiktokerscommunity' contiene 'tiktok'; club de fans, falso positivo (corregido en la Fase 1: ya da sin-senales) |
| 21 | legit | sin-senales | 0 | — | patron letra-digito-letra ('f1n') en un sitio de noticias de Formula 1 real (corregido en la Fase 1: ya da sin-senales) |
| 22 | legit | sin-senales | 0 | — | patron letra-digito-letra ('g2e') en una organizacion de esports real (corregido en la Fase 1: ya da sin-senales) |
| 23 | legit | sin-senales | 0 | — | patron letra-digito-letra ('b3d') en un estudio de desarrollo real (corregido en la Fase 1: ya da sin-senales) |
| 24 | legit | sin-senales | 0 | — | patron letra-digito-letra ('s3b') en una herramienta de backup real (corregido en la Fase 1: ya da sin-senales) |
| 25 | legit | sin-senales | 0 | — | TLD .beauty marcado como sospechoso pero usado por negocios reales (corregido en la Fase 1: ya da sin-senales) |
| 26 | legit | sin-senales | 0 | — | TLD .fit marcado como sospechoso pero usado por gimnasios reales (corregido en la Fase 1: ya da sin-senales) |
| 27 | legit | sin-senales | 0 | — | TLD .bar marcado como sospechoso pero usado por bares reales (corregido en la Fase 1: ya da sin-senales) |
| 28 | legit | sin-senales | 0 | — | TLD .surf marcado como sospechoso pero usado por negocios reales (corregido en la Fase 1: ya da sin-senales) |
| 29 | legit | sin-senales | 0 | — | TLD .autos marcado como sospechoso pero usado por concesionarios reales (corregido en la Fase 1: ya da sin-senales) |
| 30 | legit | sin-senales | 0 | — | TLD .homes marcado como sospechoso pero usado por inmobiliarias reales (corregido en la Fase 1: ya da sin-senales) |
| 31 | legit | sin-senales | 0 | — | 'pago' es palabra de presion; tienda real cobrando un pedido (corregido en la Fase 1: ya da sin-senales) |
| 32 | legit | sin-senales | 0 | — | 'envio' es palabra de presion; empresa de logistica real (corregido en la Fase 1: ya da sin-senales) |
| 33 | legit | sin-senales | 0 | — | 'descuento' es palabra de presion; promocion real de comercio (corregido en la Fase 1: ya da sin-senales) |
| 34 | legit | sin-senales | 0 | — | 'factura' es palabra de presion; software de contabilidad real (corregido en la Fase 1: ya da sin-senales) |
| 35 | legit | sin-senales | 0 | — | 'paquete' es palabra de presion; aerolinea real con paquetes turisticos (corregido en la Fase 1: ya da sin-senales) |
| 36 | legit | sin-senales | 0 | — | 'pago' es palabra de presion; confirmacion de compra real (corregido en la Fase 1: ya da sin-senales) |
| 37 | legit | sin-senales | 1 | direccion-poco-habitual | nombre largo con varios guiones pero una sola senal de peso 1; no cruza el umbral de precaucion. (la version original con 'regalos' se descarto: 'regalos' contiene la palabra de presion 'regalo' y subia a precaucion por una razon distinta a la que queria mostrar este caso) |
| 38 | legit | sin-senales | 0 | — | hosting gratuito sin ninguna marca en el subdominio; no debe dispararse nada |
| 39 | legit | sin-senales | 0 | — | caso neutro de control, sin ninguna senal esperada |
| 40 | legit | sin-senales | 0 | — | caso neutro de control, sin ninguna senal esperada |
| 41 | legit | sin-senales | 1 | direccion-poco-habitual | varios guiones (peso 1) pero no cruza el umbral de precaucion |
| 42 | legit | sin-senales | 0 | — | caso neutro de control, sin ninguna senal esperada |
| 43 | legit | precaucion | 2 | subdominios-extranos | 2 subdominios internos legitimos disparan 'subdominios-extranos' (peso 2) -> precaucion |
| 44 | legit | precaucion | 2 | subdominios-extranos | entorno de staging real con 2 subdominios -> precaucion |
| 45 | legit | precaucion | 2 | subdominios-extranos | blog regional real con 2 subdominios -> precaucion |
| 46 | phishing | riesgo | 8 | imitacion-marca, caracteres-enganosos, sin-conexion-segura | sustitucion l->1, distancia de Levenshtein 1 respecto a 'paypal' |
| 47 | phishing | riesgo | 11 | imitacion-marca, caracteres-enganosos, pide-datos, sin-conexion-segura | sustitucion i->1 respecto a 'netflix' |
| 48 | phishing | riesgo | 11 | imitacion-marca, caracteres-enganosos, pide-datos, sin-conexion-segura | sustitucion o->0 (x2) respecto a 'google', distancia 2 |
| 49 | phishing | riesgo | 8 | imitacion-marca, caracteres-enganosos, sin-conexion-segura | sustitucion o->0 respecto a 'amazon', ademas dispara el patron letra-digito-letra |
| 50 | phishing | riesgo | 8 | imitacion-marca, caracteres-enganosos, sin-conexion-segura | 'faceb00k' es keyword exacta ya listada en brands.ts |
| 51 | phishing | riesgo | 8 | imitacion-marca, caracteres-enganosos, sin-conexion-segura | 'instagrarn' es keyword exacta ya listada en brands.ts |
| 52 | phishing | riesgo | 8 | imitacion-marca, pide-datos, dominio-sospechoso | token completo 'apple' (no substring) + TLD sospechoso; contraste con los falsos positivos de substring |
| 53 | phishing | riesgo | 10 | imitacion-marca, pide-datos, dominio-sospechoso, palabras-de-presion | token completo 'netflix' + TLD sospechoso + palabra de presion 'pago' |
| 54 | phishing | riesgo | 5 | imitacion-marca, palabras-de-presion | token completo 'mercadolibre', dominio no oficial |
| 55 | phishing | riesgo | 6 | imitacion-marca, pide-datos | token completo 'bancolombia' en un dominio que no es ninguno de los oficiales listados |
| 56 | phishing | riesgo | 10 | marca-en-subdominio, pide-datos, dominio-sospechoso, subdominios-extranos | la marca viaja en los subdominios, el dominio registrable real es verifica-cuenta.xyz |
| 57 | phishing | riesgo | 10 | marca-en-subdominio, pide-datos, dominio-sospechoso, subdominios-extranos | mismo patron que bancolombia.com.verifica-cuenta.xyz |
| 58 | phishing | riesgo | 7 | marca-en-subdominio, dominio-sospechoso, palabras-de-presion | 'dhl-entrega' es keyword exacta, dominio registrable real es paquete-pendiente.icu |
| 59 | phishing | riesgo | 9 | marca-en-subdominio, dominio-sospechoso, subdominios-extranos, palabras-de-presion | la marca 'nequi' viaja en el subdominio sobre un dominio .win sospechoso |
| 60 | phishing | riesgo | 4 | caracteres-enganosos, direccion-poco-habitual | dominio punycode (xn--), senal caracteres-enganosos directa |
| 61 | phishing | riesgo | 7 | caracteres-enganosos, pide-datos, direccion-poco-habitual | dominio punycode generico, senal caracteres-enganosos directa |
| 62 | phishing | riesgo | 4 | caracteres-enganosos, direccion-poco-habitual | la primera 'a' es cirilica (U+0430), dispara caracteres-enganosos por caracter no ASCII |
| 63 | phishing | riesgo | 10 | direccion-numerica, pide-datos, sin-conexion-segura, direccion-manipulada | host IPv4 directo, senal direccion-numerica |
| 64 | phishing | riesgo | 8 | direccion-numerica, pide-datos, sin-conexion-segura | host IPv4 directo, caso clasico del plan original |
| 65 | phishing | riesgo | 8 | direccion-numerica, pide-datos, sin-conexion-segura | host IPv4 directo |
| 66 | legit | precaucion | 2 | direccion-manipulada | hallazgo real de la Fase 0: 'looking' estaba a distancia de Levenshtein 1 de la marca 'booking' y disparaba imitacion-marca por una palabra comun del ingles. Tras la Fase 1 (Levenshtein exige compartir la primera letra: 'l' vs 'b' no coincide), ya no se marca como imitacion; solo queda el parametro de redireccion oculto (precaucion). |
| 67 | legit | sin-senales | 0 | — | 'cooking' esta a distancia de Levenshtein 1 de 'booking' pero empieza con letra distinta ('c' vs 'b'); la regla de primera letra compartida lo rechaza correctamente |
| 68 | legit | sin-senales | 0 | — | 'hooking' tambien esta a distancia de Levenshtein 1 de 'booking', primera letra distinta ('h' vs 'b'), correctamente rechazado |
| 69 | legit | riesgo | 3 | imitacion-marca | riesgo residual aceptado a proposito: 'goggle' (mirar con ojos como platos) esta a distancia de Levenshtein 1 de 'google', tiene 6+ letras y comparte la primera letra ('g'), asi que la regla de Fase 1 lo sigue marcando como imitacion de marca. Es el costo de mantener distancia 1 (en vez de exigir coincidencia exacta siempre); documentado como limitacion conocida en docs/CHANGELOG-algoritmo.md |
| 70 | phishing | precaucion | 2 | direccion-manipulada | parametro redirect oculto hacia otro host, sin ninguna otra senal; hoy solo pesa 2 (precaucion), no riesgo por si solo pese a ocultar el destino real |
| 71 | phishing | riesgo | 5 | pide-datos, direccion-manipulada | parametro next oculto + la palabra 'login' dentro del destino oculto disparan tambien pide-datos (la regla de combinacion funciona como se espera aqui) |
| 72 | phishing | riesgo | 5 | archivo-descarga, dominio-sospechoso | extension .apk, senal archivo-descarga directa |
| 73 | phishing | riesgo | 7 | archivo-descarga, dominio-sospechoso, sin-conexion-segura | extension .exe, senal archivo-descarga directa |
| 74 | phishing | riesgo | 7 | archivo-descarga, dominio-sospechoso, palabras-de-presion | extension .docm + palabra 'pago' en la ruta |
| 75 | phishing | precaucion | 4 | enlace-acortado, sin-conexion-segura | acortador conocido sin mas contexto; hoy queda en precaucion, no en riesgo, al no comprobarse el destino en el modo offline |
| 76 | phishing | precaucion | 2 | enlace-acortado | acortador conocido, mismo caso |
| 77 | phishing | precaucion | 2 | enlace-acortado | acortador conocido, mismo caso |
| 78 | phishing | riesgo | 6 | imitacion-marca, pide-datos | hosting gratuito con la marca en el subdominio; hoy ya se detecta via el bucket de subdominios, sin necesitar PSL real |
| 79 | phishing | riesgo | 6 | imitacion-marca, pide-datos | mismo patron que bancolombia-verificacion.web.app |
| 80 | phishing | riesgo | 5 | imitacion-marca, palabras-de-presion | mismo patron, ademas palabra de presion 'pago' |
| 81 | phishing | riesgo | 10 | marca-en-subdominio, pide-datos, palabras-de-presion, subdominios-extranos | combina un sufijo multi-parte reconocido (.com.co) con el truco de marca en subdominio. Con tldts (Fase 1), se parsea correctamente: domain=verificacion-urgente.com.co, subdomain=bancolombia.com, y dispara 'marca-en-subdominio'. |
| 82 | legit | precaucion | 2 | dominio-nuevo | dominio simulado como recien registrado (5 dias) sin ninguna otra senal: debe quedar en precaucion, nunca en riesgo por si solo (podria ser un negocio real recien lanzado) |
| 83 | legit | sin-senales | 1 | direccion-poco-habitual | dominio simulado como antiguo (3+ anios): no dispara dominio-nuevo |
| 84 | legit | sin-senales | 1 | direccion-poco-habitual | edad desconocida (RDAP sin servidor para el TLD, 404, o timeout): nunca mejora ni empeora el veredicto, queda neutro |
| 85 | phishing | riesgo | 8 | imitacion-marca, pide-datos, dominio-nuevo | imitacion de marca (token completo 'bancolombia') + dominio registrado hace 3 dias: sigue en riesgo, pero ya lo estaria solo por la marca (ancla de regresion, no mide la mejora real de la Fase 2) |
| 86 | phishing | precaucion | 4 | direccion-manipulada, dominio-nuevo | parametro de redireccion oculto (peso 2) + dominio nuevo (peso 2) = puntaje 4: todavia no alcanza el umbral de riesgo (6). Ejemplo real de que, tal como esta disenada (tope en precaucion por su cuenta), la señal de dominio nuevo no basta sola para resolver este tipo de caso -- ver el analisis de la Fase 2 en docs/CHANGELOG-algoritmo.md |
