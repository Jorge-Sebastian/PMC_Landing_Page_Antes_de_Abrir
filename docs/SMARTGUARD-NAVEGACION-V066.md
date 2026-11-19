# SmartGuard Android - Navegacion unica y vista de escenarios (v0.6.6)
 
## Primera fase: estructura de la interfaz (no es un sistema de suscripciones)

- La APK Android usa una sola navegacion de 5 vistas: Inicio, Analizar, Actividad, Proteccion y Familia.
- Escenarios visuales **Prueba de 15 dias** y **Premium**: las cinco vistas aparecen en el menu.
- Escenarios visuales **Gratis**, **Vencida** e **Invitado sin Premium**: solamente Inicio y Analizar.
- La aplicacion abre SIEMPRE en **Aplicacion real**; este es el piloto existente y **todavia no existe enforcement de planes**.
- "Herramientas de vista - Probar escenarios" aparece discretamente al final de Inicio. Cada escenario lleva la etiqueta SIMULACION. El boton de salida restablece la app real.
- Las pantallas Premium simuladas no muestran datos reales, no activan permisos, no crean familias ni alteran Firebase.
- Analizar siempre ejecuta el analizador real, tambien mientras se previsualiza un escenario. Se indica claramente.
- Actividad real muestra exclusivamente eventos nativos disponibles. El codigo no genera eventos de ejemplo como si fueran reales.
- Proteccion real reutiliza ProtectionPanel; Familia real reutiliza FamilyPage; Analizar reutiliza HeroSection y LinkAnalyzer. No se cambia el motor de clasificacion ni el plugin Android.

## Siguiente fase, separada

- Decidir y verificar con backend los derechos reales de trial/free/premium, con fechas de servidor y antiabuso.
- Asociar el plan familiar a un grupo sin perder permisos o datos previos.
- Implementar controles en servidores/rules, no solo esconder pantallas del frontend.
- Revisar los accesos directos a /familia, las invitaciones y el comportamiento fuera de la navegacion principal.
- Redisenar el onboarding de primera instalacion solo despues de validar la navegacion.
- Tener en cuenta que una APK debug de CI no necesariamente conserva la firma de la APK piloto instalada.

## Pruebas minimas

1. En Aplicacion real las cinco secciones llevan a las funciones actuales.
2. La vista Gratis muestra solamente Inicio y Analizar.
3. La vista Prueba muestra las cinco secciones pero las avanzadas son simulaciones explicitas.
4. Vencida e Invitado muestran solo dos secciones.
5. Cambiar de escenario y salir restablece la app real sin permisos ni cuentas modificadas.
6. El analizador manual sigue operativo.
7. La vista de actividad real no inventa resultados.
8. Los flujos existentes de Firebase Family/Android Protection siguen accesibles en el piloto real.
