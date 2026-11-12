# SmartGuard — Informe técnico integral de medición (Excel v8)

**Entrega 4 · Alpha 0.2 · SmartGuard web + SmartGuard Android**

> **Base del informe:** archivo entregado por el equipo `SMARTGUARD_CALIDAD_TECNICA_INTEGRAL(8).xlsx` (13 hojas). El equipo identifica este libro como su consolidado original de mediciones. Las cifras de este informe se contrastan con las 1.198 filas que contiene. Esta comprobación aritmética no constituye, por sí misma, verificación independiente de una exportación autenticada de Firebase: el archivo fuente citado, `SmartGuard_1198_CORREGIDO_EXCEL_ES.csv`, no está incluido en el material recibido para esta revisión.

## 1. Resumen para el evaluador

SmartGuard combina una **web pública** para consultar enlaces y una **APK Android** para analizar señales y emitir alertas. Por las diferencias arquitectónicas entre una web y una APK, se emplearon dos conjuntos de instrumentos:

- **Android:** resultados por evento, éxito de análisis, salud operativa observada, publicación de alertas, confirmaciones y distribución de latencias.
- **Web:** UptimeRobot para disponibilidad HTTP(S), PageSpeed Insights/Lighthouse para rendimiento y accesibilidad móvil y pruebas funcionales con dos cuentas para autenticación/aislamiento.

En el **conjunto del Excel**, los seis objetivos internos Android se cumplen. **No se convierte automáticamente ese resultado en un 4/4 oficial**: cada criterio de la rúbrica tiene un instrumento y una prueba propios.

## 2. Identificación, período y procedencia declarada

| Dato | Valor identificado en el libro |
| --- | --- |
| Registros individuales | 1.198 |
| Identificadores de instalación | 6 (`SG-SIM-01` a `SG-SIM-06`) |
| Inicio de ventana declarado | 2026-10-29 16:00, Bogotá |
| Fin de ventana declarado | 2026-11-05 16:00, Bogotá |
| Fuente declarada | Firebase, registros numéricos |
| Archivo fuente nombrado | `SmartGuard_1198_CORREGIDO_EXCEL_ES.csv` |
| SHA-256 **declarado para ese CSV**, no calculado aquí | `7ab26aecf2223ca27fb7809f65cd84252fdde5e4d2f6c3a14a1ff4bfca06fe5a` |
| Libro de análisis | `SMARTGUARD_CALIDAD_TECNICA_INTEGRAL(8).xlsx` |

Los identificadores de eventos conservan prefijos `SIM-` y las instalaciones `SG-SIM-`. Se documentan literalmente, sin rebautizarlos ni tomar los prefijos como prueba concluyente de autenticidad o falta de ella. La hoja `10_TRAZABILIDAD` contiene a la vez una declaración de origen Firebase y la advertencia «Fuente original no certifica capturas Android ni uso de servicios externos»; por ello la procedencia se presenta como **declaración del equipo pendiente de contraste con exportación primaria**. Si el equipo conserva esa exportación, puede corroborarse por hash y correspondencia evento por evento. Los registros con contenidos privados (SMS, enlaces personales, tokens, datos familiares) no se deben publicar.

## 3. Resultados Android: definiciones, cálculos y umbrales

| Indicador | Cálculo con la muestra | Valor | Objetivo interno | Evaluación |
| --- | --- | ---: | ---: | --- |
| Salud operativa observada | 1.188 eventos saludables / 1.198 eventos instrumentados | **99,17 %** | ≥99 % | Cumple |
| Análisis exitosos | 1.187 análisis correctos / 1.198 intentos | **99,08 %** | ≥99 % | Cumple |
| Alertas publicadas | 523 alertas OK / 527 alertas requeridas | **99,24 %** | ≥99 % | Cumple |
| Confirmaciones de eventos | 1.187 confirmaciones / 1.198 eventos | **99,08 %** | ≥99 % | Cumple |
| Latencia de análisis P95 | Percentil 95 de 1.187 muestras de duración | **437 ms** | ≤500 ms | Cumple |
| Latencia de alerta P95 | Percentil 95 de 523 muestras elegibles | **783 ms** | ≤1.000 ms | Cumple |

Las alertas requeridas se identifican en eventos **naranja o rojo**: 326 naranjas + 201 rojos = **527 elegibles**. Los otros **671** eventos son verdes. La ausencia de alerta para riesgo verde no debe contabilizarse como error.

**Agregación:** cada porcentaje general se calcula con `SUM(éxitos)/SUM(elegibles)`, no promediando tasas individuales de los seis dispositivos. Los percentiles globales se calculan sobre **muestras individuales** mediante la regla de rango más cercano `P95 = SMALL(muestras, ROUNDUP(N*0.95, 0))`. No se promedian percentiles parciales por instalación.

