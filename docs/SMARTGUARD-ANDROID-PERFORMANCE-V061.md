# SmartGuard Android 0.6.1 — Firebase Performance y métricas locales

## Qué se implementó

- `versionCode` 18, paquete Android sin cambios (`co.antesdeabrir.piloto`). Permite actualizar versiones 0.6.0 instaladas si se usa el mismo certificado piloto.
- Métricas persistentes en Android (solo tiempos, contadores de errores, p95 aproximado de las 64 últimas mediciones): apertura visual de la app, análisis manual, análisis por notificación, creación de sala, ingreso, análisis familiar y carga de riesgo familiar.
- Pantalla de métricas dentro del panel de protección Android: promedio, p95 y número de mediciones/errores, con actualización manual.
- SDK oficial Firebase Performance para Android, con recopilación desactivada inicialmente y habilitación voluntaria por separado. Se generan trazas personalizadas `sg_manual_analysis`, `sg_notification_analysis`, `sg_family_join`, `sg_family_create`, `sg_family_manual`, `sg_family_upload` y el SDK puede medir el arranque automáticamente una vez configurado y autorizado.
- Para privacidad **no** se aplica la instrumentación automática de solicitudes HTTP del plugin de Gradle Firebase Perf: analizar enlaces sospechosos implica URL potencialmente sensible. Los trazos propios solo llevan tipo de operación y resultado (correcto/error). La métrica de arranque de UI calculada localmente no equivale a la medición automática de Firebase.
- No se modifican reglas Firestore, permisos de Android, autenticación, servicios del administrador, historial familiar, pagos ni ninguna cuenta de otro proyecto.

## Bloqueo de configuración externa

El repositorio solo contiene la configuración de una *app web* Firebase (`1:...:web:...`), que no es válida para registrar métricas de **una app Android**. Firebase Performance necesita un Android App ID (`1:...:android:...`) registrado en el proyecto existente. Sin Android `google-services.json` la APK sigue compilando y presenta métricas locales, pero el indicador muestra **'Solo local'** y no se transmiten traces a Firebase. **No afirmar lo contrario.**

1. En Firebase Console, proyecto **smartguard-piloto-20261029** > Configuración del proyecto > Tus aplicaciones > Agregar aplicación > Android. Nombre de paquete exacto: **co.antesdeabrir.piloto**. Si ya está registrada, no duplicarla.
2. Descargar **google-services.json** de la aplicación Android, no usar el `config.json` web. Guardarlo en `android/app/google-services.json` (ignorado por git) para compilación local.
3. Para CI, crear GitHub Actions secret `FIREBASE_ANDROID_GOOGLE_SERVICES_JSON_B64` con el JSON de Android codificado en base64. No compartirlo en el chat ni versionarlo en GitHub. GitHub Actions validará automáticamente el paquete y proyecto antes de compilar.
4. Construir la APK **con esa configuración** y firmarla localmente con el certificado piloto previo. Verificar el SHA-256 del certificado de firma: `b5616ccde6a28c301aea8d6fc049fa63e61801fecb284682352813399afca122`.
5. Instalar la APK y abrir **Rendimiento de SmartGuard · métricas reales**. Debe mostrar `Firebase Performance: Listo, sin compartir`. Activar la casilla de permiso y ejecutar varios análisis.
6. Abrir Firebase Console > **Performance Monitoring** > app Android, verificar las trazas `sg_*`. La primera aparición puede demorarse; la compilación por sí sola no demuestra envíos reales.

## Métricas para las entrevistas

- En Android: app_ready (tiempo de primera pantalla en cada arranque), manual_analysis y notification_analysis (duración real, incluye verificaciones remotas), family_create / family_join / family_manual / family_upload.
- El p95 que muestra Android es **de las últimas 64 muestras**, no el p95 de todos los usuarios ni un SLA. `Sin muestras` significa que todavía no hay mediciones. Fallas de conexión pueden reflejarse como análisis sin datos completos; no se confunden con resultados de phishing.
- Este panel **no sustituye** UptimeRobot ≥99% ni PageSpeed móvil rendimiento≥70 y accesibilidad≥80 de la rúbrica, que se miden sobre la web pública.
- Los datos locales se guardan sin nombres, URL, códigos de invitación o mensajes. Desactivar el envío futuro no borra datos que Firebase ya haya recibido.

## Pruebas automatizadas y pendientes

- `node scripts/qa/native-performance-check.mjs` valida la instrumentación, permisos y presencia del puente nativo.
- `node scripts/qa/check-android-firebase-config.mjs android/app/google-services.json` verifica configuración Android cuando se aporte.
- Ejecutar pruebas web, TypeScript, compilación Android, comprobar que la APK contiene la pantalla de métricas y métodos del plugin.
- **Requiere dispositivo físico:** actualizar sobre 0.6.0 sin desinstalar, ejecutar analizador manual y una notificación, salir/entrar de la app y comprobar valores persistentes. Para confirmar envío cloud: compilar con Android App ID válido y consentimiento, probar en equipo y observar `sg_*` en consola Firebase.
