# SmartGuard Family — Firebase real, hasta 20 integrantes

**Implementación:** Firestore directo + Firebase Authentication anónima en segundo plano; no Cloud Functions y no se requiere Blaze. **Proyecto objetivo:** `smartguard-piloto-20261029`. **Advertencia:** añadir estos archivos a GitHub y superar las pruebas no despliega automáticamente las nuevas reglas en Firebase. No se debe anunciar como sala operativa hasta verificar el despliegue y una prueba real entre dos sesiones.

## Flujo del usuario

- El anfitrión crea una sala con nombre; se genera una clave aleatoria de 16 símbolos (`SG-` + 80 bits) que también forma parte del enlace con fragmento (`/familia#codigo=SG-...`).
- Los invitados pueden abrir el enlace o escribir el código. Solo necesitan apodo y elegir si autorizan compartir resultados rojos. La autenticación anónima existe, pero no muestra un registro de correo/contraseña.
- La misma sala persiste en Firestore aunque se borre la caché de un teléfono. El usuario puede reingresar con el código, pero si borra su sesión anónima pierde su identidad anterior y consume otro cupo. Solo el anfitrión puede liberar los antiguos.
- Máximo 20 integrantes en total, anfitrión incluido. La cifra se verifica en las reglas de Firestore sobre un mapa `members` de un único documento y las incorporaciones son transaccionales.
- Desde el navegador, cualquier persona puede analizar manualmente un enlace. Si el motor determina **riesgo alto**, el cliente registra el dominio registrable, fecha y origen manual **solo cuando el propio usuario lo autorizó**. Otros resultados no van a la sala.
- En el historial todos ven el apodo del autor mientras pertenezca al grupo y pueden filtrar por persona. Para un enlace nuevo se muestra contexto sobre dominios previos iguales o parecidos. Similaridad no equivale a veredicto ni identidad de URL completa.
- El anfitrión puede cerrar nuevos ingresos o retirar integrantes y sus reportes. Un integrante puede retirar el consentimiento, borrar sus reportes y abandonar la sala.

## Colecciones Firestore

```text
family_rooms/{codigo-aleatorio}
  name             string
  hostUid          Firebase Auth uid
  open             boolean
  createdAt        server timestamp
  members          { [uid]: { nickname, role, shareRisks, joinedAt } }
  risk_events/{eventId}
    memberUid      uid
    domain         dominio registrable (no URL)
    color          "red"
    source         "manual" | "notification"
    engineVersion  string
    createdAt      server timestamp
```

El nombre de la familia y los apodos solo son visibles al disponer de un **código de sala** válido. Las consultas de colección de salas están denegadas. El historial de riesgo exige, además, ser integrante activo autenticado. **El código es una credencial de invitación:** quienes lo tengan pueden unirse si hay cupos; no es una lista indexada públicamente. No hay chats, accesos de administradores generales ni datos personales de los mensajes. Se conservaron sin cambios las reglas anteriores de `devices`, `analyses` y `admins`.

**No confundir:** la telemetría agregada de la versión 0.5.9 solo envía color, fecha y versión. La APK 0.5.9 actual no envía dominios a Family; no se promete sincronización de notificaciones familiares automática hasta ampliar el puente nativo, firmar nueva APK y probarla en Android. La funcionalidad web manual ya está implementada en el código fuente.

## Por qué la persistencia no necesita funciones de pago

Firestore controla la cuota de veinte desde Security Rules: una solicitud que agregue una identidad de más es rechazada incluso si el cliente es manipulado. Los cambios se aplican con transacción, que se reintenta si otro invitado modifica la sala. La decisión de no exigir registro visible a invitados se implementa con autenticación anónima, manteniendo el UID entre sesiones normales mientras el navegador conserve los datos.

**Limitación aceptada:** en un modelo basado únicamente en código, quien lo reciba puede compartirlo; el anfitrión puede cerrar temporalmente nuevos ingresos, pero aún no existe rotación del código en esta versión. Para revocarlo completamente, debe migrarse a una nueva sala, o añadirse un mecanismo de invitación administrado por backend seguro.

## Despliegue: dos destinos diferentes

1. **Frontend web:** `src/pages/familia/index.tsx` se publica junto con la landing de Vercel al desplegar el commit de la rama `main`. `public/smartguard-family/client.js` y `config.json` se copian como assets públicos de Vite. El archivo de configuración contiene **exclusivamente parámetros públicos de una app Firebase**: no incluye claves administrativas.
2. **Reglas Firestore:** `firebase/firestore.rules` conserva todo el contrato anterior y añade `family_rooms`. **No usar `firebase init` sobre el proyecto existente ni desplegar Hosting**, porque podría reemplazar el administrador actual. Desde un entorno autenticado como propietario del proyecto, comprobar que el target sea `smartguard-piloto-20261029` y ejecutar:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules --project smartguard-piloto-20261029
```

Este proyecto contiene `firebase.json` configurado **únicamente para Firestore**; no cambia Firebase Hosting. No subir credenciales ni tokens a GitHub. En esta sesión no hay una operación de Firebase conectada que autorice publicar reglas, así que **desplegar esta segunda parte requiere acceso de Firebase fuera de este chat**.

## Cómo verificar

- CI `smartguard-family-firebase-check.yml` ejecuta Vitest, TS, build Vite y reglas en **Firestore Emulator**, con UIDs sintéticos y sin tocar datos reales.
- En la Firebase Console, confirmar reglas `family_rooms` publicadas y Authentication Anónima habilitada (ya lo estaba en la configuración histórica).
- Entrar en `/familia` desde dos navegadores o dos perfiles: crear sala, copiar URL, unirse, verificar nombres y persistencia.
- Intentar un tercer navegador sin código: no debe poder enumerar salas ni leer eventos.
- Agregar participantes hasta 20; el 21 debe ser rechazado.
- Analizar manualmente un enlace que el motor clasifique rojo. Solo dominio/fecha/origen aparecen; verde/naranja y enlaces con tokens no se comparten.
- Cerrar y reabrir el navegador, borrar caché, introducir el código y verificar que la sala exista. Aclarar en el informe que el UID anónimo se puede perder.

## Seguridad y alcance futuro

- Una sala de 20 no significa 20 cuentas verificadas: limpiar datos genera una nueva UID. Un entrevistador puede retirar a participantes antiguos para reutilizar cupos.
- Los clientes aún pueden autodeclarar eventos rojos dentro de su propia sala; esos eventos sirven para **contexto familiar**, nunca como prueba certificada de phishing ni blacklist global. La reputación general requiere una API de confianza, controles contra spam y autorización adicional.
- La comparación de dominios imitados usa el código `src/family/risk-matching.ts` y **no debe generar falsos mensajes** que afirmen que una persona recibió un enlace cuando no existe ese evento.
- El historial muestra los 100 eventos recientes; se necesitará paginación para salas con más actividad.
- Para pruebas con usuarios, documentar consentimiento para el historial familiar y no grabar pantallas con información privada sin autorización.

### Publicación responsable en la landing

La ruta `/familia` queda incluida en el código. Para mostrar el acceso en la navegación y la sección de planes, configure `VITE_SMARTGUARD_FAMILY_ENABLED=true` en el despliegue de Vercel **después** de publicar y probar reglas Firestore. Por defecto permanece sin anunciar para evitar falsas promesas antes de activar el backend.