### Distribución temporal y por instalación

Los seis identificadores acumulan respectivamente **200, 200, 200, 200, 199 y 199 observaciones**, total **1.198**. La hoja `08_HISTORICO_7D` presenta cortes calendarios entre el **29 de octubre** y el **5 de noviembre**, con extremos de ventana parciales. Una tabla de eventos repartidos en fechas **no implica** monitorización HTTP continua ni disponibilidad en los intervalos sin eventos.

### Latencias y lectura operativa

| Serie | Muestras | P50 | P90 | P95 | P99 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Análisis | 1.187 | 270 ms | 405 ms | **437 ms** | 537 ms |
| Alerta | 523 | 576 ms | 743 ms | **783 ms** | 881 ms |

**Interpretación:** el P95 de análisis de 437 ms significa que aproximadamente el 95 % de las duraciones válidas registradas no supera ese valor. El P95 de alerta de 783 ms describe el tiempo instrumentado para emitir las alertas elegibles. No demuestra, por sí mismo, cuánto tarda un usuario en ver el aviso en cualquier fabricante Android ni mide un flujo completo bajo todas las condiciones de red/batería.

El libro presenta un índice Android propio cercano a **99,31/100**; es un **índice interno ponderado**, definido en `09_METODOLOGIA`, **no** una puntuación de Google PageSpeed ni un estándar externo. La cadena `"6/6"` en `00_VEREDICTO!D5` es texto fijo: la evaluación reproducible de cada indicador reside en `00_VEREDICTO!F9:F14`.

## 4. Método y recorrido de cada dato

1. **Captura y origen declarado:** la hoja `10_TRAZABILIDAD` identifica Firebase y un CSV de origen; su correspondencia técnica con una exportación externa debe conservarse como evidencia de procedencia.
2. **Filas individuales:** `01_REGISTROS` contiene ID del evento, hora Bogotá, ID de instalación, versión Android, nivel de riesgo, indicadores de éxito y duraciones válidas.
3. **Sumatorias:** `02_SUMATORIAS` realiza recuentos y sumas por instalación y acumulados, con los denominadores respectivos.
4. **Comparación:** `03_COMPARATIVA` muestra diferencias entre instalaciones sin sustituir datos de base.
5. **Histórico:** `08_HISTORICO_7D` agrega registros por día, sin inferir disponibilidad fuera de las observaciones.
6. **Percentiles:** `12_AUX_LATENCIAS` organiza muestras para las funciones de percentil.
7. **Objetivos y fórmula:** `09_METODOLOGIA` enumera seis umbrales, pesos, operaciones y reglas de interpretación.
8. **Síntesis:** `00_VEREDICTO` muestra índice, estados y lectura general.
9. **Correspondencia:** `04_RUBRICA_OFICIAL` y `05_EQUIVALENCIAS_ANDROID` describen criterios web y alcance Android, que deben leerse por separado.
10. **Pruebas funcionales complementarias:** `06_PRUEBAS_E2E` y `07_ACCESIBILIDAD` proporcionan plantillas de verificación; los campos de resultados observados no pueden sustituirse por tasas de telemetría.

## 5. Inventario de las trece hojas

| Hoja | Función | Lectura responsable |
| --- | --- | --- |
| `00_VEREDICTO` | Síntesis, índice propio, estados | El índice es interno; contrastar cualquier 4/4 con la matriz de evidencia |
| `01_REGISTROS` | 1.198 eventos individuales | Base de cálculo; conservar identificadores y no publicar datos sensibles |
| `02_SUMATORIAS` | Contadores/ratios/percentiles por instalación | Denominadores correctos y agregado ponderado |
| `03_COMPARATIVA` | Comparación entre instalaciones | Comparación descriptiva de la muestra |
| `04_RUBRICA_OFICIAL` | Cinco subcondiciones agrupadas en cuatro criterios | Celdas `C7:C9` contienen descripciones Android, no cifras oficiales de PSI/UptimeRobot; `D7:D11` marca `CUMPLE` sin corroborarlo en todos los casos |
| `05_EQUIVALENCIAS_ANDROID` | Diferencias web vs Android | Declara expresamente que no hay conversión automática |
| `06_PRUEBAS_E2E` | Diez pasos de cuentas A/B en móvil/PC | Resultados observados y enlaces sin diligenciar en la copia recibida; `D18=PENDIENTE` |
| `07_ACCESIBILIDAD` | TalkBack, etiquetas, contraste, foco, escala | Las casillas de estado/evidencia están vacías en la copia; su `A2` afirma incorrectamente que representa un score PageSpeed |
| `08_HISTORICO_7D` | Cortes diarios | No equivale a uptime medido por UptimeRobot |
| `09_METODOLOGIA` | Definiciones, reglas y umbrales | Seis objetivos internos propios y reglas de cálculo |
| `10_TRAZABILIDAD` | Fuente declarada, CSV, hash y fechas | Origen afirmado por el equipo, no validado externamente en este análisis |
| `11_CATALOGO_30` | Catálogo de posibles indicadores | No son treinta métricas automáticamente calculadas |
| `12_AUX_LATENCIAS` | Vectores auxiliares de latencias | Alimentan cuantiles sin mezclar valores no aplicables |

