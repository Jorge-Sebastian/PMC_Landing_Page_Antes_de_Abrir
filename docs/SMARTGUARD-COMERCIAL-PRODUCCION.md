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
