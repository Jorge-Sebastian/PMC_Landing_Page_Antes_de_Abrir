# Antes de Abrir — Pipeline del analizador de enlaces y análisis crítico

> Documento de referencia sobre cómo funciona hoy el flujo de análisis de enlaces de la aplicación, qué comprobaciones hace exactamente, y una evaluación crítica de qué funciona bien, qué no, y cómo mejorarlo.
>
> Copiado dentro del repositorio (`docs/`) el 2026-10-10 para que sirva de referencia compartida en la rama `samuel`. El motor descrito aquí es el estado **anterior** a las fases de `docs/CHANGELOG-algoritmo.md`; donde ambos documentos no coincidan, el changelog es la fuente de verdad más reciente.

---

## 1. Resumen del pipeline

```
Usuario pega texto/URL
        │
        ▼
┌───────────────────────┐
│ 1. Extracción y        │  extract-url.ts
│    normalización       │  normalize-input.ts
└───────────────────────┘
        │  (URL válida http/https)
        ▼
┌───────────────────────┐
│ 2. Análisis estático    │  analyze-url.ts
│    (en el dispositivo,  │  brands.ts / signals.ts
│    sin red)             │
└───────────────────────┘
        │  señales de la dirección
        ▼
┌───────────────────────┐
│ 3. Comprobación del     │  check-destination.ts (cliente)
│    destino real         │  supabase/functions/check-link (servidor)
│    (red, backend)       │
└───────────────────────┘
        │  señales del destino
        ▼
┌───────────────────────┐
│ 4. Veredicto final      │  build-verdict.ts
│    (riesgo/precaución/  │
│    sin señales)         │
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ 5. Presentación         │  analysis-result.tsx
│                         │  risk-signal-card.tsx
└───────────────────────┘
```

El motor vive en `src/lib/link-analysis/` y es invocado desde `src/pages/home/link-analyzer.tsx`, que es el componente de UI principal.

---

## 2. Paso a paso detallado

### 2.1 Entrada: pegar texto o URL

Archivo: `src/pages/home/link-analyzer.tsx`

- El usuario escribe/pega en un `<input>` o usa el botón "Pegar" (`navigator.clipboard.readText()`).
- Se admite pegar el **mensaje completo** (WhatsApp, SMS, Instagram) y no solo la URL pelada — la extracción se encarga de sacar el enlace de ese texto.
- Mientras se analiza, se fuerza un retraso mínimo de 400 ms (`delay(400)`) junto con la llamada real, para que el estado "analizando" no parpadee en la interfaz aunque la respuesta sea instantánea.

### 2.2 Extracción del candidato de URL

Archivo: `src/lib/link-analysis/extract-url.ts`

1. `findDisallowedScheme` busca cualquier esquema tipo `algo://` en el texto. Si existe y **no** es `http`/`https` (p. ej. `javascript:`, `ftp:`, `tel:`), se rechaza de inmediato como error de tipo `scheme`.
2. `extractUrlCandidate` intenta, en orden:
   - Encontrar una URL completa con esquema (`https?:\/\/...`).
   - Si no hay, buscar un **dominio "pelado"** sin esquema (`algo.com/ruta`).
3. `stripTrailingPunctuation` quita signos de puntuación que suelen pegarse al final de una frase (`.`, `,`, `)`, `"`, etc.), para no romper el parseo de la URL.

### 2.3 Normalización

Archivo: `src/lib/link-analysis/normalize-input.ts`

- Si el texto está vacío → error `empty`.
- Si no se pudo extraer ningún candidato → error `noLink`.
- Si el candidato no tenía `http://`/`https://`, se le agrega `https://` automáticamente (`assumedHttps`).
- Si la URL resultante supera **2048 caracteres** → error `tooLong` (mismo límite que usa el backend).
- Se valida con el `URL` nativo del navegador: solo se aceptan protocolos `http`/`https`, y el host debe tener un punto (dominio) o ser una IP válida (`isIpHost`).

> En este punto la app ya tiene una `URL` parseada y válida, o ya mostró un mensaje de error y se detuvo. **Nada de lo anterior toca la red.**

### 2.4 Análisis estático del enlace (sin red)

Archivo: `src/lib/link-analysis/analyze-url.ts` — usa catálogos de `brands.ts`

Esta es la parte "gratis" en términos de cómputo: se ejecuta en el navegador del usuario, no llama a ningún servidor. Evalúa **12 pruebas** sobre el texto de la URL y acumula señales (cada señal tiene un peso 1, 2 o 3 definido en `signals.ts`):

