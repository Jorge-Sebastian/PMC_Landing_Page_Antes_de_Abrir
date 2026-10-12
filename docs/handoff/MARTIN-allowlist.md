# Handoff para Martín — allowlist de dominios en base de datos

Pega este documento completo como primer mensaje en tu propia sesión de
Claude Code, en este mismo repositorio. No asumas que quien lo lee (vos o
la IA) vio ninguna conversación anterior — todo lo que necesitás saber
está acá o en los archivos que se mencionan.

**Primer mensaje sugerido después de pegar esto:** "lee este documento y
`docs/CONTRATO.md`, dime tu plan antes de escribir código".

## El proyecto

"Antes de Abrir" es una herramienta que analiza un enlace o mensaje y dice
si tiene señales de phishing — ingeniería social, no malware. La premisa
es específica: **detectar enlaces NUEVOS que las listas negras conocidas
todavía no tienen fichados**, no reemplazar un antivirus ni una blacklist
comercial. El motor nunca dice "seguro": como mucho dice "sin señales",
que significa "no encontramos nada", no "está confirmado como inofensivo".

Tres personas, tres partes:
- **Samuel** — el algoritmo de detección (`src/lib/link-analysis/`) y el
  backend que comprueba destinos (`supabase/functions/check-link/`).
- **Martín (vos)** — sacar el catálogo de marcas de un archivo estático a
  una tabla real en base de datos, con gobernanza, y una segunda señal de
  "qué tan popular es este dominio" que hoy no existe.
- **Jorge** — el frontend.

## Arquitectura (simple, pero con una trampa)

- El frontend se despliega en Vercel. El análisis **estático** (estructura
  de la URL, catálogo de marcas, TLD sospechosos, etc.) corre entero en el
  navegador, sin red — eso nunca necesita backend.
- `check-link` (la parte que de verdad visita el destino del enlace, mide
  redirecciones, edad de dominio, etc.) es una Edge Function que vive en
  **el proyecto de Supabase del equipo** (ref `tzweryoduyrsbvnzjqmb`), no
  en un proyecto administrado por nadie externo.
- **La trampa:** son DOS despliegues independientes. Mergear a `main`
  actualiza la página en Vercel automáticamente. `check-link` **NO** se
  redespliega solo — alguien tiene que correr el comando a mano, y por
  ahora esa persona es **solo Samuel** (ver `docs/DEPLOY.md`). Si tocás
  algo dentro de `supabase/functions/check-link/`, tu cambio no llega a
  producción hasta que se lo pidas a Samuel y él lo redespliegue.
- El proyecto de Supabase está en el plan gratis: **se pausa solo por
  inactividad**. Si `check-link` deja de responder después de unos días
  sin uso, no es necesariamente un bug — primero revisá si el proyecto
  está pausado en el panel de Supabase.

## Decisiones ya tomadas (y por qué) — no las reabras sin avisar

- **Nunca decir "seguro".** Es la regla de más peso de todo el proyecto.
  `"sin-senales"` = no encontramos nada, no "confirmado inofensivo".
- **La falta de datos nunca mejora el veredicto.** Si no se pudo comprobar
  el destino, la edad del dominio, o lo que sea, eso nunca hace que un
  enlace parezca MÁS seguro. En el peor caso es neutro.
- **El contrato (`docs/CONTRATO.md`) siempre es aditivo.** Se agregan
  campos opcionales nuevos; nunca se renombra ni se quita algo que ya usa
  otra parte del código.
- **El texto de cada señal vive en `src/lib/link-analysis/signals.ts`**,
  no en `public/locales/es.json`. Es a propósito (ver `CodeGuideline.md`):
  los identificadores de señal son dinámicos y el sistema de traducción
  exige claves literales, así que no puede vivir ahí.