## 6. Relación con la rúbrica: cinco subcondiciones, cuatro criterios agregados

| Subcondición | Umbral / exigencia | Evidencia identificada | Qué se puede afirmar |
| --- | --- | --- | --- |
| **UptimeRobot / disponibilidad** | ≥99 % últimos siete días | Página de estado: https://stats.uptimerobot.com/vyppRM840A ; README documenta monitor creado el 05/11 | La URL permite revisar el monitor; el **99,17 % Android** no demuestra uptime HTTP de los siete días anteriores |
| **PageSpeed / Performance** | ≥70 móvil | Existe informe oficial de la portada de fecha 05/11 enlazado en README, que reporta **84/100** | Evidencia web puntual para la URL evaluada; **437 ms P95 Android** no es PageSpeed |
| **PageSpeed / Accessibility** | ≥80 móvil | El mismo informe oficial enlazado en README reporta **96/100** | Evidencia web puntual; la revisión TalkBack nativa requiere acta propia |
| **Flujo E2E entre cuentas** | Registro, ingreso, aislamiento y navegación en dispositivos correspondientes | Libro tiene diez pasos diseñados, pero `06_PRUEBAS_E2E!F7:H16` está sin ejecución registrada | **Pendiente de documentar ejecución**, aun si el equipo ya realizó pruebas |
| **README completo** | Instalación, ejecución, arquitectura, seguridad, pruebas y evidencia | README raíz y documentación técnica del repositorio | Documentación presente; revisar enlaces y criterios de entrega |

**Informe oficial PageSpeed móvil (referenciado en README):** https://pagespeed.web.dev/analysis/https-pmc-landing-page-antes-de-abrir-vercel-app/rk6l31oauk?form_factor=mobile

La matriz `04_RUBRICA_OFICIAL` del libro recibido muestra **`4/4 VERIFICADOS`**, pero sus resultados `C7:C9` describen mediciones Android y la hoja E2E está pendiente. **Esa etiqueta es una declaración del libro, no una conclusión probada por la evidencia incluida**. Para sustentar 4/4 se necesita vincular cada resultado a su medición específica, con fecha/URL y acta E2E.

## 7. Fundamento técnico de la instrumentación alternativa para Android

**UptimeRobot:** requiere un servicio HTTP(S) direccionable desde Internet. Una APK puede ejecutarse localmente y depender del permiso Notification Listener, del sistema operativo, de restricciones de batería y de conectividad. Sus eventos saludables miden **fracción de acciones observadas con resultado favorable**, no tiempo continuo de respuesta HTTP. Para la web sí corresponde emplear UptimeRobot con una ventana efectiva de siete días.

**PageSpeed Insights:** ejecuta Lighthouse sobre una página web, con métricas y auditorías específicas del navegador. La latencia del detector y el tiempo de publicación de alerta en Android son indicadores objetivos **de finalidad relacionada con el rendimiento**, pero sus unidades y metodologías son distintas. No hay función válida para transformar milisegundos de la APK en puntos Lighthouse. La accesibilidad Android requiere TalkBack/Accessibility Scanner, no solo latencias.

**Firebase/confirmaciones:** el ACK registrado indica el éxito observado de la operación instrumentada de confirmación. No acredita por sí solo entrega de todos los SMS, recepción de cada notificación ni continuidad de conectividad; esas propiedades demandan pruebas adicionales.

Por ello, el diseño de medición **es defendible como instrumentación complementaria adaptada al componente nativo**, siempre que se distinga de las herramientas oficiales de la web.

## 8. Documentos y código relacionado

- [Inicio de calidad técnica — Entrega 4](ENTREGA-4-INICIO-AQUI.md)
- [Resultados numéricos consolidados](RESULTADOS-CONSOLIDADOS-ENTREGA-4.md)
- [Justificación técnica Android](JUSTIFICACION-TECNICA-ENTREGA-4-ANDROID.md)
- [Calidad web y PageSpeed](../WEB-QUALITY-ALPHA02.md)
- [README raíz](../../README.md)
- [Índice del directorio y precauciones de generación](README.md)

**Declaración de integridad:** este documento no cambia el Excel, no altera datos ni registros, no reconstruye una exportación de Firebase inexistente y no deduce un resultado oficial web a partir de observaciones Android.
