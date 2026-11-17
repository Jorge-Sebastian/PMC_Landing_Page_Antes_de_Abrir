# SmartGuard — Operación comercial, despliegue y evidencias

**Estado: código en desarrollo, no desplegado ni activado en Firebase, Vercel o una APK firmada.**
Rama: feature/smartguard-production-core-20261117.
Firebase esperado: smartguard-piloto-20261029. La web conserva Supabase para la comprobación de enlaces.

## 1. Matriz de alcance

| Elemento | Código | Verificación |
| --- | --- | --- |
| Registro UID e instalación | functions/index.js, src/mobile/commercial-client.ts | Fuente implementada; pruebas E2E pendientes |
| Plan Gratis, prueba 15 días | sgGetAccess, sgStartTrial | Transacciones programadas; pruebas Firebase pendientes |
| Premium Individual 9.900 COP y Familiar 19.900 COP / 30 días | sgAdminGrantPlan, sgAdminRevokePlan | Requiere conexión real y despliegue |
| Código único seguro | sgAdminIssueCode, sgRedeemCode | Código aleatorio, hash, canje atómico |
| Pagos bancarios | Llave 1011097783, correo dkek195@gmail.com | Verificación humana indispensable |
| Administrador | src/admin/commercial-panel.tsx | Requiere administrador Firebase verificado |
| Onboarding 6 pantallas y permisos | src/mobile/mobile-onboarding.tsx | Requiere pruebas en Android real |
| Familia de 10 integrantes | risk-event, client.js, firestore.rules | Emulator de reglas y migración pendientes |
| Descarga por invitación | src/pages/familia/invitation-landing.tsx | APK en ruta piloto, App Links pendientes |
| Telemetría del usuario | sgAdminGetCustomer, QualityPanel | Solo datos autorizados y observados |
| APK final firmada | Android Capacitor | PENDIENTE, ninguna compilación final realizada |

## 2. Firebase, identidad y seguridad

El UID Firebase es el identificador interno. Un ID público SG- seguido de 20 caracteres hexadecimales se deriva en servidor para buscar compradores; no es un medio de autenticación. Un UUID distinto identifica cada instalación. La cuenta anónima puede vincular correo y contraseña conservando el UID y su grupo. La prueba y Premium recuperable requieren correo verificado.

Las colecciones comerciales sg_accounts, sg_trials, sg_entitlements, sg_activation_codes, sg_payment_references, sg_admin_operations y sg_audit solo pueden ser modificadas mediante Firebase Admin SDK en funciones confiables. Las reglas niegan escritura de clientes. admins/{uid}.enabled y correo verificado habilitan acciones administrativas.

El interruptor sg_config/commercial.enforced, cuando es true, agrega verificación del plan del titular a las reglas de salas familiares. Ausente o false conserva el piloto. La bandera frontend VITE_SMARTGUARD_COMMERCIAL_ENABLED=false deshabilita el nuevo flujo comercial hasta que el backend haya sido probado. Una bandera cliente nunca sustituye autorización del servidor.

## 3. Operación de pagos y códigos

Premium individual cuesta 9.900 COP por 30 días. Premium familiar 19.900 COP por 30 días, hasta diez integrantes incluido el titular.

1. El comprador transfiere a la llave 1011097783; no se usa Mercado Pago.
2. Prepara un correo a dkek195@gmail.com con importe, plan, correo y ID real SmartGuard; adjunta MANUALMENTE el comprobante.
3. El administrador revisa en la entidad bancaria que el dinero llegó: la captura por sí sola no prueba el pago.
4. En /administrador busca el cliente por ID, registra referencia bancaria, marca la verificación y activa el plan directamente O emite un código de un solo uso para enviar por correo. La misma referencia no debe producir ambas activaciones.
5. Códigos: formato SGP- seguido de 24 caracteres hex, aleatorios de 96 bits. Solo se almacena hash; ligados al UID; 14 días para redimir, 30 días de plan desde el canje, no reutilizables. En la app la ubicación acordada es Ajustes → Mi plan → Activar código; la integración visual de canje sigue pendiente.
6. Durante pago pendiente, la persona usa los días aún disponibles de su prueba única de 15 días; no se reinicia al solicitar otro plan. Tras vencimiento, Gratis hasta confirmar Premium.

