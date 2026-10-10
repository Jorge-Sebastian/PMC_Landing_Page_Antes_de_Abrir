# Contrato del motor de análisis de enlaces

Qué expone `src/lib/link-analysis/` hacia el resto de la app (Jorge) y hacia
el backend (Martín), y qué forma deben tener los datos que ellos produzcan
para que el motor los consuma. Vive junto al código: si cambia la forma de
un tipo, este documento se actualiza en el mismo commit.

**Regla general: todo cambio a este contrato es aditivo.** Se agregan campos
opcionales; no se renombran ni se quitan campos existentes, no se cambia el
significado de uno que ya exista. `buildVerdict(url, destination)` sigue
funcionando exactamente igual que antes de la Fase 1.

## 1. Tipos (`src/lib/link-analysis/types.ts`)

### `Signal`

```ts
type Signal = {
  id: SignalId;          // ver la lista de ids más abajo — son estables
  title: string;
  explanation: string;
  weight: 1 | 2 | 3;      // 3 = fuerte, 2 = media, 1 = detalle
  source: "link" | "destination";
  params?: Record<string, unknown>;   // nuevo en Fase 1, opcional
};
```

Los `SignalId` existentes **nunca cambian de nombre**: tienen claves i18n
colgando de ellos (ver `src/lib/link-analysis/signals.ts`, el texto vive ahí
y no en `public/locales/es.json` a propósito — los ids son dinámicos y i18n
exige claves literales). Una señal nueva es una entrada nueva en el `type
SignalId` union y en `SIGNAL_LIBRARY`; nunca se reutiliza un id para otra
cosa.

IDs definidos hasta la Fase 1 (en orden de peso, los de peso 3 primero):
`imitacion-marca`, `marca-en-subdominio` *(nuevo, Fase 1)*,
`caracteres-enganosos`, `direccion-numerica`, `pide-datos`,
`archivo-descarga`, `otra-web-oculta`, `dominio-sospechoso`,
`enlace-acortado`, `palabras-de-presion`, `sin-conexion-segura`,
`subdominios-extranos`, `destino-no-responde`, `direccion-manipulada`,
`direccion-muy-larga`, `direccion-poco-habitual`.

### `OfficialMatch` (nuevo en Fase 1)

```ts
type OfficialMatch = {
  brandId: string;
  brandName: string;
  officialDomains: string[];
};
```

Resultado de `allowlist.ts`. **Nunca implica que el enlace sea seguro**:
solo que el dominio registrable analizado coincide con uno de los dominios
que esa marca declaró como propios. Jorge lo muestra como un estado
informativo aparte del nivel de riesgo (ver `__fixtures__/mock-results.ts`,
estado `"dominio-oficial"`), nunca sustituyéndolo.

### `Verdict`

```ts
type Verdict = {
  level: RiskLevel;       // "riesgo" | "precaucion" | "sin-senales" — nunca "seguro"
  score: number;
  signals: Signal[];
  officialMatch?: OfficialMatch | null;   // nuevo en Fase 1
};
```

### `DestinationCheck`

Campos vigentes desde antes de la Fase 1: `checked`, `reason`, `reachable`,
`status`, `finalUrl`, `finalHost`, `redirects`, `differentHost`, `title`,
`hasPasswordField`.

Campos aditivos agregados en la Fase 1, **todavía no producidos por
`check-link`** (quedan en `undefined` hasta que una fase futura los llene;
un campo en `undefined` nunca mejora el veredicto, igual que `checked:
false` hoy):

```ts
type DestinationCheck = {
  // ...campos existentes, sin cambios...
  domainAgeDays?: number | null;   // Fase 2 (RDAP). null = no se pudo saber (neutro)
  formActionHost?: string | null;  // Fase 3
  sensitiveFields?: string[];      // Fase 3
  looksLikeJsShell?: boolean;      // Fase 3
  allowlist?: {                    // Martín (lookupPopular)
    tier: "official" | "popular" | "none";
    brand?: { id: string; name: string; officialDomains: string[] };
  };
};
```

### `DestinationStatus` (nuevo en Fase 1)

Para que Jorge no tenga que leer `checked`/`reason` a mano en cada
componente:

```ts
type DestinationStatus =
  | { kind: "pending" }
  | { kind: "checked" }
  | { kind: "unchecked"; reason?: DestinationReason };

function getDestinationStatus(destination: DestinationCheck | null | undefined): DestinationStatus;
```

Derivado, no un campo nuevo guardado — no se puede desincronizar de
`checked`/`reason`.

## 2. API del motor (`src/lib/link-analysis/build-verdict.ts`)

