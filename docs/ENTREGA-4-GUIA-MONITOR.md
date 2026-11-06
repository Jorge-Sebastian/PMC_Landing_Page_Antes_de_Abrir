# Entrega 4 — Accesos, guion y evidencia técnica

Corte de revisión: **5 de noviembre de 2026**, hora de Colombia. Esta guía prepara la evaluación; no rellena ni modifica la sección reservada al monitor en Google Sheets.

## Accesos públicos

- Producto web: https://pmc-landing-page-antes-de-abrir.vercel.app/
- APK Alpha 0.2, Android 8 o posterior: https://pmc-landing-page-antes-de-abrir.vercel.app/downloads/SmartGuard-Family-v0.6.0-Alpha.apk
- Repositorio: https://github.com/Jorge-Sebastian/PMC_Landing_Page_Antes_de_Abrir
- README directo: https://github.com/Jorge-Sebastian/PMC_Landing_Page_Antes_de_Abrir/blob/main/README.md
- Family: https://pmc-landing-page-antes-de-abrir.vercel.app/familia
- PageSpeed **móvil**: https://pagespeed.web.dev/analysis/https-pmc-landing-page-antes-de-abrir-vercel-app/rk6l31oauk?form_factor=mobile

La ruta principal y `/familia` devolvieron HTTP 200 con el documento SmartGuard sin autenticación de Vercel en una petición sin cookies. Esto comprueba acceso, no el funcionamiento de Firebase ni los resultados del motor. La descarga pública del APK coincide byte a byte con el entregado por el equipo (SHA-256 documentado en README).

## Evidencia de PageSpeed

Informe del **05/11/2026, 17:24 GMT-5**, dispositivo Moto G Power emulado, Lighthouse 13.6.0, red 4G lenta, carga inicial de `/`:

| Métrica | Medición | Mínimo de la rúbrica |
| --- | ---: | ---: |
| Rendimiento móvil | **84/100** | 70 |
| Accesibilidad móvil | **96/100** | 80 |
| Recomendaciones | 100/100 | — |
| SEO | 100/100 | — |

El resultado proviene del informe visible de PageSpeed, no de una estimación. La API automática devolvió HTTP 429; es una ejecución distinta y no debe sobrescribirse como si hubiera obtenido estas puntuaciones. La web mantiene la misma portada tras ingresar con Clerk; esta medición es una carga pública sin sesión, no una auditoría autenticada ni una medición del APK. Accesibilidad automática no sustituye la revisión manual. Se detecta una oportunidad de mejora en contraste.

## Cuenta de prueba y sesiones

**Pendiente del equipo:** crear una cuenta de prueba normal, agregar datos de uso y facilitar sus credenciales al monitor en el canal de entrega acordado. No escribir contraseñas, códigos de sala reales ni tokens en GitHub.

Existen dos sistemas distintos:

- Botón **Iniciar sesión** de la cabecera: Clerk, sesión opcional para el producto web; el análisis manual no exige registro. No implica un historial personal remoto implementado.
- **Cuenta de anfitrión** en Family: Firebase Authentication. Los invitados de una sala pueden utilizar una identidad anónima y su código de invitación. Una invitación concede acceso a la sala correspondiente; es comportamiento previsto, no aislamiento entre usuarios de esa misma sala.

Para demostrar aislamiento, usar dos perfiles de navegador separados y dos salas distintas. No confundir el historial familiar autorizado con un historial privado de cada usuario. Si una cuenta puede ver una sala ajena sin invitación, registrar el defecto y no dar la prueba por aprobada.

## Guion central para el monitor — 6 pasos

Repetir en computador y celular. Registrar dispositivo, navegador, fecha y resultado; los resultados siguientes son lo esperado y **no están certificados por esta guía**.

1. Abrir el producto público. Debe verse SmartGuard y el campo para un mensaje con enlace, sin pantalla de acceso a Vercel. Usar **Iniciar sesión** para registrar una cuenta normal nueva y volver a ingresar; verificar que cambien los controles de sesión.
2. Introducir `https://www.wikipedia.org/` y pulsar **Analizar enlace**. Debe comenzar la comprobación y mostrarse un resultado legible desde el inicio de la tarjeta. No se exige un color fijo: si falta información debe explicarse, sin confundirlo con seguridad garantizada.
3. Probar un mensaje sin enlace y después `https://ejemplo.invalid/`. Debe haber validación clara del primer caso y un resultado que explique la imposibilidad de comprobar el segundo, sin presentarlo como enlace seguro. No abrir destinos sospechosos ni pegar mensajes privados.
4. Abrir `/familia`; verificar conexión, registrar/ingresar con la cuenta de anfitrión nueva y crear una sala de prueba con apodo ficticio. Revisar el consentimiento antes de compartir. Si el registro está deshabilitado o fallan las reglas, anotar el error exacto.
5. En un segundo perfil o dispositivo, ingresar mediante la invitación a esa sala. Deben verse únicamente sus integrantes y eventos autorizados. Crear otra sala con una segunda cuenta y comprobar que no accede al historial de la primera sin invitación. No publicar eventos falsos para aparentar resultados reales de usuarios.
6. En Android 8 o posterior, descargar e instalar la APK 0.6.0; habilitar únicamente los permisos que solicita la función de protección. Probar con una notificación de un mensaje controlado por el equipo, registrar el aviso y el resultado, luego cerrar sesión y volver a ingresar donde corresponda. La prueba requiere un teléfono y no queda aprobada por las pruebas web.

## Enlaces de la hoja: hallazgos del corte

- **B56, Alpha 0.2:** apunta a un archivo APK de Drive. Complementar su nota con la web pública y el requisito Android 8+. Para evaluación desde computador hace falta el enlace web además del instalador.
- **B57, Repositorio:** URL correcta al repositorio público.
- **B58, Demo:** apunta a una carpeta pública de Drive que estaba **vacía** al revisar. Falta subir la grabación y preferiblemente enlazar directamente el video final de **4 minutos o menos**, primero H2 y luego growth loop. Verificar acceso sin iniciar sesión y duración real.
- **Calidad técnica (filas 63–70):** no editada por solicitud del equipo. Entregar al monitor el informe PageSpeed, URL de estado, cuenta y este guion; no escribir números de uptime supuestos.

## Requisitos que no se pueden acreditar con código

- UptimeRobot creado el 29/10 y disponibilidad >=99% durante siete días: si se crea hoy, se declara la fecha real y solo el periodo observado.
- Cuenta de prueba con datos de uso y registro/ingreso/aislamiento en móvil y escritorio: pendientes de validación con sesiones reales.
- Grabación pública <=4 minutos y ocho participantes con sus evidencias: el equipo debe aportar el material auténtico.
- Mantener producto, APK y servicios disponibles hasta el **11 de noviembre**, fin de la revisión de monitores.

Fuente de requisitos: https://receptive-leotard-8da.notion.site/Entrega-4-Alpha-0-2-y-Growth-Loops-3b96af1e3f4c81edb0c4e0b27cf11aba
