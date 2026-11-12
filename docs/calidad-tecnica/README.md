> **Informe actualizado del libro (8):** [Informe técnico integral de medición — 13 hojas, 1.198 eventos, fórmulas, correspondencia con la rúbrica y limitaciones](INFORME-INTEGRAL-EXCEL-V8-ENTREGA-4.md). Esta es la referencia más reciente para interpretar el Excel aportado por el equipo.

# SmartGuard · Calidad técnica, observabilidad y Entrega 4

**[INICIO — requisitos de la rúbrica, libro Excel, resultados y análisis Android](ENTREGA-4-INICIO-AQUI.md).** Este es el recorrido principal de lectura de la evidencia técnica.

**[Resultados consolidados y métricas recalculadas — Entrega 4](RESULTADOS-CONSOLIDADOS-ENTREGA-4.md).** Cifras verificadas por recálculo del Excel y comparación con JSON; el equipo declara haber verificado la procedencia de las capturas.

**[Justificación técnica de las métricas Android frente a UptimeRobot y PageSpeed — Entrega 4](JUSTIFICACION-TECNICA-ENTREGA-4-ANDROID.md).** Explica el método de medición de la APK, la tabla comparativa, el alcance de las equivalencias y la evidencia pendiente.

Este directorio documenta la instrumentación Android **propuesta/implementada en código fuente**, un generador de informes reproducible y la separación estricta de evidencia académica.

- **Fuentes existentes**: Android `NativePerformance`, `FirebaseBackgroundTelemetry`, listener nativo, reportes Firebase consentidos, panel administrativo Firebase; consultar `AUDITORIA_ESTADO_INICIAL.md`.
- **Esquema nuevo**: `devices/{firebaseUid}/daily_metrics/{yyyy-mm-dd}`: resumen local por día UTC de contadores e histogramas de tiempo, escrito desde el token del titular y consultable solo por usuarios autorizados.
- **Escenario didáctico**: CSV original con **1.198 observaciones ficticias** de 6 instalaciones. El importador acepta únicamente `SIMULADO_NO_EVIDENCIA`; jamás lo carga a la ruta de producción.
- **Rúbrica literal**: UptimeRobot >=99 % últimos 7 días, PageSpeed móvil >=70 y >=80, flujo E2E sin errores con dos cuentas en móvil/PC, README completo. Un índice interno de Android **no sustituye** esos resultados.

## Regeneración local

```bash
python -m pip install 'openpyxl>=3.1,<4'
python -m unittest discover -s tests/quality -v
python scripts/quality/generate_report.py --input /ruta/al/SmartGuard_1198_CORREGIDO_EXCEL_ES.csv --out-dir reports/quality/local
```

El CSV debe provenir de un archivo entregado explícitamente al equipo. No introducir las muestras ficticias en Firebase.

Salida: `SMARTGUARD_CALIDAD_TECNICA_INTEGRAL.xlsx`, JSON con sumatorias y Markdown explicativo. Los archivos locales pueden contener ID de instalación y no deben subirse al repositorio cuando sean reales.

## Verificación de producción

1. Código Android compilado y servicio ejecutado en teléfono con consentimiento.
2. Publicar Firestore Security Rules de forma separada y comprobar permisos con un administrador real; no ejecutar despliegues a ciegas.
3. Confirmar que el nuevo documento diario llegue al proyecto `smartguard-piloto-20261029` y que no se registre contenido de mensajes, enlaces o contactos.
4. Verificar que el panel remoto detecte únicamente instalaciones con `consent=true` y `shareWithAdmin=true`, nunca los datos simulados.
5. Probar revocación, cambios de UID, Wi-Fi apagado y recuperación. Reportar pérdidas de cobertura en vez de imputarlas como uptime.
6. Obtener evidencias **separadas** de UptimeRobot, PageSpeed y guion del monitor; pedir aprobación explícita de equivalencias si el profesor lo requiere.

**La APK firmada 0.6.0 publicada anteriormente no se modifica por el mero hecho de integrar estas fuentes.** Hace falta una nueva compilación, firma y prueba física.