| # | Prueba | Qué detecta | Peso |
|---|--------|--------------|------|
| 1 | `direccion-numerica` | El host es una IP (`123.45.67.89`) en vez de un nombre | 3 |
| 2 | `caracteres-enganosos` | Punycode (`xn--`), caracteres no ASCII, o patrón letra-número-letra en el nombre | 3 |
| 3 | `imitacion-marca` | El dominio no es oficial de una marca conocida pero contiene su nombre/variante (comparación por tokens + distancia de Levenshtein) | 3 |
| 4 | `pide-datos` | Menciona contraseñas/datos bancarios — **solo cuenta si ya hay otra señal** | 3 |
| 5 | `archivo-descarga` | La ruta termina en `.apk`, `.exe`, `.msi`, `.docm`, etc. | 3 |
| 6 | `dominio-sospechoso` | El TLD está en la lista de terminaciones usadas en fraudes (`.xyz`, `.top`, `.click`...) | 2 |
| 7 | `enlace-acortado` | El dominio es un acortador conocido (`bit.ly`, `tinyurl.com`...) | 2 |
| 8 | `palabras-de-presion` | Contiene palabras como "urgente", "bloqueado", "premio", "gratis" | 2 |
| 9 | `sin-conexion-segura` | El protocolo es `http:` en vez de `https:` | 2 |
| 10 | `subdominios-extranos` | Tiene 2 o más subdominios antes del nombre principal | 2 |
| 11 | `direccion-manipulada` | Usuario en la URL (`user@host`), puerto no estándar, o parámetro que redirige a otra URL oculta (`?redirect=http://...`) | 2 |
| 12 | `direccion-muy-larga` / `direccion-poco-habitual` | URL > 120 caracteres, muchos `%XX` codificados, o nombre con muchos guiones/dígitos | 1 |

**Cómo se parsea el dominio** (`splitHost`): separa el host en `core` (nombre principal), `suffix` (terminación, soporta sufijos de dos partes como `.com.ar`, `.co.uk` mediante una lista manual) y `subdomains`. Este resultado alimenta casi todas las demás pruebas.

**Detección de imitación de marca** (`detectBrandImitation`): compara el `core` del dominio y el resto de la URL contra ~40 marcas conocidas (bancos, redes sociales, paqueterías, mayormente de LatAm y España) definidas en `brands.ts`. Usa:
- Coincidencia exacta o por substring del nombre de la marca.
- Distancia de Levenshtein (≤2) para variantes tipo `paypa1`, `netfl1x`, `instagrarn`.
- Si el dominio **es** uno de los dominios oficiales listados (`isOfficialHost`), nunca se marca como imitación.

### 2.5 Comprobación del destino real (red, backend)

Archivo cliente: `src/lib/link-analysis/check-destination.ts`
Archivo servidor: `supabase/functions/check-link/index.ts` (Edge Function de Supabase)

El cliente llama a la función `check-link` con un timeout propio de **9 segundos** (si se excede, se trata como "no comprobado", nunca como "seguro").

En el servidor:
1. Valida la URL (protocolo, longitud) y **bloquea de entrada** hosts peligrosos: `localhost`, `.internal`, `.local`, `.lan`, `.home`, y cualquier IP privada/loopback/link-local (protección contra SSRF).
2. Sigue las redirecciones **manualmente** (no deja que `fetch` las siga solo), hasta **5 saltos**, con **6 segundos** de timeout por salto, revalidando en cada salto que el nuevo host no sea uno bloqueado.
3. Lee como máximo 64 KB del HTML de la respuesta final (solo si el `content-type` es HTML).
4. Extrae de ese HTML: el `<title>` y si existe algún `<input type="password">`.
5. Devuelve: si fue alcanzable, código de estado HTTP, URL final, lista de redirecciones, si el host final es distinto al original (`differentHost`), el título y si pide contraseña — **nunca el contenido completo de la página**.
6. No guarda nada, no ejecuta JavaScript de la página, no hace de proxy de contenido.

Si cualquier paso falla (red, timeout, host bloqueado, respuesta inválida), se devuelve `checked: false` con un motivo, y la app **no inventa un resultado**.

> **Limitación conocida (no corregida en este documento original):** el bloqueo de hosts privados/locales se hace por el texto del hostname, no por la IP a la que resuelve el DNS. Ver `docs/CHANGELOG-algoritmo.md` para el detalle y el arreglo sugerido (DNS rebinding).

### 2.6 Construcción del veredicto

Archivo: `src/lib/link-analysis/build-verdict.ts`

1. Se ejecuta de nuevo el análisis estático (paso 2.4) sobre la URL.
2. Si el destino se pudo comprobar:
   - Host final distinto al original → señal `otra-web-oculta` (peso 3).
   - No alcanzable (error HTTP) → señal `destino-no-responde` (peso 2).
   - Si pide contraseña **y** ya había alguna señal fuerte o el host cambió → señal `pide-datos` (peso 3).
3. Se suman los pesos de todas las señales (`score`) y se evalúa:
   - Si hay **al menos una señal de peso 3**, o `score ≥ 6` → **`riesgo`**
   - Si `score ≥ 2` → **`precaución`**
   - En cualquier otro caso → **`sin-senales`** (nunca "seguro")

