# Handoff para Jorge — frontend sobre el motor final

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
Esa regla es la más importante de todo el proyecto para vos: ningún texto
nuevo que escribas puede usar la palabra "seguro" para describir un enlace
o un dominio.

Tres personas, tres partes:
- **Samuel** — el algoritmo de detección (`src/lib/link-analysis/`) y el
  backend que comprueba destinos (`supabase/functions/check-link/`).
- **Martín** — catálogo de marcas en base de datos (hoy vive a mano en
  `brands.ts`) y una señal nueva de "qué tan popular es este dominio".
- **Jorge (vos)** — todo lo de interfaz: estados nuevos que el motor ya
  puede producir, el flujo de resultado, y los mensajes cuando algo no se
  pudo comprobar.

## Arquitectura (simple, pero con una trampa)

- El frontend se despliega en Vercel. El análisis **estático** (estructura
  de la URL, catálogo de marcas, TLD sospechosos, etc.) corre entero en el
  navegador, sin red — eso nunca necesita backend ni tiene delay de red.
- `check-link` (la parte que de verdad visita el destino del enlace) es
  una Edge Function que vive en **el proyecto de Supabase del equipo**
  (ref `tzweryoduyrsbvnzjqmb`).
- **La trampa:** son DOS despliegues independientes. Mergear a `main`
  actualiza la página en Vercel automáticamente — tu trabajo se ve solo
  con eso. `check-link` NO se redespliega solo; eso lo hace Samuel a mano
  (`docs/DEPLOY.md`). No deberías necesitar tocar eso nunca.
- El proyecto de Supabase está en el plan gratis: **se pausa solo por
  inactividad**. Si en algún momento `check-link` tarda mucho o no
  responde después de unos días sin uso, no es necesariamente un bug de
  tu código — revisá primero si el proyecto está pausado.
- Las variables de entorno de Supabase (URL + clave publicable) ya están
  puestas en Vercel. Para comprobarlo en producción: abrí la página
  desplegada, F12 → pestaña **Network**, analizá cualquier enlace, y
  confirmá que la petición sale hacia
  `https://tzweryoduyrsbvnzjqmb.supabase.co/functions/v1/check-link` (no
  hacia `localhost` ni hacia un proyecto distinto).

## Decisiones ya tomadas (y por qué) — no las reabras sin avisar

- **Nunca decir "seguro".** `"sin-senales"` = no encontramos nada, no
  "confirmado inofensivo". El texto actual de
  `result.level.noSignals.explanation` en `es.json` ya tiene el tono
  correcto — mantenelo en todo lo nuevo.
- **La falta de datos nunca mejora el veredicto.** Si algo no se pudo
  comprobar, nunca se muestra como si fuera una buena señal.
- **El contrato (`docs/CONTRATO.md`) siempre es aditivo.** Si necesitás un
  campo nuevo en algún tipo, es un cambio de contrato: pedilo, no lo
  agregues directamente en `src/lib/link-analysis/`.
- **El texto de cada señal vive en `src/lib/link-analysis/signals.ts`**,
  no en `public/locales/es.json` — es a propósito (ver
  `CodeGuideline.md`): los ids de señal son dinámicos y el sistema de
  traducción exige claves literales. Los textos de UI que SÍ son tuyos
  (botones, estados de carga, mensajes generales) van en `es.json` como
  siempre.
- **Pesos de señal enteros** (`0`=nota informativa que no suma, `1`=detalle,
  `2`=media, `3`=fuerte — una señal de peso 3 sola ya alcanza "riesgo").
  Elegidos con búsqueda + validación cruzada, no con una fórmula de
  probabilidad continua — por eso las señales se combinan sumando enteros,
  no promediando probabilidades.
- **`pnpm@9` siempre**, nunca `pnpm` a secas ni `npm`/`yarn`. **Merge
  commits**, no squash ni rebase, al integrar un PR a `main`.

## Qué se hizo y qué se aprendió (resumen honesto)

El motor empezó con reglas escritas a mano, afinadas contra un banco de
~99 casos armados también a mano ("el seed"). Contra ese seed el recall en
"riesgo" llegaba a ~90%. Esa cifra era optimista: no representa phishing
real y nuevo.

Se armó un banco de datos real (OpenPhish + Tranco), separado 70/30 por
dominio (función fija, no por orden de descarga) en entrenamiento y una
**prueba que quedó congelada hasta el final** — ninguna decisión se tomó
mirándola.

Resultado final, medido UNA sola vez sobre esa prueba (`reports/final.md`),
comparado contra el motor de antes de esta iniciativa, con intervalo de
confianza del 95% (~129 phishing en la prueba, margen amplio):

