# SmartGuard | Evaluación de calidad técnica — Entrega 4

**Alpha 0.2 · Arquitectura web + aplicación Android**

**Lectura prioritaria (libro v8):** [Informe técnico integral de medición, evidencia y rúbrica](INFORME-INTEGRAL-EXCEL-V8-ENTREGA-4.md). Incluye la descripción individual de las 13 hojas y las diferencias entre el veredicto declarado en el Excel y la evidencia documentada.

## 1. Requisitos de calidad técnica

La Entrega 4 establece criterios de disponibilidad de siete días (UptimeRobot, **≥99 %**), rendimiento móvil (**≥70** en PageSpeed Insights), accesibilidad móvil (**≥80** en PageSpeed Insights) y un flujo de extremo a extremo comprobable entre dos cuentas. Para contrastarlos, SmartGuard distingue la operación de su **web pública** de la ejecución **nativa Android**: ambas tienen superficies de medición diferentes.

| Requisito de la rúbrica | Medición oficial | Medición de SmartGuard Android | Tratamiento |
| --- | --- | --- | --- |
| Disponibilidad ≥99 % durante siete días | Monitor HTTP(S) y página de estado UptimeRobot | Salud operativa de eventos instrumentados, con denominador explícito | Complementaria; no equivale al uptime continuo |
| Rendimiento móvil ≥70 | PageSpeed Insights móvil, puntuación Lighthouse de la web | Latencia de análisis y de alerta, cuantiles P50/P90/P95/P99 | Complementaria; no genera puntaje Lighthouse |
| Accesibilidad móvil ≥80 | PageSpeed Insights móvil de la web | Pruebas de accesibilidad Android (etiquetas, lector de pantalla, contraste, interacción) | Requiere evidencia específica de interfaz |
| Flujo E2E de dos cuentas | Registro, ingreso, aislamiento y flujo en web/móvil | Pruebas de SmartGuard Family con sesiones distintas | Se evalúa funcionalmente; no se infiere del Excel |

## 2. Instrumento de medición: libro Excel de calidad técnica

La consolidación se realizó en el libro **`SMARTGUARD_CALIDAD_TECNICA_INTEGRAL.xlsx`**, elaborado para reunir el registro individual de cada operación, calcular los indicadores, comparar seis instalaciones y relacionar los resultados con los criterios de calidad.

**Acceso al libro:** la versión actual revisada fue suministrada por el equipo como **`SMARTGUARD_CALIDAD_TECNICA_INTEGRAL(8).xlsx`**; se distingue del paquete histórico **`SMARTGUARD_CALIDAD_ENTREGABLES(1).zip`**. Su copia binaria todavía debe publicarse como archivo descargable permanente en el repositorio; por ello no se presenta una URL de GitHub inexistente. La **[tabla resumen verificable dentro del repositorio](RESULTADOS-CONSOLIDADOS-ENTREGA-4.md)** y los **[indicadores exportables en CSV](RESULTADOS-RESUMEN-ENTREGA-4.csv)** están disponibles desde esta página.

### Organización del Excel (13 hojas)

| Hoja | Qué aporta |
| --- | --- |
| `00_VEREDICTO` | Síntesis y lectura general de los criterios |
| `01_REGISTROS` | 1.198 filas con evento, fecha, instalación, resultados y latencias |
| `02_SUMATORIAS` | Totales, ratios y percentiles por instalación y globales |
| `03_COMPARATIVA` | Comparación de indicadores entre instalaciones |
| `04_RUBRICA_OFICIAL` | Criterios literales de la rúbrica y su estado |
| `05_EQUIVALENCIAS_ANDROID` | Diferencia entre evaluación web e indicadores Android |
| `06_PRUEBAS_E2E` | Registro de recorridos de extremo a extremo |
| `07_ACCESIBILIDAD` | Registro de comprobaciones de accesibilidad |
| `08_HISTORICO_7D` | Agrupación temporal de la ventana examinada |
| `09_METODOLOGIA` | Definiciones, reglas de cálculo y umbrales |
| `10_TRAZABILIDAD` | Referencias a las fuentes de las mediciones |
| `11_CATALOGO_30` | Catálogo de indicadores y criterios |
| `12_AUX_LATENCIAS` | Series auxiliares para calcular percentiles |

