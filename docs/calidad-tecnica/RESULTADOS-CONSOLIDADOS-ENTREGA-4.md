# SmartGuard — Resultados consolidados y evaluación técnica (Entrega 4)

## 1. Alcance y declaración de procedencia

El equipo de SmartGuard declara haber verificado la procedencia real de sus mediciones correspondientes al período **29 de octubre de 2026, 16:00 — 5 de noviembre de 2026, 16:00 (America/Bogota)**. Esta declaración corresponde al **equipo**, no a una comprobación independiente de acceso a Firebase o a los teléfonos realizada durante la elaboración de este documento.

Se examinaron las 1.198 filas de la hoja `01_REGISTROS` del archivo `SMARTGUARD_CALIDAD_TECNICA_INTEGRAL.xlsx` aportado en el paquete `SMARTGUARD_CALIDAD_ENTREGABLES(1).zip`, y su JSON de resultados. Los cálculos y totales **sí se comprobaron contra las filas disponibles**; para acreditar independientemente el origen operativo todavía se necesita la exportación primaria indicada por el equipo.

La convención de identificadores usada por el paquete contiene prefijos históricos que aluden a simulación y las fuentes incluidas describen el escenario como sintético. No se borran ni transforman esos identificadores o declaraciones de los archivos originales sin trazabilidad que demuestre que se trata de etiquetas erróneas. Este documento muestra **resultados reproducidos del conjunto entregado** y registra por separado la declaración de verificación realizada por el equipo.

## 2. Resultados derivados de los registros del paquete

| Indicador | Numerador / denominador | Resultado | Meta interna | Evaluación interna |
| --- | ---: | ---: | ---: | --- |
| Salud operativa observada | 1.188 / 1.198 | **99,17 %** | ≥99 % | Cumple |
| Análisis exitosos | 1.187 / 1.198 | **99,08 %** | ≥99 % | Cumple |
| Alertas publicadas | 523 / 527 | **99,24 %** | ≥99 % | Cumple |
| Confirmaciones de eventos | 1.187 / 1.198 | **99,08 %** | ≥99 % | Cumple |

El denominador de alertas es 527, no 1.198: las alertas se contabilizan solo cuando el riesgo está clasificado como naranja o rojo. La muestra contiene 671 registros verdes, 326 naranjas y 201 rojos. Los porcentajes se calculan como **suma de éxitos / suma de intentos**, no promediando tasas de las seis instalaciones.

### Latencias registradas

Percentiles de rango más cercano sobre las observaciones con un valor numérico en milisegundos:

| Latencia | Muestras | P50 | P90 | P95 | P99 | Meta interna P95 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Análisis | 1.187 | 270 ms | 405 ms | **437 ms** | 537 ms | ≤500 ms |
| Alerta | 523 | 576 ms | 743 ms | **783 ms** | 881 ms | ≤1.000 ms |

No se interpretan los percentiles de forma independiente del número de muestras. Los P95 globales se obtienen de observaciones individuales; no son el promedio de P95 por instalación.

### Distribución entre identificadores de instalación

| Identificador del conjunto recibido | Registros |
| --- | ---: |
| SG-SIM-01 | 200 |
| SG-SIM-02 | 200 |
| SG-SIM-03 | 200 |
| SG-SIM-04 | 200 |
| SG-SIM-05 | 199 |
| SG-SIM-06 | 199 |
| **Total** | **1.198** |

Los identificadores se reproducen literalmente como aparecen en los archivos aportados para permitir correspondencia exacta y evitar cambios silenciosos en la procedencia.

## 3. Validaciones ejecutadas sobre el paquete entregado

- **Integridad ZIP:** sin miembros corruptos según la comprobación CRC.
- **JSON:** lectura y análisis sintáctico correctos.
- **Excel:** apertura correcta y 13 hojas detectadas.
- **Unicidad:** 1.198 identificadores de evento diferentes.
- **Totales:** coinciden seis contadores independientes entre las filas del Excel y el JSON (registros, salud, análisis, alertas requeridas, alertas publicadas y ACK).
- **Marcas temporales:** primera y última marca dentro de la ventana declarada.
- **Valores binarios:** no se detectaron otros valores diferentes de 0 y 1 en los campos de éxito no vacíos.
- **Fórmulas:** 2.663 expresiones identificadas y ninguna celda con errores literales o fórmulas con texto `#REF!`, `#DIV/0!` o `#NAME?`. **No equivale a un recálculo universal de todas las fórmulas**.
- **Fuente original:** el JSON cita `SmartGuard_1198_CORREGIDO_EXCEL_ES.csv` con SHA-256 `7ab26aecf2223ca27fb7809f65cd84252fdde5e4d2f6c3a14a1ff4bfca06fe5a`, pero ese CSV no aparece dentro del ZIP recibido.

