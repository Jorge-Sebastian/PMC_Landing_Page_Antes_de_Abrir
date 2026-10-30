# Auditoría SmartGuard — Entrega 4: Alpha 0.2 y Growth Loops

**Fecha:** 30 de octubre de 2026. **Curso:** ISIS-2007 Diseño de Productos e Innovación en TI. **Cierre:** jueves 5 de noviembre de 2026, 11:59 p. m. **Sustentación:** viernes 6 de noviembre. **Revisión del monitor:** 9-11 de noviembre.

Este documento transcribe los criterios de la guía de Entrega 4 proporcionada por el equipo y separa evidencia verificada de trabajo sin comprobar. La nota no se calcula automáticamente y no se inventan resultados.

## Rúbrica y evidencias pendientes

| Criterio | Peso | Qué se debe acreditar | Situación |
| --- | ---: | --- | --- |
| Cierre de H1 | 10 % | Resultado final numérico medido con el método declarado, decisión perseverar/ajustar/pivotar y comparación con umbral y pivote. | Por verificar en la hoja. |
| H2 desde el Alpha 0.1 | 30 % | Observaciones con fuentes, hipótesis y umbral previos al despliegue, funcionalidad nueva en línea desde el 29/10, al menos 7 días, 8 personas con grabación y fila en Conversaciones, resultado contra el umbral. | Alto riesgo: fecha, usuarios y resultados no verificados. |
| Growth loop | 25 % | Cuatro pasos reales en el producto, métrica, umbral previo y demostración completa; cero con interpretación honesta es válido. | Alto riesgo: SmartGuard Family sigue siendo demostración local, no coordinación remota comprobada. |
| Calidad técnica | 25 % | UptimeRobot status page pública con 99 % o más en últimos 7 días; PageSpeed móvil Performance >=70 y Accessibility >=80; guion de 3 a 6 pasos para cuenta nueva móvil/escritorio y aislamiento; README completo sin claves. | Parcial; métricas y flujo no verificadas. |
| Demo | 5 % | Video público de 4 minutos o menos: 2 minutos H2 y 2 minutos growth loop; pantalla de producto real. | No se verificó enlace o grabación. |
| Uso de IA | 5 % | Herramientas y tareas, acierto y fallo documentados, cambios desde Entrega 3 y propuesta para Entrega 5. | No se revisó la declaración. |

**Aviso temporal:** la funcionalidad de la H2 y el monitor UptimeRobot debían estar operativos el **29/10/2026**. No atribuir ese hito retroactivamente a una versión posterior. El growth loop puede publicarse hasta el 05/11 y el producto debe mantenerse disponible hasta el 11/11.

## Observaciones verificadas en el repositorio original

1. La rama main incluye código nativo Android para telemetría Firebase 0.5.9; último commit de fusión revisado: 1296e92585f289250b1b1c9b9feea4bff07dafa4. El workflow de Android de ese commit finalizó correctamente.
2. El build.gradle del código fuente convencional declara 0.4.0-piloto, versionCode 7. La APK 0.5.9 entregada utiliza versionCode 16 y parches sobre una APK previa. **No distribuir el debug antiguo como si fuera 0.5.9.**
3. android/variables.gradle declara minSdkVersion 26 (Android 8.0 o superior). Android 7 y anteriores no son compatibles en esta configuración. Android 10 o anterior con poca RAM puede impedir habilitar el NotificationListenerService.
4. El envío de 0.5.9 depende de recibir callbacks de un servicio de notificaciones vinculado; la cola persiste, pero no hay WorkManager/JobScheduler de reintento independiente. No prometer sincronización inmediata garantizada tras apagado, reinicio o restricción del fabricante.
5. La landing enlaza actualmente la APK 0.5.4. La 0.5.9 fue entregada de forma separada, y todavía requiere verificación física antes de publicarla como descarga principal.
6. La página administrativa nueva de Firebase está desplegada en otro flujo; las rutas del frontend de main aún contienen un panel remoto heredado de Supabase.
7. La rama Family tiene un pull request abierto (#9). El demo de Family de la APK no equivale a un growth loop completo entre teléfonos.
8. El repositorio muestra tests de análisis y CI. Su aprobación no equivale a ocho usuarios de Alpha 0.2, accesibilidad móvil validada ni pruebas físicas.

## Avances que se pueden realizar sin tocar celulares de usuarios

- Completar esta matriz con enlaces de evidencias auténticos, fechas y decisiones. Escribir cierre de H1, la justificación y umbral de H2 y los cuatro pasos medibles del loop.
- Actualizar documentación, README, versión de descarga, guía del monitor y plan del video, **sin afirmar funcionalidades no desplegadas**.
- Ejecutar pruebas automatizadas de extracción de enlaces, deduplicación, nivel de riesgo y privacidad; agregar casos de mensajes sin URL y notificaciones agrupadas.
- Auditar accesibilidad y rendimiento web; crear las correcciones que recomiende PageSpeed cuando exista un informe de la URL exacta después de ingresar.
- Preparar la implementación real del growth loop con invitaciones, atribución, consentimiento y métrica persistente; desplegarlo solo tras pruebas automatizadas y autorizaciones.
- Robustecer reintentos con WorkManager/JobScheduler y revisar compatibilidad Android sin romper las APK firmadas.
- Documentar un procedimiento de reporte de errores sin copiar conversaciones, enlaces privados ni credenciales.

## Evidencia que no puede sustituirse por automatización

- Al menos 8 participantes reales usando el Alpha 0.2, con fila en Conversaciones y grabación autorizada.
- Disponibilidad medida desde UptimeRobot cada 5 minutos (no se puede reconstruir retroactivamente una semana de monitoreo ausente).
- PageSpeed Insights móvil sobre la pantalla principal de usuario autenticado: números e informe público.
- Cuenta de prueba, registro e ingreso real de usuario normal, privacidad de dos cuentas y guion de 3 a 6 pasos.
- Pruebas de APK 0.5.9 en dispositivo real, incluidas actualizaciones in situ, WhatsApp y SMS, sin red, sin abrir la app, revocación, reinicio y limitaciones de dispositivos antiguos.
- Demo de 4 minutos que muestre funcionalidad H2 y growth loop verdaderamente operativos.

## Compatibilidad Android: matriz inicial

| Entorno | Evaluación estática | Riesgo |
| --- | --- | --- |
| Android 7 y anteriores | No instala según minSdk=26 | Requiere versión compatible y pruebas o alternativa web. |
| Android 8-9 | Instalación técnicamente posible | WebView antiguo, RAM, permisos, disponibilidad de notificaciones. |
| Android 10 Go / low-RAM | Instalación puede ser posible | El SO puede denegar NotificationListenerService en equipos de poca RAM. |
| Android 11-12 | Instalación técnicamente posible | Políticas de batería y optimizaciones del fabricante. |
| Android 13+ | Instalación técnicamente posible | Permiso de publicar notificaciones y acceso al listener; restricciones de segundo plano. |

**Importante:** probar con emuladores no reproduce fielmente los estados de WhatsApp, el fabricante ni los problemas reales de poca memoria.

## Orden recomendado de trabajo

1. **E4 primero:** verificar H2, su fecha de despliegue y growth loop medible (55 % de la entrega).
2. Registro e ingreso público y aislamiento entre cuentas; guion para monitor, prueba de la funcionalidad central.
3. UptimeRobot 99 %, PageSpeed móvil 70/80 y README; ninguna medición se inventa.
4. Automatización de pruebas y compatibilidad, migración de UI moderna a código fuente reproducible.
5. Evidencia: 8 usuarios, conversaciones, resultados, video, declaración IA y sustentación.