| Umbral | Recall antes | Recall ahora | FPR antes | FPR ahora |
|---|---|---|---|---|
| riesgo | 23.3% | **46.5%** [38.1%, 55.1%] | 2.2% | **1.7%** [1.4%, 2.1%] |
| riesgo + precaución | 55.0% | **69.0%** [60.6%, 76.3%] | 2.8% | **2.4%** [2.0%, 2.8%] |

El recall casi se duplicó y las falsas alarmas **bajaron**. Para vos esto
significa: el nivel "riesgo" hoy es más confiable que antes, pero sigue
sin ser perfecto — más o menos la mitad del phishing real sigue sin
detectarse, así que los mensajes de "sin señales"/"precaución" tienen que
seguir sonando como lo que son (ausencia de evidencia, no garantía).

Señales nuevas desde entonces (texto completo en `signals.ts`, pesos en
`reports/final-paso4.md`): detectar que un sitio vive en hosting gratuito,
y un campo de contraseña en un dominio sin reputación. Ninguna alerta
sola. Se probó y se **descartó** una señal (marca pegada al inicio de una
palabra más larga, ej. `netflixcol.vercel.app`) porque rompía casos de
negocios reales cuyo nombre empieza igual que una marca — no afecta nada
de lo que renderizás, pero explica por qué ciertos enlaces que "deberían"
verse sospechosos a simple vista siguen en "sin señales".

Hallazgos reales encontrados probando el motor desplegado, ya corregidos
(quedan como ejemplo de por qué el tono de los mensajes importa):
`g2.com` (un bloqueo automático no es evidencia), `youtuve.com` (marca no
catalogada a tiempo), `coordinadora.com` (un error HTTP aislado no debe
subir de nivel solo).

## Limitaciones conocidas (afectan qué deberías comunicar en la UI)

- El catálogo de marcas se amplió mirando fallos de entrenamiento — la
  mejora medida ahí es optimista. Siempre va a faltar algo en el
  catálogo; un mensaje de "sin señales" nunca debería sonar a "verificado
  contra todas las marcas que existen".
- Acortadores y redirecciones legítimas pueden salir en "riesgo" sin
  merecerlo (ej. `tinyurl.com/...` que en realidad lleva a Wikipedia, o
  un caso real visto en producción: `nic.co` redirigiendo a
  `gobernanzadeinternet.mintic.gov.co`). Si en algún momento mostrás el
  destino final, no lo presentes como "confirmado phishing" solo porque
  hubo una redirección.
- Páginas armadas con JavaScript (poco contenido visible) y cloaking
  (contenido distinto para el bot que para una persona) no se pueden
  resolver con este método — de ahí la importancia del estado
  `"cascaron-spa"` (ver abajo): tiene que decir explícitamente que no se
  pudo ver el contenido, nunca mostrarse como "sin señales" igual que si
  sí se hubiera revisado.
- RDAP (edad de dominio) no siempre tiene servidor para `.co`/`.com.co` —
  esa señal puede no aparecer nunca para esos dominios, sin que sea un
  error.

## Qué es tuyo

- `src/pages/home/link-analyzer.tsx`, `analysis-result.tsx`,
  `risk-signal-card.tsx` y cualquier componente nuevo en `src/pages/home/`.
- `public/locales/es.json` para texto de UI nuevo (no de señales).
- `src/index.css` / `tailwind.config.ts` si necesitás un token de color
  nuevo para "dominio oficial" — no reutilices `risk.safe/caution/danger`,
  ese estado no es un nivel de riesgo.

## Qué NO tocar

- `src/lib/link-analysis/**` (motor) — es de Samuel.
- `supabase/**` — no es tuyo en esta fase.
- Lo que `brands.ts`/`allowlist.ts` expone como catálogo — consumilo vía
  `Verdict.officialMatch`, no lo leas directo.

## El contrato que tenés que respetar (resumen — leé `docs/CONTRATO.md` completo)

- `Verdict.officialMatch?: OfficialMatch | null` — estado **informativo
  aparte** del nivel de riesgo, nunca lo reemplaza. Mostralo como "Esta
  dirección coincide con un dominio oficial de {brandName}", nunca "Este
  enlace es seguro" (fixture `"dominio-oficial"`).
- `getDestinationStatus(destination)` (en `types.ts`) te da
  `{kind: "pending"|"checked"|"unchecked", reason?}` sin leer
  `checked`/`reason` a mano.
