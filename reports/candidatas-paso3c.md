# Señales candidatas — Paso 3.C (solo entrenamiento)

Cada candidata se evaluó con validación cruzada de 5 particiones, fijas por
hash de dominio registrable (mismo método del reparto 70/30 — nunca por
orden de descarga). En cada rotación, el peso se elige mirando solo las
otras 4 particiones y se mide en la partición dejada afuera; los números de
abajo son la suma/promedio de esas 5 mediciones "a ciegas". El conjunto de
prueba no se tocó. Script: `scripts/eval/candidate-signals.ts`.

Línea base (entrenamiento, con el catálogo de marcas ya ampliado en el
Paso 3.B): `riesgo` recall=27.6% FPR=0.83%; `riesgo+precaución`
recall=57.1% FPR=1.46%.

## Se quedan

### 1. `esHostingGratuito` (sufijo privado de la PSL)
Dispara en 77/170 phishing y solo 22/13 957 legítimos. Con CV: recall
`riesgo` 27.6%→**67.1%**, FPR 0.83%→0.99%. El salto de recall más grande de
todas las candidatas, con un costo casi nulo en FPR. **Se agrega**, con un
peso bajo (candidato: 2) — nunca por sí sola basta para "riesgo" (habría que
combinarla con otra señal), consistente con que el Paso 3.A encontró que el
69% de estos casos no tienen ninguna otra pista.

### 2. Marca al inicio de un token de 6+ letras, dominio no oficial
Ejemplo real: `netflixcol.vercel.app`. Dispara en 8 phishing / 27 legítimos
(antes de revisar los 27, eran 46 — **19 resultaron ser infraestructura real
de Amazon/Google/Microsoft/TikTok/Spotify sin catalogar**, confirmada hoy por
certificado TLS y agregada al catálogo en este mismo paso). De los 27 que
quedan, 2 ya estaban marcados por otra señal (sin costo adicional) y **3 son
colisiones genuinas con empresas no relacionadas** (`outlookindia.com` —
revista india, nada que ver con Microsoft; `twittervideodownloader.com` —
herramienta de terceros; `bookingexperts.com` — empresa de software para
alojamientos, socia de Booking.com pero no la misma empresa). Esas 3 son un
costo inherente al método (empezar con el nombre de una marca no implica ser
esa marca), no un bug de catálogo. Recall `riesgo` 27.6%→31.4%, FPR
0.83%→1.01%. **Se agrega** con peso bajo (candidato: 1) — la relación
señal/ruido es la más débil de las que se quedan, así que su peso final en
el Paso 4 probablemente salga bajo.

### 3. Campo de contraseña en dominio sin reputación (hosting gratuito o <30 días)
Dispara en 13/134 phishing (del subconjunto con caché real) y solo 1/407
legítimos — la mejor relación señal/ruido de todas las candidatas. Recall
`riesgo` dentro de ese subconjunto 31.3%→40.7%, FPR casi sin cambio
(18.4%→18.6%). **Se agrega**, peso medio (candidato: 2).

## Se descartan (por ahora)

### 4. Título contra marca en host no oficial
Dispara en 39/134 phishing pero también 20/407 legítimos — la relación
señal/ruido es la peor de las candidatas con datos suficientes (recall
+3.5pp por FPR +1.9pp). Probablemente se solapa en parte con las otras
señales de marca. **Se descarta esta ronda** — no se ve suficientemente
mejor que no hacer nada para justificar el riesgo de falsos positivos
nuevos.

### 5. Transposición de letras adyacentes (`faecbook`)
Solo 2 ejemplos en las 170 de phishing de entrenamiento. Es exactamente el
problema de "no decidir por una sola URL" que las reglas del proyecto piden
evitar — con tan pocos casos, la validación cruzada no puede confirmar que
generalice (recall no mejora en los pliegues de prueba). **Se descarta por
falta de datos**, no porque esté mal — si en el futuro aparecen más
ejemplos reales, vale la pena reevaluarla.

## Se modifica una regla existente

### 6. `otra-web-oculta`: deja de ser automáticamente "riesgo"
Hoy, **cualquier** redirección a otro host pesa 3 (fuerza "riesgo" sola).
En entrenamiento, de 78 casos con `differentHost=true`, **10 son solo
diferencias de `www.`/apex o redirecciones entre dos dominios oficiales de
la misma marca** (ej. `office.com`→Microsoft 365) — ninguno de los 10 es
phishing. Esos 10 se limpian por completo (ya no cuentan nada): costo cero,
beneficio directo.

De los 68 casos restantes, solo 3 son phishing real — muy pocos para que la
validación cruzada elija un peso con confianza (en los pliegues de prueba,
el peso elegido no detecta ningún phishing nuevo). La conclusión honesta:
**no hay suficiente phishing real con redirección en el entrenamiento para
afinar el peso con datos**. Lo que sí es seguro, con o sin más datos: una
redirección por sí sola nunca debería forzar "riesgo" automáticamente (ni el
hallazgo de producción de `nic.co`→`gobernanzadeinternet.mintic.gov.co`, ni
los 65 legítimos restantes de este análisis, son casos donde eso tenga
sentido). **Se agrega la normalización** (www/apex y mismo-dominio-oficial)
y **se baja el peso de 3 a 2** — deja de forzar "riesgo" por sí sola; el
peso final definitivo se decide en el Paso 4 con la regresión.

### 7. Edad de dominio: el umbral de 30 días ya está bien calibrado
Con los 374 casos de entrenamiento que tienen edad real (vía RDAP, de la
consulta en vivo): a <30 días, 22.3% del phishing es joven y **0%** de los
legítimos. Subir el umbral a 60/90 días solo gana 1 caso más de phishing
pero introduce el primer falso positivo. **No se cambia el umbral actual**
— ya está bien calibrado contra datos reales, no solo contra el seed.
Limitación conocida (se mantiene del Paso 2): los legítimos con edad
conocida en este banco son casi todos de Tranco, es decir, grandes y
viejos — este resultado no dice nada sobre un negocio real con dominio
joven, porque el banco no tiene ejemplos de eso.

## Resumen para el Paso 4

Señales que entran como variables a la regresión logística:
`esHostingGratuito`, `marca-al-inicio-de-token`,
`contrasena-en-dominio-sin-reputacion`, y la versión normalizada de
`otra-web-oculta` (peso tope 2, no 3). Sin cambios: `dominio-nuevo` (umbral
actual ya calibrado). Descartadas por ahora: título-vs-marca,
transposición de letras.

No se tocó `check-link` ni se pidió redespliegue en este paso — todo se
calculó con los campos que ya estaban en la caché de la consulta en vivo
del Paso 1.
