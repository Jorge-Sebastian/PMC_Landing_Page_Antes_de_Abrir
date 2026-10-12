# Paso 5 — resultado final (conjunto de prueba, una sola corrida)

Corrida única sobre `scripts/eval/data/datasets/test.jsonl` (6088 casos:
129 phishing, 5959 legítimos), nunca tocado hasta ahora. **No se reajustó
nada después de ver el resultado.** Script: `scripts/eval/final-test-run.ts`.

## Resultado vs. línea base (motor antes de esta iniciativa, commit `cf6e3ab`)

Intervalos de confianza de Wilson al 95% — con ~129 phishing en el
conjunto de prueba el margen es amplio, sobre todo en "riesgo" (60 casos).

| Umbral | Motor | TP | FP | Precisión | Recall (IC95%) | FPR (IC95%) |
|---|---|---|---|---|---|---|
| riesgo | antes | 30 | 132 | 18.5% | 23.3% [16.8%, 31.3%] | 2.2% [1.9%, 2.6%] |
| riesgo | **ahora** | 60 | 103 | 36.8% | **46.5% [38.1%, 55.1%]** | **1.7% [1.4%, 2.1%]** |
| riesgo+precaución | antes | 71 | 169 | 29.6% | 55.0% [46.4%, 63.4%] | 2.8% [2.4%, 3.3%] |
| riesgo+precaución | **ahora** | 89 | 141 | 38.7% | **69.0% [60.6%, 76.3%]** | **2.4% [2.0%, 2.8%]** |

El recall en "riesgo" casi se duplica (23.3%→46.5%) y la FPR **bajó** en
vez de subir (2.2%→1.7%), dentro del objetivo de 1-2% pedido para ese
umbral. La mejora medida en entrenamiento (Paso 4: 27.6%→50.6%) se mantiene
en el mismo orden en el conjunto de prueba — no se infló por sobreajuste.

## Honestidad del recall del seed vs. el banco real

El seed curado de 99 casos reporta recall de 87.5-92.3% en "riesgo". El
banco real da 46.5%. La diferencia es esperable y no contradictoria: el
seed se diseñó a mano para cubrir patrones conocidos; el banco real
(OpenPhish) trae campañas nuevas, hosting gratuito y marcas no
catalogadas que el seed no representa. El número de referencia honesto
para el proyecto es el del banco real: **46.5% en "riesgo", 69.0% si se
cuenta "precaución" como alerta también.**

## Desgloses

| Grupo | n | sin señales | precaución | riesgo |
|---|---|---|---|---|
| Legítimos hosting gratuito | 7 | 5 | 2 | 0 |
| Legítimos .co/.com.co | 60 | 58 | 0 | 2 |
| Phishing caído/sin respuesta | 18 | 8 | 4 | 6 |
| Phishing que respondió | 111 | 32 | 25 | 54 |

Los 2 `.co`/`.com.co` en "riesgo" (`maza18.co`, `bloomerang.co`) combinan
una redirección real con otra señal media (`dominio-nuevo` o `pide-datos`)
— no es un fallo del hosting gratuito, es el mismo patrón de
`otra-web-oculta` que ya se sabía imperfecto (ver limitaciones).

## Qué NO detecta este método (40 de 129 en "sin señales", +29 solo en "precaución")

| Categoría | Casos | % |
|---|---|---|
| Necesita revisión humana (marca no catalogada / solo en contenido) | 22 | 55.0% |
| Hosting gratuito sin ninguna otra pista | 11 | 27.5% |
| Página caída o sin respuesta real | 6 | 15.0% |
| Posible cascarón de JavaScript | 1 | 2.5% |