El pago pendiente NO se acredita automáticamente ni es un acceso pagado. El administrador debe mantener trazabilidad de cambios y referencias.

## 4. Secuencia de despliegue segura

- Obtener respaldo de colecciones y reglas actuales; comprobar proyecto Firebase correcto, permisos de administrador y plan de facturación Cloud Functions.
- Instalar las dependencias de functions con lockfile reproducible; ejecutar node --check y Node tests.
- Ejecutar pruebas de reglas de Firestore con emulator y UIDs sintéticos. Especialmente: cliente gratis sin privilegios, prueba vencida, administradores, lector ajeno, incorporación del décimo y denegación del undécimo miembro, grupos heredados mayores de diez, revocación y consentimiento.
- Publicar primero Cloud Functions del codebase smartguard-commercial, en entorno de prueba aislado cuando esté disponible; verificar IDs, prueba única, renovación, código de un uso y duplicados.
- Desplegar las reglas Firestore después de confirmar compatibilidad. **No desplegar Firebase Hosting** desde este repositorio: alberga un panel administrativo preexistente.
- Migrar planes y grupos existentes antes de escribir sg_config/commercial.enforced=true. Las reglas permiten reducir salas antiguas sobreocupadas sin borrar sus datos ni añadir miembros.
- Habilitar VITE_SMARTGUARD_COMMERCIAL_ENABLED solo tras pruebas en dos cuentas, Android físico y Android 13+. Revalidar preferencias al cerrar/abrir APK, modo sin red y vencimientos.
- Firmar una única APK consolidada, con firma de actualización compatible, instalarla y verificar distribución y descarga. No publicar una APK solo porque la compilación termina.
- Verificar el sitio público, /familia, /administrador y enlaces/archivos en incógnito. Preparar procedimiento de vuelta atrás antes de producción.

**Bloqueos pendientes:** acceso de despliegue Firebase, reglas emuladas, Cloud Functions y lockfile de dependencias; Android físico; App Links verificados; envío de correo bajo intervención humana y mecanismo real de cobros pendientes; integración final de canje y captura de Growth Loop; APK firmada.

## 5. Telemetría e indicadores sin inventar datos

Las observaciones históricas de Entrega 4 (1.198 filas, seis identificadores) se preservan con su advertencia de procedencia. No importar ejemplos SIMULADOS al panel PRODUCCIÓN.

En producción el administrador solo ve estadísticas de un teléfono si devices/{uid}.consent=true y shareWithAdmin=true. La ficha por cliente ofrece agregados de hasta siete días de documentos daily_metrics y una muestra de máximo 100 clasificaciones recientes por color; estos colores NO representan necesariamente un histórico completo de siete días. La ausencia de datos se presenta como SIN DATOS, no como resultado 100%.

Metas internas existentes: salud observada >=99%, análisis exitosos >=99%, alertas publicadas >=99%, eventos confirmados >=99%, P95 de análisis <=500 ms, P95 de alerta <=1000 ms. Cada resultado debe usar numeradores/denominadores y fuente explícitos. Para P95 no promediar percentiles por equipo.

UptimeRobot >=99% por siete días y PageSpeed móvil >=70 rendimiento y >=80 accesibilidad son mediciones WEB separadas. Ninguna tasa de eventos Android constituye uptime web ni una puntuación de Lighthouse. Para validar falsos positivos/negativos hace falta un conjunto etiquetado de referencia.

Los SMS, enlaces completos con parámetros privados, contraseñas y conversaciones familiares NO se cargan en el administrador. La última comunicación de telemetría no prueba que el teléfono estuvo protegido todo el día.

## 6. Invitaciones familiares

