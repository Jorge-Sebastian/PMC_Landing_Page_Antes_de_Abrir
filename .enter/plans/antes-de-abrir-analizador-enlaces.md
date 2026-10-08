# Antes de Abrir — analizador de enlaces sospechosos

## Contexto

Hoy el proyecto es la plantilla vacía de Vite + React + TS + shadcn/ui: `src/pages/Index.tsx` solo muestra dos textos de ejemplo, el i18n está configurado en inglés/chino y no hay backend conectado.

El objetivo es convertir esa pantalla en una aplicación real y en español para adultos de 40+, cuyo protagonista sea la herramienta de análisis de enlaces (no una landing comercial). Al entrar, en menos de 5 segundos el usuario debe entender qué hace, dónde pegar el enlace y qué pasará al pulsar «Analizar enlace». La promesa es reducir la incertidumbre antes de abrir un enlace recibido por WhatsApp, SMS o Instagram, sin registrarse y sin lenguaje técnico.

## Decisiones confirmadas con el usuario

- **Nombre del producto:** «Antes de Abrir».
- **Profundidad del análisis:** señales del propio enlace calculadas en el navegador **+ comprobación real del destino en el servidor** (redirecciones, si el sitio responde, título de la página, si pide contraseña). Requiere activar el backend.
- **Footer:** «Cómo funciona» y «Consejos de seguridad» como anclas de la misma página; «Privacidad» y «Contacto» como rutas simples.
- **Idioma:** español único, sin selector de idioma.
- **Sin registro, sin base de datos:** los análisis no se guardan. El enlace se envía al servidor solo para comprobar a dónde lleva; se dice así en la sección de transparencia.

## Arquitectura del análisis

Flujo único (`src/pages/home/link-analyzer.tsx`):

1. El usuario pega un enlace, o el mensaje completo de WhatsApp/SMS (se extrae la primera URL del texto).
2. `normalizeInput()` valida y normaliza: añade `https://` si falta el protocolo y parece un dominio; rechaza vacío, texto sin enlace y protocolos no `http(s)`.
3. Se calculan las señales locales al instante (`analyze-url.ts`) y se muestra «Analizando…».
4. En paralelo se llama a la función de backend `check-link` y su resultado (dominio final, redirecciones, si responde, formulario de contraseña) se añade como señales.
5. `buildVerdict()` combina todo y devuelve nivel, explicación corta, lista de señales y recomendación.
6. Si la comprobación del destino falla o tarda demasiado, se muestran igualmente las señales del enlace, con un aviso «No pudimos comprobar a dónde lleva en este momento» y **nunca** un nivel más favorable que el verificado.

### Catálogo de señales (`src/lib/link-analysis/signals.ts`)

Texto en español dentro del módulo (no en `es.json`): los identificadores son dinámicos y el skill de i18n prohíbe construir claves `t()` dinámicas.

