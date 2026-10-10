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
    domains: ["whatsapp.com", "wa.me", "whatsapp.net"],
  },
  { name: "Instagram", keywords: ["instagram", "instagrarn"], domains: ["instagram.com"] },
  { name: "Facebook", keywords: ["facebook", "faceb00k", "fb-login"], domains: ["facebook.com", "fb.com", "messenger.com"] },
  { name: "Netflix", keywords: ["netflix", "netfl1x"], domains: ["netflix.com", "netflix.com.br", "netflix.com.mx"] },
  { name: "Amazon", keywords: ["amazon", "amaz0n"], domains: ["amazon.com", "amazon.es", "amazon.com.mx", "amazon.com.br", "amazon.com.ar"] },
  { name: "PayPal", keywords: ["paypal", "paypa1"], domains: ["paypal.com", "paypal.me"] },
  { name: "Apple", keywords: ["apple", "appleid", "icloud"], domains: ["apple.com", "icloud.com", "apple.co"] },
  { name: "Microsoft", keywords: ["microsoft", "outlook", "office365", "hotmail"], domains: ["microsoft.com", "live.com", "outlook.com", "office.com"] },
  { name: "Google", keywords: ["google", "gmail", "g00gle", "youtube"], domains: ["google.com", "gmail.com", "youtube.com", "google.com.mx", "google.es"] },
  { name: "Mercado Libre", keywords: ["mercadolibre", "mercadolivre", "mercadolibre-envios"], domains: ["mercadolibre.com", "mercadolibre.com.ar", "mercadolibre.com.mx", "mercadolibre.com.co", "mercadolibre.com.pe", "mercadolibre.cl", "mercadolivre.com.br"] },
  { name: "Mercado Pago", keywords: ["mercadopago", "mercado-pago"], domains: ["mercadopago.com", "mercadopago.com.ar", "mercadopago.com.mx", "mercadopago.com.co", "mercadopago.com.br", "mercadopago.cl"] },
  { name: "BBVA", keywords: ["bbva", "bbva-seguro"], domains: ["bbva.com", "bbva.es", "bbva.mx", "bbva.com.ar", "bbva.com.co", "bbva.pe", "bbva.cl"] },
  { name: "Santander", keywords: ["santander"], domains: ["santander.com", "santander.es", "santander.com.mx", "santander.com.ar", "santander.cl", "santander.com.br"] },
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
  { name: "Correos", keywords: ["correos", "correo-argentino", "correoschile"], domains: ["correos.es", "correoargentino.com.ar", "correoschile.cl", "correosdechile.cl"] },
  { name: "DHL", keywords: ["dhl", "dhl-entrega"], domains: ["dhl.com", "dhl.de", "dhl.es", "dhl.com.mx"] },
  { name: "FedEx", keywords: ["fedex"], domains: ["fedex.com", "fedex.com.mx"] },
  { name: "UPS", keywords: ["ups", "ups-entrega"], domains: ["ups.com", "ups.com.mx"] },
  { name: "Visa", keywords: ["visa", "visa-secure"], domains: ["visa.com", "visa.com.mx", "visa.com.br"] },
  { name: "Mastercard", keywords: ["mastercard", "master-card"], domains: ["mastercard.com", "mastercard.com.mx", "mastercard.com.br"] },
  { name: "Telefónica / Movistar", keywords: ["movistar", "telefonica"], domains: ["movistar.es", "movistar.com.mx", "movistar.com.co", "movistar.cl", "telefonica.com"] },
  { name: "Andesmar / Ecomm", keywords: ["pedidosya", "rappi"], domains: ["pedidosya.com", "rappi.com", "rappi.com.mx", "rappi.com.co"] },
  { name: "Binance", keywords: ["binance"], domains: ["binance.com"] },
  { name: "Bitcoin / cripto", keywords: ["metamask", "coinbase", "trustwallet"], domains: ["metamask.io", "coinbase.com", "trustwallet.com"] },
  { name: "Steam", keywords: ["steampowered", "steam"], domains: ["steampowered.com", "steamcommunity.com"] },
  { name: "LinkedIn", keywords: ["linkedin"], domains: ["linkedin.com", "lnkd.in"] },
  { name: "TikTok", keywords: ["tiktok"], domains: ["tiktok.com"] },
  { name: "Uber", keywords: ["uber"], domains: ["uber.com"] },
  { name: "Booking", keywords: ["booking"], domains: ["booking.com"] },
  { name: "Airbnb", keywords: ["airbnb"], domains: ["airbnb.com", "airbnb.com.mx", "airbnb.com.br"] },
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
