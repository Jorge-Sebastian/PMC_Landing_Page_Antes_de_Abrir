# Datos de prueba (NO evidencia)

El archivo de 1.198 registros que proporcionó el equipo se carga **localmente** mediante:

`python scripts/quality/generate_report.py --input /ruta/SmartGuard_1198_CORREGIDO_EXCEL_ES.csv --out-dir reports/quality/local`

No se versiona el CSV de usuarios del proyecto. La muestra JSON del panel en `public/smartguard-quality/demo-summary.json` utiliza exclusivamente identificadores y eventos sintéticos `SG-SIM-*` y `SIMULADO_NO_EVIDENCIA` para demostrar cómo se vería un resumen. No se publica información real de instalaciones.
