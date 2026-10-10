// Comprueba a dónde lleva realmente un enlace.
//
// Sigue las redirecciones a mano y observa si el destino responde. No guarda
// nada, no ejecuta SQL y no hace de proxy: devuelve solo metadatos (estado,
// dominio final, cadena de saltos, título de la página, si pide contraseña
// y hace cuánto se registró el dominio, vía RDAP). Nunca se solicita nada a
// direcciones internas, locales o numéricas.
import { lookupDomainAge } from "./lib/rdap.ts";
import { registrableDomainFor } from "./lib/registrable-domain.ts";
import { buildSuccessBody, resolveDomainAge } from "./lib/response.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_URL_LENGTH = 2048;
const MAX_REDIRECTS = 5;
const HOP_TIMEOUT_MS = 6000;
const MAX_HTML_CHARS = 64 * 1024;
const USER_AGENT = "AntesDeAbrir/1.0 (comprobacion de enlaces)";
const RDAP_TIMEOUT_MS = 3000;
// El cliente se rinde a los 9 s (ver check-destination.ts); se responde
// antes de eso para que la interfaz nunca se quede esperando algo que ya
// decidimos no esperar más. No cancela las conexiones de red en curso (eso
// requeriría enganchar un AbortController dentro de followRedirects), pero
// sí garantiza que la RESPUESTA al cliente llegue dentro del plazo.
const GLOBAL_DEADLINE_MS = 8000;

const withDeadline = async <T>(promise: Promise<T>, ms: number): Promise<T | null> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
};

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const IPV6 = /^[0-9a-f:]+$/i;
const BLOCKED_SUFFIXES = [".local", ".internal", ".localhost", ".lan", ".home"];

type FunctionBody = Record<string, unknown>;

const jsonResponse = (body: FunctionBody, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const stripBrackets = (host: string) => host.replace(/^\[/, "").replace(/\]$/, "");

const isIpLiteral = (host: string) => {
  const bare = stripBrackets(host);
  if (IPV4.test(bare)) return true;
  return bare.includes(":") && IPV6.test(bare);
};

const isPrivateIpv4 = (host: string) => {
  const [a, b] = host.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
};

const isPrivateIpv6 = (host: string) => {
  const bare = stripBrackets(host).toLowerCase();
  return (
    bare === "::1" ||
    bare === "::" ||
    bare.startsWith("fc") ||
    bare.startsWith("fd") ||
    bare.startsWith("fe80")
  );
};

// Devuelve un motivo si el host no debe solicitarse nunca, o null si es apto.
const blockedHostReason = (host: string): string | null => {
  const lowered = host.toLowerCase();
  if (!lowered) return "invalid";
  if (lowered === "localhost" || BLOCKED_SUFFIXES.some((suffix) => lowered.endsWith(suffix))) {
    return "blocked-host";
  }
  if (isIpLiteral(lowered)) {
    if (isPrivateIpv4(lowered) || isPrivateIpv6(lowered)) return "blocked-host";
    // Una dirección numérica tampoco se solicita: el analizador ya la marca
    // como señal de riesgo por sí misma.
    return "blocked-host";
  }
  return null;
};

const readLimitedHtml = async (response: Response) => {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("html")) return "";
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let html = "";
  let readBytes = 0;
  try {
    while (readBytes < MAX_HTML_CHARS) {
      const { done, value } = await reader.read();
      if (done) break;
      readBytes += value?.byteLength ?? 0;
      html += decoder.decode(value, { stream: true });
    }
  } catch (error) {
    console.error("check-link: error leyendo el HTML", String(error));
  } finally {
    try {
      await reader.cancel();
    } catch {
      // El cuerpo ya estaba cerrado: no hay nada que cancelar.
    }
  }
  return html;
};

const followRedirects = async (startUrl: string) => {
  const redirects: string[] = [];
  let currentUrl = startUrl;
  let status = 0;
  let html = "";

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const target = new URL(currentUrl);
    const blocked = blockedHostReason(target.hostname);
    if (blocked) return { blocked, redirects, currentUrl, status };

    const response = await fetch(currentUrl, {
      method: "GET",
      redirect: "manual",
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml,*/*" },
      signal: AbortSignal.timeout(HOP_TIMEOUT_MS),
    });
    status = response.status;

    const location = response.headers.get("location");
    if (status >= 300 && status < 400 && location) {
      if (redirects.length >= MAX_REDIRECTS) {
        console.warn("check-link: demasiadas redirecciones, se detiene el seguimiento");
        break;
      }
      const nextUrl = new URL(location, currentUrl).toString();
      redirects.push(nextUrl);
      currentUrl = nextUrl;
      continue;
    }

    html = status >= 200 && status < 400 ? await readLimitedHtml(response) : "";
    break;
  }

  return { blocked: null, redirects, currentUrl, status, html };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let payload: { url?: unknown } = {};
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ ok: false, reason: "invalid" });
  }

  const rawUrl = typeof payload.url === "string" ? payload.url.trim() : "";
  if (!rawUrl || rawUrl.length > MAX_URL_LENGTH) {
    return jsonResponse({ ok: false, reason: rawUrl ? "too-long" : "invalid" });
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return jsonResponse({ ok: false, reason: "invalid" });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return jsonResponse({ ok: false, reason: "unsupported-scheme" });
  }

  const initialHost = parsed.hostname;
  const blockedAtStart = blockedHostReason(initialHost);
  if (blockedAtStart) {
    return jsonResponse({ ok: false, reason: blockedAtStart });
  }

  const outcome = await withDeadline(
    (async () => {
      const initialRegistrable = registrableDomainFor(initialHost);

      // RDAP del host original arranca en paralelo con las redirecciones:
      // en el caso más común (sin redirección a otro dominio) esa misma
      // consulta ya es la respuesta final, sin costo extra de tiempo.
      const [result, initialAge] = await Promise.all([
        followRedirects(parsed.toString()),
        lookupDomainAge(initialRegistrable, { timeoutMs: RDAP_TIMEOUT_MS }),
      ]);

      if (result.blocked) {
        console.warn("check-link: destino bloqueado", result.blocked, initialHost);
        return jsonResponse({ ok: false, reason: result.blocked });
      }

      const finalUrl = new URL(result.currentUrl);
      const finalRegistrable = registrableDomainFor(finalUrl.hostname);

      // Si el destino final es otro dominio, su edad es la que de verdad
      // importa (a dónde termina llegando la persona) — se consulta aparte,
      // ya conocido el host final. Si es el mismo dominio, no hay que
      // repetir la consulta: ya la tenemos (`resolveDomainAge`, testeada en
      // response.test.ts con un caso tipo acortador).
      const domainAge = await resolveDomainAge(initialRegistrable, finalRegistrable, initialAge, (domain) =>
        lookupDomainAge(domain, { timeoutMs: RDAP_TIMEOUT_MS }),
      );

      const body = buildSuccessBody(initialHost, finalUrl.toString(), result, domainAge);

      console.log(
        "check-link: analizado",
        initialHost,
        "->",
        body.finalHost,
        "estado",
        body.status,
        "saltos",
        body.redirects.length,
        "edad del dominio",
        domainAge.ok ? `${domainAge.ageDays}d` : domainAge.reason,
      );

      return jsonResponse(body);
    })(),
    GLOBAL_DEADLINE_MS,
  ).catch((error) => {
    console.error("check-link: no se pudo comprobar el destino", String(error));
    return null;
  });

  return outcome ?? jsonResponse({ ok: false, reason: "unavailable" });
});
