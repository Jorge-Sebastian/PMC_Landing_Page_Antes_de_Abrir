# Progreso del método de detección basado en datos

Seguimiento de la iniciativa "dejar de parchear casos sueltos y mejorar el
método con datos" (rama `fix/destino-y-marcas`). Para el detalle técnico de
cada paso, ver los reportes en `reports/` y `docs/CHANGELOG-algoritmo.md`.
Este documento es el estado general, no el detalle.

## Reglas que se mantienen en todo el proceso

- El conjunto de prueba (`scripts/eval/data/datasets/test.jsonl`) está
  congelado: ninguna decisión de catálogo, señal, peso o umbral se toma
  mirándolo. Se usa una sola vez, en el Paso 5.
- Ninguna decisión se justifica con una sola URL.
- Los archivos crudos del banco de datos (feed de OpenPhish, lista de
  Tranco, caché de consultas) nunca se suben a git — solo scripts,
  reportes agregados y el hash del conjunto de prueba.
- Cambios de contrato (`docs/CONTRATO.md`) siempre aditivos.

## Estado por paso

| Paso | Qué hace | Estado |
|---|---|---|
| 0 | Reglas y banco de datos (OpenPhish + Tranco, 70/30 por hash de dominio) | Hecho |
| 1 | Consultas en vivo a `check-link` (1097 URLs) | Hecho |
| 2 | Análisis de errores sobre entrenamiento (`reports/analisis-errores.md`) | Hecho |
| 3.A | Desglose de pistas en phishing de hosting gratuito | Hecho |
| 3.B | Ampliación de `brands.ts` con marcas/dominios verificados | Hecho |
| 3.C | Señales candidatas con validación cruzada (`reports/candidatas-paso3c.md`) | Hecho |
| 4 | Pesos y umbrales (`reports/final-paso4.md`) | Hecho — **parado aquí, a la espera de OK** |
| 5 | Prueba única sobre el conjunto de prueba congelado | **No iniciado** |
| 6 | Push + PR (sin merge) | Rama pusheada; PR pendiente |

## Resumen de lo que cambió el catálogo/motor hasta el Paso 4

- `brands.ts`: +6 marcas nuevas (Roblox, Chase, Adobe, Spotify, Rackspace,
  Twitter/X) y dominios de país/infraestructura verificados para Amazon,
  Google, Microsoft, Apple, Airbnb, Santander, Correos, Telefónica,
  Binance, Steam, WhatsApp, Spotify, TikTok.
- Señales nuevas: `hosting-gratuito` (peso 1), `contrasena-sin-reputacion`
  (peso 1). Una tercera candidata, `marca-al-inicio-de-token`, se probó y
  se **descartó** el 2026-10-12: rompía casos reales del seed curado
  (negocios cuyo nombre empieza igual que una marca). El entrenamiento no
  tenía ningún ejemplo de esa colisión.
- `otra-web-oculta`: bajó de peso 3 a 1 y ya no cuenta en redirecciones
  www/apex o entre dos dominios oficiales de la misma marca.
- `DANGER_SCORE` (umbral de "riesgo"): bajó de 6 a 3, elegido con una
  búsqueda pequeña de enteros + validación cruzada en entrenamiento
  (`scripts/eval/grid-search-weights.ts`), no con una regresión completa.

## Hallazgo importante del 2026-10-12

La primera versión del Paso 4 puso `hosting-gratuito` en peso 2 — igual al
`CAUTION_SCORE` de entonces — así que cualquier sitio en hosting gratuito
salía en "precaución" solo por vivir ahí, sin ninguna otra señal. Se
confirmó en los 22 legítimos de hosting gratuito del entrenamiento:
los 22 caían en "precaución", incluida la landing del propio proyecto
(`pmc-landing-page-antes-de-abrir.vercel.app`). Se corrigió bajando el peso
a 1 (ver tabla en `reports/final-paso4.md`).

## Qué falta antes de poder cerrar la iniciativa

1. Paso 5: correr el motor UNA VEZ sobre el conjunto de prueba congelado,
   con el OK explícito del equipo (todavía no se dio).
2. Paso 6: abrir el PR (la rama ya está pusheada) y esperar revisión antes
   de cualquier merge.
