# Auditoría inicial · repositorio `main` observado el 12/11/2026

| Pieza | Estado observado | Evidencia del código | Límite |
|---|---|---|---|
| Recopilación de colores Android | IMPLEMENTADO EN CÓDIGO | `FirebaseBackgroundTelemetry.record()` + SQLite + Firestore REST | 0.5.9+ fuente; APK real no probada aquí |
| Cola local persistente y reintentos | IMPLEMENTADO EN CÓDIGO | SQLite `events`, deduplicación `seen`, `doFlush()` | Reintento no garantizado bajo Doze o sin callback |
| Identidad Firebase/consentimiento | IMPLEMENTADO EN CÓDIGO | Plugin `firebaseBackgroundSession` y reglas Firestore de `devices` | Falta confirmar revocación en equipos reales |
| Medición de tiempos local | PARCIAL | `NativePerformance.record`, histogramas recientes de 64 latencias, trazas SDK opt-in | Firebase Performance remoto exige app Android registrada |
| Panel global de métricas | PARCIAL | `src/admin/admin-page.tsx` aún usa telemetría remota Supabase/Clerk o demo | No atribuir cifras de demo a Firebase |
| Panel Firebase administrador | IMPLEMENTADO INDEPENDIENTE | Hosting Firebase preparado y cuenta de administrador autorizable | El agente no pudo comprobar cuenta real ni consulta E2E |
| Familia persistente | PARCIAL | `/familia`, Firestore reglas y `FirebaseFamilyReporter` | No se verificó ingreso en dos teléfonos |
| UptimeRobot | PENDIENTE DE REVALIDAR | Enlace de estado documentado en README/WEB-QUALITY | Sólo el proveedor da el uptime real para el intervalo pedido |
| PageSpeed en móvil | PENDIENTE DE REVALIDAR | Scripts de PageSpeed web en `scripts/qa` | Puntuación real del sitio, no de la APK |
| 30 métricas automáticas | NO IMPLEMENTADO EN SU TOTALIDAD | 30 se definen en `11_CATALOGO_30` | Estatus por indicador debe ser honesto |
| Código fuente moderno vs APK pública | DISTINTOS | Fuente versionName 0.6.5-piloto; enlace público APK 0.6.0 | Evitar prometer reimpresión de APK sin firma y prueba |
| 1.198 filas del informe antiguo | SIMULACIÓN CON DATOS APORTADOS | CSV `SIMULADO_NO_EVIDENCIA` y libro corregido | No constituye logs de Firebase ni siete días reales |

No se crearon usuarios, no se conectó una cuenta de profesor y no se desplegaron reglas remotas durante esta auditoría. Un workflow verde confirma pruebas del código, no el comportamiento Android físico.