| id | Título mostrado | Peso | Cuándo se activa |
|---|---|---|---|
| `imitacion-marca` | Posible imitación de una página conocida | 3 | Aparece una marca/banco conocido en el subdominio o la ruta, pero el dominio real no es el suyo, o el dominio se parece peligrosamente al oficial (`whatsapp-verificacion-cuenta`, `paypa1`) |
| `caracteres-engañosos` | Uso de caracteres engañosos | 3 | Dominio en punycode (`xn--`) o con caracteres no latinos que imitan letras, o dígitos sustituyendo letras (`g00gle`, `paypa1`) |
| `direccion-numerica` | Dirección numérica en lugar de un nombre | 3 | El host es una dirección IP (`http://45.12.8.3/login`) |
| `pide-datos` | El enlace pide datos o contraseñas | 3 | Palabras en dominio/ruta tipo `password`, `clave`, `banco`, `tarjeta`, `cuenta`, `login` + combinación con otras señales, o el destino final tiene campo de contraseña |
| `archivo-descarga` | El enlace descarga un archivo | 3 | Termina en `.apk`, `.exe`, `.scr`, `.msi`, `.zip` |
| `otra-web-oculta` | Lleva a otra web distinta | 3 | (backend) El dominio final no coincide con el dominio que muestra el enlace |
| `dominio-sospechoso` | Dominio sospechoso | 2 | Terminación poco habitual: `.xyz`, `.top`, `.click`, `.tk`, `.gq`, `.cf`, `.work`, `.loan`, `.rest`, `.icu`, `.buzz`, `.cyou`, `.monster`… |
| `enlace-acortado` | Enlace acortado | 2 | `bit.ly`, `tinyurl.com`, `t.co`, `goo.gl`, `ow.ly`, `cutt.ly`, `rb.gy`, `is.gd`, `shorturl.at`… |
| `palabras-de-presion` | Palabras que buscan alarmarte o premios | 2 | `bloquead`, `urgente`, `suspend`, `verific`, `reclam`, `premio`, `sorteo`, `gratis`, `ganaste`, `paquete`, `pago pendiente`, `factura` |
| `sin-conexion-segura` | Conexión no segura | 2 | El enlace empieza por `http://` (se explica sin la palabra SSL) |
| `subdominios-extranos` | Dirección con demasiadas partes | 2 | 4 o más niveles antes del dominio, o marca + guiones en el subdominio (`banco.com.verificacion-login.ru`) |
| `destino-no-responde` | El destino no responde | 2 | (backend) El sitio no responde, o responde con error de servidor |
| `direccion-manipulada` | Dirección manipulada | 2 | Contiene `@`, puerto no habitual (`:8080`, `:8843`) o parámetros de redirección (`url=`, `redirect=`, `next=`) hacia otro dominio |
| `direccion-muy-larga` | Dirección muy larga y enrevesada | 1 | Más de 120 caracteres o más del 30 % de caracteres codificados (`%2F`) |
| `muchos-guiones-numeros` | Dirección poco habitual | 1 | Muchos guiones o números en el dominio, o dominio con más de 30 caracteres |

**Niveles** (`buildVerdict()`):
- `riesgo` — «Se detectaron señales de riesgo»: alguna señal de peso 3 o suma ≥ 6.
- `precaucion` — «Requiere precaución»: suma 2–5.
- `sin-senales` — «No se detectaron señales evidentes de riesgo»: suma 0–1.
- Error de entrada (texto sin enlace, vacío, protocolo no permitido) → mensaje en el propio campo, no un nivel.

Nunca se afirma que un enlace sea seguro: `sin-senales` incluye «Esto no significa que el enlace sea seguro».

### Backend: función `check-link`

- Archivo: `supabase/functions/check-link/index.ts`; entrada `{ url }`, salida `{ reachable, status, finalUrl, finalHost, redirects[], differentHost, title, hasPasswordField, error? }`.
- `Deno.serve` + CORS con `OPTIONS` atendido antes de cualquier trabajo; importaciones externas solo desde `esm.sh`.
- Sigue redirecciones a mano (`redirect: "manual"`, máximo 5 saltos, 6 s por salto con `AbortSignal.timeout`), y recoge la cadena de saltos.
- Si el HTML final ocupa menos de 64 KB, extrae solo el `<title>` y si hay `<input type="password">`; nunca devuelve el HTML completo ni hace de proxy.
- Protecciones: solo `http`/`https`, máximo 2048 caracteres, se bloquean `localhost`, `.local`, `.internal` y direcciones privadas/reservadas (10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x, ::1, fc00::/7).
- Sin SQL, sin escrituras, sin secretos, sin claves propias: el usuario no tiene que aportar ninguna clave.
- Endpoint público sin registro: añadir en `supabase/config.toml` `[functions.check-link]` con `verify_jwt = false` antes de desplegar.
- Cliente: `supabase.functions.invoke("check-link", { body: { url } })` desde `src/lib/link-analysis/check-destination.ts`, usando el cliente que genere la activación del backend (`@/integrations/supabase/client`), sin editar ese archivo.

## Diseño y sistema de diseño

Estética clara, tranquila y minimalista de startup tecnológica (nada de negro, Matrix, neón verde, calaveras ni candados gigantes).

