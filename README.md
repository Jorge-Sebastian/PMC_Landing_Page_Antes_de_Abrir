# SmartGuard — Antes de Abrir

SmartGuard permite revisar enlaces sospechosos manualmente desde la web y, en Android, analiza los enlaces visibles en notificaciones compatibles con autorización explícita. Un resultado sin señales no es garantía de seguridad.

**Actualización documental al 06-11-2026 (posterior al cierre):** el código de `main` incluye SmartGuard Family con Firebase, instrumentación de rendimiento Android y cambios nativos hasta 0.6.4. La descarga pública es el piloto Android **0.6.0** proporcionado por el equipo; una versión de código fuente y una APK distribuida no son la misma evidencia. Las pruebas en dispositivos y entre cuentas se registran por separado.

- **Fuente del producto:** https://github.com/Jorge-Sebastian/PMC_Landing_Page_Antes_de_Abrir
- **Panel Firebase de administración:** https://smartguard-piloto-20261029.web.app/ (requiere permisos administrativos; no es el producto público).
- **Producto web público:** [Abrir SmartGuard](https://pmc-landing-page-antes-de-abrir.vercel.app/). No requiere acceso de Vercel para abrirlo ni cuenta para el análisis manual.
- **APK Alpha 0.2:** [Descargar SmartGuard Family 0.6.0](https://pmc-landing-page-antes-de-abrir.vercel.app/downloads/SmartGuard-Family-v0.6.0-Alpha.apk), Android 8.0 o posterior.
- **Calidad técnica de Entrega 4:** [Empezar por requisitos, Excel y resultados Android](docs/calidad-tecnica/ENTREGA-4-INICIO-AQUI.md).
- **Guía de evaluación:** [Guion del monitor y evidencias de Entrega 4](docs/ENTREGA-4-GUIA-MONITOR.md).
- **Auditoría y matriz de entrega:** [docs/ENTREGA-4-SMARTGUARD-AUDITORIA.md](docs/ENTREGA-4-SMARTGUARD-AUDITORIA.md).
- **Descarga actual de la landing:** `public/downloads/SmartGuard-Family-v0.6.0-Alpha.apk`, proporcionado por el equipo (versión interna `0.6.0-piloto`, código 17; Android 8.0 o posterior; 22 MB). SHA-256: `9d2974d6b3429d426377e8391b1f23ee7608d4f482797a3cf533cd5a593620b3`. Se verificaron la estructura ZIP y los metadatos; queda pendiente probar instalación, compatibilidad de firma con la versión anterior y funcionalidad en un teléfono Android. El APK 0.5.4 se conserva como versión anterior.

## Stack actual

- Web: React, TypeScript, Vite, Tailwind CSS; hospedada en Vercel.
- Android: Capacitor 6 y Java; servicio nativo NotificationListenerService y motor de comprobación.
- Telemetría piloto 0.5.9: Firebase Auth anónima, Firestore y panel administrativo publicado en Firebase Hosting.
- Analizador web: reglas propias y funciones remotas `check-link` de Supabase. Production está configurado para el proyecto del equipo mediante variables de entorno; el código conserva un respaldo heredado de Enter si no se configuran.
- SmartGuard Family: ruta `/familia`, Firebase Authentication y Firestore para salas e historial compartido con consentimiento. La presencia del código no certifica las reglas desplegadas ni el recorrido entre teléfonos; consultar la guía de pruebas.

## Pruebas de calidad sin instalar una APK

    pnpm install --frozen-lockfile
    pnpm test
    pnpm exec tsc -p tsconfig.app.json --noEmit
    pnpm build:prod
    node scripts/qa/e4-preflight.mjs

El preflight es estático y **no certifica** funcionamiento con WhatsApp, consumo de batería, Android antiguos, uptime ni resultados de personas.

## Variables de entorno (nombres, nunca valores)

| Variable | Uso |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Proyecto Supabase del equipo para las comprobaciones remotas. |
| `VITE_CLERK_PUBLISHABLE_KEY` | Inicio de sesión opcional en la web. Vacía oculta sus controles. |
| `VITE_SMARTGUARD_FAMILY_ENABLED` | Mostrar el acceso Family cuando su backend esté preparado. |
| `VITE_SMARTGUARD_STATUS_PAGE_URL` | Enlace HTTPS a la página pública de estado; opcional. |
| `VITE_SMARTGUARD_TELEMETRY_URL`, `VITE_SMARTGUARD_TELEMETRY_PUBLISHABLE_KEY` | Integración opcional heredada de telemetría Supabase, distinta de Firebase nativo. |
| `VITE_ENTER_ANALYTICS_ENABLED`, `VITE_ENTER_ANALYTICS_TOKEN`, `VITE_ENTER_PROJECT_ID`, `VITE_ENTER_ANALYTICS_ENDPOINT`, `VITE_ENTER_ANALYTICS_DEFINITIONS_ENDPOINT`, `VITE_ENTER_ANALYTICS_DEBUG` | Analítica heredada opcional; desactivada por defecto. |

Copiar `.env.example` y completar solo las integraciones necesarias. Los valores `VITE_` son públicos en el navegador: nunca incluir claves administrativas, contraseñas o tokens de sesión. Firebase Family utiliza configuración pública en `public/smartguard-family/config.json`; sus permisos se controlan con Authentication y reglas Firestore.

**Cuenta de prueba para monitores:** pendiente de creación por el equipo y de carga de datos de uso. El análisis web es público y puede probarse sin cuenta; esto no sustituye la prueba de registro e ingreso exigida por la rúbrica. Clerk (login de la cabecera) y Firebase (cuenta de anfitrión de Family) son sesiones distintas. La cuenta que se entregue debe indicar a cuál corresponde. Facilitar las credenciales al monitor por el canal de entrega acordado y dejar aquí solo el procedimiento, sin contraseñas. Ver [guion y aislamiento](docs/ENTREGA-4-GUIA-MONITOR.md).

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

## Backend y despliegues separados

Vercel publica el frontend desde `main`. Las funciones Supabase y las reglas Firestore se despliegan por separado; subir el código no las actualiza automáticamente. Configurar el proyecto del equipo mediante `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`; sin ellas se utiliza el respaldo de Enter. Sin respuesta remota, el resultado debe indicar comprobación incompleta, sin prometer seguridad.

El repositorio conserva herramientas y documentación históricas de Enter. La configuración pública de Firebase no concede permisos administrativos. No subir claves `service_role`, cuentas de servicio, keystores ni sesiones. Consultar [despliegue Supabase](docs/DEPLOY.md) y [Family Firebase](docs/SMARTGUARD-FAMILY-FIREBASE-V1.md).

## Colaboración

Trabajar en ramas, revisar los cambios mediante pull requests e invitar colaboradores desde GitHub con sus usuarios. No compartir cuentas ni credenciales. Conservar el lockfile y excluir `.env`, dependencias y archivos generados.

## Contexto para otros chats

Compartir este README, la documentación de `.enter/plans/`, el enlace del repositorio y un resumen de las decisiones. Los archivos del proyecto original de ChatGPT no se incorporan automáticamente al repositorio.

## Publicar en Vercel

Importar este repositorio desde Vercel, elegir Vite y usar `npm run build:prod` con salida `dist`. La configuración `vercel.json` permite abrir directamente `/contacto` y `/privacidad`. Mantener `VITE_ENTER_ANALYTICS_ENABLED=false` salvo configuración deliberada. La función Supabase se aloja por separado y no se despliega mediante este archivo.

## Observabilidad Android y reporte técnico integral

**[Resultados cuantitativos de calidad Android — Entrega 4](docs/calidad-tecnica/RESULTADOS-CONSOLIDADOS-ENTREGA-4.md).** Contiene cálculos contrastados con las 1.198 filas del paquete, fórmulas y explicación de equivalencias técnicas; la verificación de origen real se atribuye al equipo, sin suponer acceso externo a Firebase.

**[Calidad técnica · documentación y arquitectura](docs/calidad-tecnica/README.md).** El generador reproducible separa las 1.198 observaciones **simuladas** de cualquier telemetría real de dispositivos. La nueva sección `CALIDAD TÉCNICA Y RENDIMIENTO` del administrador usa Firebase Auth verificada; sus datos reales requieren reglas `daily_metrics` desplegadas y una APK firmada que los envíe. La simulación no acredita UptimeRobot ni PageSpeed.

## Calidad técnica web Alpha 0.2 (5 de noviembre de 2026)

**[Procedimiento de calidad y evidencia](docs/WEB-QUALITY-ALPHA02.md).** La entrega evalúa **la web pública**, no directamente el APK: UptimeRobot HTTP(s) cada 5 minutos, porcentaje real de los últimos 7 días >= 99%, PageSpeed móvil Performance >=70 y Accessibility >=80. Los números solo se registran después de medirlos en servicios externos; NO se infieren a partir de los tests.

- **Estado público:** https://stats.uptimerobot.com/vyppRM840A. Monitor creado el **05/11/2026**, con intervalo de **5 minutos**; no acredita siete días previos a su creación. En el footer se muestra el enlace `Estado del servicio` únicamente cuando Vercel recibe `VITE_SMARTGUARD_STATUS_PAGE_URL` con la dirección HTTPS publicada (no confundir con una API key).
- Para la auditoría web, crear la variable de GitHub Actions `SMARTGUARD_PUBLIC_URL` con la dirección verificada que abre en incógnito. La acción `SmartGuard web quality - PageSpeed mobile` permite pruebas manuales y periódicas; conserva archivos JSON de disponibilidad externa y PageSpeed en cada ejecución.
- Los scripts `scripts/qa/check-public-site.mjs` y `scripts/qa/pagespeed-mobile.mjs` son reproducibles con Node.js 22. Google PageSpeed puede requerir la clave opcional `PAGESPEED_API_KEY` en **GitHub Secret**, nunca en el frontend. Si la URL está protegida o Google no responde, reportan NO VERIFICADO, sin atribuir resultados inventados.
- Navegación web optimizada: rutas secundarias cargan bajo demanda, el SDK opcional de analítica no se descarga si está desactivado y los recursos versionados usan caché de larga duración.


## Android Performance Monitoring 0.6.1
La APK incluye una pantalla de métricas locales persistentes con promedio y p95 (últimas 64 mediciones). El SDK `firebase-perf` solo transmite trazas cuando se ha registrado la aplicación Android `co.antesdeabrir.piloto` en el proyecto Firebase existente con su propio `android/app/google-services.json` y el usuario activa consentimiento separado. La configuración web de Firebase no sirve para una app Android. Consulta [docs/SMARTGUARD-ANDROID-PERFORMANCE-V061.md](docs/SMARTGUARD-ANDROID-PERFORMANCE-V061.md).

## Medición web y alcance del piloto Android

El [informe PageSpeed móvil del 05/11/2026](https://pagespeed.web.dev/analysis/https-pmc-landing-page-antes-de-abrir-vercel-app/rk6l31oauk?form_factor=mobile) registró **84/100 en rendimiento** y **96/100 en accesibilidad** sobre la portada pública sin sesión, bajo condiciones de laboratorio. No evalúa el rendimiento nativo del APK ni la exactitud del detector. La disponibilidad HTTP medida por UptimeRobot tampoco certifica el flujo completo de análisis ni la entrega de notificaciones Android.

El Alpha 0.2 entregado se enlazó como APK Android 0.6.0. Sus tiempos de apertura y análisis, permisos y funcionamiento en segundo plano requieren pruebas del teléfono e instrumentación nativa. Las demostraciones con datos simulados no sustituyen mediciones reales. Esta actualización documental no modifica el Excel entregado ni acredita retroactivamente pruebas o monitoreo.

## Android 0.6.2 — simulación de siete días y consentimiento pendiente

[Guía y límites de la demo](docs/SMARTGUARD-ANDROID-METRICAS-SIMULADAS-V062.md). El panel Android permite ver datos **reales** del teléfono o una muestra de **siete días inventados** rotulada de forma permanente como SIMULADA. Los datos ficticios no se guardan en los contadores reales ni se envían a Firebase y **no acreditan siete días de uptime**. La preferencia de compartir métricas se puede marcar sin configuración Firebase Android, pero el envío queda **inactivo** hasta registrar la app Android y pulsar nuevamente la activación.
