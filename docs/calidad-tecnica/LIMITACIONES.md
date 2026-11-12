# Limitaciones y riesgos

1. Una publicación en `main` NO implica despliegue de Firebase Security Rules ni actualización de la APK firmada.
2. El código fuente actual (0.6.5) y la descarga pública (0.6.0) son distintas versiones; solo pruebas de instalación real confirman efectos en dispositivos.
3. Los datos enviados desde clientes son auto-reportados; un cliente modificado podría mentir. No utilizar esos resultados como certificación de seguridad o vigilancia continua.
4. Intervalos sin eventos en Android no son automáticamente tiempo activo o caído: marcar cobertura y SIN DATOS.
5. Firebase Performance SDK requiere registro de la aplicación Android y consentimiento separado; un `google-services.json` no debe fabricarse desde la configuración de la app web.
6. El simulador usa los mismos 1.198 registros sintéticos históricos y los conserva inequívocamente etiquetados.
7. El reporte de Android no sustituye la auditoría web oficial ni una prueba E2E de cuentas.
8. No agregar nombres de familiares, SMS, enlaces, URLs completas, IP pública ni tokens a la telemetría.
9. Los histogramas con intervalos sólo permiten estimar cotas de P95, no una medición exacta de cada evento en el panel.
10. Medir ANR/crash/consumo requiere fuentes adicionales (Crashlytics, Android Vitals y prueba física), no inventar cero fallos.
