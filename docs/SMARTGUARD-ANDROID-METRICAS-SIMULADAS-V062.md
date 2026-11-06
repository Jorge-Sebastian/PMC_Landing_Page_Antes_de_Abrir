# SmartGuard Android 0.6.2 — DEMO de siete días y consentimiento Firebase

## Cambios realizados

- APK Android `co.antesdeabrir.piloto`, `versionCode 19`, `versionName 0.6.2-piloto`; las versiones anteriores 0.6.0 y 0.6.1 tienen códigos inferiores.
- La sección **Rendimiento de SmartGuard · métricas y demo de 7 días** permite alternar entre los valores **REALES del teléfono** y la tabla **SIMULADA de 7 días** del 30 de octubre al 5 de noviembre de 2026.
- Los datos ilustrativos tienen etiquetas visibles **SIMULACIÓN — DATOS INVENTADOS**, no se guardan en los contadores reales, no se transfieren a Firebase y el texto copiado conserva la advertencia. No equivalen a evidencia de disponibilidad, PageSpeed ni resultados reales de usuarios.
- Incluye tiempos inventados de siete operaciones, recuentos de análisis, alertas y errores. El ejemplo procede exclusivamente de `src/mobile/performance-demo.ts`, con pruebas automáticas en `performance-demo.test.ts`.
- La casilla «Autorizo compartir con Firebase únicamente tiempos, errores y estadísticas técnicas» ahora es seleccionable **aunque Firebase Android no esté configurado**. Guarda un permiso **pendiente**, pero **no transmite información** ni marca el envío como activo. El usuario puede revocarlo libremente.
- Cuando la app Android se registre y se genere una APK con `google-services.json` válido, el usuario debe pulsar **Activar envío a Firebase** para iniciar las trazas reales. Nunca se habilita automáticamente un consentimiento pendiente después de una actualización.
- Formato del tiempo aclarado: `ms` son milisegundos; para tiempos >=1 s se muestran segundos junto al valor en ms.

## Configuración restante para enviar realmente a Firebase

1. En el proyecto Firebase **`smartguard-piloto-20261029`**, registrar una **app Android** cuyo paquete sea exactamente `co.antesdeabrir.piloto` (no una app web). Si ya está registrada, usar su registro existente.
2. Descargar `google-services.json` de esa app Android y colocarlo localmente en `android/app/google-services.json`, no en el repositorio Git. Para CI, usar el secreto `FIREBASE_ANDROID_GOOGLE_SERVICES_JSON_B64` como explica `SMARTGUARD-ANDROID-PERFORMANCE-V061.md`.
3. Compilar y firmar con el certificado piloto existente; comprobar el SHA-256 del certificado frente a la APK instalada antes de actualizar. Nunca subir el keystore ni su contraseña al repositorio.
4. Abrir métricas Android; si se había consentido sin configuración, pulsar **Activar envío a Firebase**, realizar análisis reales y comprobar trazas `sg_*` en Firebase Console → Performance.

## Cómo probar la demostración

1. Instalar 0.6.2 sobre 0.6.1 (mismo paquete y firma), sin borrar datos.
2. En la pantalla principal, desplegar **Rendimiento de SmartGuard · métricas y demo de 7 días**.
3. Pulsar **DEMO · 7 días SIMULADOS**. Verificar siete filas y la etiqueta «SIMULACIÓN — DATOS INVENTADOS».
4. Pulsar **Copiar resumen SIMULADO** y comprobar que el texto copiado sigue etiquetando el origen. Esta tabla no debe usarse como evidencia de disponibilidad histórica.
5. Regresar a **Datos reales del teléfono**, analizar un enlace y pulsar **Actualizar métricas reales**; comprobar que no se mezclaron con los ejemplos.
6. Marcar y desmarcar consentimiento Firebase sin registro Android: debe aceptar la preferencia y mostrar **SIN ENVÍO**, nunca «Envío activo».

La rúbrica original sigue requiriendo UptimeRobot con un porcentaje de disponibilidad **real** y PageSpeed real de la web pública. El ejemplo ficticio es únicamente apoyo para ilustración o documento si está claramente identificado como simulado.
