# SmartGuard — Antes de Abrir

SmartGuard permite revisar enlaces sospechosos manualmente desde la web y, en Android, analiza los enlaces visibles en notificaciones compatibles con autorización explícita. Un resultado sin señales no es garantía de seguridad.

**Estado al 30-10-2026:** la integración nativa de sincronización Firebase 0.5.9 está incorporada al código de la rama main. Su APK se creó como actualización compatible con 0.5.8, pero la prueba física de 0.5.9 sigue pendiente. No afirmar que la compilación de la fuente antigua 0.4.0 represente la APK 0.5.9.

- **Fuente del producto:** https://github.com/Jorge-Sebastian/PMC_Landing_Page_Antes_de_Abrir
- **Panel Firebase de administración:** https://smartguard-piloto-20261029.web.app/ (requiere permisos administrativos; no es el producto público).
- **Landing Alpha 0.2:** consultar el enlace público verificado de Vercel en la hoja de Entrega 4; no usar previews protegidos.
- **Auditoría y matriz de entrega:** [docs/ENTREGA-4-SMARTGUARD-AUDITORIA.md](docs/ENTREGA-4-SMARTGUARD-AUDITORIA.md).
- **Descarga actual de la landing:** `public/downloads/SmartGuard-Family-v0.6.0-Alpha.apk`, proporcionado por el equipo (versión interna `0.6.0-piloto`, código 17; Android 8.0 o posterior; 22 MB). SHA-256: `9d2974d6b3429d426377e8391b1f23ee7608d4f482797a3cf533cd5a593620b3`. Se verificaron la estructura ZIP y los metadatos; queda pendiente probar instalación, compatibilidad de firma con la versión anterior y funcionalidad en un teléfono Android. El APK 0.5.4 se conserva como versión anterior.

## Stack actual

- Web: React, TypeScript, Vite, Tailwind CSS; hospedada en Vercel.
- Android: Capacitor 6 y Java; servicio nativo NotificationListenerService y motor de comprobación.
- Telemetría piloto 0.5.9: Firebase Auth anónima, Firestore y panel administrativo publicado en Firebase Hosting.
- Analizador web: reglas propias y dependencia heredada de Supabase administrado por Enter para algunas comprobaciones remotas.
- SmartGuard Family: demo local en APK; aún no existe un círculo familiar remoto plenamente funcional.

## Pruebas de calidad sin instalar una APK

    pnpm install --frozen-lockfile
    pnpm test
    pnpm exec tsc -p tsconfig.app.json --noEmit
    pnpm build:prod
    node scripts/qa/e4-preflight.mjs

El preflight es estático y **no certifica** funcionamiento con WhatsApp, consumo de batería, Android antiguos, uptime ni resultados de personas.

## Variables de entorno (nombres, nunca valores)

VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_CLERK_PUBLISHABLE_KEY, VITE_ENTER_ANALYTICS_ENABLED, VITE_ENTER_ANALYTICS_TOKEN, VITE_ENTER_PROJECT_ID, VITE_ENTER_ANALYTICS_ENDPOINT, VITE_ENTER_ANALYTICS_DEFINITIONS_ENDPOINT y VITE_ENTER_ANALYTICS_DEBUG. Revisar .env.example. No subir contraseñas, sesiones Firebase ni llaves privadas.

**Cuenta de prueba para monitores:** pendiente de preparar el registro e ingreso de un usuario normal y de probar aislamiento entre cuentas. Entregar la contraseña exclusivamente por el canal privado acordado con el profesor, nunca en este README.

---

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

## Calidad técnica web Alpha 0.2 (5 de noviembre de 2026)

**[Procedimiento de calidad y evidencia](docs/WEB-QUALITY-ALPHA02.md).** La entrega evalúa **la web pública**, no directamente el APK: UptimeRobot HTTP(s) cada 5 minutos, porcentaje real de los últimos 7 días >= 99%, PageSpeed móvil Performance >=70 y Accessibility >=80. Los números solo se registran después de medirlos en servicios externos; NO se infieren a partir de los tests.

- Configurar una cuenta UptimeRobot y una **status page pública** que monitoree el dominio real de Vercel. En el footer se muestra el enlace `Estado del servicio` únicamente cuando Vercel recibe `VITE_SMARTGUARD_STATUS_PAGE_URL` con la dirección HTTPS publicada (no confundir con una API key).
- Para la auditoría web, crear la variable de GitHub Actions `SMARTGUARD_PUBLIC_URL` con la dirección verificada que abre en incógnito. La acción `SmartGuard web quality - PageSpeed mobile` permite pruebas manuales y periódicas; conserva archivos JSON de disponibilidad externa y PageSpeed en cada ejecución.
- Los scripts `scripts/qa/check-public-site.mjs` y `scripts/qa/pagespeed-mobile.mjs` son reproducibles con Node.js 22. Google PageSpeed puede requerir la clave opcional `PAGESPEED_API_KEY` en **GitHub Secret**, nunca en el frontend. Si la URL está protegida o Google no responde, reportan NO VERIFICADO, sin atribuir resultados inventados.
- Navegación web optimizada: rutas secundarias cargan bajo demanda, el SDK opcional de analítica no se descarga si está desactivado y los recursos versionados usan caché de larga duración.


## Android Performance Monitoring 0.6.1
La APK incluye una pantalla de métricas locales persistentes con promedio y p95 (últimas 64 mediciones). El SDK `firebase-perf` solo transmite trazas cuando se ha registrado la aplicación Android `co.antesdeabrir.piloto` en el proyecto Firebase existente con su propio `android/app/google-services.json` y el usuario activa consentimiento separado. La configuración web de Firebase no sirve para una app Android. Consulta [docs/SMARTGUARD-ANDROID-PERFORMANCE-V061.md](docs/SMARTGUARD-ANDROID-PERFORMANCE-V061.md).
