# Antes de Abrir — PMC

Aplicación educativa para revisar señales de riesgo en enlaces antes de abrirlos. Incluye análisis del dominio, detección de posibles imitaciones de marcas, enlaces acortados y una comprobación opcional del destino mediante Supabase. Un resultado sin señales no garantiza que un enlace sea seguro.

## Origen y repositorio

Código exportado de Enter el 7 de octubre de 2026. El desarrollo continúa fuera de la sincronización Enter–GitHub.

Repositorio: https://github.com/Jorge-Sebastian/PMC_Landing_Page_Antes_de_Abrir

## Desarrollo local

Requisitos: Node.js 22 y pnpm compatible con el lockfile incluido (formato 9).

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

La aplicación abre en http://localhost:8080. Las variables de analítica de Enter son opcionales; mantener desactivada la analítica si no se configura deliberadamente.

```sh
pnpm lint
pnpm exec tsc -p tsconfig.app.json --noEmit
pnpm exec tsc -p tsconfig.node.json --noEmit
pnpm build:prod
pnpm preview
```

`build` en el export usa modo desarrollo; usar `build:prod` para producción. El comando `check` original no comprueba por sí solo todas las referencias TypeScript, por eso se indican los proyectos explícitamente.

## Estructura

- `src/pages/home/`: landing page y formulario del analizador.
- `src/lib/link-analysis/`: reglas, señales y construcción del resultado.
- `src/pages/privacidad/` y `src/pages/contacto/`: páginas complementarias.
- `public/locales/es.json`: textos en español.
- `supabase/functions/check-link/`: comprobación del destino y redirecciones.
- `.enter/plans/`: documentación histórica del proyecto exportado.

## Dependencias que siguen vinculadas a Enter

Abandonar la sincronización GitHub no migra automáticamente los servicios. El export conserva `vite-plugin-enter-dev`, el SDK de analítica y un cliente de Supabase administrado por Enter. La URL y clave `anon` del cliente se distribuyen al navegador: no son una clave administrativa. No agregar claves `service_role`, contraseñas ni tokens privados al frontend.

La comprobación remota necesita que `check-link` siga disponible en ese Supabase. Migrar a un backend propio requiere configurar un proyecto nuevo y desplegar la función; copiar el repositorio no realiza ese despliegue. Sin respuesta del backend, la interfaz indica que no pudo comprobar el destino.

Antes de desplegar esa función en infraestructura propia, revisar protección frente a destinos privados resueltos por DNS, límites de uso y tiempos de lectura. El bloqueo actual de direcciones literales y nombres locales no valida las IP resultantes de DNS.

## Colaboración

Trabajar en ramas, revisar los cambios mediante pull requests e invitar colaboradores desde GitHub con sus usuarios. No compartir cuentas ni credenciales. Conservar el lockfile y excluir `.env`, dependencias y archivos generados.

## Contexto para otros chats

Compartir este README, la documentación de `.enter/plans/`, el enlace del repositorio y un resumen de las decisiones. Los archivos del proyecto original de ChatGPT no se incorporan automáticamente al repositorio.

## Publicar en Vercel

Importar este repositorio desde Vercel, elegir Vite y usar `npm run build:prod` con salida `dist`. La configuración `vercel.json` permite abrir directamente `/contacto` y `/privacidad`. Mantener `VITE_ENTER_ANALYTICS_ENABLED=false` salvo configuración deliberada. La función Supabase se aloja por separado y no se despliega mediante este archivo.
