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
