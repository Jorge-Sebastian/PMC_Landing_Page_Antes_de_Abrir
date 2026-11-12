# Arquitectura técnica

```text
Android NotificationListenerService
  -> clasificación y alertas (sin cambiar el motor)
  -> QualityAccumulator: contadores + histogramas + chequeos observados
  -> SharedPreferences local por día UTC, revisionada
  -> FirebaseBackgroundTelemetry: token Firebase ya consentido en AndroidKeyStore
  -> Firestore REST de daily_metrics, cada 15 min cuando hay datos nuevos
  -> devices/{uid}/daily_metrics/{UTC-date}
  -> Firestore Security Rules: titular o admin habilitado y consentimiento
  -> Admin /administrador: Calidad técnica -> Firebase Auth admin verificado
  -> Agregado por dispositivo y fecha -> CSV descargable

INDEPENDIENTE:
CSV SIMULADO_NO_EVIDENCIA -> core.py -> generate_report.py -> Excel/JSON/Markdown.
NO hay ruta desde la simulación a Firebase.
```

- Cada documento diario guarda contadores absolutos (no deltas); el panel **no suma revisiones anteriores** del mismo día.
- Solo se publican datos si está habilitado compartir con administrador. No se incluyen URL, dominio, contenido, nombres ni tokens.
- `eventsGenerated` cuenta entradas nuevas a SQLite; `eventsAcked` solo confirmaciones HTTP 2xx, no reintentos ni respuestas ambiguas 409/412.
- Salud operativa es muestreada: la ausencia de un evento no demuestra que el servicio estuviera disponible.
- P95 del panel utiliza cota superior de cada bucket, conservadora pero aproximada. El Excel sobre muestras originales usa percentil nearest-rank real.
- Modo demo del administrador está en un archivo estático marcado SIMULADO_NO_EVIDENCIA; consultas Firebase en modo producción no lo incluyen.
- No se escriben agregados globales por dispositivo desde clientes (evita puntos de contención y escalamiento de privilegios). Agregar al consultar o con backend de confianza si la escala lo requiere.
