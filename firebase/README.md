# Firebase Firestore rules (SmartGuard piloto)

The baseline in `firestore.rules` is the original safely deployed 2026-10-29 contract copied from `SmartGuard-Firebase-configuracion.zip`. It preserves the original devices/analyses/admins. This addition enables only `family_rooms` + `risk_events` (as the rules permit). Firebase Hosting is intentionally NOT defined in this repository's firebase.json: never overwrite the current admin website.

See `../docs/SMARTGUARD-FAMILY-FIREBASE-V1.md` for setup and limitations.


## Lote cerrado de códigos del piloto

El piloto usa Firebase Auth y Firestore con `commercialTransport: "firestore-pilot"`.
La compilación Android debe habilitar `VITE_SMARTGUARD_COMMERCIAL_ENABLED`.
El operador entrega manualmente uno de los diez códigos Individual o diez Familiar.
El canje guarda 30 días de acceso en la cuenta desde la fecha registrada por Firebase.
El piloto usa una sesión anónima persistente. Al borrar los datos de la app, cerrar la sesión o cambiar de teléfono, se puede perder el acceso asociado a ese UID.

- El archivo privado de códigos se genera una vez con `node functions/scripts/pilot-codes.js generate /ruta/privada/codigos.csv`. Conserva y usa el mismo archivo al provisionar. Exclúyelo del repositorio y de la APK.
- Con credenciales de operador en el proyecto existente, publica solo las reglas con `firebase deploy --only firestore:rules --project smartguard-piloto-20261029`. Importa el lote por única vez con `GOOGLE_CLOUD_PROJECT=smartguard-piloto-20261029 node functions/scripts/pilot-codes.js seed /ruta/privada/codigos.csv`. El importador escribe únicamente los hashes.
- El panel **Authentication → Users** muestra los usuarios y sus UID. `sg_pilot_accounts/{uid}` registra la primera entrada en el modo piloto.
- Para repetir pruebas, crea `sg_pilot_testers/{uid}` con el booleano `enabled: true` desde la consola de Firestore para el UID del evaluador. En **Ajustes → Mi plan de SmartGuard → Herramientas de prueba**, usa **Reiniciar activación Premium**. El botón devuelve al lote únicamente el último código de esa cuenta y conserva el usuario, el UID y cualquier prueba gratuita previa.
- El modo piloto concede el plan a la cuenta que canjea el código. Un código Familiar permite abrir las funciones Family en la cuenta del titular. El acceso Premium heredado por invitados pertenece al transporte comercial existente.
