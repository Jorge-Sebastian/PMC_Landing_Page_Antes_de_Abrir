# Propuesta de equivalencias técnicas — SmartGuard Android

Profesor:

SmartGuard es una herramienta de prevención de enlaces engañosos. La aplicación principal se distribuye como APK para Android y detecta enlaces visibles en notificaciones de aplicaciones compatibles con autorización expresa del usuario. También ofrece una interfaz web de análisis manual. Por su arquitectura, algunos indicadores web de la Entrega 4 no describen por sí solos la calidad del componente Android.

## 1. Atributos de calidad evaluados

Buscamos evaluar **disponibilidad, rendimiento, accesibilidad, funcionamiento y aislamiento** con mediciones apropiadas para cada plataforma. Entendemos que la rúbrica exige UptimeRobot HTTP(s) >=99% durante los últimos siete días, PageSpeed móvil >=70 en rendimiento y >=80 en accesibilidad, flujo funcional con cuentas separadas y README completo.

## 2. Disponibilidad

En un servidor web, UptimeRobot envía solicitudes HTTP a intervalos regulares. La protección Android, en cambio, depende de un `NotificationListenerService` autorizado por el sistema operativo, que no expone un endpoint HTTP público. Proponemos medir la proporción de comprobaciones saludables, la cobertura del muestreo, el número de notificaciones elegibles observadas y la tasa de procesamiento. La falta de telemetría se marca como información desconocida y no se rellena como actividad.

## 3. Rendimiento

En lugar de transformar artificialmente milisegundos en una puntuación Lighthouse, proponemos instrumentar inicio de la interfaz, tiempo entre detección y clasificación, tiempo hasta publicar la alerta y percentiles de latencia P50/P95/P99. La calidad móvil se valida adicionalmente con pruebas reproducibles en teléfonos de distintas versiones de Android.

## 4. Accesibilidad

Proponemos auditoría con TalkBack y Accessibility Scanner (etiquetas, contraste, tamaños táctiles y orden de foco), documentando hallazgos y correcciones. Esta auditoría no genera automáticamente el puntaje de accesibilidad de PageSpeed.

## 5. Recopilación de datos

Cada instalación autorizada mantiene contadores e histogramas técnicos por día, con ID de instalación anónimo y agregación en Firebase. Se evitan mensajes, nombres de contactos, contraseñas, enlaces completos y tokens. La base guarda sumatorias, y el administrador presenta resultados individuales y consolidados sin promediar porcentajes de equipos de carga desigual.

## 6. Indicadores y umbrales internos

Las metas iniciales propias son >=99% salud observada, >=99% éxito de análisis, >=99% publicación de alertas, >=99% recepción confirmada por Firebase, P95 análisis <=500 ms y P95 alerta <=1000 ms. Son valores de ingeniería propuestos por el equipo, no umbrales de la rúbrica ni garantías de éxito.

## 7. Ejemplo didáctico del informe de siete días

Como validación del cálculo disponemos de **1.198 observaciones sintéticas y seis dispositivos ficticios** para la ventana del 29 de octubre a las 16:00 al 5 de noviembre a las 16:00 de 2026, zona horaria Bogotá. Estos registros muestran el mecanismo de agregación, los estados CUMPLE/NO CUMPLE y la exportación a Excel, pero **no provienen de celulares reales**. Se adjunta el SHA-256 del conjunto y el script reproducible.

## 8. Evidencia real y funcional

Los indicadores que estén respaldados por dispositivos y por el backend real deben presentarse en una sección distinta. El registro, inicio de sesión, persistencia y aislamiento de cuentas A/B deben documentarse con actas y pruebas E2E en celular y computador. Un indicador alto de telemetría no certifica que esas pruebas hayan pasado.

## 9. Limitaciones

Los sistemas Android pueden suspender servicios o limitar su ejecución por políticas de batería; una comprobación saludable no significa 24 horas continuas de protección. Los datos auto-reportados pueden contener errores y no equivalen a una certificación de seguridad. Las herramientas web siguen siendo referencias válidas para la landing y su acceso público.

## 10. Solicitud

Solicitamos considerar, como **evidencia complementaria o equivalencia aprobada explícitamente**, las mediciones nativas de confiabilidad, latencia y accesibilidad en Android. En paralelo conservamos las mediciones literales de UptimeRobot y PageSpeed para el componente web cuando sean aplicables. Si se autoriza sustituir algún criterio, proponemos registrar por escrito el atributo, instrumento, ventana, umbral y evidencias aceptadas.

Atentamente,

Equipo SmartGuard — Los Robustos
