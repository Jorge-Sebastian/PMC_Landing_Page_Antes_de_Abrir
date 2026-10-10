# Reporte de evaluación: baseline

Generado: 2026-10-10T20:32:15.136Z
Casos evaluados: 78 (análisis estático offline, sin comprobar destino).

## Matriz de confusión y métricas

| Umbral | TP | FP | TN | FN | Precisión | Recall | Tasa de falsos positivos |
|---|---|---|---|---|---|---|---|
| riesgo | 29 | 12 | 33 | 4 | 70.7% | 87.9% | 26.7% |
| riesgo+precaucion | 33 | 27 | 18 | 0 | 55.0% | 100.0% | 60.0% |

> `riesgo`: solo el nivel más alto cuenta como alerta. `riesgo+precaucion`: ambos niveles cuentan como alerta.

## Casos de regresión (`expect`)

Todos los casos con `expect` definido coinciden con el resultado real.

## Detalle por categoría (`source`)

| Fuente | Casos | Niveles obtenidos |
|---|---|---|
| manual:official-stable | 12 | riesgo=0, precaucion=0, sin-senales=12 |
| manual:substring-fp | 8 | riesgo=8, precaucion=0, sin-senales=0 |
| manual:char-pattern-fp | 4 | riesgo=4, precaucion=0, sin-senales=0 |
| manual:tld-fp | 6 | riesgo=0, precaucion=6, sin-senales=0 |
| manual:pressure-words-fp | 6 | riesgo=0, precaucion=6, sin-senales=0 |
| manual:stable-structural | 6 | riesgo=0, precaucion=0, sin-senales=6 |
| manual:subdomain-fp | 3 | riesgo=0, precaucion=3, sin-senales=0 |
| manual:typosquat | 4 | riesgo=4, precaucion=0, sin-senales=0 |
| manual:brand-exact | 2 | riesgo=2, precaucion=0, sin-senales=0 |
| manual:brand-exact-contrast | 4 | riesgo=4, precaucion=0, sin-senales=0 |
| manual:subdomain-brand | 4 | riesgo=4, precaucion=0, sin-senales=0 |
| manual:punycode | 2 | riesgo=2, precaucion=0, sin-senales=0 |
| manual:homoglyph | 1 | riesgo=1, precaucion=0, sin-senales=0 |
| manual:ip | 3 | riesgo=3, precaucion=0, sin-senales=0 |
| manual:levenshtein-common-word-fp | 1 | riesgo=1, precaucion=0, sin-senales=0 |
| manual:redirect-param | 1 | riesgo=0, precaucion=1, sin-senales=0 |
| manual:redirect-param-combo | 1 | riesgo=1, precaucion=0, sin-senales=0 |
| manual:download-ext | 3 | riesgo=3, precaucion=0, sin-senales=0 |
| manual:shortener-only | 3 | riesgo=0, precaucion=3, sin-senales=0 |
| manual:free-hosting-brand | 3 | riesgo=3, precaucion=0, sin-senales=0 |
| manual:cctld-structural | 1 | riesgo=1, precaucion=0, sin-senales=0 |

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
| 13 | legit | riesgo | 6 | imitacion-marca, pide-datos | 'pineapple' contiene 'apple' como substring; hoy detectBrandImitation usa includes() y la marca como falso positivo |
| 14 | legit | riesgo | 3 | imitacion-marca | 'snapple' contiene 'apple'; mismo bug de substring |
| 15 | legit | riesgo | 3 | imitacion-marca | 'visalia' empieza con 'visa'; falso positivo de imitacion de marca |
| 16 | legit | riesgo | 3 | imitacion-marca | 'grownups' contiene 'ups'; falso positivo |
| 17 | legit | riesgo | 6 | imitacion-marca, pide-datos | 'mastercardiology' empieza con 'mastercard'; clinica real, falso positivo |
| 18 | legit | riesgo | 3 | imitacion-marca | 'appleseed' contiene 'apple'; vivero real, falso positivo |
| 19 | legit | riesgo | 6 | imitacion-marca, pide-datos | 'visacard' contiene 'visa'; tienda de accesorios, falso positivo |
| 20 | legit | riesgo | 3 | imitacion-marca | 'tiktokerscommunity' contiene 'tiktok'; club de fans, falso positivo |
| 21 | legit | riesgo | 3 | caracteres-enganosos | patron letra-digito-letra ('f1n') en un sitio de noticias de Formula 1 real |
| 22 | legit | riesgo | 3 | caracteres-enganosos | patron letra-digito-letra ('g2e') en una organizacion de esports real |
| 23 | legit | riesgo | 3 | caracteres-enganosos | patron letra-digito-letra ('b3d') en un estudio de desarrollo real |
| 24 | legit | riesgo | 3 | caracteres-enganosos | patron letra-digito-letra ('s3b') en una herramienta de backup real |
| 25 | legit | precaucion | 2 | dominio-sospechoso | TLD .beauty marcado como sospechoso pero usado por negocios reales |
| 26 | legit | precaucion | 2 | dominio-sospechoso | TLD .fit marcado como sospechoso pero usado por gimnasios reales |
| 27 | legit | precaucion | 2 | dominio-sospechoso | TLD .bar marcado como sospechoso pero usado por bares reales |
| 28 | legit | precaucion | 2 | dominio-sospechoso | TLD .surf marcado como sospechoso pero usado por negocios reales |
| 29 | legit | precaucion | 2 | dominio-sospechoso | TLD .autos marcado como sospechoso pero usado por concesionarios reales |
| 30 | legit | precaucion | 2 | dominio-sospechoso | TLD .homes marcado como sospechoso pero usado por inmobiliarias reales |
| 31 | legit | precaucion | 2 | palabras-de-presion | 'pago' es palabra de presion; tienda real cobrando un pedido |
| 32 | legit | precaucion | 2 | palabras-de-presion | 'envio' es palabra de presion; empresa de logistica real |
| 33 | legit | precaucion | 2 | palabras-de-presion | 'descuento' es palabra de presion; promocion real de comercio |
| 34 | legit | precaucion | 2 | palabras-de-presion | 'factura' es palabra de presion; software de contabilidad real |
| 35 | legit | precaucion | 2 | palabras-de-presion | 'paquete' es palabra de presion; aerolinea real con paquetes turisticos |
| 36 | legit | precaucion | 2 | palabras-de-presion | 'pago' es palabra de presion; confirmacion de compra real |
| 37 | legit | sin-senales | 1 | direccion-poco-habitual | nombre largo con varios guiones pero una sola senal de peso 1; no cruza el umbral de precaucion. (la version original con 'regalos' se descarto: 'regalos' contiene la palabra de presion 'regalo' y subia a precaucion por una razon distinta a la que queria mostrar este caso) |
| 38 | legit | sin-senales | 0 | — | hosting gratuito sin ninguna marca en el subdominio; no debe dispararse nada |
| 39 | legit | sin-senales | 0 | — | caso neutro de control, sin ninguna senal esperada |
| 40 | legit | sin-senales | 0 | — | caso neutro de control, sin ninguna senal esperada |
| 41 | legit | sin-senales | 1 | direccion-poco-habitual | varios guiones (peso 1) pero no cruza el umbral de precaucion |
| 42 | legit | sin-senales | 0 | — | caso neutro de control, sin ninguna senal esperada |
| 43 | legit | precaucion | 2 | subdominios-extranos | 2 subdominios internos legitimos disparan 'subdominios-extranos' (peso 2) -> precaucion |
| 44 | legit | precaucion | 2 | subdominios-extranos | entorno de staging real con 2 subdominios -> precaucion |
| 45 | legit | precaucion | 2 | subdominios-extranos | blog regional real con 2 subdominios -> precaucion |
| 46 | phishing | riesgo | 5 | imitacion-marca, sin-conexion-segura | sustitucion l->1, distancia de Levenshtein 1 respecto a 'paypal' |
| 47 | phishing | riesgo | 11 | caracteres-enganosos, imitacion-marca, pide-datos, sin-conexion-segura | sustitucion i->1 respecto a 'netflix' |
| 48 | phishing | riesgo | 11 | caracteres-enganosos, imitacion-marca, pide-datos, sin-conexion-segura | sustitucion o->0 (x2) respecto a 'google', distancia 2 |
| 49 | phishing | riesgo | 8 | caracteres-enganosos, imitacion-marca, sin-conexion-segura | sustitucion o->0 respecto a 'amazon', ademas dispara el patron letra-digito-letra |
| 50 | phishing | riesgo | 8 | caracteres-enganosos, imitacion-marca, sin-conexion-segura | 'faceb00k' es keyword exacta ya listada en brands.ts |
| 51 | phishing | riesgo | 5 | imitacion-marca, sin-conexion-segura | 'instagrarn' es keyword exacta ya listada en brands.ts |
| 52 | phishing | riesgo | 8 | imitacion-marca, pide-datos, dominio-sospechoso | token completo 'apple' (no substring) + TLD sospechoso; contraste con los falsos positivos de substring |
| 53 | phishing | riesgo | 10 | imitacion-marca, pide-datos, dominio-sospechoso, palabras-de-presion | token completo 'netflix' + TLD sospechoso + palabra de presion 'pago' |
| 54 | phishing | riesgo | 5 | imitacion-marca, palabras-de-presion | token completo 'mercadolibre', dominio no oficial |
| 55 | phishing | riesgo | 6 | imitacion-marca, pide-datos | token completo 'bancolombia' en un dominio que no es ninguno de los oficiales listados |
| 56 | phishing | riesgo | 10 | imitacion-marca, pide-datos, dominio-sospechoso, subdominios-extranos | la marca viaja en los subdominios, el dominio registrable real es verifica-cuenta.xyz |
| 57 | phishing | riesgo | 10 | imitacion-marca, pide-datos, dominio-sospechoso, subdominios-extranos | mismo patron que bancolombia.com.verifica-cuenta.xyz |
| 58 | phishing | riesgo | 7 | imitacion-marca, dominio-sospechoso, palabras-de-presion | 'dhl-entrega' es keyword exacta, dominio registrable real es paquete-pendiente.icu |
| 59 | phishing | riesgo | 9 | imitacion-marca, dominio-sospechoso, palabras-de-presion, subdominios-extranos | la marca 'nequi' viaja en el subdominio sobre un dominio .win sospechoso |
| 60 | phishing | riesgo | 7 | caracteres-enganosos, imitacion-marca, direccion-poco-habitual | dominio punycode (xn--), senal caracteres-enganosos directa |
| 61 | phishing | riesgo | 7 | caracteres-enganosos, pide-datos, direccion-poco-habitual | dominio punycode generico, senal caracteres-enganosos directa |
| 62 | phishing | riesgo | 7 | caracteres-enganosos, imitacion-marca, direccion-poco-habitual | la primera 'a' es cirilica (U+0430), dispara caracteres-enganosos por caracter no ASCII |
| 63 | phishing | riesgo | 10 | direccion-numerica, pide-datos, sin-conexion-segura, direccion-manipulada | host IPv4 directo, senal direccion-numerica |
| 64 | phishing | riesgo | 8 | direccion-numerica, pide-datos, sin-conexion-segura | host IPv4 directo, caso clasico del plan original |
| 65 | phishing | riesgo | 8 | direccion-numerica, pide-datos, sin-conexion-segura | host IPv4 directo |
| 66 | phishing | riesgo | 5 | imitacion-marca, direccion-manipulada | hallazgo real del banco de pruebas (no era la intencion original): el token 'looking' esta a distancia de Levenshtein 1 de la marca 'booking', asi que imitacion-marca se dispara por una palabra comun del ingles, no por el parametro de redireccion. Documentar en el changelog como ejemplo de colision Levenshtein contra palabras comunes. |
| 67 | phishing | precaucion | 2 | direccion-manipulada | parametro redirect oculto hacia otro host, sin ninguna otra senal; hoy solo pesa 2 (precaucion), no riesgo por si solo pese a ocultar el destino real |
| 68 | phishing | riesgo | 5 | pide-datos, direccion-manipulada | parametro next oculto + la palabra 'login' dentro del destino oculto disparan tambien pide-datos (la regla de combinacion funciona como se espera aqui) |
| 69 | phishing | riesgo | 5 | archivo-descarga, dominio-sospechoso | extension .apk, senal archivo-descarga directa |
| 70 | phishing | riesgo | 7 | archivo-descarga, dominio-sospechoso, sin-conexion-segura | extension .exe, senal archivo-descarga directa |
| 71 | phishing | riesgo | 7 | archivo-descarga, dominio-sospechoso, palabras-de-presion | extension .docm + palabra 'pago' en la ruta |
| 72 | phishing | precaucion | 4 | enlace-acortado, sin-conexion-segura | acortador conocido sin mas contexto; hoy queda en precaucion, no en riesgo, al no comprobarse el destino en el modo offline |
| 73 | phishing | precaucion | 2 | enlace-acortado | acortador conocido, mismo caso |
| 74 | phishing | precaucion | 2 | enlace-acortado | acortador conocido, mismo caso |
| 75 | phishing | riesgo | 6 | imitacion-marca, pide-datos | hosting gratuito con la marca en el subdominio; hoy ya se detecta via el bucket de subdominios, sin necesitar PSL real |
| 76 | phishing | riesgo | 6 | imitacion-marca, pide-datos | mismo patron que bancolombia-verificacion.web.app |
| 77 | phishing | riesgo | 5 | imitacion-marca, palabras-de-presion | mismo patron, ademas palabra de presion 'pago' |
| 78 | phishing | riesgo | 10 | imitacion-marca, pide-datos, palabras-de-presion, subdominios-extranos | combina un sufijo multi-parte reconocido (.com.co) con el truco de marca en subdominio; resultado no verificado a mano, lo documenta el runner |
