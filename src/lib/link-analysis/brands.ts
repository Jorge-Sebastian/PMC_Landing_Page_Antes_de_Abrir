/**
 * Empresas, bancos, redes sociales y servicios de paquetería cuyo nombre suele
 * usarse para imitar páginas reales. `keywords` son las palabras que aparecen
 * en la dirección falsa; `domains` son los dominios oficiales legítimos.
 */
export type Brand = {
  name: string;
  keywords: string[];
  domains: string[];
};

export const BRANDS: Brand[] = [
  {
    name: "WhatsApp",
    keywords: ["whatsapp", "whats app"],
    // wa.link es el acortador oficial de WhatsApp Business (detectado el
    // 2026-10-11 como falso positivo de "dominio-sospechoso" en entrenamiento).
    domains: ["whatsapp.com", "wa.me", "whatsapp.net", "wa.link"],
  },
  { name: "Instagram", keywords: ["instagram", "instagrarn"], domains: ["instagram.com"] },
  { name: "Facebook", keywords: ["facebook", "faceb00k", "fb-login"], domains: ["facebook.com", "fb.com", "messenger.com"] },
  { name: "Netflix", keywords: ["netflix", "netfl1x"], domains: ["netflix.com", "netflix.com.br", "netflix.com.mx"] },
  {
    name: "Amazon",
    keywords: ["amazon", "amaz0n"],
    // Dominios de país verificados visitando el sitio el 2026-10-11 (Paso 3.B):
    // todos muestran el marketplace real de Amazon para ese país. amazon.ie
    // dio 503 al consultarlo hoy (posible bloqueo a tráfico automático, mismo
    // patrón que g2.com en el hallazgo de producción #1), pero es un mercado
    // de Amazon real y documentado públicamente (lanzado en 2024) — se agrega
    // con esa salvedad. amazon.eu no se pudo verificar por contenido (solo
    // resolvió por DNS a un rango de IP de AWS); se agrega con baja confianza.
    domains: [
      "amazon.com",
      "amazon.es",
      "amazon.com.mx",
      "amazon.com.br",
      "amazon.com.ar",
      "amazon.co.uk",
      "amazon.ca",
      "amazon.in",
      "amazon.it",
      "amazon.com.au",
      "amazon.nl",
      "amazon.pl",
      "amazon.com.tr",
      "amazon.sa",
      "amazon.eg",
      "amazon.sg",
      "amazon.ie",
      "amazon.jobs",
      "amazon.eu",
      // Infraestructura real de Amazon/AWS, encontrada el 2026-10-11 al
      // revisar los falsos positivos de la candidata "marca al inicio de
      // token" (Paso 3.C) — confirmada por certificado TLS emitido a nombre
      // de "Amazon" (no solo por coincidencia de nombre).
      "amazonaws.com",
      "amazonaws.com.cn",
      "amazonaws.eu",
      "amazontrust.com",
      "amazonsilk.com",
      "amazonses.com",
    ],
  },
  { name: "PayPal", keywords: ["paypal", "paypa1"], domains: ["paypal.com", "paypal.me"] },
  {
    name: "Apple",
    keywords: ["apple", "appleid", "icloud"],
    // apple.news, apple.com.cn e icloud.com.cn verificados visitando el sitio
    // el 2026-10-11 (Paso 3.B): los tres muestran contenido/copyright de Apple.
    domains: ["apple.com", "icloud.com", "apple.co", "apple.news", "apple.com.cn", "icloud.com.cn"],
  },
  {
    name: "Microsoft",
    keywords: ["microsoft", "outlook", "office365", "hotmail"],
    // hotmail.com faltaba a pesar de que "hotmail" ya era palabra clave.
    // microsoft365.com verificado el 2026-10-11: redirige (302) a
    // m365.cloud.microsoft, dominio real de Microsoft 365.
    // microsoftonline.com/.us/-p.com confirmados el 2026-10-11 via el
    // certificado TLS de login.microsoftonline.com (mismo cluster de
    // identidad de Azure AD/Entra ID en los tres).
    domains: [
      "microsoft.com",
      "live.com",
      "outlook.com",
      "office.com",
      "hotmail.com",
      "microsoft365.com",
      "microsoftonline.com",
      "microsoftonline.us",
      "microsoftonline-p.com",
    ],
  },
  {
    name: "Google",
    keywords: ["google", "gmail", "g00gle", "youtube"],
    // Los 131 dominios de país de abajo son el redirector de búsqueda local
    // que Google opera para cada ccTLD desde hace años (práctica pública y
    // documentada). Verificados por muestreo el 2026-10-11: google.bs,
    // google.ci y varios más devuelven un 301 real de Google hacia
    // google.com (la redirección la emite el propio servidor de Google, no
    // algo que un sitio de phishing pueda falsificar). Se excluyó a propósito
    // "googll.store" (encontrado en los falsos positivos de entrenamiento):
    // no sigue el patrón de nombre real de Google, no redirige a google.com
    // y el sitio devuelve 403 — no se agrega.
    domains: [
      "google.com",
      "gmail.com",
      "youtube.com",
      "google.com.mx",
      "google.es",
      "google.dev",
      "google.org",
      "google.ad", "google.ae", "google.am", "google.as", "google.at", "google.az",
      "google.ba", "google.be", "google.bf", "google.bg", "google.bi", "google.bj",
      "google.bs", "google.by", "google.ca", "google.cg", "google.ci", "google.cm",
      "google.cn", "google.co.ao", "google.co.bw", "google.co.ck", "google.co.cr",
      "google.co.id", "google.co.il", "google.co.jp", "google.co.ke", "google.co.kr",
      "google.co.ls", "google.co.ma", "google.co.nz", "google.co.th", "google.co.tz",
      "google.co.uk", "google.co.uz", "google.co.ve", "google.co.vi", "google.co.za",
      "google.co.zw", "google.com.ag", "google.com.ai", "google.com.ar", "google.com.au",
      "google.com.bd", "google.com.bh", "google.com.bn", "google.com.br", "google.com.bz",
      "google.com.cu", "google.com.cy", "google.com.do", "google.com.ec", "google.com.et",
      "google.com.gh", "google.com.gt", "google.com.hk", "google.com.jm", "google.com.kw",
      "google.com.lb", "google.com.ly", "google.com.mm", "google.com.my", "google.com.ng",
      "google.com.ni", "google.com.om", "google.com.pa", "google.com.ph", "google.com.pk",
      "google.com.pr", "google.com.py", "google.com.qa", "google.com.sa", "google.com.sb",
      "google.com.sg", "google.com.sl", "google.com.sv", "google.com.vc", "google.com.vn",
      "google.cv", "google.dj", "google.dz", "google.fm", "google.ga", "google.ge",
      "google.gg", "google.gl", "google.gm", "google.gp", "google.gr", "google.gy",
      "google.hr", "google.ht", "google.ie", "google.im", "google.is", "google.je",
      "google.jo", "google.ki", "google.kz", "google.la", "google.lt", "google.lu",
      "google.lv", "google.md", "google.mk", "google.mn", "google.mu", "google.mv",
      "google.mw", "google.ne", "google.nl", "google.nr", "google.nu", "google.ps",
      "google.pt", "google.rs", "google.ru", "google.rw", "google.sc", "google.se",
      "google.sh", "google.si", "google.sm", "google.sn", "google.sr", "google.tg",
      "google.tn", "google.to", "google.vu",
      // Infraestructura real de Google, confirmada el 2026-10-11 por
      // certificado TLS (Google Trust Services, con otros dominios de Google
      // en el mismo SAN).
      "googlevideo.com",
      "googletagmanager.com",
      "googleusercontent.com",
      "googledomains.com",
      "googlesyndication.com",
      "googleblog.com",
      "googleoptimize.com",
    ],
  },
  { name: "Mercado Libre", keywords: ["mercadolibre", "mercadolivre", "mercadolibre-envios"], domains: ["mercadolibre.com", "mercadolibre.com.ar", "mercadolibre.com.mx", "mercadolibre.com.co", "mercadolibre.com.pe", "mercadolibre.cl", "mercadolivre.com.br"] },
  { name: "Mercado Pago", keywords: ["mercadopago", "mercado-pago"], domains: ["mercadopago.com", "mercadopago.com.ar", "mercadopago.com.mx", "mercadopago.com.co", "mercadopago.com.br", "mercadopago.cl"] },
  { name: "BBVA", keywords: ["bbva", "bbva-seguro"], domains: ["bbva.com", "bbva.es", "bbva.mx", "bbva.com.ar", "bbva.com.co", "bbva.pe", "bbva.cl"] },
  {
    name: "Santander",
    keywords: ["santander"],
    // santander.co.uk verificado el 2026-10-11: el pie de página del sitio
    // nombra literalmente "www.santander.co.uk" como dirección de Santander UK plc.
    domains: ["santander.com", "santander.es", "santander.com.mx", "santander.com.ar", "santander.cl", "santander.com.br", "santander.co.uk"],
  },
  { name: "Bancolombia", keywords: ["bancolombia", "sucursal-virtual"], domains: ["bancolombia.com", "sucursalvirtual.com.co", "grupobancolombia.com"] },
  { name: "Banco de Chile", keywords: ["bancochile", "banco-de-chile"], domains: ["bancochile.cl"] },
  { name: "BancoEstado", keywords: ["bancoestado", "banco-estado"], domains: ["bancoestado.cl"] },
  { name: "Itaú", keywords: ["itau", "itau-unibanco"], domains: ["itau.com.br", "itau.cl", "itau.com.ar", "itau.com.uy", "itau.co"] },
  { name: "Bradesco", keywords: ["bradesco"], domains: ["bradesco.com.br", "bradesco.com"] },
  { name: "Banco do Brasil", keywords: ["bancodobrasil", "banco-do-brasil"], domains: ["bb.com.br", "bancodobrasil.com.br"] },
  { name: "Nubank", keywords: ["nubank", "nu-bank"], domains: ["nubank.com.br", "nubank.com.co", "nubank.com.mx"] },
  { name: "Nequi", keywords: ["nequi"], domains: ["nequi.com.co"] },
  { name: "Daviplata", keywords: ["daviplata"], domains: ["daviplata.com"] },
  // Las 7 marcas siguientes se agregaron tras la prueba en producción
  // (hallazgo youtuve.com) y se verificaron visitando cada dominio antes
  // de incluirlo — ver docs/CHANGELOG-algoritmo.md.
  { name: "Davivienda", keywords: ["davivienda"], domains: ["davivienda.com"] },
  { name: "Banco de Bogotá", keywords: ["bancodebogota", "banco-de-bogota"], domains: ["bancodebogota.com"] },
  { name: "PSE", keywords: ["pse"], domains: ["pse.com.co"] },
  { name: "DIAN", keywords: ["dian"], domains: ["dian.gov.co"] },
  { name: "Servientrega", keywords: ["servientrega"], domains: ["servientrega.com"] },
  { name: "Interrapidísimo", keywords: ["interrapidisimo", "inter-rapidisimo"], domains: ["interrapidisimo.com"] },
  { name: "Coordinadora", keywords: ["coordinadora"], domains: ["coordinadora.com"] },
  { name: "Yape", keywords: ["yape"], domains: ["yape.pe"] },
  { name: "CaixaBank", keywords: ["caixabank", "la-caixa"], domains: ["caixabank.es", "lacaixa.es"] },
  {
    name: "Correos",
    // "correios" (grafía portuguesa) verificado el 2026-10-11: correios.com.br
    // se identifica como Correios, con el CNPJ de la Empresa Brasileira de
    // Correios e Telégrafos en el pie de página.
    keywords: ["correos", "correo-argentino", "correoschile", "correios"],
    domains: ["correos.es", "correoargentino.com.ar", "correoschile.cl", "correosdechile.cl", "correios.com.br"],
  },
  { name: "DHL", keywords: ["dhl", "dhl-entrega"], domains: ["dhl.com", "dhl.de", "dhl.es", "dhl.com.mx"] },
  { name: "FedEx", keywords: ["fedex"], domains: ["fedex.com", "fedex.com.mx"] },
  { name: "UPS", keywords: ["ups", "ups-entrega"], domains: ["ups.com", "ups.com.mx"] },
  { name: "Visa", keywords: ["visa", "visa-secure"], domains: ["visa.com", "visa.com.mx", "visa.com.br"] },
  { name: "Mastercard", keywords: ["mastercard", "master-card"], domains: ["mastercard.com", "mastercard.com.mx", "mastercard.com.br"] },
  {
    name: "Telefónica / Movistar",
    keywords: ["movistar", "telefonica"],
    // telefonica.de verificado el 2026-10-11: se presenta como Telefónica
    // Deutschland (marca o2); el contenido no confirma la relación societaria
    // con el grupo español, pero la marca y el nombre coinciden.
    domains: ["movistar.es", "movistar.com.mx", "movistar.com.co", "movistar.cl", "telefonica.com", "telefonica.de"],
  },
  { name: "Andesmar / Ecomm", keywords: ["pedidosya", "rappi"], domains: ["pedidosya.com", "rappi.com", "rappi.com.mx", "rappi.com.co"] },
  {
    name: "Binance",
    keywords: ["binance"],
    // binance.info verificado el 2026-10-11 (muestra la misma portada de
    // Binance). binance.org redirige (301, emitido por el propio servidor)
    // a bnbchain.org, el proyecto de blockchain de Binance. binance.us se
    // identifica como "BAM Trading Services Inc., doing business as
    // Binance.US" — la entidad estadounidense con licencia de la marca.
    domains: ["binance.com", "binance.info", "binance.org", "binance.us"],
  },
  { name: "Bitcoin / cripto", keywords: ["metamask", "coinbase", "trustwallet"], domains: ["metamask.io", "coinbase.com", "trustwallet.com"] },
  {
    name: "Steam",
    keywords: ["steampowered", "steam"],
    // steam-chat.com verificado el 2026-10-11: su certificado TLS es el mismo
    // que cubre steampowered.com, steamcommunity.com, valvesoftware.com y el
    // resto del portafolio conocido de Valve (misma entidad, mismo certificado).
    domains: ["steampowered.com", "steamcommunity.com", "steam-chat.com"],
  },
  { name: "LinkedIn", keywords: ["linkedin"], domains: ["linkedin.com", "lnkd.in"] },
  {
    name: "TikTok",
    keywords: ["tiktok"],
    // tiktokv.com y tiktokshop.com confirmados el 2026-10-11 por certificado
    // TLS dedicado a ese dominio exacto.
    domains: ["tiktok.com", "tiktokv.com", "tiktokshop.com"],
  },
  { name: "Uber", keywords: ["uber"], domains: ["uber.com"] },
  { name: "Booking", keywords: ["booking"], domains: ["booking.com"] },
  {
    name: "Airbnb",
    keywords: ["airbnb"],
    // airbnb.co.uk y airbnb.fr verificados el 2026-10-11 (ambos muestran el
    // pie de página "© Airbnb, Inc." y contenido localizado real).
    domains: ["airbnb.com", "airbnb.com.mx", "airbnb.com.br", "airbnb.co.uk", "airbnb.fr"],
  },
  // Las 6 marcas siguientes se agregaron en el Paso 3.B (2026-10-11), a partir
  // de lo que encontró el análisis de errores sobre el conjunto de
  // ENTRENAMIENTO real (reports/analisis-errores.md) — sin mirar el conjunto
  // de prueba. Roblox es el caso que motivó la regla explícita de NO usar
  // "marca + cualquier terminación de país": Roblox NO opera dominios de país
  // (a diferencia de Amazon/Google), así que su único dominio oficial es
  // roblox.com — cualquier "roblox.com.XX" sigue siendo, a propósito,
  // imitación de marca.
  { name: "Roblox", keywords: ["roblox"], domains: ["roblox.com"] },
  { name: "Chase", keywords: ["chase"], domains: ["chase.com"] },
  { name: "Adobe", keywords: ["adobe"], domains: ["adobe.com"] },
  {
    name: "Spotify",
    keywords: ["spotify"],
    // spotifycdn.com confirmado el 2026-10-11: certificado TLS dedicado a
    // *.spotifycdn.com.
    domains: ["spotify.com", "spotifycdn.com"],
  },
  { name: "Rackspace", keywords: ["rackspace"], domains: ["rackspace.com"] },
  // t.co es el acortador oficial de Twitter/X (igual que wa.link para
  // WhatsApp o lnkd.in para LinkedIn): oficial para efectos de imitación de
  // marca aunque también viva en URL_SHORTENERS.
  { name: "Twitter / X", keywords: ["twitter"], domains: ["twitter.com", "x.com", "t.co"] },
];

