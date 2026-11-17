# SmartGuard Family 0.6.8 - Bienvenida clara y enfoque familiar

## Objetivo
Explicar SmartGuard a una persona que nunca ha usado una app de seguridad, sin pedirle que abra primero un enlace ni prometer una vigilancia que la app no realiza.

## Siete preguntas guiadas
1. Bienvenida: ejemplo ficticio de mensaje que llega a Tía Sandra y por qué proteger a la familia.
2. Funcionalidades: análisis manual gratuito, avisos automáticos, historial, estado y riesgos familiares compartidos.
3. Planes: Gratis, Individual $9.900 COP/mes y Familiar $19.900 COP/mes, **propuestos/no activos**. Selección de prueba y simulación explícita de pago.
4. Secciones: Inicio y Analizar en Gratis; cinco secciones en la propuesta Prueba/Premium.
5. Familia: pasos desde la notificación hasta coincidencias de dominios rojos con consentimiento.
6. Permisos: lectura de notificaciones, mostrar alertas, servicio en segundo plano, ajustes opcionales de batería, consentimiento separado para familia. Incluye tarjeta visual de ejemplo y acción nativa para mostrar una notificación de prueba sin compartirla.
7. Final: estado **real** de la protección, opción comercial elegida a modo ilustrativo y acceso a la app.

## Hechos importantes
- La app no sabe si alguien hizo clic o abrió el enlace y nunca se debe insinuar que sí.
- La alerta familiar es un antecedente de riesgos rojos: dominio registrable, fecha, origen e integrante autorizado; nunca se comparte la conversación o URL completa.
- Las alertas automáticas dependen de permisos y de las notificaciones realmente visibles para Android.
- No es necesario convertir SmartGuard en app SMS predeterminada.
- Android puede limitar servicios en segundo plano. Se expone un acceso a ajustes de batería pero sin exigir ni activar una excepción automáticamente.
- Cuando se conceden los permisos, el botón de activación pasa a un estado verde de completado y no solicita reconfigurar.
- El botón de notificación de prueba usa `Protection.testBanner({level:"riesgo"})`, genera una alerta ilustrativa y no publica riesgos familiares.
- La prueba de 15 días y la suscripción no están implementadas en backend; la simulación de pago NUNCA procesa dinero ni concede derechos de acceso.
- La identidad anónima del grupo familiar no se modifica y no se crea un paywall real.
- El motor de clasificación, reglas Firebase, lecturas y notificaciones existentes permanecen intactos.

## QA
- Usuario que ya completó onboarding no lo repite forzosamente.
- En permisos: comprobar progreso tras volver de Ajustes y que verde no vuelva a abrir la configuración.
- Prueba de alerta: verificar que se marca demo y no entra al historial familiar.
- Explicaciones visibles sin scroll lateral en Android pequeño, navegación siguiente/atrás y salto a analizador.
- Validar en dispositivo real con batería restringida/no restringida, Android 12 y Android 13+ si hay dispositivos disponibles.
- Pruebas de navegación y privacidad, alertas y creación de familias siguen funcionando.
- APK de CI usa firma debug; puede no actualizar una instalación firmada con otra clave.