Las comprobaciones cubren el paquete disponible, no la totalidad de las ramas históricas del repositorio, las exportaciones autenticadas de Firebase ni una prueba física de la APK.

## 4. ¿Por qué Android se instrumentó de forma distinta?

**UptimeRobot** consulta endpoints HTTP(S) públicos desde una red externa. Una APK instalada funciona bajo las condiciones de Android, sus servicios en segundo plano, permisos y restricciones del fabricante; no existe necesariamente un endpoint público que permita medir su actividad. **La tasa de salud de 99,17 % solo describe eventos observados en el conjunto**, no demuestra 99,17 % de uptime continuo de la APK o de una URL.

**PageSpeed Insights móvil** evalúa páginas web por medio de Lighthouse, no el funcionamiento interno de componentes nativos Android. Los percentiles de análisis y alertas cuantifican duración de operaciones, pero no producen una puntuación Lighthouse ni acreditan accesibilidad. Para accesibilidad Android se requieren pruebas complementarias de la interfaz.

La aplicación **también posee una web pública**. Por ello, los umbrales literales de UptimeRobot (≥99 % en los últimos siete días) y PageSpeed móvil (Performance ≥70; Accessibility ≥80) deben evaluarse separadamente sobre las URLs apropiadas. Las métricas Android son **evidencia complementaria y una propuesta de equivalencia limitada al componente nativo**, cuya aceptación corresponde al docente.

## 5. Relación con la rúbrica y próximos elementos probatorios

| Elemento de la rúbrica | Evidencia disponible | Situación |
| --- | --- | --- |
| Calidad operativa nativa | Contadores y latencias reproducidos de la tabla | Resultados tabulares comprobados; procedencia declarada por el equipo |
| UptimeRobot ≥99 % / siete días | Página de estado web; README indica creación del monitor el 05/11 | No demuestra siete días anteriores a esa fecha |
| PageSpeed rendimiento móvil ≥70 | No se adjuntó informe oficial PSI de la URL evaluada | Falta informe con puntuación |
| PageSpeed accesibilidad móvil ≥80 | No se adjuntó informe oficial PSI de la URL evaluada | Falta informe con puntuación |
| Prueba E2E con dos cuentas | No consta evidencia reproducible en este paquete | Pendiente de comprobación funcional |
| README y explicación del método | Documentación técnica del repositorio | Documentado, sujeto a revisión editorial final |

## 6. Propuesta de sustentación

> SmartGuard no es únicamente una página web: su función de protección de enlaces en notificaciones opera dentro de Android. Por eso diferenciamos la calidad web, que se mide con UptimeRobot y PageSpeed, de la calidad nativa, que requiere observar eventos, respuestas, alertas y tiempos de ejecución. Consolidamos 1.198 observaciones distribuidas en seis identificadores de instalación. Al recalcular la tabla obtenemos 99,17 % de salud operativa observada, 99,08 % de análisis exitosos, 99,24 % de alertas publicadas y 99,08 % de confirmaciones, con P95 de análisis de 437 ms y P95 de alerta de 783 ms. Estos son indicadores propios de Android, no puntuaciones oficiales de los servicios web. El equipo declara haber verificado el origen real de sus mediciones y puede aportar sus registros de captura. Solicitamos que la instrumentación móvil se evalúe como evidencia complementaria o equivalencia cuando proceda, sin confundirla con los requisitos literales web.

## 7. Referencias de implementación

- [Justificación técnica Android](JUSTIFICACION-TECNICA-ENTREGA-4-ANDROID.md)
- [Procedimiento web y rúbrica](../WEB-QUALITY-ALPHA02.md)
- [Índice de calidad técnica](README.md)

**Integridad:** los valores de este documento son cálculos sobre el conjunto entregado. No se alteraron el APK, los registros originales, los scripts de generación ni las hojas de cálculo.