- `src/index.css`: paleta azul-aguamarina en `:root` — fondo `200 40% 98%`, texto `215 45% 15%`, primario `199 78% 30%`, acento/superficies suaves en 190-205, `--radius: 1rem`. Tokens nuevos: `--risk-safe 168 62% 30%`, `--risk-caution 28 85% 34%`, `--risk-danger 0 68% 40%` con sus variantes `-soft` (95 % de luminosidad) y `-foreground`, usadas **solo** para comunicar el resultado. Gradiente de hero muy sutil, sombras suaves (`--shadow-soft`, `--shadow-card`) y `--transition-smooth`. Bloque `.dark` actualizado en paralelo. Base tipográfica: 17 px, línea 1.65, y animaciones desactivadas con `prefers-reduced-motion`.
- `tailwind.config.ts`: exponer `risk.{safe,caution,danger}` (+ `soft`, `foreground`), `fontFamily.sans` desde variable, `boxShadow.soft/card/elevated`, `borderRadius` ampliado y keyframe `fade-up` suave.
- `index.html`: `lang="es"`, título y descripción en español, fuente Inter (`display=swap`, los `preconnect` ya existen).
- Componentes shadcn personalizados: `button.tsx` (nuevo `size: "xl"` de 56 px y variante `hero` con gradiente y sombra suave), `input.tsx` (altura 56 px, `text-lg`, `rounded-xl`, anillo de foco visible), `card.tsx` (esquinas `rounded-2xl`, borde tenue, sombra sutil).

Secciones (todas en la página principal, en este orden): hero con título/subtítulo y la herramienta; resultado del análisis; «¿Cómo funciona?» (3 pasos con iconos de `lucide-react` — `ClipboardCopy`, `SearchCheck`, `CircleCheckBig`); casos de uso (4 tarjetas con los textos pedidos, iconos `Landmark`, `Truck`, `Instagram`, `LogIn`); «Antes de abrir un enlace, revisa estas señales» (5 tarjetas con `AlarmClock`, `UserCheck`, `KeyRound`, `Globe`, `HelpCircle`); confianza y transparencia; footer minimalista con logotipo, anclas y rutas. Cero testimonios, cifras, logos de terceros, precios o promesas.

## Accesibilidad y responsive (móvil primero)

- Etiqueta visible en el campo, texto de ayuda «No necesitas abrir el enlace para analizarlo», `inputMode="url"`, `spellCheck={false}`; botón de 56 px a ancho completo en móvil con texto «Analizar enlace».
- Botón secundario «Pegar enlace» que usa `navigator.clipboard.readText()` y desaparece si el navegador no lo permite (con instrucción alternativa «mantén pulsado el campo y elige Pegar»).
- Resultado en una región `role="status"` con `aria-live="polite"` y foco movido al título del resultado; nivel indicado con texto + icono (nunca solo color); botón «Analizar otro enlace».
- Contraste AA garantizado por los tokens (nunca texto claro sobre `-soft` claro), cuerpo nunca por debajo de 16 px, áreas táctiles ≥ 44 px, sin funciones importantes escondidas tras iconos: todo botón lleva texto.
- Recorrido móvil sin pasos extra: mensaje recibido → copiar → abrir la web → pegar → analizar → entender el resultado. Cabecera sin menú hamburguesa: logotipo, dos anclas y botón «Analizar un enlace».

## i18n en español único (skill `enter_i18n`)

- `i18n.config.json`: `fallbackLng: "es"` y una sola entrada `{ code: "es", label: "Español", detect: ["es"], dir: "ltr" }`.
- Crear `public/locales/es.json` con claves planas `dotted camelCase`; retirar `public/locales/en.json` y `public/locales/zh-CN.json` (una lengua no declarada en el manifiesto hace fallar la validación).
- Claves nuevas cubren: nav, hero, analizador (etiqueta, placeholder, botón, ayuda, errores, avisos), resultado (títulos de los 3 niveles, explicaciones, recomendación, a dónde lleva, botón de repetir, aviso legal), cómo funciona, casos de uso, consejos, transparencia, footer, privacidad, contacto y las ya existentes `notFound.*`.
- Se conserva `src/components/language-switcher.tsx` sin renderizar (infraestructura de la plantilla) y no se toca `src/i18n/*.ts`.

## Archivos

**Backend:** `supabase/config.toml`, `supabase/functions/check-link/index.ts`.

**Motor de análisis:** `src/lib/link-analysis/{types.ts,brands.ts,signals.ts,analyze-url.ts,extract-url.ts,normalize-input.ts,build-verdict.ts,check-destination.ts}`.

