# Calidad web del Alpha 0.2: evidencia real para la Entrega 4

La rúbrica exige en la **web pública del producto**: (1) página de estado pública de UptimeRobot con 99 % o más de uptime en los últimos 7 días; (2) informe de PageSpeed Insights en **Móvil** con Rendimiento >= 70 y Accesibilidad >= 80. **No son métricas del APK**. Ninguna prueba de código o un sitio que simplemente devuelva HTTP 200 demuestra estos umbrales.

## 1. URL pública correcta

Elige la URL **principal y estable** del Alpha 0.2 en Vercel, verificando desde una ventana de incógnito que abre `/` y `/familia` sin autenticación de Vercel. No uses previews protegidos, la URL del dashboard administrativo de Firebase, ni localhost. La ruta de monitor debe ser la página que los evaluadores abren en el navegador.

Si Vercel bloquea visitas anónimas con Deployment Protection, resuelve eso **en el proyecto del equipo correspondiente** antes de monitorear; HTTP 200 de la pantalla de autenticación no significa que SmartGuard esté pública.

## 2. UptimeRobot — 5 minutos, meta >= 99 %

UptimeRobot utiliza una cuenta externa; el repositorio no puede crear un monitor sin autorización de esa cuenta.

1. Abre https://uptimerobot.com/ e ingresa con la cuenta autorizada del equipo.
2. `Add New Monitor` -> `HTTP(s)` -> Nombre `SmartGuard Alpha 0.2 - Web` -> URL pública del punto 1 -> intervalo **5 minutos** -> guardar.
3. `Status Pages` -> crear `SmartGuard - Estado del servicio`, **pública**, añadir ese monitor, publicar y copiar la URL.
4. El 5 de noviembre registra `Overall Uptime > Last 7 days` con su fecha y el enlace. Si comenzaste a monitorear después del 29 de octubre, NO inventes 7 días de datos.
5. Si quieres mostrar `Estado del servicio` en el footer de SmartGuard, establece en Vercel la variable `VITE_SMARTGUARD_STATUS_PAGE_URL` a la URL **HTTPS de la página publicada**. Re-despliega. Hasta entonces el enlace se oculta, sin mostrar una disponibilidad ficticia.

La URL de UptimeRobot solo aparece después de publicarla en la cuenta; no se genera desde GitHub. No publiques API keys de UptimeRobot en archivos web, variables `VITE_...` ni README.

## 3. PageSpeed Insights — Móvil >=70 / >=80

Usa https://pagespeed.web.dev/ con la URL exacta de la página principal que utiliza el usuario después de iniciar sesión, selecciona **Móvil** y copia los valores y el enlace de la ejecución en la hoja de entrega. Si el flujo de H2 se encuentra en `/familia`, analiza también esa ruta; no sustituye el resultado de la pantalla principal requerida.

La herramienta automatizada del repositorio produce evidencia adicional sin puntuaciones inventadas:

- GitHub: `Settings > Secrets and variables > Actions > Variables > New repository variable`: `SMARTGUARD_PUBLIC_URL` = URL HTTPS pública verificada.
- GitHub: `Actions > SmartGuard web quality - PageSpeed mobile > Run workflow` (opcional: especifica otra URL en el campo URL).
- El workflow consulta la API oficial de PageSpeed para `performance` y `accessibility`, ejecuta una comprobación externa de `/` y `/familia`, y sube `pagespeed-mobile.json` y `public-site.json` como artefactos durante 30 días. Si faltan datos o no cumple los mínimos, la verificación falla claramente.
- Hay una ejecución diaria si `SMARTGUARD_PUBLIC_URL` está configurada. Si Google limita las solicitudes anónimas, se puede añadir `PAGESPEED_API_KEY` como **GitHub Actions Secret**. No introducirlo en el frontend ni publicarlo.
- También se puede ejecutar manualmente con Node 22:

```bash
SMARTGUARD_PUBLIC_URL='https://TU-DOMINIO.vercel.app/' node scripts/qa/check-public-site.mjs
SMARTGUARD_PUBLIC_URL='https://TU-DOMINIO.vercel.app/' node scripts/qa/pagespeed-mobile.mjs
```

## 4. Evidencia para los monitores

- URL pública de la web, comprobada en incógnito.
- URL pública de **UptimeRobot Status Page** y porcentaje real `Last 7 days`, con fecha.
- URL del reporte real de PageSpeed Insights **Móvil**, y números Performance/Accessibility.
- Cuenta nueva y cuenta de prueba con datos previos; prueba en móvil y computador; sesiones aisladas.
- README actualizado, variables sin secretos. La herramienta automática NO reemplaza el vídeo de 4 minutos ni las entrevistas.

**Estado inicialmente desconocido:** URL pública exacta validada, monitor externo creado, porcentaje de 7 días y puntajes de PageSpeed. Completar únicamente con mediciones que existen, nunca poner `99%`, `70` u `80` sin evidencia.