- **Los dominios se comparan por dominio REGISTRABLE, con la Public
  Suffix List real** (vía la librería `tldts`), nunca por substring ni por
  una lista de sufijos escrita a mano. Esto es importante para vos: es
  exactamente lo que te permite distinguir `x.vercel.app` de `y.vercel.app`
  como dos dominios registrables distintos, no "subdominios de vercel.app".
- **Una señal de "no responde" nunca suma puntaje por sí sola.** Necesita
  combinarse con otra señal real para contar. Un sitio real puede fallar
  solo (bloqueo de bots, error pasajero) sin que eso sea evidencia de nada.
- **Los pesos de las señales son ENTEROS, elegidos con una búsqueda pequeña
  + validación cruzada sobre datos de entrenamiento — no con una regresión
  estadística completa.** Se intentó una regresión logística y sus
  coeficientes salían inestables con pocos ejemplos positivos; se
  descartó esa técnica a favor de probar combinaciones de enteros y medir
  con validación cruzada cuál generaliza mejor. Esto importa para vos
  porque tu trabajo (gobernanza de catálogo) alimenta señales que
  funcionan con esta lógica de pesos enteros, no con probabilidades
  continuas.
- **`pnpm@9` siempre**, nunca `pnpm` a secas ni `npm`/`yarn` (hay un
  desajuste de formato de lockfile con versiones más viejas de pnpm que ya
  causó un problema real). **Merge commits**, no squash ni rebase, al
  integrar un PR a `main`.

## Qué se hizo y qué se aprendió (resumen honesto)

El motor empezó con reglas escritas a mano, afinadas contra un banco de
~99 casos armados también a mano ("el seed"). Contra ese seed, el recall
en el nivel "riesgo" llegaba a ~90%. Esa cifra era optimista: el seed se
diseñó para cubrir patrones ya conocidos, no para medir qué tan bien
funciona el motor contra phishing real y nuevo.

Se armó un banco de datos real (feed de OpenPhish + lista de popularidad
Tranco), separado 70/30 por dominio registrable (función fija basada en
hash, no por orden de descarga, para que agregar URLs después no
reordene qué quedó en cada lado) en entrenamiento y prueba. **La prueba
quedó congelada hasta el final — ninguna decisión de catálogo, señal o
peso se tomó mirándola.**

Resultado final, medido UNA sola vez sobre esa prueba congelada
(`reports/final.md`), comparado contra el motor de antes de esta
iniciativa, con intervalo de confianza del 95% (hay ~129 phishing en la
prueba, el margen es amplio):

| Umbral | Recall antes | Recall ahora | FPR antes | FPR ahora |
|---|---|---|---|---|
| riesgo | 23.3% | **46.5%** [38.1%, 55.1%] | 2.2% | **1.7%** [1.4%, 2.1%] |
| riesgo + precaución | 55.0% | **69.0%** [60.6%, 76.3%] | 2.8% | **2.4%** [2.0%, 2.8%] |

El recall casi se duplicó y la tasa de falsas alarmas **bajó**, no subió.

Señales que sobrevivieron (con peso bajo a propósito, pesos completos en
`reports/final-paso4.md`): detectar que un sitio vive en hosting gratuito
(vercel.app, netlify.app, github.io...) y detectar un campo de contraseña
en un dominio sin reputación (hosting gratuito o recién registrado).
Ninguna de las dos alerta por sí sola — necesitan combinarse con otra
señal.

Señales que se probaron y se **descartaron** (importante para que no las
reintentes sin pasar por el mismo proceso):
- **Marca pegada al inicio de una palabra más larga** (ej.
  `netflixcol.vercel.app`): parecía funcionar en entrenamiento, pero
  rompía casos reales de negocios legítimos cuyo nombre empieza igual que
  una marca (una clínica llamada "Mastercardiology", un club de fans
  "TikTokersCommunity"). El entrenamiento no tenía ningún ejemplo de esa
  colisión; un banco de casos curados a mano sí la detectó.
