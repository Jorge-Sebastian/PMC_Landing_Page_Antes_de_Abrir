# SmartGuard 0.5.7 · Administrador y telemetría segura

## Qué se implementó en la APK 0.5.7

- Mantiene intacto el onboarding, la protección individual y el inicio de sesión opcional de la APK 0.5.6.
- Incorpora **ABRIR ADMINISTRADOR** en el dashboard Android.
- Tablero de monitoreo con indicadores verdes, ámbar y grises; tarjetas por dispositivo; total de análisis y desglose verde/naranja/rojo.
- **MI CELULAR** consulta el estado REAL de `Protection.status()` y su contador local. Si el historial está desactivado, los desgloses desconocidos se muestran como `—`, nunca como cero ficticio.
- **VER DEMO** presenta seis teléfonos simulados explícitamente identificados como datos ficticios.
- **DISPOSITIVOS** es el modo protegido por sesión Clerk + RLS. Solo consulta dispositivos remotos si existe una base dedicada de SmartGuard configurada y esa cuenta recibió permisos mediante `sg_admin_accounts`.
- Verde en remoto significa `last_seen_at` de hasta 15 minutos; ámbar hasta 24 horas; gris después. No significa que Android esté conectado de forma permanente.

La APK 0.5.7 entregada aún NO incluye un backend de telemetría conectado; los dispositivos de otras personas no pueden aparecer de forma real antes de crear y asegurar una base exclusiva. No se realizaron instalaciones de prueba en un dispositivo Android físico.

## Arquitectura definitiva

1. Crear un proyecto **Supabase exclusivo de SmartGuard**. No utilizar los proyectos personales o Subachoque y no almacenar datos en el proyecto gestionado por Enter.
2. Aplicar `supabase/blueprints/smartguard_admin_telemetry.sql` tras revisar RLS, índices, permisos y políticas.
3. Configurar Supabase Auth para inicio de sesión anónimo en Android y Third-party Auth de Clerk para administradores. Verificar el JWT firmado; el rol admin nunca se concede desde un cliente.
4. Provisionar manualmente el `subject` real y verificado de una cuenta administradora desde SQL Editor seguro. NO configurar permisos usando el correo que envía el usuario ni nombres de la APK.
5. Configurar exclusivamente credenciales **publicables** para la compilación Android y la web. No incluir `service_role`, claves privadas o certificados en APK/GitHub.
6. Incorporar consentimiento granular para compartir estadísticas y una cola de eventos con reintentos. El código fuente en `src/telemetry/` contempla un primer envío solo en primer plano; falta instrumentar el servicio nativo para eventos en segundo plano con pruebas reales.
7. Probar con **dos teléfonos físicos**, aceptar tratamiento de datos, activar telemetría, registrar eventos, comprobar la misma identidad tras actualizar y validar que una cuenta normal NO pueda consultar los dispositivos de terceros.

Las sesiones anónimas permanecen entre actualizaciones normales si la aplicación conserva sus datos. Desinstalar o borrar los datos puede perder esa identidad. Una cuenta de pago reutilizable y recuperable requerirá identificación verificada.

## Modelo de datos

- `sg_admin_accounts`: autorizaciones solo de servidor por subject del JWT. Sin permisos de escritura desde apps.
- `sg_devices`: instalación seudónima, versión, consentimiento, último heartbeat, contador nativo y estado local de protección.
- `sg_events`: eventos sin mensajes, URLs completas ni tokens; resultados de riesgo `green/orange/red`.
- `sg_device_rollups`: consulta agregada que respeta RLS (`security_invoker = true`).

El contador total puede ser mayor que la suma de los desgloses cuando el usuario no ha consentido conservar el historial de resultados. Esto es esperado y no se oculta.

## Construcción de APK de prueba

La versión 0.5.6 con la interfaz moderna no tiene todavía su código React/Android fuente completo recuperado. Para **no retroceder a la interfaz 0.4.0**, esta versión se creó con un parche temporal documentado en:

- `scripts/android/build_admin_apk_v057.py`
- `scripts/android/admin_native_v057.js`
- `scripts/android/admin_native_v057.css`

Desde una estación de desarrollo que tenga la APK **v0.5.6** y el certificado piloto original disponible **sin subirlo al repositorio**:

```bash
python scripts/android/build_admin_apk_v057.py \
  --base /ruta/privada/SmartGuard-v0.5.6-Family-Alpha.apk \
  --keystore /ruta/privada/smartguard-pilot.keystore \
  --output SmartGuard-v0.5.7-Admin-Alpha.apk
```

Antes de activar dispositivos remotos es necesario construir una nueva APK que incluya los valores públicos de URL/clave del proyecto dedicado, tras activar y probar las políticas de RLS:

```bash
python scripts/android/build_admin_apk_v057.py \
  --base /ruta/privada/SmartGuard-v0.5.6-Family-Alpha.apk \
  --keystore /ruta/privada/smartguard-pilot.keystore \
  --telemetry-url "https://PROJECT_REF.supabase.co" \
  --telemetry-key "sb_publishable_PUBLIC_KEY" \
  --output SmartGuard-v0.5.7-Admin-Alpha.apk
```

**Advertencia:** el APK puente NO implementa envío automático de análisis a la base. Eso requiere la fase de telemetría Android con consentimiento, pruebas de segundo plano y una versión posterior con el código fuente Android recuperado. El cambio de configuración solo activaría la **consulta admin**, no inventaría registros.

La construcción incluye verificación del APK base, cambios mínimos de JavaScript/CSS, versión Android 14 (`0.5.7-piloto`), firma V2 original compatible y verificación criptográfica de integridad.

## Tests que hay que ejecutar para completar el producto

- [ ] Instalación sin desinstalar 0.5.6 (persistencia local)
- [ ] Onboarding invitado y protección siguen funcionando
- [ ] Monitor: datos locales y vista de ejemplo distinguidos claramente
- [ ] Pruebas 2 dispositivos: Green/Amber/Gray según `last_seen_at`
- [ ] Cuenta sin privilegios ve **ACCESO DENEGADO** y no puede descargar datos por la API
- [ ] Cuenta administradora ve solo métricas agregadas autorizadas
- [ ] Telemetría no se envía si no hay consentimiento, y puede revocarse
- [ ] Un mensaje sin URL no genera evento de análisis
- [ ] Renovación de sesiones, actualizaciones y red sin conexión