Desde la Fase 1 existen tres funciones, todas exportadas:

```ts
type StaticAnalysis = { signals: Signal[]; officialMatch: OfficialMatch | null };

function analyzeStatic(url: string): StaticAnalysis;
function finalizeVerdict(staticResult: StaticAnalysis, destination: DestinationCheck): Verdict;
function buildVerdict(url: string, destination: DestinationCheck): Verdict; // = finalizeVerdict(analyzeStatic(url), destination)
```

`buildVerdict` sigue siendo la función de siempre — `link-analyzer.tsx` no
necesita cambiar nada. `analyzeStatic`/`finalizeVerdict` existen para que la
UI pueda mostrar las señales del enlace **antes** de que termine la
comprobación del destino (sin recalcular `analyzeLink`), si Jorge decide
construir esa experiencia en dos tiempos. Es opcional: mientras eso no se
construya, seguir usando `buildVerdict` tal cual es perfectamente válido.

## 3. `allowlist.ts` — interfaz para Martín

```ts
// src/lib/link-analysis/allowlist.ts
interface OfficialDomainsSource {
  version: string;
  findOfficial(registrableDomain: string): OfficialMatch | null;
  brands(): BrandEntry[];   // BrandEntry = { id, name, keywords, domains }
}

export const officialDomainsSource: OfficialDomainsSource; // instancia en uso
```

**Reglas de la implementación:**
- `findOfficial` recibe el dominio **ya reducido a su forma registrable**
  (el campo `registrable` que devuelve `splitHost` en `analyze-url.ts`, vía
  `tldts` con `allowPrivateDomains: true` — `x.web.app` y `y.github.io` son
  dominios registrables distintos entre sí, no "un subdominio de web.app").
  La comparación contra la lista de dominios de cada marca es **siempre
  exacta** (`domains.includes(domain)`), nunca `includes`/`endsWith` sobre
  texto libre.
- Hoy `StaticAllowlist` envuelve `brands.ts` (ver el archivo). Martín la
  sustituye por una que lea `data/official-domains.json` — mismo contrato,
  cero cambios en quien la consume (`build-verdict.ts`).

**Esquema de `data/official-domains.json`** (lo genera Martín desde la base
de datos; es el formato que `allowlist.ts` debe poder leer):

```json
{
  "version": "2026-10-10T00:00:00Z",
  "brands": [
    {
      "id": "bancolombia",
      "name": "Bancolombia",
      "keywords": ["bancolombia", "sucursal-virtual"],
      "domains": ["bancolombia.com", "sucursalvirtual.com.co", "grupobancolombia.com"]
    }
  ]
}
```

`keywords` se usa para `findBrandMatch` en `analyze-url.ts` (detección de
imitación); `domains` para `findOfficial`. Mismo contenido que hoy tiene
cada entrada de `BRANDS` en `brands.ts`.

## 4. `lookupPopular` — stub para Martín en `check-link`

```ts
// supabase/functions/check-link/lib/popular-domains.ts
type PopularityTier = "popular" | "none";
async function lookupPopular(registrableDomain: string): Promise<PopularityTier>;
```

Hoy devuelve siempre `"none"` (no cambia el comportamiento actual de
`check-link`; nada en `index.ts` lo llama todavía). Mismo requisito que
`findOfficial`: comparación exacta por dominio registrable, nunca
`includes`/`endsWith`.

## 5. Fixtures para Jorge

```ts
// src/lib/link-analysis/__fixtures__/mock-results.ts
type MockResultState =
  | "riesgo-imitacion-marca" | "precaucion" | "sin-senales" | "dominio-oficial"
  | "destino-no-comprobado-timeout" | "cascaron-spa" | "host-final-distinto";

function getMockResult(state: MockResultState): { url: string; verdict: Verdict; destination: DestinationCheck };
```

Datos simulados — no corren el motor real. Incluyen estados de las Fases 2
y 3 (`cascaron-spa`, `domainAgeDays` implícito en `destino-no-comprobado-timeout`)
para que Jorge pueda construir esa UI por adelantado, usando el contrato
aditivo ya definido arriba, sin esperar a que esas fases terminen de verdad.

## Historial

- **Fase 1 (2026-10-10):** primera versión. Agrega `OfficialMatch`,
  `Verdict.officialMatch`, los campos aditivos de `DestinationCheck` para
  Fase 2/3, `DestinationStatus`, `analyzeStatic`/`finalizeVerdict`,
  `allowlist.ts`, el stub `lookupPopular`, las fixtures, y el id de señal
  `marca-en-subdominio`.