- **Marca mencionada en el título de la página, no en la URL**: peor
  relación entre lo que detecta y los falsos positivos que generaba.
- **Letras transpuestas** (`faecbook` en vez de `facebook`): solo 2
  ejemplos en todo el entrenamiento, insuficiente para confiar en la
  validación cruzada.
- **La regresión logística completa**: coeficientes inestables con pocos
  ejemplos positivos; en un caso llevó a un peso que violaba una regla
  explícita (una señal débil no debe alertar sola). Se reemplazó por la
  búsqueda de enteros mencionada arriba.

Hallazgos reales encontrados probando el motor desplegado, ya corregidos:
- **g2.com**: un sitio real que bloquea la visita automática (403) se
  interpretaba como señal de riesgo. Un bloqueo automático no es, por sí
  solo, evidencia de nada.
- **youtuve.com**: un dominio de phishing real que imitaba a YouTube no se
  detectaba porque "youtube" no estaba en las palabras clave de la marca
  Google en ese momento.
- **coordinadora.com**: un sitio real (empresa de paquetería) que
  respondía con un error HTTP aislado, sin ninguna otra señal alrededor,
  subía de nivel solo por eso.

## Limitaciones conocidas (no son bugs, son el estado honesto del método)

- El catálogo de marcas (`brands.ts`) se amplió mirando los fallos del
  conjunto de **entrenamiento** — la mejora medida ahí es optimista por
  construcción. Hasta en la prueba congelada siguió apareciendo algo sin
  catalogar (dominios reales de infraestructura de Amazon/Google/Apple no
  verificados a tiempo).
- Las legítimas de Tranco son sitios grandes y establecidos — casi no hay
  ejemplos de negocios chicos o con dominio joven, así que la tasa real de
  falsas alarmas contra ese tipo de sitio puede ser mayor a lo medido.
- El feed de OpenPhish es sobre todo de marcas globales (Microsoft,
  Google, criptomonedas), no de bancos o comercios colombianos
  específicamente.
- Acortadores y redirecciones legítimas pueden salir en "riesgo" sin
  merecerlo: un `tinyurl.com/...` que en realidad lleva a Wikipedia, o
  `nic.co` redirigiendo a `gobernanzadeinternet.mintic.gov.co` (un caso
  real que se vio en producción) — el acortador/redirección no distingue
  todavía si el destino final es enorme y conocido.
- DNS rebinding (una IP pública que resuelve a una IP privada en el
  momento de la petición) no está protegido en `check-link` — está
  documentado como fuera de alcance en `docs/CHANGELOG-algoritmo.md`.
- Páginas armadas con JavaScript (poco contenido visible al bot) y
  cloaking (mostrarle contenido distinto al bot que a una persona real) no
  se pueden resolver con este método.
- RDAP (la fuente de "edad del dominio") no siempre tiene un servidor para
  `.co`/`.com.co` — para esos dominios la señal de "dominio nuevo" puede
  no calcularse nunca, sin que eso sea un error.

## Qué es tuyo

- Esquema de tablas nuevas (`brands`, `official_domains`,
  `popular_domains`) con migraciones en `supabase/migrations/` (no existe
  esa carpeta todavía — la creás con tu primera migración), en **el
  proyecto de Supabase del equipo** (ref `tzweryoduyrsbvnzjqmb`, ver
  `docs/DEPLOY.md` para los comandos exactos de despliegue/verificación).
- Semilla de esas tablas: las marcas y dominios oficiales que hoy están en
  `src/lib/link-analysis/brands.ts`, **verificados uno por uno** (visitando
  el sitio real o confirmando el certificado TLS — no por patrón de
  nombre). Documentá cómo verificaste cada uno y cuáles quedaron afuera
  por no poder verificarse (hay precedente: ver "Se descarta por no poder
  verificar" en `reports/final-paso4.md` y los comentarios de
  `brands.ts`).
