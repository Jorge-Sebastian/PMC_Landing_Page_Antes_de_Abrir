# SmartGuard — Calidad técnica de la Beta · Entrega 5

**Fecha de corte documental:** 26 de noviembre de 2026 (America/Bogota).  
**Rama examinada:** `main`. **Último commit observado antes de este informe:** [`8bf9682`](https://github.com/Jorge-Sebastian/PMC_Landing_Page_Antes_de_Abrir/commit/8bf9682d30234f42fc7c5b028cacfdcacb959f65), publicado el 22/11/2026.  
**Propósito:** registrar qué se puede acreditar para el cierre de la Entrega 5, qué evidencia es histórica y qué requiere comprobación externa actualizada. No sustituye pruebas de usuario ni modifica las mediciones originales de Entrega 4.

> **Precisión:** «documentado», «pasó CI», «publicado en el repositorio» y «verificado en producción» son estados distintos. Este informe no atribuye mediciones nuevas a servicios externos que no se hayan podido consultar.

## 1. Resumen ejecutivo del corte

- SmartGuard combina **web pública informativa y descarga** con una **aplicación Android** que implementa el análisis de enlaces y la funcionalidad familiar. La página pública está dirigida al acceso comercial y a la descarga; **no se puede dar por demostrado en ella el registro, ingreso ni la ejecución de la funcionalidad Android**.
- El repositorio contiene fuentes Android con `versionName "0.6.5-piloto"` (`android/app/build.gradle`, `versionCode 22`), un APK histórico `SmartGuard-Family-v0.6.0-Alpha.apk` en `public/downloads/`, y una actualización posterior del enlace externo de descarga de la landing. El commit del 22/11/2026 identifica esa actualización como **0.6.35**. **No se ha comprobado aquí el contenido, firma, SHA-256 ni funcionamiento físico del instalador externo anunciado**. Son tres evidencias diferentes; no presentar una como prueba de la otra.
- Existen ejecuciones de GitHub Actions del **20/11/2026** con resultado **success** para revisiones de código web, Android y reglas Family; esto acredita **las comprobaciones automatizadas ejecutadas**, no el comportamiento de usuarios, el monitoreo web de siete días ni la entrega de alertas en teléfonos.
- Las ejecuciones programadas de **SmartGuard web quality - PageSpeed mobile** del 20 al 25/11/2026 figuran como **skipped**. El workflow condiciona la ejecución programada a que esté definida la variable `SMARTGUARD_PUBLIC_URL`. Por tanto, **no hay una medición PageSpeed actual acreditada mediante esas ejecuciones**.
- La última evidencia numérica de PageSpeed identificada en esta revisión está fechada **05/11/2026**: **Rendimiento móvil 84/100, Accesibilidad móvil 96/100**, según el [informe de PageSpeed](https://pagespeed.web.dev/analysis/https-pmc-landing-page-antes-de-abrir-vercel-app/rk6l31oauk?form_factor=mobile) y la [guía histórica](../ENTREGA-4-GUIA-MONITOR.md). **No se presentan como valores del 26/11**.
- No fue posible obtener desde las fuentes inspeccionadas el porcentaje exacto de **UptimeRobot de los siete días previos al cierre**, ni un acta de **registro, ingreso, análisis y aislamiento con cuentas nuevas en celular y computador**. Su estado a este corte es **pendiente de acreditar**, no «incumple» ni «cumple» por suposición.

## 2. Matriz de los cuatro requisitos oficiales (15 % de la Entrega 5)

| Condición de la rúbrica | Umbral literal | Evidencia identificada | Estado al 26/11/2026 |
| --- | --- | --- | --- |
| **1. Disponibilidad web** | UptimeRobot **≥99 % durante los 7 días previos al cierre**, con página pública | [Estado público de SmartGuard](https://stats.uptimerobot.com/vyppRM840A), monitor documentado desde 05/11; no se recuperó la cifra actual de la ventana requerida | **PENDIENTE DE VERIFICACIÓN NUMÉRICA** |
| **2. PageSpeed móvil** | Rendimiento **≥70** y Accesibilidad **≥80** | Informe móvil del 05/11: **84 / 96** (histórico). [Workflow de calidad web](../../.github/workflows/smartguard-web-quality.yml) programado con ejecuciones omitidas del 20 al 25/11 | **CUMPLIMIENTO HISTÓRICO; ACTUALIZACIÓN DEL CIERRE PENDIENTE** |
| **3. Flujo central e aislamiento** | Monitor ejecuta en **celular y computador**, con cuenta nueva, registro, ingreso y funcionalidad sin bloqueos; una cuenta no ve los datos privados de otra | [Guion histórico](../ENTREGA-4-GUIA-MONITOR.md); código y tests CI, **sin acta reciente de prueba en dispositivos y dos cuentas** | **PENDIENTE DE PRUEBA E2E REAL** |
| **4. README** | Documentación completa y **sin credenciales** | [README raíz](../../README.md), documentación técnica, scripts de prueba y variables públicas descritas | **PRESENTE; REQUIERE REVISIÓN FINAL DE ACTUALIDAD Y SECRETOS** |

**Regla de evaluación:** Para Excelente se requieren las **cuatro** condiciones. Con tres, la tercera (flujo central) es obligatoria para el nivel Bueno, según la rúbrica. La presencia de código o métricas Android no convierte automáticamente un criterio en «cumplido».

### Ventana temporal de UptimeRobot

Para el cierre del **jueves 26/11/2026 a las 23:59, hora de Bogotá**, el indicador debe corresponder a los **siete días inmediatamente anteriores**, y debe indicarse la hora de corte de la captura o exportación. Anotar porcentaje literal, enlace de estado, periodo observado y captura. La antigüedad del monitor no garantiza el porcentaje de la ventana.

### PageSpeed móvil

Ejecutar PageSpeed Insights **sobre la URL final pública que realmente revisará el jurado**, con perfil **Móvil** y fecha de ejecución visible. Registrar **ambas** puntuaciones y conservar la URL del informe. Si Google limita la API, usar el resultado visible del navegador y documentar el enlace; **no reciclar 84/96 como resultado de noviembre 26**.

## 3. Evidencia de ingeniería y sus límites

### Pruebas automatizadas accesibles

Ejecuciones de **20/11/2026** identificadas como `success`:
- [Android source check](https://github.com/Jorge-Sebastian/PMC_Landing_Page_Antes_de_Abrir/actions/runs/44760600452).
- [Family Firebase rules and web](https://github.com/Jorge-Sebastian/PMC_Landing_Page_Antes_de_Abrir/actions/runs/44760610091).
- [Production core checks](https://github.com/Jorge-Sebastian/PMC_Landing_Page_Antes_de_Abrir/actions/runs/44760610076).
- [Family risk contract](https://github.com/Jorge-Sebastian/PMC_Landing_Page_Antes_de_Abrir/actions/runs/44760610303).
- [Pricing and landing validation](https://github.com/Jorge-Sebastian/PMC_Landing_Page_Antes_de_Abrir/actions/runs/44760610282).
- [E4 static preflight](https://github.com/Jorge-Sebastian/PMC_Landing_Page_Antes_de_Abrir/actions/runs/44760610236).

**Interpretación:** estas ejecuciones permiten demostrar automatización, revisiones de código y regresiones controladas. **No sustituyen** UptimeRobot, PageSpeed actual, cuenta nueva ni revisión de aislamiento en producción. La [ejecución web de calidad del 25/11](https://github.com/Jorge-Sebastian/PMC_Landing_Page_Antes_de_Abrir/actions/runs/45714773822) terminó **skipped**, no **success**.

### Medición Android heredada de la Entrega 4

Se conservan en su contexto el [informe integral del Excel v8](INFORME-INTEGRAL-EXCEL-V8-ENTREGA-4.md), los [resultados de 1.198 registros](RESULTADOS-CONSOLIDADOS-ENTREGA-4.md), [métricas y fórmulas](METRICAS_Y_FORMULAS.md) y [limitaciones](LIMITACIONES.md).

Esos registros corresponden a la **ventana del 29/10 al 05/11**, **no a los siete días anteriores a la Entrega 5**. Las fuentes históricas también contienen discrepancias de procedencia, con identificadores `SG-SIM-*` y referencias a escenario sintético. Los cálculos pueden ser reproducibles sin que su origen se haya verificado externamente en Firebase. No cambiar sus etiquetas ni presentarlos como telemetría nueva del 26/11.

Las tasas de eventos de Android y latencias P95 describen operaciones instrumentadas; **no equivalen** a uptime HTTP de UptimeRobot ni a las puntuaciones Lighthouse de PageSpeed. La aceptación de equivalencias docentes requiere autorización; este corte no afirma que exista.

## 4. Prueba mínima de flujo central para el monitor

Realizar y registrar una pasada **en Android** y una pasada **en computador usando la superficie realmente disponible**. Si la experiencia completa es solo Android, dejarlo explícito y **no declarar cumplida la condición de computador** sin validación o aceptación del docente.

1. **Identificar versión exacta:** APK descargada desde la landing, versión interna, firma y SHA-256. Consignar dispositivo, Android, navegador de escritorio, fecha, zona horaria y tester.
2. **Cuenta nueva:** registrar, iniciar sesión, cerrar sesión y volver a ingresar; anotar errores y capturas sin exponer credenciales.
3. **Análisis central:** usar un enlace seguro de control y un enlace de prueba que produzca advertencia real; documentar la clasificación y cualquier limitación, sin asumir que «verde» garantiza seguridad.
4. **Protección automática:** con permisos autorizados, generar en el teléfono una notificación de prueba controlada y verificar su procesamiento y, cuando corresponda, su alerta real.
5. **Familia y growth loop:** crear grupo, invitar a otra cuenta real, incorporarla, verificar beneficios compartidos solo con consentimiento; no simular invitaciones aceptadas.
6. **Aislamiento:** crear dos cuentas o grupos **no relacionados**; comprobar que los datos de uno no son visibles para el otro sin invitación. Registrar resultado **PASS/FAIL**, pasos y evidencia.
7. **Retención y planes:** abrir Actividad y Planes, verificar navegación y opciones comerciales de la Beta sin confundir un botón de pagos con pagos procesados.

Al terminar, adjuntar acta y video/capturas de los pasos, con redacción de datos personales. **No subir correos, contraseñas, tokens, SMS reales, códigos privados de grupo ni datos identificables.**

## 5. Acciones para cerrar la evidencia hoy

1. **UptimeRobot:** abrir [página de estado](https://stats.uptimerobot.com/vyppRM840A), extraer el porcentaje **Last 7 days** y conservar fecha, hora, URL y captura. Si no hay suficiente cobertura, indicar exactamente el intervalo disponible.
2. **PageSpeed:** medir en [PageSpeed Insights](https://pagespeed.web.dev/) la [web pública](https://pmc-landing-page-antes-de-abrir.vercel.app/) con estrategia Móvil. Guardar URL del informe y puntuaciones. Configurar la variable de repositorio `SMARTGUARD_PUBLIC_URL` con esa dirección en GitHub Actions y ejecutar manualmente [SmartGuard web quality](https://github.com/Jorge-Sebastian/PMC_Landing_Page_Antes_de_Abrir/actions/workflows/smartguard-web-quality.yml). `PAGESPEED_API_KEY` es **secreto opcional**, nunca texto público.
3. **Prueba E2E:** dos cuentas nuevas o aisladas, móvil/computador, capturas, fecha y resultado, especialmente acceso cruzado. La ausencia de un acta es «sin verificar», no «PASS».
4. **Documentación y publicación:** actualizar en el [README raíz](../../README.md) la versión real de la APK entregada y el procedimiento de pruebas; verificar que el enlace descargue el mismo archivo anunciado. No publicar claves ni contraseñas.
5. **Excel oficial:** copiar **solo los valores y enlaces demostrados** a las celdas de calidad técnica de Entrega 5. Si faltan, describir el estado pendiente y la limitación concreta.

### Ficha para registrar resultados posteriores a este corte

| Evidencia | Valor a incorporar | Fuente y fecha obligatorias |
| --- | --- | --- |
| Uptime 7 días | **SIN DATO NUEVO VERIFICADO** | % real, ventana, captura, enlace público |
| PageSpeed rendimiento móvil | **SIN DATO NUEVO VERIFICADO** | Puntaje, fecha y URL del reporte |
| PageSpeed accesibilidad móvil | **SIN DATO NUEVO VERIFICADO** | Puntaje, fecha y URL del reporte |
| Flujo central Android y PC | **SIN ACTA FINAL INSPECCIONADA** | cuentas de prueba, dispositivos, pasos, incidencias, aislamiento |
| Integridad APK | **ENLACE COMERCIAL ACTUALIZADO; BINARIO NO VALIDADO** | versión, firma, SHA-256, instalación |
| README y credenciales | **REVISIÓN FINAL PENDIENTE** | enlace commit y lista de comprobación |

## 6. Trazabilidad y documentos conservados

- [README de calidad técnica](README.md).
- [Informe de Entrega 4: inicio y alcance](ENTREGA-4-INICIO-AQUI.md).
- [Resultados consolidados históricos de Entrega 4](RESULTADOS-CONSOLIDADOS-ENTREGA-4.md).
- [Guía del monitor de Entrega 4](../ENTREGA-4-GUIA-MONITOR.md).
- [Procedimiento web UptimeRobot/PageSpeed](../WEB-QUALITY-ALPHA02.md).
- [Workflow y parámetros de la auditoría web](../../.github/workflows/smartguard-web-quality.yml).
- [Limitaciones de las métricas Android](LIMITACIONES.md).

**Nota editorial:** se conserva el historial anterior sin re-fecharlo. Este documento es el punto de entrada de calidad técnica para la **Entrega 5**, con estado al **26/11/2026**. Las mediciones que se agreguen más tarde deben indicar **su propia fecha de observación** y no alterar retroactivamente este corte.