- Campos opcionales en `DestinationCheck`, todos pueden venir
  `undefined`/`null`:
  - `looksLikeJsShell?: boolean` — fixture `"cascaron-spa"`. Cuando es
    `true`, decir explícitamente que no se pudo ver el contenido.
  - `domainAgeDays?: number | null` — `null` = no se pudo saber (neutro).
  - `formActionHost?: string | null`, `sensitiveFields?: string[]` — aún
    no los produce `check-link` de verdad (ver trabajo futuro abajo);
    pensalos como apoyo de una señal, no algo que se muestre suelto.
  - `allowlist?: { tier: "official"|"popular"|"none"; brand?: {...} }` —
    lo llena Martín. Mismo principio que `officialMatch`.

## Qué construir

1. **Estados nuevos de la tarjeta de resultado**, usando
   `getMockResult(state)` de `src/lib/link-analysis/__fixtures__/mock-results.ts`
   para desarrollar sin esperar a nadie: `"dominio-oficial"`,
   `"destino-no-comprobado-timeout"`, `"cascaron-spa"`,
   `"host-final-distinto"` (revisá primero qué ya existe en
   `analysis-result.tsx` antes de duplicar).
2. **Mostrar el código HTTP del destino** en la tarjeta "Qué encontramos
   al comprobar el destino". Hoy no se muestra, y eso dificultó
   diagnosticar el caso real de `coordinadora.com` (un 404/400 aislado
   que subía de nivel sin que nadie pudiera ver, mirando la UI, qué código
   había devuelto el sitio). Es información que ya existe en
   `DestinationCheck.status`, solo falta renderizarla.
3. **Notas informativas (peso 0) distinguibles de señales con peso.** Una
   señal de peso 0 (ej. "el sitio bloqueó la comprobación automática") es
   informativa, no evidencia de riesgo — no debería verse ni sonar igual
   que una señal que sí suma.
4. **Resultado progresivo** (opcional, ver nota abajo): usar
   `analyzeStatic(url)` para mostrar las señales del enlace al instante,
   mientras se espera la respuesta de `check-link` — esto reemplazaría el
   `delay(400)` artificial que hoy existe en `link-analyzer.tsx` (línea
   ~69) solo para que el spinner no parpadee.
5. **Dirección principal del proyecto y Deployment Protection**: para la
   sustentación, confirmá cuál es la URL pública estable del proyecto en
   Vercel (no una URL de preview que pida login) y desactivá la
   "Deployment Protection" de esa URL si está activada — si queda
   protegida, nadie externo puede abrir la página el día de la
   sustentación.
6. **Aviso de privacidad**: si cambiás qué datos se envían a algún
   servicio (por ejemplo si Martín termina exponiendo `lookupPopular` vía
   un endpoint propio con telemetría propia), actualizá el aviso de
   privacidad (`trust-notice.tsx` / `es.json`) para que siga siendo
   verdad lo que dice.

**Nota sobre el punto 4:** Samuel dejó el refactor en dos tiempos
(`analyzeStatic`/`finalizeVerdict`) ya hecho y funcionando en
`build-verdict.ts`, pero NO conectado a la UI — `buildVerdict` (lo que usa
`link-analyzer.tsx` hoy) sigue funcionando igual que siempre. Si construís
la experiencia progresiva, la base ya está; si no, no es obligatorio.

## Flujo de trabajo

1. Traé `main` actualizado y creá tu rama desde ahí.
2. Usá `pnpm@9` siempre.
3. Antes de abrir tu PR: `pnpm test`, `pnpm lint`, typecheck, `pnpm build`.
4. **Orden de merge acordado: primero Martín, después vos.** Antes de abrir
   tu PR, traé `main` actualizado a tu rama (merge, no rebase) — probablemente
   ya va a incluir lo de Martín. Nadie mergea sin avisar al resto.
5. **Fecha límite: mañana.** Si el tiempo aprieta, lo primero que se
   recorta es lo opcional (punto 4, resultado progresivo) — los estados
   nuevos de la tarjeta y el código HTTP visible son lo mínimo.

## Criterios de aceptación

- Ningún texto nuevo usa la palabra "seguro" para describir un enlace o un
  dominio.
- Los estados de `MOCK_RESULT_STATES` se ven bien, con foco accesible y
  `aria-live` anunciando el nivel (mismo patrón que ya existe).
- `pnpm test`, `pnpm lint`, typecheck y `pnpm build` pasan.
- Texto nuevo en `public/locales/es.json`, usando `useTranslation()`
  directo (sin wrapper propio), mismo patrón del resto del proyecto.
- Un color nuevo para "dominio oficial" vive como token en
  `tailwind.config.ts`/`src/index.css`, no como hex suelto, y es
  distinguible de los tokens de riesgo.
