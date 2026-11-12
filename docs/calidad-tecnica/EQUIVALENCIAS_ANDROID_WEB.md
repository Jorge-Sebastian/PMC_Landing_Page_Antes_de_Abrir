# Equivalencias y limitaciones

- **UptimeRobot**: peticiones HTTP a la URL pública y porcentaje de uptime durante una ventana determinada. SmartGuard Android recibe notificaciones del sistema mientras los permisos y el SO lo permiten. Su indicador análogo es *salud observada* con cobertura y tasa de procesado. **No es uptime continuo**: sin reportes la conclusión es desconocida.
- **PageSpeed Performance**: Lighthouse analiza carga, interacción y otros indicadores web. La APK mide inicio de interfaz (local), duración análisis y tiempo de alerta mediante reloj monotónico. **Milisegundos no equivalen a 70/100.** Se requiere benchmark Android o análisis propio y verificar medidas con instrumentos reproducibles.
- **PageSpeed Accessibility**: Lighthouse web verifica reglas de accesibilidad de un documento. Para Android corresponde auditoría Accessibility Scanner, TalkBack, contraste, etiquetas, tamaños táctiles y navegación; no produce automáticamente 80/100.
- **Flujo E2E**: se valida de forma independiente con cuenta A y B, celular y computador. La telemetría no demuestra que una cuenta no haya visto la información de otra; se necesita prueba de seguridad.
- **README**: checklist documental independiente.

**Solicitud académica:** mantener la evidencia literal de UptimeRobot/PageSpeed en el componente web cuando exista y proponer indicadores equivalentes nativos como complemento; pedir aprobación si se desea sustituir un requisito.