La tabla permite **reproducir los cálculos desde las 1.198 filas disponibles**. El equipo declara que verificó el origen real de las mediciones; la correspondencia independiente con exportaciones originales de captura se documenta separadamente. La trazabilidad de fórmulas y la procedencia operativa son verificaciones diferentes.

## 3. Resultados obtenidos de la tabla consolidada

Se examinaron **1.198 observaciones**, agrupadas en **seis identificadores de instalación**, dentro de la ventana declarada entre el **29 de octubre y el 5 de noviembre de 2026**.

| Indicador medido | Eventos favorables / elegibles | Resultado |
| --- | ---: | ---: |
| Salud operativa observada | 1.188 / 1.198 | **99,17 %** |
| Análisis exitosos | 1.187 / 1.198 | **99,08 %** |
| Alertas publicadas | 523 / 527 | **99,24 %** |
| Confirmaciones de eventos | 1.187 / 1.198 | **99,08 %** |

El número de alertas elegibles (**527**) corresponde a los eventos de riesgo naranja o rojo. Los porcentajes se calculan **sumando primero los numeradores y denominadores** por instalación; no son promedios simples de porcentajes.

| Distribución de latencias | P50 | P90 | P95 | P99 |
| --- | ---: | ---: | ---: | ---: |
| Análisis | 270 ms | 405 ms | **437 ms** | 537 ms |
| Publicación de alertas | 576 ms | 743 ms | **783 ms** | 881 ms |

Los percentiles se calculan con observaciones elegibles individuales y el método de rango más cercano. El P95 de análisis resulta inferior a la meta operativa interna de **500 ms**, y el P95 de alertas a la de **1.000 ms**.

## 4. Fundamentación de los indicadores nativos

UptimeRobot consulta externamente endpoints HTTP(S). El servicio de notificaciones de una APK no es un servidor web público: su ejecución está condicionada por permisos, estados de Android, restricciones de segundo plano y conectividad. Por ello, la tasa de salud operativa observada caracteriza los eventos medidos, **no el porcentaje de disponibilidad continua de la aplicación**.

PageSpeed Insights puntúa páginas web; no mide directamente la duración de los procesos del listener nativo Android. Las latencias de análisis y de alertas permiten caracterizar esa ejecución con unidades físicas (milisegundos), **sin convertirse en una puntuación PageSpeed**.

La web pública de SmartGuard se evalúa por separado con las herramientas oficiales; su evaluación está descrita en [Calidad web del Alpha 0.2](../WEB-QUALITY-ALPHA02.md). Los indicadores nativos amplían la evidencia de calidad para las funciones que esas herramientas web no observan.

## 5. Interpretación y límites de la evidencia

Los registros consolidados permiten comparar fiabilidad y tiempos de operación de la instrumentación Android en el conjunto suministrado. La página de estado web, los informes móviles de PageSpeed y las pruebas E2E corresponden a pruebas específicas con metodología propia y deben presentarse con sus enlaces y fechas de ejecución. **No se atribuyen a las métricas Android puntajes oficiales que no hayan sido medidos por la herramienta correspondiente.**

La captura y validación original de mediciones se atribuye al equipo; para auditoría externa de procedencia se requiere conservar o referenciar la exportación primaria y su correspondencia con los identificadores del Excel.

## 6. Documentación de apoyo

- [Resultados detallados, agregaciones y verificación interna](RESULTADOS-CONSOLIDADOS-ENTREGA-4.md)
- [Fundamentación técnica de la instrumentación Android](JUSTIFICACION-TECNICA-ENTREGA-4-ANDROID.md)
- [Guía de calidad web y herramientas oficiales](../WEB-QUALITY-ALPHA02.md)
- [Índice de calidad técnica](README.md)

*Los resultados anteriores se recalcularon a partir de los registros contenidos en el libro suministrado. No se ha alterado su contenido.*
