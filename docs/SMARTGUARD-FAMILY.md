# SmartGuard Family — Alpha 0.2

## Estado y alcance

Se implementó el módulo web de protección familiar en `/familia`, más un modo
interactivo de prueba en `/familia?demo=1`. **La demo es local y ficticia**: no
registra usuarios ni envía mensajes. La versión multiusuario real necesita el
backend Supabase de **SmartGuard** configurado con autenticación Clerk.

Esta implementación **no sustituye** ni modifica la APK 0.5.4 / 0.5.5 instalada
por los probadores. El repositorio contiene código Android 0.4.0, mientras que
la 0.5.5 es una adaptación de una APK compilada. No distribuir una APK de la rama
fuente 0.4.0 como si fuera la 0.5.5.

## Valor para el usuario

1. El usuario crea un círculo y recibe un enlace de invitación de un solo uso,
   válido por 72 horas. Los familiares pueden aceptarlo desde web después de
   iniciar sesión voluntariamente.
2. Cada integrante decide **quién recibirá sus alertas**; el administrador no
   obtiene automáticamente acceso a ellas.
3. Cuando una persona pulsa **Solicitar ayuda familiar**, o **Avisar que podría
   continuar** tras ver un enlace de riesgo en SmartGuard, los contactos que
   autorizó reciben el evento en su bandeja web (actualización cada 10 s cuando
   la página está visible). Pueden marcarlo como atendido y comunicarse
   directamente con el familiar.
4. La invitación y su aceptación quedan contabilizadas, permitiendo observar
   una métrica del growth loop real (aceptadas / generadas por cada usuario).

**No se afirma que el sistema haya visto una apertura externa** desde WhatsApp,
SMS o el navegador. Los eventos son declarados por acciones dentro de SmartGuard
(`client_reported`). No hay notificaciones push, SMS, llamadas automáticas ni
seguimiento de actividad fuera de SmartGuard. Tampoco se almacena el texto de
conversaciones ni URLs privadas: como máximo, un hostname público no sensible.

## Cómo conectar el backend real

1. Seleccionar o crear un **proyecto dedicado a SmartGuard** en Supabase,
   diferente de la base personal o la de Subachoque. No usar el proyecto Enter
   sin autorización y sin acceso a su esquema.
2. Conectar Clerk a **ese** Supabase como proveedor de autenticación externo:
   <https://supabase.com/docs/guides/auth/third-party/clerk>.
   Clerk debe generar un JWT de sesión que incluya `role: authenticated`.
   En la aplicación web se usa `session.getToken()` como `accessToken` de
   un cliente Supabase dedicado a Family.
3. Revisar el SQL de `supabase/blueprints/smartguard_family.sql`. Crear la
   migración con la CLI (`supabase migration new smartguard_family_v1`) y
   trasladar el contenido allí. Aplicarla **solo al proyecto SmartGuard**.
   Nunca pegar una `service_role` en el frontend.
4. Configurar el despliegue web con `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_PUBLISHABLE_KEY` y `VITE_CLERK_PUBLISHABLE_KEY`. La URL y
   clave son públicas; los secretos privados nunca van en `VITE_*`.
5. Validar con dos usuarios distintos: A crea e invita; B acepta, elige a A
   como contacto; B solicita ayuda; A ve alerta y la marca atendida. Una cuenta
   no invitada no debe poder consultar información de esas personas.
6. Verificar en Supabase que todas las tablas `smartguard_family*` tienen RLS,
   que ningún usuario `anon` puede consultar tablas ni llamar el RPC, y que
   la función privilegiada está en `smartguard_private`, un esquema que **no
   debe exponerse** en Data API. Revisar la autenticación externa y políticas.

## Rutas para pruebas

- `/familia`: presentación de la propuesta. Clerk sigue siendo **opcional
  para el analizador**, pero es necesario iniciar sesión para vincular familias.
- `/familia?demo=1`: demostración interactiva visible sin cuentas ni backend.
- `/#analizador`: análisis existente sin inicio de sesión.
- Tras analizar un enlace de riesgo, el resultado enlaza a `/familia` y ofrece
  avisar a contactos de confianza. El enlace completo nunca se pasa por la URL
  de navegación; solo un hostname público permitido.

## Datos, permisos y seguridad

- Invitaciones criptográficamente aleatorias (2 UUIDs v4), de un solo uso;
  se almacena solo su SHA-256. El servidor bloquea intentos tras la caducidad.
- Límite de 10 familiares por círculo de prueba, 3 círculos por cuenta,
  10 invitaciones por integrante/día, y 5 eventos por remitente cada 30 minutos.
- Los contactos de confianza son **opt-in por persona protegida**.
- La función de base de datos valida Clerk JWT y membresía en cada operación.
  Todo acceso directo a tablas se deniega por RLS/revocación de privilegios.
- Los eventos guardan remitente, destinatario, hora y opcionalmente dominio
  público; se filtran tokens, rutas, mensajes y URLs completas.
- Salir de una familia revoca sus relaciones y elimina alertas ligadas a la
  membresía. El responsable puede borrar el círculo cuando está solo.
- El enlace con token puede ser capturado por registradores de visitas si no se
  excluyen de la analítica: la interfaz lo elimina de la URL al cargarse.
  Configurar la analítica y no registrar parámetros `invitacion`.

## Hipótesis y mediciones propuestas para E4 (registrar antes del despliegue)

- H2: "Creemos que la protección familiar con contacto de confianza hará que
  al menos 6 de 8 personas seleccionen un contacto y completen una acción de
  ayuda correctamente durante una prueba controlada".
- Métrica de H2: porcentaje de participantes que completan el flujo completo
  crear/unirse → consentimiento → evento → ver alerta → atender.
- Growth loop: enlaces generados → aceptaciones reales → integrantes que envían
  una nueva invitación. Guardar umbral numérico antes del despliegue.

## Límites de la versión

- El backend de SmartGuard administrado por Enter no está conectado en esta
  sesión, por lo cual no se aplicó la migración a un servidor remoto.
- No hay push en segundo plano ni interceptación de aperturas externas.
- La APK 0.5.5 debe conservarse en el celular hasta disponer de su código fuente
  reproducible, sus claves de firma y pruebas físicas.
