# SmartGuard Family 0.6.7 - Inicio y Proteccion

## Cambios visibles
- Encabezado centrado, con isotipo oficial, SmartGuard Family y Seguridad antes de abrir.
- La etiqueta Piloto real se elimina. El aviso de Prueba visual aparece solo cuando hay un escenario simulado.
- Primera instalacion: bienvenida, funcionamiento, privacidad, permisos de Android, explicacion de las cinco secciones y resumen final.
- Los usuarios que completaron la bienvenida anterior no son enviados a un nuevo onboarding a la fuerza.
- En Inicio: estado, acceso directo al analizador, explicaciones de cada seccion, precios propuestos y guia repetible.
- Configuracion y permisos (incluido el panel anterior con sus herramientas) permanece en Inicio bajo seccion expandible.
- Proteccion: solo estadisticas reales, actividad local y tiempos. No solicita permisos en su vista principal.
- Vista de experimentos al final de Inicio. Vista REAL restaurable inmediatamente; pruebas visuales no activan suscripciones.
- Analizar, Firebase Family y plugin de notificaciones nativas se reutilizan sin modificar sus motores.

## Importante
- Plan gratuito, planes de pago y 15 dias siguen siendo propuesta COMERCIAL, no entitlements activos.
- El asistente del onboarding muestra precios propuestos 9900 COP/mes individual y 19900 COP/mes familiar. Nadie es cobrado desde esta beta.
- Habilitar acceso nativo requiere consentimiento; compartir datos con familiares y enviar telemetria son consentimientos separados.
- La instalacion sobre una APK previa requiere la misma firma; un artefacto debug puede no tener la clave original.
- La version visible para Android pasa a 0.6.7, con versionCode 23.

## Pruebas manuales antes de fusionar
1. Instalacion limpia: cinco pasos, botones atras/continuar, configuracion opcional, salida a Inicio o Analizar.
2. Instalacion actualizada: no repetir onboarding previo; Inicio muestra guia repetible.
3. Encabezado oficial centrado, sin Piloto real; prueba visual con aviso y salida visible.
4. Inicio: botones a Analizar, Proteccion, Familia y configuracion; guias no cambian suscripciones.
5. Proteccion: no pedir permisos; contadores provienen del servicio Android y no hay estadisticas ficticias.
6. Inicio > Configuracion: conserva controles y consentimiento previo.
7. Permisos nativos: confirmar cambio al regresar del panel Android; manual disponible sin acceso.
8. Real/Gratis/Prueba/Premium/Vencida/Invitado: navegacion correcta.
9. Firebase Family, notificaciones y clasificacion de enlaces no regresan.