### 2.7 Presentación del resultado

Archivos: `src/pages/home/analysis-result.tsx`, `risk-signal-card.tsx`

- Cada nivel (`riesgo` / `precaución` / `sin-senales`) tiene su propio color, ícono y texto (vía i18n).
- Se listan todas las señales encontradas, cada una con su título y explicación en lenguaje llano, ordenadas por peso (las más fuertes primero).
- Hay un aviso de confianza (`trust-notice.tsx`) que explica qué hace la herramienta y qué no promete.

---

## 3. Análisis crítico

### 3.1 Qué funciona bien

- **Comunicación de riesgo honesta**: nunca dice "esto es seguro", solo "no se encontraron señales". Evita la falsa sensación de seguridad, que es el error más peligroso en herramientas de este tipo.
- **No sube de confianza por falta de datos**: si el destino no se pudo comprobar, eso nunca mejora el veredicto.
- **Separación de costos**: el análisis estático (gratis, sin red) filtra antes de llegar a la parte cara (seguir redirecciones, leer HTML).
- **Protección SSRF real** en el backend: bloquea IPs privadas y hosts internos antes de cada petición, incluso después de cada salto de redirección (con la limitación de DNS rebinding ya anotada).
- **Sigue redirecciones manualmente** con límite de saltos y timeout — evita colgarse con cadenas de redirección maliciosas o infinitas.
- **Detección de typosquatting** vía Levenshtein es una técnica razonable para variantes simples de un dominio conocido (`paypa1`, `netfl1x`).
- **Privacidad del request**: el backend no guarda nada, no actúa como proxy de contenido, y solo devuelve metadatos mínimos.

### 3.2 Qué no funciona bien

**Falsos positivos estructurales (el problema más serio)**

- `detectBrandImitation` usa `value.includes(keyword)` — es coincidencia por **substring**, no por palabra completa. Cualquier dominio legítimo que contenga el string de una marca se marca como imitación (p. ej. dominios que contienen "apple", "visa" o "ups" como parte de otra palabra).
- La distancia de Levenshtein (≤2) se aplica también a palabras comunes del idioma que casualmente quedan cerca de una marca (ej. "looking" vs "booking", distancia 1) — ver `docs/CHANGELOG-algoritmo.md` para un caso real encontrado por el banco de pruebas (`scripts/eval/`).
- El patrón `[a-z]\d+[a-z]` para "caracteres engañosos" marca como sospechoso cualquier nombre con patrón letra-número-letra, común en marcas reales actuales (`web3`, `f1`, `g2`).
- `PRESSURE_WORDS` incluye palabras cotidianas de comercio/logística legítimos ("pago", "envío", "descuento", "factura"). Una tienda real con esas palabras en la URL ya cae en "precaución" solo por eso.
- `SUSPICIOUS_TLDS` incluye gTLDs genéricos hoy usados por negocios reales (`.bar`, `.fit`, `.beauty`, `.skin`, `.homes`). Cualquier negocio legítimo con uno de estos dominios queda marcado como sospechoso.
- La lista de sufijos de dos partes (`MULTI_PART_SUFFIXES`) es manual e incompleta (no usa la Public Suffix List real); cualquier ccTLD no listado se parsea mal, lo que contamina en cascada otras pruebas.

**Riesgos operativos en el backend**

- La función de backend es pública, sin autenticación y sin límite de peticiones (`verify_jwt = false`, CORS abierto a `*`). Cualquiera puede llamarla directamente, no solo desde la página.
- En el peor caso, una sola petición puede tardar hasta ~36 segundos en el servidor (6 saltos × 6s), mientras el cliente ya se rindió a los 9s — trabajo desperdiciado y potencial vector de abuso/costo, sin límite de concurrencia.
- No hay caché: la misma URL (viral, maliciosa o no) se vuelve a resolver por completo en cada análisis de cada usuario.

**Limitaciones de detección**

- Solo busca `<input type="password">` en el HTML crudo del servidor. La mayoría del phishing moderno usa aplicaciones de una sola página (React/Vue) que renderizan el formulario con JavaScript — como no hay motor JS en el backend, esto falla en gran parte de los casos reales.
- No se ejecuta JavaScript, por lo que redirecciones hechas en el cliente (cloaking) no se detectan.
- Los umbrales de puntaje (`DANGER_SCORE = 6`, `CAUTION_SCORE = 2`) parecen fijados a mano. El banco de pruebas en `scripts/eval/` ahora permite medirlos contra un dataset en vez de confiar solo en la intuición.

### 3.3 Cómo mejorarlo

Ver el plan de fases y las decisiones tomadas en `docs/CHANGELOG-algoritmo.md` y `docs/CONTRATO.md`.