**Componentes y páginas:** `src/components/layout/{site-header.tsx,site-footer.tsx}`, `src/pages/home/{index.tsx,hero-section.tsx,link-analyzer.tsx,analysis-result.tsx,risk-signal-card.tsx,how-it-works.tsx,use-cases.tsx,safety-tips.tsx,trust-notice.tsx}`, `src/pages/privacidad/index.tsx`, `src/pages/contacto/index.tsx`.

**Modificar:** `src/router.tsx` (rutas `/`, `/privacidad`, `/contacto` con nombres semánticos), `src/pages/Index.tsx` → se sustituye por `src/pages/home/index.tsx`, `src/index.css`, `tailwind.config.ts`, `src/components/ui/{button,input,card}.tsx`, `index.html`, `i18n.config.json`, `CodeGuideline.md` (estructura de carpetas, según la regla del propio documento).

## Verificación

- `pnpm check` (lint + `tsc --noEmit`) y `pnpm build`.
- `node /workspace/.agents/skills/enter_i18n/assets/scripts/check-i18n.mjs` → «i18n check passed.» y `.../scan-i18n.mjs` sin errores.
- Capturas en móvil 390 px y escritorio 1280 px de la misma ruta: la herramienta con su campo y botón queda visible en la primera pantalla móvil.
- Casos de prueba del analizador: `http://whatsapp-verificacion-cuenta.xyz/login?user=1` (riesgo), `https://bit.ly/abc123` (precaución), `https://www.mercadolibre.com` (sin señales), `hola` / campo vacío / `ftp://sitio.com` (error de entrada), `http://45.12.8.3/login` (riesgo, dirección numérica), texto completo de un mensaje con enlace dentro (se extrae la URL).
- Comprobación real del destino con un enlace acortado conocido y con un dominio inexistente; y el caso de fallo (backend no disponible) mostrando igualmente el resultado con el aviso.
- Consola del navegador sin errores (`get_console_logs`) y recorrido con teclado: foco visible, `Enter` analiza, foco salta al resultado.

## Implementation checklist

- [x] Activar el backend del proyecto (`supabase_enable`) antes de escribir código de servidor.
- [x] Crear `supabase/functions/check-link/index.ts` con `Deno.serve`, CORS + `OPTIONS`, validación `http(s)`, bloqueo de hosts privados, máximo 5 redirecciones y 6 s por salto.
- [x] Devolver del backend solo `reachable`, `status`, `finalUrl`, `finalHost`, `redirects`, `differentHost`, `title`, `hasPasswordField`; nunca HTML completo ni escrituras.
- [x] Añadir `[functions.check-link] verify_jwt = false` en `supabase/config.toml` y desplegar con `supabase_deploy_edge_function`.
- [x] Crear `src/lib/link-analysis/signals.ts` con las 15 señales (id, título en español, explicación corta y peso) y su umbral por nivel.
- [x] Crear `normalize-input.ts`: añade `https://` cuando falta, y devuelve error para vacío, texto sin enlace o protocolo distinto de `http(s)`.
- [x] Crear `extract-url.ts` para obtener la primera URL de un mensaje pegado y `analyze-url.ts` para evaluar todas las señales del enlace sin red.
- [x] Crear `build-verdict.ts`: peso 3 o suma ≥ 6 → riesgo; 2–5 → precaución; 0–1 → sin señales; nunca un nivel mejor cuando el destino no pudo comprobarse.
- [x] Crear `check-destination.ts` que llame a `check-link` con `supabase.functions.invoke` y traduzca su respuesta a señales (`otra-web-oculta`, `destino-no-responde`, `pide-datos`).
- [x] Crear `link-analyzer.tsx` con los estados vacío / analizando / resultado / error, incluido el botón «Pegar enlace» y el aviso cuando la comprobación del destino falla.
- [x] Crear `analysis-result.tsx` con los tres niveles: nivel visible, explicación corta, señales encontradas, recomendación y «Analizar otro enlace».
- [x] Redactar las recomendaciones de cada nivel (riesgo: no abrir, no introducir contraseñas ni datos bancarios; precaución: solo si esperas ese mensaje; sin señales: aviso de que no garantiza seguridad).
- [x] Añadir en el resultado, siempre, el aviso de que ningún análisis garantiza que un enlace sea completamente seguro.
- [x] Cartera de tokens en `src/index.css` (azul-aguamarina + `risk.safe/caution/danger`, sombras suaves, radio 1 rem, base 17 px, `prefers-reduced-motion`).
- [x] Exponer en `tailwind.config.ts` los tokens de riesgo, sombras, fuente y animación `fade-up`.
- [x] Personalizar `button.tsx` (tamaño `xl` de 56 px y variante `hero`), `input.tsx` (56 px, `text-lg`) y `card.tsx` (`rounded-2xl`, sombra sutil).
- [x] Construir `site-header.tsx` y `site-footer.tsx` con logotipo «Antes de Abrir», anclas a «Cómo funciona» y «Consejos de seguridad», y rutas de Privacidad y Contacto.
- [x] Construir las secciones `hero-section`, `how-it-works` (3 pasos), `use-cases` (4 casos), `safety-tips` (5 tarjetas), `trust-notice` con los textos exactos solicitados.
- [x] Crear `src/pages/privacidad/index.tsx` y `src/pages/contacto/index.tsx` (contenido breve en español, sin formularios que no envían nada) y registrarlas en `src/router.tsx`.
- [x] Eliminar `src/pages/Index.tsx` tras mover la ruta `/` a `src/pages/home/index.tsx`.
- [x] Dejar `i18n.config.json` con `es` como única lengua y `public/locales/es.json` con todas las claves usadas por `t()`; retirar `en.json` y `zh-CN.json`.
- [x] Actualizar `index.html` (`lang="es"`, título, descripción, fuente) y `CodeGuideline.md` con las carpetas y páginas nuevas.