El enlace existente /familia#codigo=SG-... conserva el código. En navegador abre exclusivamente una experiencia de descarga APK y copia de código; no incorpora miembros desde la web. En Android sigue el ingreso a sala con consentimiento independiente. Android App Links, attribution de instalaciones y primer arranque quedan PENDIENTES. No contar clics de descarga como instalaciones reales.

## 7. Tabla de aceptación operativa

| Requisito | Evidencia requerida | Estado |
| --- | --- | --- |
| Identidad única y correo recuperable | Dos cuentas y cambio de dispositivo | PENDIENTE E2E |
| Prueba única 15 días | Firebase emulator / integración | PARCIAL: fuente y unidad |
| Activación, renovación, revocación | Administrador y APK en vivo | PENDIENTE E2E |
| Código de un solo uso | Canje paralelo / otro usuario | PENDIENTE E2E |
| Pago manual | Banco confirmado y auditoría | PENDIENTE E2E |
| Familias diez integrantes | Firestore emulator y dos teléfonos | PENDIENTE E2E |
| Permisos Android | Android 12/13+ y restricciones | PENDIENTE E2E |
| Métricas y privacidad | Firebase consentido, CSV, revocación | PENDIENTE E2E |
| UptimeRobot y PageSpeed | Ventanas/URLs actuales verificadas | PENDIENTE ACTUALIZACIÓN |
| APK final | Firma, instalación, actualización | PENDIENTE |

Los checks que pasan en GitHub Actions prueban comportamiento de fuente bajo sus condiciones, NO sustituyen pruebas físicas ni certifican funcionamiento de producción.


## 8. Correcciones integradas en la revisión de cierre

- Onboarding: tocar una tarjeta solo **previsualiza**; «Elegir» confirma el plan. Gratis dispone de confirmación voluntaria equivalente; no existe activación de cobro por previsualizar.
- Retorno al servicio: un titular Premium vigente puede terminar el onboarding en otro dispositivo sin agotar otra prueba.
- Identidad: actualización del UID anónimo a cuenta verificada, restablecimiento de contraseña y reenvío del correo de verificación (Firebase Authentication). La persistencia entre dispositivos requiere iniciar sesión en la misma cuenta.
- Protección automática: antes de activarse, consulta el derecho comercial. La APK compilada con la bandera comercial exige asimismo la fecha límite sincronizada con Firebase desde el código Java; el listener la comprueba por notificación incluso con la interfaz cerrada. Al vencer, deja de crear historial nuevo sin eliminar registros previos.
- Los dispositivos sin conexión conservan como máximo la fecha de expiración que verificaron previamente; no se autoriza un nuevo período por estar sin conexión. Una APK modificada puede manipular almacenamiento local, por lo que la autorización de datos compartidos y grupos siempre la ejercen las reglas del servidor.
- Family: crear salas requiere licencia propia de prueba/Familiar. Un invitado gratuito o Individual entra con código si pertenece a la sala y el titular tiene Familiar/prueba activa. La licencia del titular incluye diez puestos. El invitado no puede crear otra sala con esa licencia prestada.
- Firestore: pruebas sintéticas del cupo de diez, denegación del undécimo, consentimiento, membresías, reglas comerciales activadas/desactivadas, host Individual, host Familiar y plan vencido; ninguna colección de pagos permite escritura directa del cliente.
- Panel: solicitudes de pago declaradas como pendientes, activaciones con referencia realmente verificada por operador, códigos de un uso y rechazo auditado. Una revocación incrementa la generación de códigos de la cuenta para invalidar códigos pendientes previos.
- Android: pipeline compila APK **debug de previsualización** con identificación 0.6.11-commercial-preview, sin firma de distribución ni activación bancaria. Un APK debug de CI puede no actualizar instalaciones previas si la firma es distinta.

