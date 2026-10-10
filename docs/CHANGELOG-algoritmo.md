# Changelog — motor de análisis de enlaces (rama `samuel`)

Decisiones, limitaciones conocidas y qué cambió en cada fase del trabajo sobre
`src/lib/link-analysis/` y `supabase/functions/check-link/`. No se tocan
componentes de UI ni el esquema/seed de la base de datos (salvo los stubs de
contrato documentados en `docs/CONTRATO.md` a partir de la Fase 1).

## Limitaciones conocidas, fuera de alcance a propósito

### DNS rebinding en `check-link` (fuera de alcance, no se implementa)

`supabase/functions/check-link/index.ts` bloquea hosts peligrosos por el
**texto** del hostname (`blockedHostReason`): rechaza `localhost`, sufijos
como `.internal`/`.local`, e IPs literales privadas. Lo que **no** valida es
la IP a la que realmente resuelve el DNS de un hostname público que parece
normal. Un atacante puede registrar un dominio público cuyo registro DNS
apunte a `127.0.0.1` o a una IP interna (DNS rebinding), y ese dominio pasaría
el filtro de `blockedHostReason` porque el filtro solo mira el string del
host, no la IP real que `fetch()` termina usando.

Esto ya estaba documentado de forma general en el `README.md` del proyecto
("El bloqueo actual de direcciones literales y nombres locales no valida las
IP resultantes de DNS"). Queda explícitamente **fuera de alcance** de este
trabajo por decisión del 2026-10-10.

**Arreglo sugerido para cuando se aborde:** antes de cada `fetch` (en el
primer salto y en cada redirección), resolver el hostname con
`Deno.resolveDns(hostname, "A")` (y `"AAAA"` si aplica) y validar cada IP
devuelta con la misma lógica que ya existe para IPs literales
(`isPrivateIpv4` / `isPrivateIpv6`) antes de permitir la petición. Si alguna
IP resuelta es privada/reservada, tratar el host como bloqueado igual que un
host literal. Esto cierra el DNS rebinding sin cambiar el contrato público de
la función.

## Nota de entorno — versión de pnpm (2026-10-10)

`package.json` declaraba `"pnpm": "8.6.12"` en devDependencies, pero el
`pnpm-lock.yaml` del repo está en `lockfileVersion: '9.0'`, formato que solo
genera pnpm v9+. Instalar con pnpm 8.x reescribe el lockfile entero a formato
6 y re-resuelve todas las versiones (lo vimos de primera mano en la Fase 0).
Se corrigió el campo a `"pnpm": "9.15.9"` para que coincida con el formato
real del lockfile. **Martín y Jorge:** usen pnpm 9.x (`corepack use pnpm@9` o
`npx pnpm@9 install`) para no reescribir el lockfile sin querer.

## Fase 0 — banco de pruebas offline (2026-10-10)

**Qué se agregó:**

- `scripts/eval/`: runner offline (`run.ts`) + utilidades (`lib/dataset.ts`,
  `lib/report.ts`) que corren el motor estático actual (`buildVerdict` con
  `destination.checked:false`) sobre un dataset JSONL y reportan matriz de
  confusión, precisión, recall y tasa de falsos positivos en dos umbrales
  (`riesgo` solo, y `riesgo+precaucion`). Sale con código 1 si algún caso con
  `expect` definido no coincide con el resultado real.
- `scripts/eval/data/seed.jsonl`: 78 casos escritos a mano (45 legítimos, 33
  de phishing), con `label`, `source`, `note` y, cuando el comportamiento es
  estable y no depende de los cambios planeados en la Fase 1, un `expect` que
  ancla el resultado actual como regresión.
- `reports/baseline.md` / `reports/baseline.json`: resultado de correr el
  dataset semilla contra el motor **sin modificar**. Esta es la referencia
  para medir el efecto de la Fase 1 en adelante.
- `vitest` y `tsx` como dependencias de desarrollo (mínimas, sin archivo de
  configuración adicional). `pnpm test` corre los tests unitarios; `pnpm eval`
  corre el runner offline.
- `src/lib/link-analysis/build-verdict.test.ts`: 6 tests sobre las reglas de
  combinación de `buildVerdict` que no cambian con la Fase 1 (bypass de
  dominio oficial, "una señal fuerte basta", suma de señales débiles hasta el
  umbral, destino no comprobado no agrega señales, y la regla de combinación
  de `pide-datos` con/sin host distinto). El presupuesto total acordado es de
  ~15 tests en todo el trabajo; el resto se agrega en las fases donde el
  código que prueban deja de cambiar (matching de marca tras la Fase 1,
  parseo de edad RDAP en la Fase 2, extracción de señales del HTML en la
  Fase 3).

**Recortes de alcance decididos (no son bugs, son decisiones):**

- Sin modo `--network`: el runner nunca llama a `check-link`; la comprobación
  real del destino se prueba a mano al desplegar.
- `scripts/` no tiene `tsconfig.scripts.json` ni bloque de ESLint propio: está
  excluido del lint (`eslint.config.js`) y no se typechequea como parte del
  proyecto; se ejecuta directo con `tsx`.
- `scripts/eval/fetch-datasets.ts` (para traer feeds públicos tipo
  OpenPhish/Tranco) queda pendiente y es opcional — no se construyó en esta
  fase.

**Hallazgos reales del dataset semilla (no hipotéticos, confirmados corriendo
el motor actual):**

- `imitacion-marca` no solo falla por coincidencia de substring (`pineapple`
  contiene `apple`, `visacard` contiene `visa`): la distancia de Levenshtein
  (≤2) también dispara con palabras comunes del idioma que casualmente caen
  cerca de una marca. Ejemplo encontrado al construir el dataset:
  `trusted-looking-shop.com` — el token `looking` está a distancia de
  Levenshtein 1 de la marca `booking`, así que se marca como imitación de
  marca sin que el dominio tenga nada que ver con Booking.com. Ver
  `scripts/eval/data/seed.jsonl` (fuente `manual:levenshtein-common-word-fp`).
- Una palabra de presión puede aparecer como substring de una palabra inocente
  (`"regalos"` contiene `"regalo"`), igual que las marcas. Es el mismo patrón
  de bug en dos listas distintas.
- Un parámetro de redirección oculto (`direccion-manipulada`, peso 2) por sí
  solo hoy solo llega a "precaución", nunca a "riesgo", aunque oculte por
  completo el destino real — a menos que el texto del destino oculto contenga
  además una palabra sensible como "login" (caso real:
  `newsportal-daily.com/click?next=http://phishy-login.cf/auth`, que sí llega
  a "riesgo" vía la regla de combinación `pide-datos`).

**Resultado del baseline** (ver `reports/baseline.md` para el detalle completo
por caso): con el umbral `riesgo` solo, precisión 70.7%, recall 87.9%, tasa de
falsos positivos 26.7%, sobre 78 casos. Con el umbral `riesgo+precaucion`,
recall 100% pero precisión 55.0% y tasa de falsos positivos 60.0% — la mitad
de lo que hoy se marca como "alguna alerta" sobre un dominio legítimo termina
en falso positivo. Esta es la referencia que la Fase 1 debe mejorar.

## Fase 1 — reducir falsos positivos + contrato/handoff (2026-10-10)

**Resultado** (detalle completo y comparación caso por caso en
`reports/after-fase1.md`): con el umbral `riesgo`, precisión 70.7%→**96.6%**,
recall 87.9%→87.5% (caída de 0.4 puntos, dentro del límite de 2 acordado),
tasa de falsos positivos 26.7%→**2.0%**. Con `riesgo+precaucion`, precisión
55.0%→**86.5%**, falsos positivos 60.0%→**10.2%**, recall se mantiene en
100%. 24 dominios legítimos del seed dejan de marcarse como riesgo o
precaución.

**Qué se cambió:**

- `detectBrandImitation` → `findBrandMatch` (`analyze-url.ts`): coincidencia
  por token completo. Se quitó por completo el `.includes()` sobre texto
  libre que causaba los falsos positivos de substring (`pineapple`⊃`apple`,
  `visacard`⊃`visa`...). La aproximación ahora es, en orden: (1) exacta, (2)
  exacta tras normalizar confusables (`0`→`o`, `rn`→`m`, `vv`→`w`, y `1` que
  se prueba como `l` e `i`, solo sobre los caracteres que de verdad aparecen
  en el token — nunca se tocan letras ya correctas), (3) como último
  recurso, Levenshtein distancia EXACTAMENTE 1, solo para tokens de 6+
  letras, y solo si token y marca comparten la primera letra. Nunca
  distancia 2. Esto es más estricto que el pedido original (5+ letras, sin
  exigir primera letra) por el hallazgo de la Fase 0: con las reglas
  viejas, `trusted-looking-shop.com` marcaba imitación de marca porque
  `looking` cae a distancia 1 de `booking` — una palabra común del idioma,
  no un typosquat.
- El dominio/subdominio/ruta se tokenizan por DOS vías combinadas: separando
  solo por símbolos no alfanuméricos (conserva dígitos pegados, para
  detectar sustituciones tipo `amaz0n`→`amazon`) y separando también por
  dígitos (para aislar una marca de un sufijo/prefijo numérico, p. ej.
  `paypal2024`→`paypal`).
- El patrón `/[a-z]\d+[a-z]/i` (que marcaba `f1news.com`, `g2esports.com`,
  `web3dev-studio.com`, `s3backup-tools.com` como "caracteres engañosos" sin
  ningún motivo real) se eliminó. La señal `caracteres-enganosos` ahora solo
  se agrega por esa vía cuando la coincidencia de marca dependió de
  normalizar un confusable — es decir, cuando de verdad hubo una sustitución
  visual, no por cualquier dígito en el nombre.
- Nueva señal `marca-en-subdominio` (peso 3): cuando la marca aparece en el
  SUBDOMINIO (no en el dominio registrable), como en
  `bancolombia.com.verifica-cuenta.xyz`. Mismo peso que `imitacion-marca`,
  mensaje más preciso. No cambia ningún nivel ya calculado (solo reemplaza
  el id de la señal en esos casos), así que no hay regresión posible por
  este cambio.
- `PRESSURE_WORDS` se separó en `STRONG_PRESSURE_WORDS` (alarma/urgencia:
  bloqueado, suspendida, cancelado, urgente, premio, sorteo, ganaste...,
  cuentan solas, peso 2 sin cambios) y `COMMERCIAL_PRESSURE_WORDS`
  (vocabulario normal de comercio: pago, factura, envío, descuento,
  paquete, gratis, regalo, bono, pendiente — ya no cuentan solas, solo
  combinadas con otra señal ya presente, mismo patrón que `SENSITIVE_WORDS`/
  `pide-datos`).
- `SUSPICIOUS_TLDS` se depuró con una fuente citada y fechada (Interisle
  Consulting Group, *Phishing Landscape 2025*, mayo 2024–abril 2025: TLDs
  con mayor "Phishing Score" por cada 10 000 dominios delegados — `.xin`
  10 810, `.bond` 1 759, `.cfd` 747.8, `.icu` 459.4, `.help`/`.win` también
  altos; `.com` como referencia tiene 30). Se sacaron `.fit`, `.surf`,
  `.bar`, `.beauty`, `.skin`, `.autos`, `.boats`, `.homes`, `.makeup`: gTLD
  genéricos usados hoy por negocios reales, sin evidencia de abuso fuera de
  lo común, y confirmados como falsos positivos por el banco de pruebas.
  Ver `src/lib/link-analysis/brands.ts` para las fuentes completas.
- `splitHost` ahora usa la Public Suffix List real vía `tldts`
  (`allowPrivateDomains: true`), reemplazando la lista manual
  `MULTI_PART_SUFFIXES` (que no cubría la mayoría de los ccTLD reales).
  `x.web.app` y `y.github.io` cuentan como dominios registrables distintos
  entre sí. `tldts` se probó primero con un script de inspección directo
  (no hizo falta la ruta de respaldo de lista fija: funciona igual de bien
  en Node que en el navegador; la verificación específica en Deno para
  `check-link` queda para cuando la Fase 2 la necesite de verdad, vía RDAP).
- Contrato y handoff (ver `docs/CONTRATO.md`, `docs/handoff/`): tipos
  aditivos en `types.ts` (`OfficialMatch`, `Verdict.officialMatch`, campos
  nuevos de `DestinationCheck` para las Fases 2/3, `DestinationStatus`),
  `analyzeStatic`/`finalizeVerdict` (refactor en dos tiempos de
  `buildVerdict`, pequeño, no rompe nada), `allowlist.ts` con
  `OfficialDomainsSource` (implementación temporal sobre `brands.ts`), el
  stub `lookupPopular` en `supabase/functions/check-link/lib/popular-domains.ts`,
  las fixtures en `__fixtures__/mock-results.ts`, y
  `docs/handoff/{MARTIN-allowlist,JORGE-front}.md`.
- El estado informativo "dominio oficial" (regla no negociable del proyecto)
  quedó implementado de verdad en esta fase, no solo documentado: todo
  `Verdict` trae `officialMatch` cuando el dominio coincide con uno conocido.

**Qué sigue fallando, documentado a propósito (no corregido en esta fase):**

- `xn--pple-43d.com` / `аpple.com` (homoglifo cirílico): ya no reconocen la
  marca "apple" en sí (el token decodificado es muy corto para el umbral de
  6+ letras), aunque el nivel sigue en `riesgo` por el punycode/no-ASCII
  independientemente. Ver el detalle en `reports/after-fase1.md`.
- Coincidencias de marca solo en la RUTA (no en el dominio ni el
  subdominio) siguen contando como `imitacion-marca`: un artículo de
  noticias que mencione una marca en el slug de la URL podría disparar la
  señal. No se tocó porque reducir la confianza en esos matches no estaba
  en el alcance acordado de la Fase 1 y arriesgaba bajar el recall contra
  ataques reales que sí usan la ruta para esconder la marca.
- Un parámetro de redirección oculto por sí solo (`direccion-manipulada`,
  peso 2) sigue sin alcanzar `riesgo` por sí mismo, igual que antes de la
  Fase 1 — no estaba en los puntos acordados para este trabajo.
- `goggle-eyed-crafts.com` (a propósito, no es un bug): "goggle" cae a
  distancia de Levenshtein 1 de "google", mismo largo (6+) y misma primera
  letra — el residuo exacto que la regla de Fase 1 decidió aceptar como
  costo de seguir permitiendo distancia 1 en vez de exigir coincidencia
  exacta siempre.

## Fase 2 — edad de dominio vía RDAP (2026-10-10)

**Análisis previo (pedido antes de escribir código):** de los 4 casos de
phishing del seed que no llegaban a `riesgo` en `after-fase1.md` (12.5% de
recall perdido), 3 son casos de "el destino real es malo" que `check-link`
ya resuelve en producción vía `otra-web-oculta` (peso 3) — el eval offline
no puede verlo porque nunca llama a `check-link` de verdad, no porque el
motor tenga un hueco. Solo 1 (`bit.ly/3xK9z1`, que ya sumaba 4) se resuelve
con la señal de dominio nuevo por sí sola, al cruzar el umbral de puntaje
(4+2=6). El detalle completo está en `reports/after-fase2.md`.

**Qué se cambió:**

- Señal `dominio-nuevo` (peso 2, `build-verdict.ts`): se agrega cuando
  `domainAgeDays < 30`, independiente de `checked` (RDAP puede responder
  aunque el sitio no sea alcanzable por HTTP, o al revés). `null`/`undefined`
  nunca agrega nada — nunca mejora ni empeora el veredicto por falta de
  dato. Diseño DELIBERADAMENTE distinto al de la propuesta original (que
  tenía 3 escalones de peso 1/2/3 según la edad): esa versión permitía que
  un dominio nuevo, por sí solo, llegara a "riesgo" con el escalón de peso
  3 — lo que contradice la regla acordada "dominio nuevo solo → máximo
  precaución". Se simplificó a un solo escalón (<30 días, peso 2) para que
  esa regla sea verdad por construcción, no por casualidad.
- `supabase/functions/check-link/lib/rdap.ts`: `lookupDomainAge` (bootstrap
  de IANA en `https://data.iana.org/rdap/dns.json`, caché de 24h en
  memoria, timeout de 3s) y `parseRegistrationAge` (pura). La consulta del
  host ORIGINAL corre en paralelo con `followRedirects`; si el host FINAL
  es un dominio registrable distinto, se consulta aparte (es la edad que
  importa: a dónde termina llegando la persona). Sin imports externos, para
  poder testear toda la lógica con `fetch` simulado, fuera de Deno.
- `lib/registrable-domain.ts`: dominio registrable aproximado con una lista
  fija corta de sufijos de dos partes, **solo** para decidir qué dominio
  preguntarle a RDAP. Decisión explícita: no hay Deno instalado en este
  entorno de desarrollo, así que no se pudo verificar que `npm:tldts` o
  `esm.sh/tldts` carguen bien en el runtime de las Supabase Edge Functions.
  En vez de arriesgar una dependencia sin verificar en producción, se usa
  esta lista — la misma que tenía el motor del cliente antes de la Fase 1.
  Si en el futuro se confirma que `tldts` carga bien ahí, se puede
  reemplazar sin cambiar la firma de `registrableDomainFor`.
- `index.ts`: deadline global de 8s (bajo los 9s de `check-destination.ts`)
  envolviendo todo el trabajo (redirecciones + RDAP) en un `Promise.race`;
  si no termina a tiempo, responde `{ok:false, reason:"unavailable"}` en
  vez de dejar al cliente esperando. No cancela las conexiones de red en
  curso (eso requeriría enganchar un `AbortController` dentro de
  `followRedirects`, fuera de alcance de esta fase) — solo garantiza que la
  RESPUESTA llegue a tiempo.
- `scripts/eval/`: el JSONL acepta `domainAgeDays` opcional; el runner lo
  inyecta como destino simulado para poder probar las reglas de
  combinación offline. El reporte deja explícito que esas cifras prueban
  reglas, no RDAP real.
- Presupuesto de tests subido a ~30 (acordado este turno): 15 nuevos sobre
  funciones puras (parseo RDAP, `registrableDomainFor`, las 2 reglas de
  combinación de dominio nuevo).

**Qué no se pudo verificar en este entorno (queda para el despliegue real):**

- Todo lo de Deno/`check-link` en ejecución real: el deadline global, el
  paralelismo RDAP + redirecciones, y si el bootstrap de IANA responde
  dentro del timeout en la práctica. No hay Deno instalado en este entorno
  de desarrollo. Mismo patrón que el resto de `check-link` desde la Fase 0:
  se prueba a mano al desplegar.
- Si `npm:tldts`/`esm.sh/tldts` cargan en el runtime real de Supabase Edge
  Functions — por eso se usó la lista fija corta en `registrable-domain.ts`
  en vez de arriesgarlo.

**Verificación posterior (2026-10-10), pedida antes de pasar a la Fase 3:**

- Confirmado leyendo el código: la señal de dominio nuevo ya usaba la edad
  del host FINAL cuando la redirección lleva a un dominio registrable
  distinto del original (`resolveDomainAge` en `lib/response.ts`, antes
  esa decisión vivía inline en `index.ts`). No hacía falta corregir nada,
  pero esa lógica no tenía ningún test porque `index.ts` no se puede
  importar en un test (ejecuta `Deno.serve` al cargarse). Se extrajo a
  `lib/response.ts` (`resolveDomainAge` + `buildSuccessBody`, puras, sin
  imports externos) y se agregó `response.test.ts` con el caso acortador
  (host original viejo, destino nuevo) y el caso de fallo de RDAP
  (`domainAgeDays: null` sin afectar `redirects`, `title`, etc.).
- Presupuesto de tests: 34/40 (se usaron 4 de los ~10 reservados para la
  Fase 3, en esta verificación).

### Checklist de pruebas manuales de `check-link` (para llenar al desplegar)

Nadie en este entorno de desarrollo puede ejecutar Deno ni desplegar la
función — todo lo de abajo se prueba a mano contra la función ya
desplegada. Completar las columnas vacías.

| # | Categoría | URL sugerida (ajustar si hace falta) | Edad RDAP (días) | Tiempo de respuesta | Veredicto final |
|---|---|---|---|---|---|
| 1 | `.com` viejo | `https://www.amazon.com` | | | |
| 2 | `.co` | cualquier `.co` real a mano | | | |
| 3 | `.com.co` | `https://www.mercadolibre.com.co` | | | |
| 4 | Reciente, del feed de OpenPhish | tomar una URL activa de `openphish.com/feed.txt` en el momento de probar (el feed cambia todo el tiempo, no se puede dejar una fija aquí) | | | |
| 5 | Acortador | un enlace corto propio (bit.ly/tinyurl) apuntando a un sitio conocido | | | |
| 6 | No resuelve | `https://esto-no-existe-de-verdad-12345.com` | | | |

Qué mirar en cada fila: si "Edad RDAP" sale `null` en vez de un número,
anotar por qué (sin servidor RDAP para ese TLD, 404, timeout) en una
columna extra si hace falta. "Tiempo de respuesta" es para confirmar que
nunca se acerca a los 9s del cliente (el deadline global es de 8s). El
"Veredicto final" es el nivel que muestra la app (riesgo/precaución/sin
señales), no solo la señal de dominio nuevo.

## Hallazgos de la prueba en producción (2026-10-10, rama `fix/destino-y-marcas`)

Dos casos reales encontrados al probar la Fase 2 ya desplegada. Corregidos
**solo del lado del cliente** (sin tocar `check-link`, que no se puede
volver a desplegar en este momento). Detalle completo y métricas en
`reports/after-fix-produccion.md`.

### `g2.com` salía en "precaución" solo por `destino-no-responde`

**Causa real:** `g2.com` (sitio real) bloquea la visita automática del
backend con una respuesta HTTP de bloqueo (403/429, típico de sitios que
filtran tráfico de bots). `build-verdict.ts` no distinguía esa respuesta de
"el sitio contestó con un error real" — las trataba igual, ambas sumaban
peso 2 vía `destino-no-responde`.

Investigado antes de tocar código: `check-link` SÍ distingue internamente
estos dos casos — una respuesta HTTP (aunque sea de error) llega como
`{ok:true, reachable:false, status:<código real>}`; la ausencia total de
respuesta (host que no resuelve, conexión rechazada) llega como
`{ok:false, reason:"unavailable"}`, una forma de respuesta completamente
distinta. Son distinguibles desde el cliente: `checked:true` con
`reachable:false` y un `status` numérico (respuesta HTTP real) vs.
`checked:false` (nunca hubo respuesta).

**Hallazgo adicional no asumido originalmente:** antes de esta corrección,
el caso "sin respuesta en absoluto" (`checked:false`) no sumaba **nada**
(0, no 2) — la señal `destino-no-responde` vivía dentro de un
`if (destination.checked)` y por lo tanto nunca se evaluaba cuando
`checked` era `false`. Solo el caso "hubo una respuesta HTTP de error"
(`checked:true, reachable:false`) sumaba peso 2. Es decir, la premisa de
"bajar de 2 a 1" se cumple en espíritu (quedó en 1) aunque el punto de
partida real era 0, no 2.

**Corrección:** tres casos distintos ahora en `build-verdict.ts`:
- Respuesta HTTP de bloqueo (401/403/405/406/429/451/5xx): nota
  informativa neutra, señal nueva `destino-verificacion-bloqueada`
  (peso 0, no suma nada).
- Respuesta HTTP de error que NO es un bloqueo típico (p. ej. 404): sigue
  igual que antes, `destino-no-responde` (peso 2, sin cambios).
- Sin ninguna respuesta (`checked:false` y `reason:"unavailable"`): señal
  nueva `destino-inalcanzable` (peso 1).

### `youtuve.com` salía "sin señales"

**Causa real confirmada antes de tocar código:** `youtube.com` SÍ estaba en
`brands.ts`, pero solo en la lista `domains` de la marca Google (para
reconocer que un enlace a ese dominio es oficial). La palabra clave
`"youtube"` **nunca estuvo** en la lista `keywords` de esa marca (solo
`google`, `gmail`, `g00gle`) — la detección de imitación de marca compara
contra `keywords`, no contra `domains`. No era un fallo de la regla de
coincidencia aproximada (Levenshtein/primera letra/6+ letras): el token
`youtuve` nunca llegó a compararse contra nada parecido a "youtube" porque
esa palabra no existía en ningún lado de la lista.

**Corrección:** se agregó `"youtube"` a las keywords de Google, y se
agregaron 7 marcas colombianas que faltaban por completo (ni keyword ni
dominio): Davivienda, Banco de Bogotá, PSE, DIAN, Servientrega,
Interrapidísimo, Coordinadora. **Las 7 se verificaron visitando cada sitio
oficial antes de agregarlo** (navegador, el 2026-10-10) — ninguna quedó sin
verificar: davivienda.com, bancodebogota.com, pse.com.co, dian.gov.co,
servientrega.com, interrapidisimo.com, coordinadora.com.

No se agregó ninguna regla de "nombre aleatorio" (p. ej. para dominios como
`dhsfdfkjhsdkljf.com`): aumentaría los falsos positivos y aporta poco,
según lo acordado.

**Tests:** 2 nuevos (presupuesto 36/40): bloqueo 403 solo no produce
`precaucion`; host sin respuesta solo no produce `precaucion`.
