# SmartGuard 0.5.9 — Telemetría automática en segundo plano

**Alcance:** El `NotificationListenerService` ya existente sigue revisando enlaces en notificaciones compatibles sin abrir la WebView. Este cambio traslada el envío de **resultados futuros** a una cola nativa cifrada/autenticada con Firebase, separada del ciclo de vida de React/Capacitor.

## Flujo

1. El usuario autoriza una sola vez, desde SmartGuard, la telemetría anónima, que el administrador vea su dispositivo y opcionalmente enviar recuentos por color. Al actualizar desde 0.5.8, SmartGuard reutiliza la identidad Firebase anónima existente cuando se abre una sola vez después de instalar 0.5.9. No hay nuevo login. **No se sube historial anterior al consentimiento**.
2. El WebView verifica/crea en Firestore `devices/{uid}` con consentimiento y recibe una sesión Firebase anónima. Envía el `uid` y `refreshToken` vía `Protection.firebaseBackgroundSession`. El token queda cifrado con Android Keystore AES-GCM; no se publica, ni se sube a GitHub.
3. Las notificaciones elegidas por el usuario se procesan en `MessageListenerService`, sin pantalla abierta. Después del resultado **final**, si existe consentimiento para colores, se guarda en SQLite un evento aleatorio estable (id, fecha, versión y color, más un hash de origen que permanece local). No se guarda URL ni conversación en esta cola, ni se envía dominio.
4. Un ejecutor del servicio sube eventos a Firestore con ID inmutable, refresca el token en segundo plano y usa server timestamps. Una cola de máximo 1.000 eventos sobrevive al cierre de la aplicación, a caídas de proceso y a reinicios. Vuelve a intentar con notificaciones nuevas y mientras Android mantiene vinculado el listener; al revocar, corta el envío local inmediatamente y borra la cola.
5. El panel Firebase ya publicado sigue consultando `devices/{uid}/analyses/{eventId}`. El panel no requiere cambios. La etiqueta de *activo* refleja una fecha de actividad reciente, no una conexión permanente.

## Limitaciones de Android

Android puede restringir el servicio de notificaciones o diferir reintentos sin red bajo Doze, restricciones del fabricante o pérdida de permisos. No prometemos entrega inmediata al segundo, ni recepción de mensajes que WhatsApp o SMS no muestren en notificaciones. Reintentos mientras la app está cerrada dependen de que Android mantenga o vuelva a vincular el `NotificationListenerService` autorizado. Para garantías mayores sería una fase separada con WorkManager/JobScheduler y pruebas sobre modelos físicos.

## Seguridad y privacidad

- No hay permiso adicional para leer mensajes: seguimos usando el servicio de notificaciones existente y autorizado.
- No existe captura de notificaciones sin enlaces ni monitoreo secreto. Solo se registra un evento cuando el motor devuelve un color válido para un enlace detectado.
- La revocación **local** detiene nuevas llamadas nativas inmediatamente y borra eventos pendientes. La confirmación de revocación en Firestore puede quedar pendiente si no hay internet; se reintenta al abrir la app.
- El token de actualización se almacena cifrado con Android KeyStore. La clave API Firebase en JS/Java es pública; no equivale a un secreto de administrador.
- Los eventos utilizan IDs estables generados localmente. Los registros transmitidos NO incluyen mensajes, enlaces, dominios ni identificadores externos del mensaje.
- No se utiliza identidad personal ni se permite consultar otros dispositivos desde cuentas anónimas. El acceso administrativo remoto es la consola web protegida por Firebase.
- La base Firestore existente requiere revisar las reglas al escalar. Se recomienda limitar las cuotas; los clientes pueden declarar colores incorrectos deliberadamente, de modo que los datos no son veredictos certificados.

## Construcción

El código convencional Android conserva la interfaz anterior a la 0.5.8; **no distribuir la APK debug hecha de ese código**. El pipeline `.github/workflows/smartguard-background-059.yml` crea únicamente un APK donante con DEX compilados y probados. `scripts/android/build_background_apk_v059.py` combina esos DEX con los recursos y la interfaz real de la APK 0.5.8 y la firma con una copia **privada** del certificado de piloto original. El `versionCode` se incrementa de 15 a 16, sin cambiar el paquete. Nunca versionar la clave de firma.

Pruebas obligatorias antes de repartir la APK: instalación encima de 0.5.8 sin borrar datos, sesión anónima preservada, consentimiento/revocación, notificación con enlace sin abrir SmartGuard, actualización de recuento en panel, reconexión tras pérdida de internet, ausencia de falsos positivos sin enlace y pruebas en dos teléfonos físicos.
