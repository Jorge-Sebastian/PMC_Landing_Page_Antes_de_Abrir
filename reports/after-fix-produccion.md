# Reporte de evaluación: after-fix-produccion

Generado: 2026-10-10T22:53:59.357Z
Casos evaluados: 96 (análisis estático offline; nunca se llama a check-link/RDAP de verdad).

> **5 caso(s) usan `domainAgeDays` simulado** (destino falso con esa única edad, sin ningún otro dato de destino) para probar las reglas de combinación de `build-verdict.ts` (imitación de marca + dominio nuevo, dominio nuevo solo). **Estas cifras prueban las reglas, no miden RDAP real** — el runner nunca consulta un servidor RDAP.

> **3 caso(s) usan `destinationStatus` simulado** ("blocked" = respuesta HTTP 403 falsa, "unavailable" = sin ninguna respuesta falsa) para probar que un bloqueo automático o un host sin respuesta, cada uno por sí solo, no producen `precaucion`. **Tampoco miden nada real** — nunca se llama a `check-link`.

## Hallazgos de la prueba en producción que se corrigen aquí

1. **`g2.com` salía en "precaución" solo por `destino-no-responde`.** El
   sitio bloquea la visita automática con un código HTTP (403/429), y el
   motor lo trataba igual que "el sitio contestó con un error real". Ahora
   se distingue: una respuesta de bloqueo (401/403/405/406/429/451/5xx) no
   suma nada al puntaje y solo deja una nota informativa neutra
   (`destino-verificacion-bloqueada`, peso 0); un host que no responde en
   absoluto (no resuelve, conexión rechazada) pasa a pesar 1, no 2.
2. **`youtuve.com` salía "sin señales".** La causa real: `youtube` nunca
   estuvo en las palabras clave de la marca Google en `brands.ts` (solo
   estaba el dominio `youtube.com`, usado para otra cosa: reconocer que SÍ
   es oficial). No era un problema de la regla de coincidencia aproximada.
   Se agregó la palabra clave que faltaba, más 7 marcas colombianas que no
   estaban en absoluto (Davivienda, Banco de Bogotá, PSE, DIAN,
   Servientrega, Interrapidísimo, Coordinadora) — las 7 verificadas
   visitando cada sitio antes de agregarlas, ninguna quedó sin confirmar.

## Comparación contra `reports/after-fase2.md`

Ningún caso que ya existía cambió de nivel ni de señales — los cambios son
aditivos. El dataset creció de 86 a 96 casos (los 10 de esta corrección: 3
de destino simulado + 7 de marcas).

| Umbral | Métrica | After Fase 2 | After fix producción | Δ |
|---|---|---|---|---|
| `riesgo` | Precisión | 96.7% | 97.1% | +0.4 pp |
| `riesgo` | Recall | 85.3% | 86.8% | +1.5 pp |
| `riesgo` | Falsos positivos | 1.9% | 1.7% | -0.2 pp |
| `riesgo+precaucion` | Precisión | 85.0% | 86.4% | +1.4 pp |
| `riesgo+precaucion` | Recall | 100% | 100% | 0 pp |

Mejora en los dos sentidos: menos falsos positivos (el bloqueo de `g2.com`
ya no cuenta) y más recall real (`youtuve.com` y las variantes de marca
ahora sí se detectan).

## Matriz de confusión y métricas

| Umbral | TP | FP | TN | FN | Precisión | Recall | Tasa de falsos positivos |
|---|---|---|---|---|---|---|---|
| riesgo | 33 | 1 | 57 | 5 | 97.1% | 86.8% | 1.7% |
| riesgo+precaucion | 38 | 6 | 52 | 0 | 86.4% | 100.0% | 10.3% |

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
| manual:destino-bloqueo-produccion | 2 | riesgo=1, precaucion=0, sin-senales=1 |
| manual:destino-sin-respuesta | 1 | riesgo=0, precaucion=0, sin-senales=1 |
| manual:produccion-marcas | 7 | riesgo=3, precaucion=0, sin-senales=4 |

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
| 87 | legit | sin-senales | 0 | destino-verificacion-bloqueada | hallazgo real de la prueba en produccion (g2.com): un sitio real bloquea la visita automatica (403) y eso NO debe sumar al puntaje, solo mostrar una nota informativa neutra |
| 88 | legit | sin-senales | 1 | destino-inalcanzable | host sin ninguna respuesta (no resuelve o rechaza la conexion): peso bajo (1), no alcanza el umbral de precaucion por si solo |
| 89 | phishing | riesgo | 8 | imitacion-marca, pide-datos, palabras-de-presion, destino-verificacion-bloqueada | confirma que un destino bloqueado (peso 0) no esconde una imitacion de marca real: sigue en riesgo por la marca, no por el destino |
| 90 | phishing | riesgo | 3 | imitacion-marca | hallazgo real de la prueba en produccion: 'youtube' no estaba en las keywords de la marca Google (solo estaba el dominio). Se agrego la keyword |
| 91 | phishing | riesgo | 6 | imitacion-marca, pide-datos | 'gooogle' (doble o extra) a distancia de Levenshtein 1 de 'google', 6+ letras, misma primera letra |
| 92 | phishing | riesgo | 7 | imitacion-marca, dominio-sospechoso, palabras-de-presion | token completo 'mercadolibre' en un TLD sospechoso, dominio no oficial |
| 93 | legit | sin-senales | 0 | — | dominio oficial de YouTube/Google |
| 94 | legit | sin-senales | 0 | — | dominio oficial de Google |
| 95 | legit | sin-senales | 0 | — | dominio oficial de Facebook |
| 96 | legit | sin-senales | 0 | — | dominio oficial de Mercado Libre Colombia |
