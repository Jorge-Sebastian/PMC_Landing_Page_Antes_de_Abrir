# Estado de la integración

- El paquete de reportes y el demo están listos a nivel de código y archivos.
- Las nuevas reglas `daily_metrics` deben publicarse mediante operación administrativa validada en Firebase. Aún no equivalen a un despliegue.
- La nueva APK debe compilarse con la fuente actual, firmarse con un certificado autorizado y probarse en dispositivo; las APK anteriores permanecen sin estos cambios.
- El panel `/administrador` requerirá cuenta Firebase con correo verificado y `admins/{uid}.enabled=true`; no se debe utilizar la cuenta pública anónima como administrador.
- El sistema no puede garantizar exhaustividad de métricas sin permisos, red o servicio de notificaciones activo: mostrar SIN DATOS cuando corresponda.
- No escribir las muestras simuladas en la ruta de producción, ni convertirlas en resultados de la rúbrica.
