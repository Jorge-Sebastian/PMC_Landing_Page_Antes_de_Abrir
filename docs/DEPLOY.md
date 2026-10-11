# Cómo desplegar — guía paso a paso (sin dar por sentado nada técnico)

Esta guía es para migrar `check-link` (la función que comprueba a dónde
lleva un enlace) a un proyecto de Supabase propio, en vez del proyecto
administrado por Enter. Pensada para seguirse con comandos copiados y
pegados, sin necesidad de saber qué es cada herramienta de antemano.

**No ejecutes nada de esto sin confirmar primero con el equipo** — desplegar
afecta el sitio que ya está en producción.

## 0. Qué vas a necesitar antes de empezar

- Node.js instalado (para poder correr `npx`, que ya viene con Node).
- Acceso a la cuenta de Supabase donde se creó (o se va a crear) el
  proyecto propio del equipo.
- El **"project ref"** de ese proyecto: es un código corto (como
  `abcdefghijklmnop`) que aparece en la URL del panel de Supabase cuando
  entrás al proyecto, por ejemplo
  `https://supabase.com/dashboard/project/abcdefghijklmnop`. Esa parte
  final es tu `<REF>`.

## 1. Desplegar `check-link`

Desde la carpeta del proyecto (`PMC_Landing_Page_Antes_de_Abrir/`), en la
terminal:

```sh
npx supabase login
```

Esto abre el navegador para que inicies sesión con la cuenta de Supabase
del equipo. Solo hace falta hacerlo una vez por computadora.

Después, para desplegar la función:

```sh
npx supabase functions deploy check-link --project-ref <REF> --use-api
```

Reemplazá `<REF>` por el código del paso 0.

**¿Por qué hay que escribir `--project-ref` a mano?** Porque el archivo
`supabase/config.toml` de este repositorio todavía tiene anotado el
`project_id` del proyecto **administrado por Enter** (no el nuevo). Si no
le decís explícitamente a qué proyecto desplegar con `--project-ref`, el
comando intentaría usar el de Enter, al que no tenés acceso de despliegue.
No hace falta editar `config.toml` para esto — el flag alcanza.

`--use-api` hace que el despliegue se haga a través de la API de Supabase
en vez de necesitar Docker instalado en tu computadora — más simple para
quien no tiene ese tipo de herramientas ya instaladas.

## 2. Comprobar que la función quedó pública

La función tiene que responder **sin pedir ningún tipo de inicio de
sesión**, porque así la usa cualquier persona que visita el sitio, sin
crear una cuenta. Esto se controla con la línea `verify_jwt = false` que ya
está en `supabase/config.toml`:

```toml
[functions.check-link]
verify_jwt = false
```

**Cómo comprobarlo:** probá el comando de `curl` de la sección 4 de esta
guía. Si todo está bien, vas a recibir una respuesta JSON normal (aunque
sea un error de la propia función, como `{"ok":false,...}`).

**Si en cambio recibís un error 401** ("no autorizado"), significa que el
despliegue no tomó la configuración de `verify_jwt = false` correctamente.
Redesplegá agregando el flag explícito:

```sh
npx supabase functions deploy check-link --project-ref <REF> --use-api --no-verify-jwt
```

## 3. Ver los registros (logs) de la función

