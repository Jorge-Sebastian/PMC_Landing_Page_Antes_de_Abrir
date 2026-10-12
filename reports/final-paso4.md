# Paso 4 — pesos y umbrales (solo entrenamiento)

**No se corrió el Paso 5.** El conjunto de prueba no se tocó para ninguna
decisión de este reporte. Los pesos son **enteros elegidos por una búsqueda
pequeña en rejilla + validación cruzada de 5 particiones** sobre
entrenamiento (`scripts/eval/grid-search-weights.ts`) — **no son
coeficientes de una regresión**. Se intentó primero una regresión logística
(`scripts/eval/fit-weights.ts`) pero sus coeficientes para las señales con
pocos ejemplos positivos (8-13 casos) salían inestables y, en un caso
(`hosting-gratuito`), llevaban a un peso que rompía un requisito explícito
(ver más abajo) — se descartó ese método para la decisión final.

## Tabla final

| Señal / umbral | Valor | Motivo |
|---|---|---|
| `hosting-gratuito` | peso **1** | Bajado de 2: con peso 2 igualaba a `CAUTION_SCORE` y cualquier sitio en hosting gratuito salía en "precaución" solo por vivir ahí (ver hallazgo abajo). |
| `contrasena-sin-reputacion` | peso **1** | Mismo motivo: depende en parte del mismo banco chico de 22 legítimos de hosting gratuito. |
| `otra-web-oculta` | peso **1** (antes 3) | De 78 redirecciones reales en entrenamiento, solo 3 eran phishing; normalizado para no contar diferencias de www/apex ni saltos entre dominios oficiales de la misma marca. |
| `marca-al-inicio-de-token` | **descartada** | Rompía 2 casos del seed curado que la Fase 1 arregló a propósito (negocios reales cuyo nombre empieza igual que una marca: `mastercardiology-clinic.com`, `tiktokerscommunity-fanclub.com`). El entrenamiento no tenía ningún ejemplo de esa colisión — el seed curado sí la detectó. |
| `CAUTION_SCORE` (umbral "precaución") | **2** | Sin cambios. |
| `DANGER_SCORE` (umbral "riesgo") | **3** (antes 6) | Elegido por la búsqueda: con los pesos nuevos ya puestos, dos señales reales de peso medio combinadas (no necesariamente una señal fuerte de peso 3) ya alcanzan un umbral razonable de riesgo. |
| `STRONG_WEIGHT` (fuerza "riesgo" sola) | **3** | Sin cambios — imitación de marca, caracteres engañosos, etc. siguen forzando "riesgo" solas. |

Ninguna de las dos señales con tope bajo (`hosting-gratuito`,
`contrasena-sin-reputacion`) alcanza `CAUTION_SCORE` por sí sola (1 < 2):
un sitio en hosting gratuito sin ninguna otra pista da **"sin señales"**,
tal como se pidió.

## Impacto en entrenamiento (antes → después del Paso 4 completo)

| Umbral | Recall antes (Paso 3) | Recall después | FPR antes | FPR después |
|---|---|---|---|---|
| riesgo | 27.6% | **50.6%** | 0.83% | 0.36% |
| riesgo + precaución | 57.1% | **68.2%** | 1.46% | 1.01% |

La FPR objetivo pedida era 1-2% en "riesgo"; la búsqueda no encontró ningún
combo dentro de ese rango con mejor recall que quedarse en 0.36% — es decir,
el mejor punto que encontró la rejilla queda **por debajo** del rango
pedido (más conservador), no dentro de él. No se forzó el umbral hacia
arriba solo para "llenar" el rango.

## Hallazgo corregido: hosting gratuito disparaba "precaución" solo por existir

Confirmado antes de corregir: de los 22 legítimos de hosting gratuito del
entrenamiento, **22 de 22** caían en "precaución" — incluida la landing del
propio proyecto (`pmc-landing-page-antes-de-abrir.vercel.app`). Después de
bajar el peso a 1: **17 de 22 quedan en "sin señales"**; los 5 restantes
(incluida la landing propia) combinan `hosting-gratuito` con
`direccion-poco-habitual` (subdominios largos y con muchos guiones) — dos
señales reales combinadas, no un disparo solitario. Entre los .co/.com.co
(147 en entrenamiento): 144 en "sin señales", 1 en "precaución", 2 en
"riesgo" (sin cambios relevantes de este paso).

## Control de fuga (confirmado)

- Las páginas caídas (`cached === null` o respuesta sin `ok`) nunca entran
  como ejemplos de `contrasena-sin-reputacion` ni de `otra-web-oculta`: esas
  dos señales solo se calculan dentro de `if (destination.checked)`
  (ver `build-verdict.ts`).
- `contrasena-sin-reputacion` compara el campo de contraseña **solo entre
  páginas que respondieron de verdad** (mismo `if` de arriba) — una página
  caída nunca "tiene" ni "no tiene" contraseña.
- Los umbrales y pesos se eligieron con validación cruzada **solo sobre
  entrenamiento** (`scripts/eval/grid-search-weights.ts`).

## Catálogo de marcas: la mejora medida en entrenamiento es optimista

`brands.ts` se amplió en el Paso 3.B mirando los fallos del **conjunto de
entrenamiento** (marcas como Roblox/Chase/Adobe/Spotify que aparecían ahí
sin catalogar). Por construcción, eso hace que la mejora de recall medida
en entrenamiento sea optimista: el catálogo "aprendió" exactamente de los
casos que fallaban ahí. **La cifra de referencia real es la del conjunto de
prueba (Paso 5), todavía no corrida.**

Conteo descriptivo sobre el conjunto de prueba (sin correr el motor
completo ni mirar resultados de precisión/recall — solo el matching
estático de marca, que no usa ninguna etiqueta): de 6088 casos de prueba,
**134 (2.2%) coinciden con una marca ya catalogada** (Google 66, Amazon 13,
Roblox 9, Facebook/TikTok 4 cada una, y 10 marcas más con 1-3 casos cada
una). **No se puede saber, sin revisar cada URL a mano, cuántos casos de
prueba mencionan una marca que NO está catalogada** — eso exigiría leer el
conjunto de prueba con el mismo criterio humano que el Paso 2 aplicó sobre
entrenamiento, y hacerlo antes del Paso 5 sería mirar el conjunto de prueba
para una decisión, justo lo que se quiere evitar. Se deja como limitación
explícita del Paso 5 cuando se corra.

## Qué sigue

Parado aquí, a la espera de la confirmación explícita para el Paso 5
(prueba única sobre el conjunto de prueba congelado).
