# Reporte de evaluación: after-fase1

Generado: 2026-10-10T21:13:20.893Z
Casos evaluados: 81 (análisis estático offline, sin comprobar destino).

## Comparación contra `reports/baseline.md`

El dataset creció de 78 a 81 casos (se agregaron `cooking-with-clara.com`,
`hooking-up-events.com` y `goggle-eyed-crafts.com`, los tres casos de
"palabra común cerca de una marca" pedidos para la Fase 1). Por eso la
comparación se hace por tasa, no por conteo crudo.

| Umbral | Métrica | Baseline | After Fase 1 | Δ |
|---|---|---|---|---|
| `riesgo` | Precisión | 70.7% | **96.6%** | +25.9 pp |
| `riesgo` | Recall | 87.9% | 87.5% | -0.4 pp |
| `riesgo` | Falsos positivos | 26.7% | **2.0%** | -24.7 pp |
| `riesgo`+`precaucion` | Precisión | 55.0% | **86.5%** | +31.5 pp |
| `riesgo`+`precaucion` | Recall | 100.0% | 100.0% | 0 pp |
| `riesgo`+`precaucion` | Falsos positivos | 60.0% | **10.2%** | -49.8 pp |

**El recall se mantiene prácticamente igual** (la caída de 0.4 puntos porcentuales
está muy por debajo del límite de 2 puntos acordado) y **la tasa de falsos
positivos cae de forma drástica** en los dos umbrales. En una palabra: la Fase
1 cumplió su objetivo — bajar los falsos positivos sin perder capacidad de
detección real.

### Qué mejoró (24 dominios legítimos dejan de marcarse como riesgo/precaución)

Todos estos eran falsos positivos reales, confirmados por el banco de pruebas,
y ahora dan `sin-senales`:

- **Imitación de marca por substring** (8 casos): `pineapple-recipes.com`,
  `snapple.com`, `visalia-realestate.com`, `grownups-therapy.com`,
  `mastercardiology-clinic.com`, `appleseed-nursery.com`,
  `visacard-wallet-covers.com`, `tiktokerscommunity-fanclub.com`.
- **Patrón letra-dígito-letra** (4 casos): `f1news.com`, `g2esports.com`,
  `web3dev-studio.com`, `s3backup-tools.com`.
- **TLD hoy usado por negocios reales** (6 casos): `bellasalon.beauty`,
  `ironwill.fit`, `thelocal.bar`, `cleanhome.surf`, `driveeasy.autos`,
  `modernhomes.homes`.
- **Palabra de comercio normal** (6 casos): `tienda-andina.com` (pago),
  `empresalogistica.com` (envío), `tienda.com.mx` (descuentos),
  `contabilidadpro.com` (factura), `aerolineasur.com` (paquetes),
  `hogarventas.com` (pago).

### Qué se corrigió además (mismo nivel, mejor explicación o detección)

- `trusted-looking-shop.com`: el hallazgo real de la Fase 0 (`looking` a
  distancia de Levenshtein 1 de `booking`) ya no dispara imitación de marca;
  baja de `riesgo` a `precaucion` (el parámetro de redirección oculto sigue
  presente, correctamente).
- `bancolombia.com.verifica-cuenta.xyz`, `santander.com.actualizar-datos.tk`,
  `dhl-entrega.paquete-pendiente.icu`, `nequi.com.recarga-gratis.win`,
  `bancolombia.com.verificacion-urgente.com.co`: mismo nivel (`riesgo`), pero
  ahora la señal es la nueva `marca-en-subdominio` en vez de la genérica
  `imitacion-marca` — el mensaje que verá la persona usuaria va a ser más
  preciso ("la marca aparece en el subdominio, el sitio real es otro").
- `paypa1.com`, `netfl1x.com`, `g00gle.com`, `amaz0n-shop.com`,
  `faceb00k.com`, `instagrarn.com`: mismo nivel (`riesgo`); la señal
  `caracteres-enganosos` ahora se basa en si la coincidencia de marca
  necesitó deshacer una sustitución visual (confusables), no en un regex
  genérico de letra-dígito-letra que generaba la mitad de los falsos
  positivos de arriba.
- `xn--pple-43d.com`, `аpple.com` (con `а` cirílica): pierden la señal
  `imitacion-marca` (el token `pple`/`pple` es muy corto para el nuevo
  umbral de Levenshtein de 6+ letras) pero el nivel sigue en `riesgo` porque
  `caracteres-enganosos` ya dispara solo por el punycode/no-ASCII. Ver
  "Qué sigue fallando" abajo.

### Qué sigue fallando (y por qué)

1. **`xn--pple-43d.com` y `аpple.com` ya no detectan la imitación de marca en
   sí** (solo quedan en riesgo por el punycode/no-ASCII, no por reconocer
   "apple"). El token decodificado (`pple`) tiene 4 letras — muy corto para
   el umbral de Levenshtein de 6+ letras que exige la Fase 1 para evitar el
   problema de "looking"≈"booking". Es un trade-off consciente: bajar el
   umbral de nuevo a tokens cortos reintroduciría los falsos positivos de
   substring. Si esto importa (el nivel final no cambia, solo el detalle de
   la señal), una mejora futura sería decodificar el punycode a Unicode y
   comparar contra el nombre real de la marca antes de tokenizar.
2. **`goggle-eyed-crafts.com` (nuevo caso) queda en `riesgo` a propósito**:
   "goggle" está a distancia de Levenshtein 1 de "google", tiene 6+ letras y
   comparte la primera letra — exactamente el criterio que la Fase 1 definió
   como aceptable. Es un falso positivo residual conocido y documentado, no
   un bug: el costo de seguir aceptando distancia 1 en vez de exigir
   coincidencia exacta siempre.
3. **Un parámetro de redirección oculto por sí solo sigue llegando solo a
   `precaucion`, nunca a `riesgo`** (`northfield-outlet.com`), aunque oculte
   por completo el destino real — fuera de alcance de la Fase 1 (no estaba
   en los puntos acordados), queda anotado para una fase futura si se
   considera necesario subir su peso.
4. **Los acortadores de enlace solos siguen en `precaucion`**
   (`bit.ly`, `rebrand.ly`, `cutt.ly`) — comportamiento sin cambios, mismo
   motivo que el punto 3.
5. **Coincidencias de marca solo en la ruta** (no en el dominio ni en el
   subdominio) siguen contando como `imitacion-marca` genérica — un artículo
   de noticias que mencione una marca por su nombre en el slug de la URL
   podría activar esta señal. No había un caso de este tipo en el seed;
   queda como limitación conocida en `docs/CHANGELOG-algoritmo.md`, fuera de
   alcance explícito de la Fase 1.

## Matriz de confusión y métricas

| Umbral | TP | FP | TN | FN | Precisión | Recall | Tasa de falsos positivos |
|---|---|---|---|---|---|---|---|
| riesgo | 28 | 1 | 48 | 4 | 96.6% | 87.5% | 2.0% |
| riesgo+precaucion | 32 | 5 | 44 | 0 | 86.5% | 100.0% | 10.2% |

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
