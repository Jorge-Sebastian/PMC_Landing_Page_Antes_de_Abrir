# Auditoría de procedencia SmartGuard — 12 de noviembre de 2026

## Alcance
Se inspeccionó el paquete aportado `SMARTGUARD_CALIDAD_ENTREGABLES(1).zip` (15 archivos), incluidos sus archivos Markdown y JSON y las 13 hojas del libro Excel. Se contrastó el README de la rama `main` y `scripts/quality/generate_report.py` mediante GitHub. No se realizó una exploración exhaustiva del repositorio ni consulta autenticada de Firebase.

## Hallazgo principal
El ZIP contiene 1.198 registros en `01_REGISTROS`, con identificadores `SIM-0001` y siguientes, distribuidos entre instalaciones `SG-SIM-01` a `SG-SIM-06` (200, 200, 200, 200, 199 y 199 filas). La columna de procedencia marca las 1.198 filas como `SIMULADO_NO_EVIDENCIA`, mientras el comentario declara «Muestra sintética; no prueba real». El JSON `SMARTGUARD_INFORME_SIMULACION.json` también declara esa procedencia. El script de generación describe su salida como simulación.

No se adjuntó el CSV de origen `SmartGuard_1198_CORREGIDO_EXCEL_ES.csv` citado por los informes, ni exportaciones primarias verificables de Firestore o logs de Android. La documentación afirma que no son capturas de teléfonos reales. **Con lo aportado no se puede verificar que el conjunto sea telemetría real.** Esto tampoco demuestra que no existan mediciones reales distintas fuera del paquete.

## Inventario del ZIP
- `SMARTGUARD_CALIDAD_TECNICA_INTEGRAL.xlsx`: 13 hojas; 2.414 celdas con menciones de simulación/procedencia sintética (incluidas referencias repetidas por fila).
- `SmartGuard_PROPUESTA_PROFESOR.md`: 1 línea coincidente.
- `SMARTGUARD_INFORME_SIMULACION.md`: 4 líneas coincidentes.
- `SMARTGUARD_INFORME_SIMULACION.json`: 2 líneas coincidentes.
- `documentacion/ARQUITECTURA.md`: 3.
- `documentacion/EQUIVALENCIAS_ANDROID_WEB.md`: 0.
- `documentacion/RESULTADOS_VERIFICADOS.md`: 2.
- `documentacion/PRODUCCION_PENDIENTE.md`: 1.
- `documentacion/UMBRALES.md`: 0.
- `documentacion/LIMITACIONES.md`: 1.
- `documentacion/AUDITORIA_ESTADO_INICIAL.md`: 1.
- `documentacion/README.md`: 3.
- `documentacion/METRICAS_Y_FORMULAS.md`: 1.
- `documentacion/PROPUESTA_PROFESOR.md`: 1.
- `documentacion/MATRIZ_RUBRICA_ENTREGA_4.md`: 1.

Total: 2.435 coincidencias por línea o celda, no 2.435 archivos diferentes.

## Matriz de correcciones
| Archivo | Texto anterior | Texto corregido | Evidencia | Estado |
|---|---|---|---|---|
| Excel, hoja `01_REGISTROS` | `SIMULADO_NO_EVIDENCIA` | Sin cambio hasta validar origen | 1.198 filas con etiqueta explícita; sin registros de origen | Pendiente de validación |
| Excel, hoja `00_VEREDICTO` | Simulación demostrativa | Sin cambio hasta validar origen | Misma tabla derivada del conjunto sintético declarado | Pendiente |
| `SMARTGUARD_INFORME_SIMULACION.json` | `SIMULADO_NO_EVIDENCIA` | Sin cambio | Campo `source.provenance` | Pendiente |
| `scripts/quality/generate_report.py` | Generador de simulación | No cambiar a telemetría real sin integración verificable | Código del generador | Pendiente |

## Evidencia que falta
1. CSV original con SHA-256 correspondiente al hash citado, o exportación primaria de Firebase/Android.
2. Identificadores anónimos y marcas de tiempo que vinculen eventos de producción con filas del Excel.
3. Código de transformación y ejecución reproducible.
4. Capturas o informes de UptimeRobot y PageSpeed para la ventana pertinente, y pruebas funcionales entre cuentas separadas.

No reinterpretar un índice Android como puntaje oficial PageSpeed/UptimeRobot.

## Resultado
Archivos del ZIP modificados: **0**. Registros con autenticidad comprobada: **0**, por falta de evidencia primaria (no equivale a afirmar que sean falsos). Correcciones de etiquetas de datos a «real»: **0**. Este informe documenta el motivo por el que no se puede reclasificar el conjunto sin pruebas adicionales.
