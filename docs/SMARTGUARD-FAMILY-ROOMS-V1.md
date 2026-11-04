**Actualización 4/11/2026:** contrato inicial de 12 integrantes reemplazado por [Family Firebase de hasta 20 integrantes](SMARTGUARD-FAMILY-FIREBASE-V1.md). Esta página conserva el historial de diseño.

# SmartGuard Family — contrato de sala persistente V1

**4 de noviembre de 2026.** Acordado: una sola sala puede servir para las ocho entrevistas; límite máximo de 12 integrantes en total, incluido el anfitrión. La sala vive en Firestore y sobrevive a borrar caché o reinstalar. Entrar mediante enlace compartido o el mismo código escrito manualmente, sin registro visible; el invitado pone su apodo, acepta consentimiento y entra.

## Producto

1. Anfitrión crea Familia López y obtiene un código aleatorio difícil de adivinar y un enlace público de invitación que lo contiene.
2. Invitado abre enlace o escribe código, elige apodo y acepta compartir únicamente enlaces rojos. Auth anónima de Firebase opera en segundo plano; no requiere correo ni contraseña.
3. Cada integrante ocupa un cupo por UID de Firebase, no por apodo. Máximo 12. La identidad anónima se pierde al borrar datos, aunque la sala persiste; el anfitrión debe poder retirar una membresía antigua para liberar cupos.
4. Los enlaces rojos analizados manualmente o por notificaciones autorizadas se registran por integrante, con su apodo, el dominio registrable, fecha y origen manual/notificación. NUNCA la conversación, URL completa, ruta ni parámetros personales.
5. Al aparecer un enlace nuevo se aplica el analizador normal. Aparte, el historial familiar informa si otro miembro registró ese mismo dominio o uno muy parecido. Sin coincidencia no se inventa ninguna persona.
6. El filtro por persona permite revisar solo el historial consentido de Tía, Papá, Andrea, etc. No hay chat ni detección de clics en esta fase.

## Dos bases de datos lógicas (mismo proyecto Firebase, permisos distintos)

Privada de cada familia:
- family_rooms/{roomId}: nombre, hostUid, cupo 12, codigoHash, createdAt, admisiones habilitadas.
- family_rooms/{roomId}/members/{uid}: apodo, owner/member, consentFamilyRisk, active, joinedAt.
- family_rooms/{roomId}/risk_events/{eventId}: memberUid, dominio registrable, source, engineVersion, fecha del servidor, color=red.

General de SmartGuard:
- risk_domain_candidates/{domainKey}: dominio, reportes agregados, fecha, estado pending_review/verified/rejected. SIN apodo, UID ni sala.
- El reporte de un usuario NO pasa directamente a blacklist general: podría ser falso positivo o manipulable. La verificación independiente y los límites son obligatorios.
- Compartir resultados con familiares y contribuir a la reputación global son DOS autorizaciones independientes.

## Acceso seguro sin contraseñas

- El código de unión funciona como invitación portadora: cualquiera que lo tenga podrá entrar mientras haya cupos. Generarlo con entropía alta, permitir regeneración/deshabilitación, aplicar rate limits y nunca publicarlo en listados.
- No permitir consultas públicas a family_rooms ni a risk_events. Firestore Rules no funcionan como filtros. Usar función de confianza para canjear el código de invitación por membresía y aplicar cupo de 12 dentro de una transacción.
- Después, las consultas del historial exigen miembro activo autenticado, aunque sea anónimo. El host no puede conceder consentimiento a otro integrante. Se debe permitir salir, revocar consentimiento y borrar registros familiares.
- No sobrescribir las reglas actuales de devices, analyses y admins: hoy family está cerrado y aún no se ha desplegado un backend familiar.

## Coincidencias: alcance inicial

- El código implementado distingue same-domain y similar-domain por dominio registrable, con variantes ASCII como netf1ix versus netflix y g00gle versus google.
- La similitud NUNCA cambia la clasificación de un enlace por sí sola; solo añade contexto de registros rojos anteriores, y reconoce que puede ser un parecido accidental.
- Netflix y WhatsApp NO deben aparecer como enlaces similares simplemente porque alguien escribió 1 en ambos.
- No registrar resultados verdes o naranjas como peligrosos; no subir enlaces con tokens privados. Una coincidencia de mismo dominio NO prueba que sea exactamente el mismo enlace.

## Casos mínimos de verificación

1. El anfitrión + 11 invitados entran en la misma sala desde enlaces/códigos; el número 13 recibe mensaje de cupo lleno.
2. Ocho entrevistados distintos ven la misma sala persistente desde sesiones diferentes; se pueden sustituir miembros antiguos de pruebas.
3. Borrar caché y entrar otra vez NO borra la sala; pero la identidad anterior no se recupera solo escribiendo el mismo apodo.
4. Familia A nunca puede leer miembros ni eventos de Familia B. Quien no tenga código no puede enumerar salas.
5. Rojo manual + rojo desde Android figuran con su fuente; naranja y verde no figuran.
6. Mismo dominio muestra coincidencia; variante de marca dice 'posible similar'; sin historial no aparece un familiar inventado.
7. Anfitrión puede detener la admisión o rotar código, y cada usuario puede retirar su consentimiento.
8. Ningún registro global permite conocer qué persona de qué familia recibió un enlace.

## Estado técnico de este commit

Archivos añadidos: src/family/risk-event.ts, src/family/risk-matching.ts, src/family/risk-matching.test.ts, más este contrato y CI.
**No desplegado:** la sala real de Firebase, sus reglas, el alta de invitados y la integración con la APK siguen pendientes. Este código es el núcleo probado de límites y coincidencias, no una demo que se presente como backend real.