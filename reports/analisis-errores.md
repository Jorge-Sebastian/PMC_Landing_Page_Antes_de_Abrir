# Análisis de errores — Paso 2 (solo entrenamiento)

Motor actual (sin cambios), corrido sobre el conjunto de **entrenamiento**
únicamente (14 127 casos: 170 phishing de OpenPhish + 13 957 legítimos de
Tranco/hosting gratuito). El conjunto de prueba (6 088 casos) no se tocó.
Destino real cuando había consulta a `check-link` cacheada (todas las
`liveTier:"live"`); offline para el resto del pool estático.

**El conjunto de prueba no se usó para ninguna decisión de este análisis.**

## Matriz de confusión

| Umbral | TP | FP | TN | FN | Precisión | Recall | Tasa de falsos positivos |
|---|---|---|---|---|---|---|---|
| `riesgo` | 25 | 271 | 13 686 | 145 | 8.4% | 14.7% | 1.9% |
| `riesgo`+`precaución` | 79 | 359 | 13 598 | 91 | 18.0% | 46.5% | 2.6% |

**El motor actual detecta solo el 14.7% del phishing real** al nivel
"riesgo" (46.5% si se cuenta "precaución" como alerta también). Esto
confirma de forma cuantitativa lo que ya se sabía de forma anecdótica
(3 de 5 URLs reales pasando sin señales): el problema es sistemático, no
un puñado de casos sueltos.

## Phishing no detectado: 91 de 170 (53.5%) en "sin-señales"; 54 más (31.8%) solo llegan a "precaución"

Solo 25 de 170 (14.7%) llegan de verdad a "riesgo". Categorías de los 91
casos en "sin-señales" (revisadas a mano, no solo con la heurística
automática):

| Categoría | Casos | % | 
|---|---|---|
| Hosting gratuito (dominio en un sufijo privado de la PSL) | 49 | 53.8% |
| Marca conocida en la URL/subdominio, pero no está en `brands.ts` | 18 | 19.8% |
| Página caída o sin respuesta real | 13 | 14.3% |
| Marca mencionada solo en el contenido (título), nunca en la URL | 3 | 3.3% |
| Posible cascarón de JavaScript (responde, sin título ni contenido visible) | 4 | 4.4% |
| Sin marca identificable / estafa genérica | 4 | 4.4% |

**La categoría dominante, por lejos, es hosting gratuito (53.8%).** Esto
valida directamente la prioridad que ya se había anticipado para el
Paso 3.

### Ejemplos — Hosting gratuito (49 casos)

1. `https://www.netflixcol.vercel.app/` — "netflix" aparece pegado a "col"
   sin separador, en un dominio `.vercel.app`.
2. `https://ledger-live-desktop-app-asc.pages.dev/` — imita a Ledger
   (billetera de criptomonedas) en `pages.dev`.
3. `https://theccguuy-delivery.netlify.app/` — imita a una empresa de
   paquetería, en `netlify.app`.

### Ejemplos — Marca en la URL pero no catalogada (18 casos)

1. `https://roblox.com.pt/users/.../profile` (título real: "Red - Roblox")
   — **Roblox no está en `brands.ts`.** De los 18 casos de esta categoría,
   **11 son variantes de Roblox** con ccTLD distinto (`.com.mu`, `.com.gr`,
   `.com.pt`, `.com.bi`, `.com.bn`, `.et`) — el patrón más repetido de
   todo el análisis después de "hosting gratuito".
2. `https://testing-chase-page.hostmora.app/` (título: "Chase") —
   **Chase Bank no está en `brands.ts`.** El token "chase" SÍ queda
   separado del resto por un guion (`testing-chase-page` →
   `testing`+`chase`+`page`); si la marca estuviera catalogada, ya se
   detectaría hoy sin ningún cambio de regla.