**Gates previos a publicación:** Firebase Functions y reglas desplegadas y comprobadas en el proyecto correcto; permisos de Auth para correo; respaldo/migración; recepción real en banco; prueba física de Android con firma compatible; validación de privacidad y contrato comercial; APK final y URL pública verificada; atribución del Growth Loop. Aún no hay evidencia de estos requisitos de producción.


## 9. Publicación protegida y conexiones obligatorias

Hay tres workflows escritos en esta rama. Se ejecutan manualmente después de revisar el código y configurar el entorno GitHub **smartguard-production** con controles de autorización:

1. .github/workflows/smartguard-firebase-commercial-release.yml: ejecuta pruebas, comprueba identidad de proyecto y plan Blaze, exporta una copia REAL de Firestore a un bucket GCS existente y solo después despliega las funciones comerciales y las reglas revisadas. No cambia el interruptor de migración comercial.
2. .github/workflows/smartguard-admin-provision.yml: mediante una cuenta de servicio confiable, habilita como administrador un usuario Firebase Auth existente con correo verificado y deja un registro de auditoría.
3. .github/workflows/smartguard-signed-release.yml: requiere la clave ORIGINAL de firma y la configuración Android Firebase registrada; crea y verifica una APK 0.6.11 firmada, pero la entrega como artefacto privado de pruebas, sin sustituir automáticamente la descarga pública.

### Secretos de GitHub Actions para el entorno protegido

| Nombre del secreto | Función |
| --- | --- |
| FIREBASE_SERVICE_ACCOUNT_SMARTGUARD_B64 | Cuenta de servicio y permisos IAM para el proyecto SmartGuard |
| SG_ADMIN_PROVISION_EMAIL | Correo previamente registrado y verificado del administrador autorizado |
| SG_RELEASE_KEYSTORE_B64 | Clave de firma original (no una nueva firma incompatible) |
| SG_RELEASE_STORE_PASSWORD | Contraseña del keystore |
| SG_RELEASE_KEY_ALIAS | Alias de la firma |
| SG_RELEASE_KEY_PASSWORD | Contraseña de la firma |
| FIREBASE_ANDROID_GOOGLE_SERVICES_JSON_B64 | Configuración Firebase Android para el applicationId real |

No se deben pegar credenciales en este chat, GitHub, documentación ni mensajes. Los secretos deben almacenarse en el entorno protegido y los permisos de la cuenta de servicio deben limitarse. La cuenta y facturación reales se comprueban antes de escribir.

### Conexiones verificadas en esta sesión

- GitHub: repositorio Jorge-Sebastian/PMC_Landing_Page_Antes_de_Abrir, PR #26, rama feature/smartguard-production-core-20261117.
- El proyecto Vercel público pertenece al espacio jorgesebastian178-1050. El conector Vercel disponible aquí muestra únicamente proyectos de ronnyesteban2007-2896s-projects. No permite publicar sobre la producción existente.
- Aunque se detectó el plugin Firebase instalado para Codex, no hay operaciones Firebase disponibles en las herramientas de esta sesión. Por tanto no se han desplegado Cloud Functions ni reglas en el proyecto real, ni se han modificado usuarios reales de pago.
- Plan Blaze, cuenta de facturación, bucket GCS de respaldo y permisos IAM: NO VERIFICADOS.
- Firma original, instalación en Android físico, transferencias recibidas y envío real de correos: NO VERIFICADOS.

### Orden de liberación sin perder datos

1. Acceder al verdadero proyecto Vercel y confirmar rama, destino y entorno antes de publicar.
2. Confirmar Firebase Blaze y permisos, generar copia de seguridad gestionada de Firestore y conservar las reglas anteriores.
3. Desplegar funciones y reglas con workflow de entorno protegido; probar clientes reales de prueba autenticados con dos UIDs independientes.
4. Habilitar administrador verificado, comprobar solicitud de pago pendiente, rechazo, banco revisado, emisión de código, canje único, renovación y revocación.
5. Comprobar una familia con un titular Familiar y nueve invitados sin pagar. Verificar que el invitado 11 es rechazado, que los invitados no crean nuevas familias y que al vencer el titular se bloquean eventos sin borrar datos históricos automáticamente.
6. Migrar salas piloto de 20 antes de activar el interruptor comercial. Probar un rollback de reglas.
7. Firmar con la clave original, instalar/actualizar APK en Android 12 y 13+, comprobar permisos Android y métricas. Después reemplazar el archivo de descarga de Vercel.
8. Verificar la web y los enlaces de invitación y distinguir clics, descargas e instalaciones realmente atribuidas.

