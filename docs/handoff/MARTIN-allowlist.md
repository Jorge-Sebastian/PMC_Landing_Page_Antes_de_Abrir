# Handoff para Martín — allowlist de dominios en base de datos

Pega este documento completo como mensaje inicial en tu propia sesión de
Claude Code, en este mismo repositorio.

## Contexto

"Antes de Abrir" es una herramienta que analiza enlaces para detectar
phishing. Hoy la lista de ~40 marcas conocidas (bancos, redes sociales,
paqueterías) vive escrita a mano en `src/lib/link-analysis/brands.ts`. Tu
parte es sacar esa lista de un archivo estático y llevarla a una tabla real
en la base de datos de Supabase, con un flujo de gobernanza (altas/bajas vía
PR revisado), y agregar una segunda señal — "qué tan popular es este
dominio" — que hoy no existe en absoluto.

Trabajas en paralelo con Samuel (el algoritmo, ya en la rama `samuel`, con
Fase 1 terminada) y Jorge (el front). Ninguno de los dos depende de que tú
termines primero: el contrato ya está definido y hay una implementación
temporal funcionando.

**Antes que nada, lee:**
- `docs/CONTRATO.md` — completo. Es la fuente de verdad de lo que tenés que
  producir.
- `src/lib/link-analysis/allowlist.ts` — la implementación temporal que vas
  a sustituir. Tiene la interfaz `OfficialDomainsSource` que tenés que
  seguir exactamente.
- `supabase/functions/check-link/lib/popular-domains.ts` — el stub de
  `lookupPopular` que vas a implementar de verdad.
- `src/lib/link-analysis/brands.ts` — los datos que hoy existen a mano
  (`BRANDS`, el catálogo completo) y que vas a migrar a la base de datos.
- `docs/CHANGELOG-algoritmo.md` — decisiones y limitaciones conocidas del
  motor, para que entiendas por qué algunas cosas están como están.

## Qué archivos son tuyos

- Todo lo relacionado a la base de datos: migraciones de Supabase, el
  esquema de las tablas nuevas.
- `src/lib/link-analysis/allowlist.ts` — vas a REEMPLAZAR `StaticAllowlist`
  por una implementación real, manteniendo la interfaz `OfficialDomainsSource`
  intacta.
- `supabase/functions/check-link/lib/popular-domains.ts` — implementar
  `lookupPopular` de verdad.
- Un script de export: la base de datos → `data/official-domains.json`
  (esquema exacto en `docs/CONTRATO.md`, sección 3). Este JSON es lo que
  `allowlist.ts` lee; decidís vos si lo lee en build-time, en un fetch, o
  como prefieras — lo único fijo es el esquema del JSON y el contrato de
  `OfficialDomainsSource`.
- `docs/CONTRATO.md` — actualizalo si cambiás algo del esquema (de forma
  aditiva).

## Qué NO tocar

- `src/lib/link-analysis/analyze-url.ts`, `build-verdict.ts`,
  `signals.ts`, `types.ts` — son de Samuel. Si necesitás un cambio ahí
  (por ejemplo, un campo más en `OfficialMatch` o `BrandEntry`), proponelo
  como una extensión **aditiva** del contrato y avisale, no lo cambies
  directamente.
- Componentes de UI (`src/pages/`, `src/components/`) — son de Jorge.
- `supabase/functions/check-link/index.ts` — podés AGREGAR el uso de
  `lookupPopular` ahí si te parece que ya corresponde (ver "Extras
  opcionales" abajo), pero no cambies el resto de su lógica de
  redirecciones/SSRF.

## El contrato que tenés que respetar

De `docs/CONTRATO.md`, lo esencial:

```ts
interface OfficialDomainsSource {
  version: string;
  findOfficial(registrableDomain: string): OfficialMatch | null;
  brands(): BrandEntry[];
}
```

- `findOfficial` recibe el dominio YA REDUCIDO a su forma registrable (ej.
  `"paypal.com"`, nunca `"www.paypal.com"` ni solo `"paypal"`). La
  comparación contra los dominios de cada marca es **siempre exacta**
  (`===` o `.includes()` sobre un array de strings completos) — nunca
  `includes`/`endsWith` sobre texto libre. Esa regla no es un detalle de
  estilo: es la razón por la que la Fase 1 reemplazó el parseo manual de
  dominios por `tldts` (ver el changelog) — comparar con substring es
  exactamente el bug que se corrigió.
- `lookupPopular(registrableDomain): Promise<"popular" | "none">` — mismo
  requisito de comparación exacta.
- Cambios al esquema de `data/official-domains.json` o a los tipos: siempre
  aditivos (campos opcionales nuevos, nunca se renombra ni se quita algo que
  ya exista) — hay código que ya depende de la forma actual.

## Gobernanza de datos

Las altas/bajas de dominios oficiales/populares se revisan por PR vía CSV
(o el formato tabular que prefieras para el PR, siempre que el export final
a `official-domains.json` respete el esquema). No hay endpoint de escritura
pública ni formulario en la app para esto — es contenido curado, no
contenido de usuario.

## Extras opcionales (si te queda tiempo)

- Caché con TTL para `lookupPopular` (y para la lectura de
  `official-domains.json` si la servís vía fetch) — evita golpear la base de
  datos en cada análisis.
- Rate limiting en lo que sea que exponga esta data si se sirve vía un
  endpoint propio.

## Criterios de aceptación

- `allowlist.ts` sigue exportando `officialDomainsSource` con la misma
  interfaz `OfficialDomainsSource`; nada en `build-verdict.ts` necesita
  cambiar para usar tu implementación.
- `pnpm test`, `pnpm lint`, `pnpm exec tsc -p tsconfig.app.json --noEmit` y
  `pnpm exec tsc -p tsconfig.node.json --noEmit` pasan.
- `pnpm eval` sigue sin regresiones (`scripts/eval/data/seed.jsonl`): tu
  cambio no debería alterar ningún resultado hoy pinneado con `"expect"`,
  salvo que agregues marcas nuevas a propósito (en ese caso, avisá para
  sumar casos de prueba).
- `lookupPopular` sigue devolviendo resultados estables y comparando por
  dominio registrable exacto.
- `data/official-domains.json` (o donde decidas exponerlo) respeta el
  esquema de `docs/CONTRATO.md` byte a byte — es lo que te permite cambiar
  la fuente de datos sin romper nada del lado del motor.
