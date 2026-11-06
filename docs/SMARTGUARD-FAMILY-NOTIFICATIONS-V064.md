# SmartGuard 0.6.4 — Alertas familiares directamente en las notificaciones Android

**Objetivo:** cuando una notificación compatible de Android contiene un enlace, SmartGuard presenta primero la alerta familiar **si Firebase confirma que otro integrante ya reportó el mismo dominio o uno parecido como rojo**, y permite abrir directamente el análisis de ese mensaje pulsando el aviso del sistema.

## Cambios implementados

1. El servicio `MessageListenerService` inicia dos procesos paralelos: el análisis de phishing habitual y una consulta de solo lectura a Firebase Family con la identidad guardada previamente para el grupo.
2. `FirebaseFamilyReporter.lookup()` usa el proyecto existente, Firebase Authentication y las reglas de Firestore, obtiene el documento `family_rooms/{room}` y hasta los últimos 100 registros `risk_events` autorizados. **Nunca carga el enlace recibido a Firestore**: solo descarga reportes consentidos y los compara localmente. La consulta es asíncrona: una falla de conexión nunca impide la alerta original.
3. `FamilyDomainMatch` detecta igualdad de dominio y semejanza conservadora; ni el historial ni la semejanza reclasifican automáticamente el nivel de riesgo. Se excluyen los reportes del mismo usuario, los miembros retirados y las personas que han retirado el consentimiento de compartir.
4. Cuando hay coincidencia, la misma notificación pasa a encabezar **«ALERTA FAMILIAR · [apodo]»** o **«ALERTA FAMILIAR · DOMINIO PARECIDO»**. Ejemplo seguro: «También le llegó a Papá un enlace del dominio netf1ix.com». Las razones genéricas siguen después; nunca afirma que sea la misma URL si solo coincide el dominio.
5. Tocar el aviso o la acción «Ver alerta familiar» abre **el análisis de ese aviso en la APK**, sin abrir automáticamente el sitio peligroso. El informe comienza por el bloque destacado «Alerta familiar», después el motor explica las señales.
6. Al abrir la APK, `FamilySessionBootstrap` recupera la sala que el usuario ya había asociado. Si un integrante no autoriza publicar sus propios riesgos, conserva el acceso **solo lectura** al historial familiar, sin sincronizar eventos personales.
7. `versionCode=21`, `versionName=0.6.4-piloto`, `applicationId=co.antesdeabrir.piloto`. Se mantiene el mismo certificado del piloto para actualizar la 0.6.3 sin borrarla.

## Prueba real necesaria

1. Dos cuentas Firebase diferentes deben estar en la misma sala Family, con identidades y apodos reales. La primera comparte un enlace **rojo** desde la opción manual o desde una notificación y confirma que el evento se guardó en la colección `risk_events`.
2. La segunda recibe una notificación de WhatsApp/SMS con el **mismo dominio** (no es suficiente recibir solamente el mensaje en otra aplicación si Android no permite acceso a notificaciones). Debe aparecer primero el aviso familiar y, después, los motivos del analizador.
3. Tocar el aviso debe abrir directamente la ficha del enlace en SmartGuard sin navegar al dominio peligroso.
4. Repetir con un dominio parecido; el texto debe decir «se parece», no «es el mismo enlace».
5. Repetir sin conexión o tras retirar el consentimiento: no debe inventar coincidencias ni bloquear la alerta de phishing normal.

**Limitación:** la consulta real de Firebase y la entrega de las notificaciones requieren pruebas en teléfonos Android y cuentas de usuarios ya vinculadas; las pruebas en CI comprueban compilación, comparación de dominios y estructura de código, pero no suplantan el ensayo físico ni certifican consultas al servidor de producción. Cuando no existe historial previo o el usuario no está en una sala, SmartGuard sigue mostrando exclusivamente el análisis general. El nombre del familiar se muestra solo cuando se obtiene del documento de membresía autenticado.