3. `https://adobe.promorange.co.uk/` (título: "Homepage | Adobe
   Merchandise") — **Adobe no está en `brands.ts`.** El patrón es
   "marca-en-subdominio" (`adobe.` sobre un dominio registrable ajeno,
   `promorange.co.uk`) — la señal ya existe, solo falta la marca en el
   catálogo.

### Ejemplos — Marca solo en el contenido, nunca en la URL (3 casos)

1. `https://meine-app.login-utilizator.de/portal/openlogin/` — el título
   dice "Willkommen bei MySantander - Online Banking". **Santander SÍ
   está en `brands.ts`**, pero ni el dominio ni la ruta mencionan la
   palabra "santander" en ningún lado — solo aparece en el contenido
   renderizado de la página.
2. `https://form.jotform.com/262591344749366` — título "Outlook"
   (Microsoft/Outlook SÍ está catalogado), pero la URL es solo un ID de
   formulario de JotForm, sin ninguna palabra relacionada.
3. `https://diskcacambasdetroit.com.br/auth/rackespace/` — título
   "Rackspace Webmail..." (Rackspace no catalogado), mismo patrón.

### Ejemplos — Página caída o sin respuesta real (13 casos)

1. `https://palet.com.ua/de/app/login.php` — responde pero sin contenido
   útil (título vacío).
2. `https://hanrahans.com/web?911ad` — sin respuesta real.
3. `https://clickblitz22.shop/` — sin respuesta real (`checked:false`).

### Ejemplos — Posible cascarón de JavaScript (4 casos)

1. `https://www.roblox.et/users/.../profile` — responde (200) pero sin
   título ni contenido de texto visible.
2. `https://val1dar3656.freepage.cc/` — responde, sin título.
3. `https://faecbook.vn/sakuarastudio-...` — responde, sin título. (Nota
   aparte: "faecbook" es "facebook" con dos letras **transpuestas**
   [intercambiadas de lugar], no sustituidas — eso cambia la distancia de
   Levenshtein estándar a 2, que la regla actual rechaza a propósito. Un
   hallazgo real que no estaba en la lista de candidatas original.)

### Ejemplos — Sin marca identificable / estafa genérica (4 casos)

1. `https://121jio.senes.at/stakings?...` — estafa de "staking" cripto
   genérica, sin ninguna marca reconocible.
2. `https://34abx.anixas.at:443/newtransfer` — título "Payout", mismo
   patrón genérico.
3. `https://warayana.com.pe/publicaciones/...` — título de un artículo de
   psicología, completamente benigno. Posible sitio legítimo comprometido
   que le muestra contenido distinto a un visitante humano que a la
   comprobación automática (*cloaking*) — no hay forma de confirmar esto
   sin abrir el enlace de verdad, algo que este proyecto no hace a
   propósito.

## Falsos positivos: 359 de 13 957 legítimos (2.6%)

| Señal(es) | Casos | % |
|---|---|---|
| `imitacion-marca` | 174 | 48.5% |
| `dominio-sospechoso` | 74 | 20.6% |
| `otra-web-oculta` | 68 | 18.9% |
| `caracteres-enganosos` (dominios internacionalizados) | 12 | 3.3% |
| `enlace-acortado` | 10 | 2.8% |
| Combinaciones menores | 21 | 5.8% |

### `imitacion-marca` (174 casos, la categoría más grande) — no es un problema de la regla, es de catálogo

Ejemplos: `amazon.co.uk`, `google.cn`, `amazon.ca`, `amazon.in`,
`google.com.hk`. **Son dominios reales y oficiales de Amazon y Google**,
pero `brands.ts` solo tiene catalogados `amazon.com/.es/.mx/.br/.ar` y
`google.com/.com.mx/.es`. Cualquier variante de país no listada se marca
como imitación porque contiene el token exacto de la marca y no está en
`domains`. Esto se arregla ampliando la lista de dominios oficiales, sin
tocar ninguna regla de coincidencia.

### `otra-web-oculta` (68 casos) — redirecciones legítimas a otro dominio de la misma empresa

Ejemplos: `amazonaws.com`, `mail.ru`, `twitter.com` (redirige a `x.com`),
`office.com` (redirige a Microsoft 365), `live.com`. El mismo patrón que
ya se vio en producción con `nic.co` → `gobernanzadeinternet.mintic.gov.co`:
una redirección real y legítima a otro dominio sigue contando como peso 3
("riesgo" directo) sin excepción. Con 68 casos en el entrenamiento, esto
confirma que no fue un caso aislado — es sistemático.

### `dominio-sospechoso` (74 casos) — mezcla de dos cosas distintas

Ejemplos: `wa.link` (acortador oficial de WhatsApp), `lnkd.in` (dominio
oficial de LinkedIn, que además es acortador), y dominios de contenido
para adultos o apuestas que son reales y populares pero no "phishing"
(`arabx.cam`, `xxxvideo.link`). Dos problemas distintos: (1) un dominio
oficial de una marca catalogada que *también* es un acortador no se salva
de `enlace-acortado`/`dominio-sospechoso` — `isOfficialHost` solo protege
contra `imitacion-marca`, no contra el resto de las señales; (2) la lista
de TLD sospechosos sigue capturando sitios reales (no phishing) que usan
esos TLD por otros motivos.

### `caracteres-enganosos` (12 casos) — dominios internacionalizados legítimos

Ejemplos: `xn--ngstr-lra8j.com`, `xn--mgbkt9eckr.net`. Son nombres de
dominio reales en otros alfabetos (codificados en punycode porque así
funciona el DNS, no porque intenten engañar a nadie). La regla actual no
distingue "domino internacionalizado legítimo" de "homoglifo usado para
imitar una marca latina" — ambos usan punycode.

## Limitaciones de este análisis

- Las categorías de phishing no detectado que necesitan juicio humano
  ("marca no listada" vs. "marca solo en contenido" vs. "sin marca") se
  revisaron leyendo cada una de las 29 URLs a mano — no son producto de
  una regla automática, así que podrían tener algo de subjetividad.
- Las legítimas de Tranco son en su enorme mayoría sitios grandes,
  establecidos y antiguos — la composición del pool estático **no**
  representa bien a comercios pequeños o negocios reales recién creados.
  Esto importa especialmente para cualquier señal basada en la edad del
  dominio: el pool legítimo prácticamente no tiene ejemplos de "negocio
  real con dominio joven" para medir ese falso positivo específico.
- El "cloaking" (mostrarle contenido distinto al bot de `check-link` que
  a una persona real) no se puede detectar ni descartar con este método:
  si existe, hace que algunos "sin marca identificable" en realidad sean
  casos con marca, pero invisibles desde aquí.

## Qué sigue (Paso 3)

Los datos respaldan con fuerza, en este orden de impacto:
1. **Hosting gratuito** (53.8% de los no detectados) — candidata (a) del
   plan original, la de mayor prioridad con evidencia real.
2. **Marca al inicio de un token de 6+ letras sin separador** (valida
   `netflixcol.vercel.app` y similares) — candidata (b).
3. **Contenido del destino: título/marca** (valida los 3 casos de "marca
   solo en el contenido") — parte de la candidata (c).
4. **Ampliar `brands.ts`** con Roblox, Chase, Adobe, Spotify y los
   dominios de país faltantes de Amazon/Google — no es una señal nueva,
   es completar catálogo, y por sí solo resolvería 18 de los no detectados
   y la mayoría de los 174 falsos positivos de `imitacion-marca`.
5. Nuevo hallazgo a evaluar con cuidado: **transposición de letras
   adyacentes** (`faecbook` vs `facebook`) — no estaba en la lista
   original, un solo caso real no alcanza para decidir si vale la pena.

No se tocó código de detección en este paso — solo se corrió el motor
actual y se leyeron los resultados.