/** Palabras que apuntan a datos sensibles (contraseñas, banca, tarjetas). */
export const SENSITIVE_WORDS = [
  "password",
  "contrasena",
  "contraseña",
  "clave",
  "cvv",
  "pin",
  "tarjeta",
  "card",
  "banco",
  "bank",
  "cuenta",
  "account",
  "login",
  "iniciar-sesion",
  "iniciarsesion",
  "actualizar-datos",
  "datos-personales",
  "dni",
  "cedula",
  "rut",
  "seguridad",
  "verificacion",
  "token",
  "codigo",
];

/**
 * Palabras que buscan alarmar, meter prisa o prometer un premio. Cuentan
 * como señal por sí solas (combinadas con las demás reglas de analyze-url.ts).
 */
export const STRONG_PRESSURE_WORDS = [
  "bloque",
  "suspend",
  "cancel",
  "urgent",
  "inmediat",
  "reclam",
  "premio",
  "sorteo",
  "ganaste",
  "ganador",
  "deuda",
  "multa",
  "expira",
  "caduc",
  "ultimo-aviso",
  "ultimatum",
];

/**
 * Vocabulario normal de comercio y logística (envíos, facturas, descuentos).
 * Un sitio real también los usa todo el tiempo, así que NO cuentan por sí
 * solos: solo se agregan a la señal "palabras-de-presion" cuando ya hay
 * alguna otra señal presente (mismo patrón que SENSITIVE_WORDS más abajo).
 * Antes vivían junto a las palabras de alarma y generaban falsos positivos
 * en tiendas, aerolíneas y empresas de logística reales (ver
 * docs/CHANGELOG-algoritmo.md, Fase 1).
 */