## Verification checklist

- [x] `pnpm check` termina sin errores de lint ni de `tsc`.
- [x] `pnpm build` termina correctamente sobre el árbol de trabajo.
- [x] `check-i18n.mjs` imprime «i18n check passed.» y `scan-i18n.mjs` no reporta errores (todas las claves `t()` usadas existen y no hay ficheros de idioma sin declarar).
- [x] Positivo: `http://whatsapp-verificacion-cuenta.xyz/login?user=1` → nivel «Se detectaron señales de riesgo» con las señales de imitación de marca, dominio sospechoso y conexión no segura.
- [x] Positivo: `https://bit.ly/xyzabc` → resultado real observado: «Se detectaron señales de riesgo» (enlace acortado + «Lleva a otra web distinta»), porque el enlace acortado de prueba redirige de verdad a otro dominio.
- [x] Positivo (backend): un enlace real que redirige a otro dominio produce la señal «Lleva a otra web distinta» y muestra el dominio final en texto.
- [x] Negativo por defecto: `https://www.mercadolibre.com` → «No se detectaron señales evidentes de riesgo», con el aviso de que eso no garantiza que sea seguro.
- [x] Negativo: campo vacío, `hola` (sin enlace) y `ftp://sitio.com` muestran mensajes de ayuda claros y **no** generan un nivel de riesgo.
- [x] Límite: entrada de más de 2048 caracteres se rechaza con un mensaje claro y el backend rechaza la misma entrada.
- [x] Límite: host privado (`http://192.168.0.1/admin`) no se solicita nunca desde el backend y el resultado no mejora por ello.
- [x] Límite: si `check-link` falla o expira, el resultado se muestra con el aviso «No pudimos comprobar a dónde lleva» y sin bajar el nivel.
- [ ] Teclado y lector: `Enter` analiza, el foco es visible en campo y botón, y el foco salta al título del resultado con `aria-live` anunciando el nivel. (Pendiente de comprobar a mano en el navegador: implementado en `link-analyzer.tsx`, pero no es verificable con las herramientas automáticas disponibles.)
- [x] Responsive en 390 px: título, campo y botón «Analizar enlace» visibles en la primera pantalla; mismas comprobaciones clave en 1280 px.
- [ ] Consola del navegador sin errores ni peticiones fallidas durante un análisis completo. (No verificable ahora mismo: la telemetría de consola no registró nada durante las capturas.)

## Fuera de alcance

- Registro, inicio de sesión, historial de análisis o guardado en base de datos (no se pidieron y el usuario debe poder analizar sin registrarse).
- Consulta a bases de datos públicas de sitios fraudulentos (requeriría una clave de API que hoy no existe).
- Analítica de eventos, selector de idiomas, tests automatizados y precios/planes.
