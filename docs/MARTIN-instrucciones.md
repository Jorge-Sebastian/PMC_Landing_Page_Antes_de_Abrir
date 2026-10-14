# Martín — catálogo y popularidad (octubre 2026)

## Archivos propios y alcance

- `supabase/migrations/20261013000100_brand_catalog.sql`: tablas `brands`, `official_domains`, `popular_domains`. RLS sin escritura pública. Solamente `popular_domains` tiene lectura anónima para la función.
- `data/catalog.tsv`: entradas del catálogo histórico, editables por PR. `review_status = legacy-pending` significa que falta evidencia de verificación individual; solo cambiar a `verified` cuando exista una fuente verificable en `evidence`.
- `scripts/allowlist/build.mjs`: después de aprobar cambios en el TSV genera `20261013000200_seed_brand_catalog.sql` y una copia local de `data/official-domains.json` sin tocar el algoritmo de Samuel.
- `scripts/allowlist/export-from-db.mjs`: exporta la tabla **real** del equipo a `data/official-domains.json` (usar después de ejecutar los SQL). La app usa ese export en `allowlist.ts`, sin petición en runtime.
- `scripts/allowlist/import-popular.mjs`: importa datos externos Tranco en la tabla `popular_domains`. No se sube el CSV descargado. Se consulta desde el backend; `popular` es informativo y NO se usa como oficial ni modifica el veredicto.

## Orden de instalación en Supabase (requiere aprobación del equipo)

1. Antes de aplicar migraciones, confirmar que el proyecto es `tzweryoduyrsbvnzjqmb` (no el `project_id` antiguo de `supabase/config.toml`).
2. En el panel del equipo: **SQL Editor → New query**. Pegar y ejecutar en orden el contenido completo de `20261013000100_brand_catalog.sql`, y luego `20261013000200_seed_brand_catalog.sql`. En un despliegue automatizado futuro usar `supabase db push` enlazado al proyecto correcto, previa revisión de migraciones pendientes. **No** ejecutar un db push sin revisar porque podría ejecutar migraciones de otros.
3. En Table Editor confirmar **53 marcas y 312 dominios**, con marca y dominios en tablas separadas. `popular_domains` estará vacía hasta importar datos de Tranco.
4. Configurar en el PowerShell local las variables de **este proyecto** (`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`). No subir claves a Git; no compartir el valor de la clave con el equipo en mensajes.
5. Ejecutar `node scripts/allowlist/export-from-db.mjs`; revisar `git diff -- data/official-domains.json`. Si el SQL coincide con la exportación del TSV, no debería cambiar el catálogo. No usar el secreto `service_role` en frontend/Vercel.
6. Descargar de la fuente oficial una lista Tranco en CSV `rank,domain`; ejecutar `node scripts/allowlist/import-popular.mjs "C:\\ruta\\tranco.csv"`. Comprobar el conteo en `popular_domains`. La lista no está incluida por licencia/frescura.
7. Pedir a **Samuel** desplegar `check-link` en ese proyecto (ver `docs/DEPLOY.md`) y probar `https://www.google.com` y un dominio no catalogado con la respuesta `allowlist.tier`. La Edge Function no se despliega por hacer merge de frontend. La nueva dependencia `npm:tldts` del runtime debe probarse tras desplegar; si falla, Samuel debe revertir/revisar esa importación antes de producción.

## Gobierno del catálogo

Cambiar un dominio requiere PR: evidencia de propiedad de la marca (contenido del sitio o certificado TLS que efectivamente pruebe relación), fecha de comprobación y revisión humana. No basta una coincidencia textual ni la pertenencia a Tranco. Editar `data/catalog.tsv` y ejecutar `node scripts/allowlist/build.mjs 2026-10-13T00:00:00Z` usando la nueva fecha UTC de versión que corresponda. El script genera una migración nueva para cada versión UTC posterior a la inicial. El seed **hace upsert**; al eliminar una fila del TSV, agregar un `DELETE` explícito en esa nueva migración revisada para borrarla realmente del proyecto antes del siguiente export desde DB. Nunca modificar una migración ya aplicada en producción.

**Auditoría pendiente:** el ZIP original no contiene pruebas individuales para todos los 312 dominios. Para no alterar la detección ni afirmar una validación inexistente, se preservó íntegramente el catálogo anterior con estado `legacy-pending`, incluso dominios con reservas registradas (`amazon.eu`, `amazon.ie`). El hecho de que el motor anterior reconociera esas entradas **no** equivale a una verificación. La aprobación final de los datos debe comprobar y documentar esas entradas; si el equipo requiere que el estado "oficial" solo se muestre para filas estrictamente verificadas, debe bloquear el uso del export hasta realizar la revisión o excluir las pendientes en un PR coordinado con Samuel.

## Validación

Desde la raíz: `npx --yes pnpm@9 install --frozen-lockfile`, después `npx --yes pnpm@9 test`, `npx --yes pnpm@9 lint`, `npx --yes pnpm@9 exec tsc -p tsconfig.app.json --noEmit`, `npx --yes pnpm@9 exec tsc -p tsconfig.node.json --noEmit`, `npx --yes pnpm@9 eval`. La publicación real de SQL y de Edge Function requiere credenciales del equipo y no ocurre automáticamente en estas pruebas.
