# Resultados verificados por fuente

**Conjunto sintético entregado:** 1.198 filas, seis instalaciones con prefijo `SG-SIM-*`, intervalo 29/10/2026 16:00 a 05/11/2026 16:00 Bogotá. Los totales, tasas, percentiles y SHA-256 pueden reproducirse mediante `scripts/quality/generate_report.py`. `SIMULADO_NO_EVIDENCIA` significa que este conjunto no proviene de Android/Firebase.

**Pruebas de código:** consultar GitHub Actions del PR específico. Un resultado CI satisfactorio acredita que scripts, TypeScript y reglas pasaron sus test cases, no que exista siete días de telemetría real.

**Producción Android:** pendiente de comprobar dispositivo instalado con versión correspondiente, permisos y consentimiento. No hay importación de producción en este informe.

**Producción Firestore:** pendiente de aplicar/verificar nuevas reglas e instrumentación diaria en el proyecto de Firebase. No subir el CSV simulado al backend.

**Rúbrica oficial:** está pendiente de evidencias externas de UptimeRobot/PageSpeed y prueba E2E; no atribuir cumplimiento antes de observar dichas fuentes.