export const COMMERCIAL_PRESSURE_WORDS = [
  "gratis",
  "regalo",
  "bono",
  "descuento",
  "paquete",
  "envio",
  "envío",
  "factura",
  "pago",
  "pendiente",
];

/**
 * Terminaciones de dominio con una tasa de abuso de phishing muy por encima
 * del resto, según datos públicos y citables:
 * - Interisle Consulting Group, "Phishing Landscape 2025" (reportes de
 *   mayo 2024 a abril 2025; https://interisle.net/PhishingLandscape2025):
 *   "Phishing Score" (dominios de phishing por cada 10,000 dominios
 *   delegados) — .xin (10 810), .bond (1 759), .cfd (747.8), .icu (459.4),
 *   .help y .win entre los más altos; .com, como referencia, tiene 30.
 * - El resto de la lista (click, top, work, loan, review, date, faith,
 *   party, stream, download, racing, men, gdn, kim, buzz, monster, quest,
 *   sbs, cam, mov, country, cyou, rest, tk, gq, cf, ml) coincide con los
 *   gTLD que aparecen de forma recurrente en los reportes de abuso de
 *   Spamhaus de los últimos años (ver discusión y fuentes citadas en
 *   docs/CHANGELOG-algoritmo.md, Fase 1).
 *
 * Se sacaron a propósito `fit`, `surf`, `bar`, `beauty`, `skin`, `autos`,
 * `boats`, `homes` y `makeup`: son gTLD genéricos que hoy usan negocios
 * reales (gimnasios, salones, inmobiliarias, concesionarios...) y que el
 * banco de pruebas (`scripts/eval/`) marcó como falsos positivos — no hay
 * evidencia de que tengan una tasa de abuso fuera de lo común.
 */