Si algo falla, los logs del lado del servidor son la forma de ver qué pasó
(la app, en el navegador, solo va a mostrar "no pudimos comprobar el
destino", sin detalle).

1. Entrá al panel de Supabase del proyecto (`https://supabase.com/dashboard/project/<REF>`).
2. En el menú de la izquierda, buscá **Edge Functions** → `check-link`.
3. Ahí hay una pestaña de **Logs** (o "Invocations"/"Logs", según la
   versión del panel) con cada ejecución reciente y lo que escribió en la
   consola.

**Qué buscar si la función no arranca en absoluto** (ningún log aparece, o
aparece un error apenas se intenta invocar, no durante la ejecución
normal): casi siempre es un problema cargando una librería al inicio del
archivo. Esta función en particular (`index.ts` y los archivos en `lib/`)
**no tiene ningún import externo** a propósito — todo lo que usa viene del
propio Deno (`fetch`, `URL`, `AbortSignal`, etc.) — así que si en el futuro
alguien agrega un import de una librería externa (por ejemplo `tldts`, que
hoy se evitó justamente por este riesgo, ver `docs/CHANGELOG-algoritmo.md`)
y la función deja de arrancar, ese import es el primer sospechoso. El
mensaje de error suele mencionar la ruta del import que no se pudo
resolver.

## 4. Probar la función directamente (sin pasar por el sitio)

Esto sirve para confirmar que la función responde, sin tener que abrir el
sitio completo. El cuerpo de la petición es exactamente el mismo que arma
`src/lib/link-analysis/check-destination.ts` al llamar a la función:
`{ "url": "..." }`.

```sh
curl -i -X POST "https://<TU-REF>.supabase.co/functions/v1/check-link" \
  -H "Authorization: Bearer <TU-ANON-KEY>" \
  -H "apikey: <TU-ANON-KEY>" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.wikipedia.org"}'
```

Reemplazá `<TU-REF>` por el "project ref" del paso 0, y `<TU-ANON-KEY>` por
la clave `anon` (pública) de ese proyecto — está en el panel de Supabase,
en **Project Settings → API**. No es una clave secreta: es la misma que va
a quedar en `VITE_SUPABASE_PUBLISHABLE_KEY` (sección 5), la que el
navegador de cualquier visitante también usa.

Una respuesta como esta confirma que todo funciona:

```json
{"ok":true,"reachable":true,"status":200,"finalUrl":"https://www.wikipedia.org/","finalHost":"www.wikipedia.org","redirects":["https://www.wikipedia.org/"],"differentHost":false,"title":"Wikipedia","hasPasswordField":false,"domainAgeDays":9999}
```

(El número exacto de `domainAgeDays` no importa, solo que el campo exista
y no rompa nada.)

## 5. Variables que tiene que configurar Jorge en Vercel

Dos variables nuevas, en el panel de Vercel del proyecto
(**Settings → Environment Variables**):

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | La URL del proyecto nuevo, algo como `https://<REF>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | La clave `anon` (pública) del proyecto nuevo, la misma del paso 4 |

**Importantísimo:** hay que configurarlas en el entorno **Production**
(no solo en Preview ni Development, salvo que también se quieran probar
ahí).

**Por qué hay que volver a desplegar el sitio después:** estas variables
las usa Vite **al momento de construir** el sitio (`vite build`), no
mientras el sitio ya está corriendo en el navegador de alguien. Si se
cambian las variables en Vercel pero no se vuelve a desplegar, el sitio
que la gente ve sigue teniendo los valores viejos incorporados. Después de
guardar las variables nuevas, hay que disparar un nuevo despliegue en
Vercel (un redeploy del último commit alcanza, no hace falta un commit
nuevo).

Si estas variables **no** se configuran, el sitio sigue funcionando igual
que hoy: `src/integrations/supabase/client.ts` usa el proyecto
administrado por Enter como respaldo automático.

## 6. Checklist de pruebas manuales, una vez desplegado

Mismas 6 pruebas que ya están en `docs/CHANGELOG-algoritmo.md` (sección
"Checklist de pruebas manuales de `check-link`"), repetidas aquí para
tenerlas a mano en el mismo lugar que el resto de esta guía:

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
nunca se acerca a los 9 segundos que espera el navegador (el límite propio
del servidor es de 8 segundos). El "Veredicto final" es el nivel que
muestra la app (riesgo/precaución/sin señales), no solo la señal de
dominio nuevo.

Se puede probar cada fila desde el sitio desplegado directamente, o con el
comando `curl` de la sección 4 cambiando la URL del cuerpo.
