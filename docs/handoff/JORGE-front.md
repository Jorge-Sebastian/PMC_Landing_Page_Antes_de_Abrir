# Handoff para Jorge — frontend sobre el motor de la Fase 1

Pega este documento completo como mensaje inicial en tu propia sesión de
Claude Code, en este mismo repositorio.

## Contexto

"Antes de Abrir" analiza enlaces para detectar phishing. El motor
(`src/lib/link-analysis/`) y el backend (`supabase/functions/check-link/`)
son de Samuel, ya en la rama `samuel` con la Fase 1 terminada. Tu parte es
todo lo de UI: nuevos estados que el motor ya puede producir (o va a poder
producir en las fases 2 y 3, con datos simulados mientras tanto), el flujo
progresivo de resultado, y los mensajes de "no se pudo comprobar".

Trabajas en paralelo con Samuel (algoritmo) y Martín (base de datos). No
dependés de que ninguno de los dos termine antes: el contrato ya está
definido y hay fixtures para todo lo que todavía no existe de verdad.

**Antes que nada, lee:**
- `docs/CONTRATO.md` — completo. Los tipos que vas a renderizar.
- `src/lib/link-analysis/__fixtures__/mock-results.ts` — los 7 estados que
  tenés que saber mostrar, con datos ya armados (`getMockResult(state)`).
- `src/pages/home/{link-analyzer.tsx,analysis-result.tsx,risk-signal-card.tsx}`
  — la UI actual, que vas a extender.
- `docs/CHANGELOG-algoritmo.md` — decisiones y limitaciones conocidas,
  para entender el tono correcto de los mensajes nuevos (nunca "seguro").

## Qué archivos son tuyos

- `src/pages/home/link-analyzer.tsx`, `analysis-result.tsx`,
  `risk-signal-card.tsx` y cualquier componente nuevo que necesites en
  `src/pages/home/`.
- `public/locales/es.json` para los textos nuevos de UI (no de señales: el
  texto de cada señal vive en `src/lib/link-analysis/signals.ts` a
  propósito, ver `CodeGuideline.md`).
- `src/index.css` / `tailwind.config.ts` si necesitás un token de color
  nuevo para el estado "dominio oficial" (no reutilices los tokens
  `risk.safe/caution/danger`: ese estado no es un nivel de riesgo).

## Qué NO tocar

- `src/lib/link-analysis/**` (motor) — es de Samuel. Si necesitás un campo
  más en algún tipo, es un cambio de contrato: pedilo, no lo agregues vos.
- `supabase/**` — no es tuyo en esta fase.
- Nada de lo que `brands.ts`/`allowlist.ts` expone como catálogo —
  consumilo vía `Verdict.officialMatch`, no lo leas directo.

## El contrato que tenés que respetar

Resumen de `docs/CONTRATO.md` (leelo completo, esto es solo el mapa):

- **Nunca** un estado ni un texto puede decir "seguro". `"sin-senales"`
  sigue significando "no encontramos señales", no "está confirmado como
  seguro" — el texto actual de `result.level.noSignals.explanation` en
  `es.json` ya lo dice así, mantené ese tono en todo lo nuevo.
- `Verdict.officialMatch?: OfficialMatch | null` — nuevo. Es un estado
  **informativo aparte** del nivel de riesgo, nunca lo reemplaza ni lo
  mejora. Mostralo junto al resultado normal (ver fixture
  `"dominio-oficial"`): algo como "Esta dirección coincide con un dominio
  oficial de {brandName}" — nunca "Este enlace es seguro".
- `getDestinationStatus(destination)` (en `types.ts`) te da
  `{kind: "pending" | "checked" | "unchecked", reason?}` sin que tengas que
  leer `checked`/`reason` a mano.
- Campos nuevos en `DestinationCheck`, todos opcionales y pueden venir
  `undefined` (todavía no los produce el backend real, pero las fixtures
  simulan cómo se van a ver):
  - `looksLikeJsShell?: boolean` — fixture `"cascaron-spa"`. Cuando es
    `true`, la UI tiene que decir explícitamente que no se pudo ver el
    contenido porque el sitio se arma con JavaScript — **nunca** mostrar
    "sin señales" en ese caso como si se hubiera revisado el contenido de
    verdad.
  - `domainAgeDays?: number | null` — todavía no hay fixture específica
    para esto (llega en Fase 2); cuando llegue, `null` significa "no se
    pudo saber" (neutro, no mejora nada), no "dominio nuevo descartado".
  - `formActionHost?: string | null` y `sensitiveFields?: string[]` — Fase
    3, pensalos como datos de apoyo para una señal, no algo que se muestre
    suelto.
  - `allowlist?: { tier: "official" | "popular" | "none"; brand?: {...} }`
    — lo llena Martín. Mismo principio que `officialMatch`: informativo,
    nunca "seguro".

## Qué construir

1. **Estados nuevos de la tarjeta de resultado**, usando
   `getMockResult(state)` de las fixtures para desarrollar sin esperar a
   nadie:
   - `"dominio-oficial"`: aviso informativo adicional.
   - `"destino-no-comprobado-timeout"`: mensaje claro de "no pudimos
     comprobar a dónde lleva" (ya existe algo parecido, revisalo en
     `analysis-result.tsx` antes de duplicar).
   - `"cascaron-spa"`: aviso explícito de que no se pudo ver el contenido.
   - `"host-final-distinto"`: ya existe la señal `otra-web-oculta`, revisá
     si el mensaje actual alcanza o necesita más contexto (mostrar el host
     final).
2. **Resultado en dos tiempos** (opcional, ver abajo): usar
   `analyzeStatic(url)` para mostrar las señales del enlace al instante,
   mientras `finalizeVerdict` espera la respuesta de `check-link` — esto
   reemplazaría el `delay(400)` artificial que hoy existe en
   `link-analyzer.tsx` solo para que el spinner no parpadee.
3. Si cambia qué datos se envían a algún servicio nuevo (por ejemplo si
   Martín termina exponiendo `lookupPopular` vía un endpoint propio con
   telemetría), actualizá el aviso de privacidad (`trust-notice.tsx` /
   `es.json`) para que siga siendo verdad.

**Nota sobre el punto 2:** Samuel dejó el refactor en dos tiempos
(`analyzeStatic`/`finalizeVerdict`) ya hecho y funcionando en
`build-verdict.ts`, pero NO conectado a la UI — `buildVerdict` (lo que usa
`link-analyzer.tsx` hoy) sigue funcionando exactamente igual que antes. Si
te parece que vale la pena construir la experiencia progresiva, la base ya
está. Si no, no es necesario para esta fase.

## Criterios de aceptación

- Ningún texto nuevo usa la palabra "seguro" para describir un enlace o un
  dominio.
- Los 7 estados de `MOCK_RESULT_STATES` (`mock-results.ts`) se ven bien en
  la UI, con foco accesible y `aria-live` anunciando el nivel (mismo patrón
  que ya existe en `link-analyzer.tsx`).
- `pnpm test`, `pnpm lint`, `pnpm exec tsc -p tsconfig.app.json --noEmit` y
  `pnpm build:prod` pasan.
- Los textos nuevos están en `public/locales/es.json` (no hardcodeados en
  el JSX) y usan `useTranslation()` directo, sin wrapper propio — mismo
  patrón que el resto del proyecto (`CodeGuideline.md`).
- Si agregaste un color nuevo para "dominio oficial", está en
  `tailwind.config.ts`/`src/index.css` como token, no como un hex suelto en
  un componente, y es distinguible de los tokens de riesgo
  (`risk.safe/caution/danger`).
