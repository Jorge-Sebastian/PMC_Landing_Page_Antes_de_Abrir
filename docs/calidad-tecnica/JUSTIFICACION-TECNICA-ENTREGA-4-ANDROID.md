# SmartGuard — Justificación técnica de calidad para Entrega 4 (Alpha 0.2)

## Alcance de la evaluación

Se presenta la metodología de observabilidad de SmartGuard Android, su relación con los criterios de calidad técnica de la Entrega 4 y la separación entre las mediciones nativas y los resultados oficiales de servicios web.

**Producto evaluado:** SmartGuard dispone de una interfaz web pública y de una aplicación Android. La detección de enlaces en notificaciones y las alertas locales dependen de componentes nativos Android; otras funciones dependen de conectividad y servicios remotos. Por tanto, se presentan **dos niveles diferentes de medición**, sin atribuir resultados de una plataforma a la otra.

## 1. Requisito de la rúbrica frente a arquitectura móvil

| Requisito | Qué evalúa literalmente | Qué ocurre con la APK | Cómo se documenta en SmartGuard |
| --- | --- | --- | --- |
| UptimeRobot: disponibilidad ≥99 % últimos 7 días | Respuesta del **servicio web** publicado, desde una red externa | Una APK instalada no expone necesariamente un endpoint HTTP(S) que UptimeRobot pueda consultar. Su servicio de notificaciones puede estar detenido por permisos, batería o el sistema operativo. | **Web:** página de estado de UptimeRobot y ventana efectiva. **Android:** cobertura de observaciones, salud operativa y resultados de acciones instrumentadas. Son evidencias distintas. |
| PageSpeed móvil: rendimiento ≥70 | Puntuación Lighthouse/PSI de la **página web móvil** | No puede ejecutarse PSI sobre un APK como si fuera una URL web. | **Web:** informe oficial de PageSpeed móvil. **Android:** tiempo de análisis, tiempo de alerta y percentiles calculados desde eventos. |
| PageSpeed móvil: accesibilidad ≥80 | Auditoría automática de accesibilidad de **página web** | La interfaz Android requiere criterios y pruebas nativos (lector de pantalla, tamaños táctiles, contraste, etiquetas). | **Web:** puntaje oficial PSI. **Android:** evidencias de pruebas de accesibilidad nativa, si existen. Las latencias no miden accesibilidad. |
| E2E con dos cuentas | Registro, ingreso, aislamiento y recorrido sin errores | Aplica a flujos compartidos/Family independientemente de la plataforma. | Prueba reproducible en cuentas distintas, móvil y PC, con evidencia funcional; no se sustituye con una tabla de latencias. |

La evaluación se organiza por superficie tecnológica: disponibilidad y experiencia de la web pública mediante herramientas web, y operación nativa Android mediante instrumentación de eventos y latencias. Las métricas de ambas superficies mantienen unidades y alcances diferentes.

## 2. Instrumentación diseñada para medir el funcionamiento de Android

El repositorio contiene componentes de instrumentación como `NativePerformance`, `FirebaseBackgroundTelemetry`, el servicio nativo de notificaciones y un esquema de agregación `devices/{firebaseUid}/daily_metrics/{yyyy-mm-dd}` documentado en [calidad técnica](README.md). Su existencia en el código **no demuestra por sí sola** que una APK específica y firmada haya enviado datos de producción; ese punto debe acreditarse con registros.

Se contemplan los siguientes indicadores:

| Indicador Android | Definición operativa | Interpretación válida y límite |
| --- | --- | --- |
| Salud operativa observada | Acciones con señal de servicio correcto / acciones instrumentadas | Éxito **en eventos observados**; no es uptime continuo del sistema operativo ni de un endpoint. |
| Análisis exitosos | Análisis concluidos correctamente / intentos instrumentados | Fiabilidad de la función de clasificación en la muestra. |
| Alertas publicadas | Alertas generadas correctamente / alertas requeridas conforme a la política de riesgo | Fiabilidad de la notificación; debe definirse el universo de alertas exigibles. |
| Confirmaciones Firebase | Confirmaciones registradas / eventos que requieren confirmación | Mide sincronización observada, no garantiza recepción en todo estado de conectividad. |
| Latencia de análisis | Diferencia entre inicio y fin del procesamiento, en ms | Mide velocidad de análisis en eventos instrumentados. |
| Latencia de alerta | Diferencia entre detección y publicación de alerta, en ms | Mide retraso de notificación bajo las condiciones instrumentadas. |
| P50/P90/P95/P99 | Percentiles calculados sobre las muestras elegibles individuales | No promediar percentiles por dispositivo para construir un percentil global. |

Los indicadores de error, latencia y éxito son útiles para estudiar la experiencia real de una APK; no se convierten por ello en puntuaciones de PageSpeed ni en la disponibilidad oficial de UptimeRobot.

## 3. Tabla consolidada y método de cálculo

El paquete de trabajo `SMARTGUARD_CALIDAD_ENTREGABLES(1).zip` incluye `SMARTGUARD_CALIDAD_TECNICA_INTEGRAL.xlsx` con una tabla de **1.198 observaciones agrupadas en seis identificadores de instalación**, sumatorias, comparativas, histórico, metodología y matriz frente a la rúbrica. El período declarado es del 29 de octubre al 5 de noviembre de 2026.

La tabla se estructura en capas:

1. **Registro individual:** identificador, fecha, instalación, resultado de servicio, resultado de análisis, alerta, confirmación y latencias.
2. **Agregación por instalación:** número de observaciones, numeradores y denominadores de éxito, percentiles de las latencias.
3. **Agregación total:** suma de numeradores y denominadores; los porcentajes globales son cocientes entre esas sumas, nunca promedio simple de porcentajes de instalaciones.
4. **Comparación y umbrales:** diferencias entre instalaciones y criterios adoptados para monitorear calidad operativa.
5. **Correspondencia con la rúbrica:** relación documentada entre las pruebas oficiales de la web, los atributos Android evaluados y la evidencia específica requerida para cada criterio.

**Alcance de los resultados:** la tabla contiene 1.198 observaciones y seis identificadores de instalación. Sus métricas agregadas pueden revisarse y recalcularse a partir de las filas incluidas. El equipo señala que las observaciones corresponden a mediciones reales; para documentar esa procedencia de manera verificable es necesario enlazar la exportación primaria de Firebase/Android o el CSV original con su registro de captura. Hasta contar con esa fuente, este documento distingue resultados tabulados de telemetría de producción verificada.

### Cómo acreditar que los resultados son mediciones reales

Adjuntar o referenciar una exportación primaria con identificadores seudonimizados, marca temporal, versión de APK, tipo de evento y valores originales; explicar el mecanismo de recolección y consentimiento; ejecutar el cálculo reproducible; y comprobar que los totales del Excel coinciden con las fuentes. No subir números de teléfono, contenido de SMS, enlaces privados, tokens ni identificadores personales.

## 4. Qué cubre la página web

La web pública se ofrece en https://pmc-landing-page-antes-de-abrir.vercel.app/ .

- **UptimeRobot**: página de estado https://stats.uptimerobot.com/vyppRM840A . El README documenta que el monitor fue creado el **5 de noviembre de 2026**; no puede demostrar retrospectivamente los siete días anteriores a esa fecha. Para cualquier período evaluado se requiere porcentaje real y duración efectiva de la observación.
- **PageSpeed móvil**: generar un reporte oficial de la URL exacta de la pantalla evaluada, y registrar sus valores de rendimiento y accesibilidad. El código dispone de procedimientos y una acción documentados en [WEB-QUALITY-ALPHA02](../WEB-QUALITY-ALPHA02.md); no se deben atribuir puntuaciones sin ese reporte.
- **Cuentas y flujos**: probar el registro, inicio de sesión y aislamiento de datos con cuentas distintas. Las pruebas de instrumentación no sustituyen esta validación.

## 5. Fundamentación de la estrategia de medición

SmartGuard combina una interfaz web con una aplicación Android cuyo proceso central incluye recepción de eventos de notificaciones, análisis de enlaces y publicación de alertas. La calidad de este flujo depende tanto del procesamiento local como de la conectividad y la sincronización con los servicios remotos.

Para caracterizar la operación nativa se definieron indicadores de salud operativa observada, análisis completados, alertas publicadas, confirmaciones de sincronización y distribución de latencias. Los datos se organizan por observación individual, instalación y agregado general, con denominadores explícitos y percentiles calculados sobre las muestras elegibles.

La metodología permite evaluar de forma cuantitativa la fiabilidad de las operaciones instrumentadas y los tiempos de respuesta en Android. En paralelo, los componentes web se evalúan mediante verificaciones HTTP(S) y PageSpeed Insights. Esta separación evita equiparar una tasa de éxito por evento con disponibilidad continua, o una latencia en milisegundos con una puntuación Lighthouse.

Los resultados numéricos y las definiciones de cada métrica se presentan en [Resultados consolidados de calidad técnica](RESULTADOS-CONSOLIDADOS-ENTREGA-4.md).

## 6. Cobertura de evidencia técnica

| Afirmación | Soporte encontrado | Estado |
| --- | --- | --- |
| Existe instrumentación Android en código fuente | Componentes y documentación del repositorio | Soportado a nivel de código |
| Existe tabla de 1.198 filas y 6 instalaciones identificadas | Excel aportado en el paquete | Soportado como conjunto tabulado |
| Procedencia de las 1.198 filas como capturas reales | Pendiente aportar exportación primaria y correspondencia por evento | Sin verificación independiente |
| Se cuenta con siete días oficiales de UptimeRobot antes de la entrega | Monitor creado el 5/11 según README | No acreditado para los siete días anteriores |
| La web cumple PageSpeed móvil 70/80 | Falta reporte oficial con puntajes correspondientes | Pendiente |
| Se realizó una prueba E2E completa con dos cuentas | Falta registro funcional verificable del recorrido | Pendiente |

## 7. Documentos de referencia

- [Resultados consolidados y cálculos contrastados con el Excel y JSON](RESULTADOS-CONSOLIDADOS-ENTREGA-4.md)

- [README principal](../../README.md)
- [Calidad técnica y generación del reporte](README.md)
- [Calidad web Alpha 0.2](../WEB-QUALITY-ALPHA02.md)
- [Matriz de Entrega 4](../ENTREGA-4-SMARTGUARD-AUDITORIA.md)

**Regla de integridad:** los indicadores y sus fórmulas deben poder recalcularse a partir de los registros, y la procedencia de las mediciones debe sustentarse con las fuentes de captura. Las equivalencias propuestas para Android no sustituyen la evaluación web oficial.