Ejemplos de "necesita revisión humana": `wbdrcw.com` (título "WEBULL",
marca no catalogada), `kidsgreenay.com/en/login` (título "Log In |
Binance", marca en el contenido, no en la URL), `mfacebook.com.vn/...`
(contenido real en vietnamita servido en un dominio con "facebook" pegado
— posible cloaking, no se puede confirmar sin abrir el enlace).

## Falsos positivos (141 de 5959, 2.4%)

| Señal(es) | Casos |
|---|---|
| `imitacion-marca` | 90 |
| `dominio-sospechoso` | 31 |
| `enlace-acortado` | 4 |
| Combinaciones menores | 16 |

`imitacion-marca` sigue siendo la categoría más grande, por el mismo
motivo que en entrenamiento: dominios reales de infraestructura/país no
catalogados (`amazon.dev`, `amazon.de`, `amazon.co.jp`, `youtube-nocookie.com`,
`cdn-apple.com`, `facebook.net`). Esto confirma la limitación de abajo: el
catálogo se amplió mirando entrenamiento, así que en un conjunto nuevo
siempre va a aparecer algo sin catalogar. `dominio-sospechoso`: sitios de
adultos/apuestas reales (no phishing) en TLD de la lista (`skybridge.click`,
`spankbang.party`, `filesdl.top`, `downloadpage.xyz`) — limitación ya
conocida desde el Paso 2.

## Qué se probó y se descartó

- **`marca-al-inicio-de-token`** (netflixcol.vercel.app): sobrevivió la
  validación cruzada en entrenamiento, pero rompía 2 casos del seed curado
  que la Fase 1 arregló a propósito (`mastercardiology-clinic.com`,
  `tiktokerscommunity-fanclub.com` — negocios reales cuyo nombre empieza
  igual que una marca). El entrenamiento no tenía ningún ejemplo de esa
  colisión; el seed sí. Descartada.
- **Título contra marca en host no oficial**: peor relación señal/ruido
  que las otras candidatas (+3.5pp de recall por +1.9pp de FPR en su
  subconjunto). Descartada.
- **Transposición de letras adyacentes** (`faecbook`): solo 2 ejemplos en
  todo el entrenamiento — insuficiente para validar con CV. Descartada por
  falta de datos, no porque esté mal.
- **Regresión logística** (`scripts/eval/fit-weights.ts`): los
  coeficientes para señales con pocos ejemplos positivos salían
  inestables; en un caso (`hosting-gratuito`) llevaban a un peso que
  violaba un requisito explícito (nunca alertar sola). Se reemplazó por
  una búsqueda pequeña de pesos enteros + validación cruzada
  (`scripts/eval/grid-search-weights.ts`).

## Limitaciones (léanse antes de confiar en los números de arriba)

- **El catálogo de marcas se amplió mirando los fallos del conjunto de
  ENTRENAMIENTO** (Paso 3.B). Eso hace que la mejora sea optimista por
  construcción: el catálogo "aprendió" de ahí. El número de referencia
  real es este reporte (prueba), no el de entrenamiento — y aun así, los
  falsos positivos de `imitacion-marca` en prueba (arriba) muestran que
  siempre va a faltar algo.
- **Las legítimas de Tranco son sitios grandes y establecidos.** La tasa
  real de falsos positivos en comercios pequeños o negocios con dominio
  joven puede ser mayor de lo que mide este banco — casi no hay ejemplos
  de eso en el conjunto legítimo.
- **El feed de OpenPhish es sobre todo de marcas globales** (Microsoft,
  Google, criptomonedas, bancos de EE.UU./Europa), no de bancos o
  comercios colombianos/latinoamericanos específicamente. El recall real
  contra phishing dirigido a la región puede ser distinto.
- **Páginas caídas, JavaScript y cloaking**: una página que ya no responde
  no se puede analizar por contenido; un cascarón de SPA no muestra texto
  real; y si un sitio le muestra contenido distinto al bot de `check-link`
  que a una persona real (cloaking), este método no tiene forma de
  detectarlo ni de descartarlo.

## Trabajo futuro (fuera de alcance de esta iniciativa)

- **Acortadores**: un enlace como `tinyurl.com/...` que termina en
  Wikipedia sigue dando "riesgo" solo por ser acortador — el acortador no
  debería pesar lo mismo si el destino resulta ser un sitio enorme y
  conocido. Requiere cambiar cómo se combina `enlace-acortado` con el
  resultado del destino.
- **Form action y campos sensibles**: `formActionHost`/`sensitiveFields`
  ya están en el contrato (`types.ts`) pero `check-link` todavía no los
  llena. Necesita una nueva versión de `check-link` y volver a consultar
  — para entonces buena parte del phishing de este banco ya estará caído.
- **Edad de dominio sin RDAP para `.co`**: el bootstrap de IANA no siempre
  tiene un servidor RDAP para `.co`, así que `dominio-nuevo` no se puede
  calcular para una parte de los dominios colombianos. Pendiente de
  investigar una fuente alternativa.

## No se corrió nada más después de este resultado

Ninguna señal, peso o umbral se tocó después de ver estos números.