- Export versionado a `data/official-domains.json` (esquema exacto en
  `docs/CONTRATO.md`, sección 3) y reemplazo del stub `StaticAllowlist` en
  `src/lib/link-analysis/allowlist.ts` por una implementación real que lea
  ese export — misma interfaz `OfficialDomainsSource`, cero cambios en
  quien la consume.
- Implementar de verdad `lookupPopular` en
  `supabase/functions/check-link/lib/popular-domains.ts` (hoy devuelve
  siempre `"none"`).

**Reglas no negociables para esto:**
- Coincidir con la lista significa **"dominio oficial de esta marca"**,
  nunca "seguro" — es un estado informativo aparte del nivel de riesgo, y
  **no cortocircuita las demás señales** (un dominio oficial de WhatsApp
  que además fuera un acortador seguiría contando como acortador).
- **Nunca** una regla del tipo "marca + cualquier terminación de país =
  oficial". `roblox.com.mu` es phishing real y `amazon.co.uk` es
  legítimo — solo una lista explícita, verificada, distingue los dos
  casos. Esto no es teórico: es exactamente el patrón que encontró el
  Paso 3 de esta iniciativa.
- **Nunca** usar pertenencia a Tranco (o a cualquier lista de
  popularidad) como criterio para decidir qué es "oficial": sería
  circular, porque las legítimas de prueba de este proyecto salen
  justamente de Tranco.
- Gobernanza: las altas/bajas de dominios se revisan por PR, vía un CSV (o
  el formato tabular que prefieras, siempre que el export final respete
  el esquema de `docs/CONTRATO.md`). No hay endpoint de escritura pública
  para esto — es contenido curado, no contenido de usuario.

## Qué NO tocar

- `src/lib/link-analysis/analyze-url.ts`, `build-verdict.ts`,
  `signals.ts`, `types.ts` — son de Samuel. Si necesitás un campo nuevo,
  proponelo como extensión aditiva y avisale.
- Componentes de UI (`src/pages/`, `src/components/`) — son de Jorge.
- El resto de `supabase/functions/check-link/index.ts` (SSRF,
  redirecciones) — podés agregar el USO de `lookupPopular` ahí si
  corresponde, no cambiar su lógica existente.

## Flujo de trabajo

1. Traé `main` actualizado y creá tu rama desde ahí.
2. Usá `pnpm@9` siempre (`npx --yes pnpm@9 ...` si tu entorno no lo tiene
   fijado por defecto).
3. Antes de abrir tu PR: `pnpm eval` (sobre `scripts/eval/data/seed.jsonl`)
   sin regresiones nuevas, `pnpm test`, typecheck.
4. **Orden de merge acordado: primero Martín, después Jorge.** Antes de
   abrir tu PR, traé `main` actualizado a tu rama (merge, no rebase). Nadie
   mergea sin avisar al resto.
5. Si cambiás algo dentro de `supabase/functions/check-link/`, avisale a
   Samuel para que lo redespliegue — tu cambio no llega solo a producción.
6. **Fecha límite: mañana.** Si el tiempo aprieta, lo primero que se
   recorta es lo opcional (caché con TTL, rate limiting) — la tabla
   `brands`/`official_domains` con su export funcionando es lo mínimo.

## Criterios de aceptación

- `allowlist.ts` sigue exportando `officialDomainsSource` con la misma
  interfaz; `build-verdict.ts` no necesita cambiar nada para usarla.
- `pnpm test`, `pnpm lint`, typecheck (`tsconfig.app.json` y
  `tsconfig.node.json`) pasan.
- `pnpm eval` sigue sin romper ningún caso con `"expect"` pinneado en el
  seed, salvo que agregues marcas nuevas a propósito (avisá para sumar
  casos de prueba).
- `data/official-domains.json` respeta el esquema de `docs/CONTRATO.md`
  byte a byte.
- `lookupPopular` compara siempre por dominio registrable exacto.