export const SUSPICIOUS_TLDS = new Set([
  "xin",
  "bond",
  "help",
  "cfd",
  "icu",
  "xyz",
  "top",
  "click",
  "link",
  "tk",
  "gq",
  "cf",
  "ml",
  "work",
  "loan",
  "rest",
  "buzz",
  "cyou",
  "monster",
  "quest",
  "sbs",
  "cam",
  "mov",
  "country",
  "stream",
  "download",
  "racing",
  "win",
  "review",
  "date",
  "faith",
  "party",
  "gdn",
  "men",
  "kim",
  "zip",
]);

/** Servicios que acortan enlaces y ocultan el destino real. */
export const URL_SHORTENERS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "cutt.ly",
  "rb.gy",
  "is.gd",
  "shorturl.at",
  "tiny.cc",
  "lnkd.in",
  "t.ly",
  "shorte.st",
  "adf.ly",
  "bc.vc",
  "surl.li",
  "bl.ink",
  "rebrand.ly",
  "snip.ly",
  "trib.al",
  "buff.ly",
  "mzl.la",
  "soo.gd",
  "x.co",
  "u.to",
  "clck.ru",
  "vk.cc",
  "bit.do",
  "qps.ru",
  "t2m.io",
  "urlz.fr",
  "shrtco.de",
]);

/** Extensiones que instalan algo en el dispositivo. */
export const DOWNLOAD_EXTENSIONS = [
  "apk",
  "exe",
  "scr",
  "msi",
  "vbs",
  "bat",
  "cmd",
  "jar",
  "dmg",
  "pkg",
  "xlsm",
  "docm",
];

/** Parámetros que redirigen a otro sitio escondido. */
export const REDIRECT_PARAMS = [
  "url",
  "redirect",
  "redirect_uri",
  "redirect_url",
  "redirecturl",
  "next",
  "continue",
  "continue_url",
  "dest",
  "destination",
  "target",
  "goto",
  "return",
  "returnurl",
  "return_url",
  "link",
  "out",
];
