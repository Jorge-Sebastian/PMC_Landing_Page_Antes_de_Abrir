# Métricas y fórmulas

Existen **30 métricas catalogadas** en la hoja `11_CATALOGO_30` del generador. No todas tienen colector en el código actual. Para cada una se especifica origen, estado y limitación; no atribuir a Android una observación que no pueda captar.

| Indicador | Fórmula | Meta interna propuesta |
|---|---|---:|
| Salud observada | checks saludables / checks observados | >=99 % |
| Análisis correcto | análisis finalizados OK / (OK + fallidos) | >=99 % |
| Alertas publicadas | notificaciones notificadas / notificaciones solicitadas | >=99 % |
| ACK a Firebase | eventos HTTP 2xx confirmados / eventos SQLite creados | >=99 % |
| P95 análisis | percentil 95 nearest-rank / cota bucket por panel | <=500 ms |
| P95 alerta | percentil 95 nearest-rank / cota bucket por panel | <=1000 ms |

- Ratio global = SUMA éxitos / SUMA intentos; no promedio aritmético de ratios de instalaciones.
- Latencia global = percentil de muestras/histogramas combinados; no promedio de P95 por dispositivo.
- Si no hay denominador, resultado = SIN DATOS, no 100 %.
- Cada color verde/naranja/rojo clasifica una observación; NO demuestra la veracidad del diagnóstico sin verificación externa.
- `eventsPending` es fotografía de cola, no contador sumable por días.
- índice interno (seis métricas): 20 % cada tasa; 10 % P95 análisis y 10 % P95 alerta. Tasas aportan su valor observado; latencias aportan `min(1, objetivo/observado)`; métricas faltantes impiden certificar cumplimiento. Un fallo crítico o de aislamiento siempre figura por separado. Índice no PageSpeed.
- Las 6 métricas del CSV original son observaciones sintéticas, no equivalen a 30 colectores de APK. La hoja catálogo separa CAPTURADO/PARCIAL/PENDIENTE.