**No son equivalentes:** código integrado, tests en emulador, APK debug, despliegue Cloud Functions real y un producto comercial listo para cobrar.


## 9. Publicación existente (workflows protegidos)

Se añadieron flujos manuales a GitHub Actions para no duplicar ni confundir los proyectos originales. **No se han ejecutado en infraestructura real desde esta conexión.**

- **Firebase:** `.github/workflows/smartguard-firebase-production.yml`, rama `feature/smartguard-production-core-20261117`. Requiere secreto del entorno protegido `smartguard-production`: `FIREBASE_DEPLOY_SERVICE_ACCOUNT_B64` (cuenta de servicio con permisos mínimos en **smartguard-piloto-20261029**, no compartida en el chat). Ejecuta tests, reglas de emulador, despliega Functions `smartguard-commercial` y reglas; no despliega Hosting ni activa automáticamente `sg_config/commercial.enforced`. Requiere respaldo y migración previamente comprobados. Entradas de confirmación: `smartguard-piloto-20261029` y `DEPLOY_FIREBASE_COMMERCIAL`.
- **Web:** `.github/workflows/smartguard-vercel-production.yml`. Variables protegidas `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_SLUG=jorgesebastian178-1050`, `VERCEL_CLI_VERSION` (versión exacta). Secreto `VERCEL_TOKEN` autorizado específicamente para **el proyecto web existente**, no otro equipo. Carga configuración, comprueba IDs, construye y prepara un deployment sin cambiar el dominio, prueba las rutas y solo entonces lo promociona. No se puede ejecutar desde la conexión actual de Vercel, vinculada a otro equipo.
- **APK release:** `.github/workflows/smartguard-signed-release.yml`. Requiere secretos `SG_RELEASE_KEYSTORE_B64`, `SG_RELEASE_STORE_PASSWORD`, `SG_RELEASE_KEY_ALIAS`, `SG_RELEASE_KEY_PASSWORD`, `FIREBASE_ANDROID_GOOGLE_SERVICES_JSON_B64`; variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. Deben coincidir la app registrada y la **firma original** para actualizar instalaciones existentes. El artefacto release permanece privado para pruebas físicas; no se publica automáticamente en /downloads.

No guardar ni imprimir secretos, archivos JSON de Firebase o la keystore en el repositorio. Configurar revisores obligatorios y restringir la rama del entorno `smartguard-production` desde GitHub Settings antes de ejecutar workflows privilegiados.

**APK debug verificada en CI (solo pruebas, no comercial):** [GitHub Actions #44087140328](https://github.com/Jorge-Sebastian/PMC_Landing_Page_Antes_de_Abrir/actions/runs/44087140328), artefacto `smartguard-commercial-v0611-preview-debug-not-production`. Requiere acceso autorizado a Actions para descargar. Su build no prueba suscripciones contra Firebase real; tampoco equivale a una firma release.

### Condiciones de Go/No-Go

Para declarar PRODUCCIÓN: (1) Functions y reglas desplegadas, (2) migración revisada, (3) identidad y códigos de prueba verificados sobre Firebase real, (4) web publicada sobre el proyecto propietario, (5) APK release firmada con certificado correcto, (6) instalación y permisos probados físicamente, (7) rutas de invitación y descarga confirmadas y (8) acceso a panel comercial verificado en dos cuentas. Si falla cualquiera, dejar `sg_config/commercial.enforced` desactivado y no anunciar cobros automáticos ni métricas inexistentes.
