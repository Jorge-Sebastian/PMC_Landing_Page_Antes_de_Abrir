import { checkProviders, type SourceCheck } from './providers.ts';
import { inspectUrlPrivacy } from '../../../src/lib/link-analysis/url-privacy.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Cache-Control': 'no-store' };
const cache = new Map<string, { until: number; checks: SourceCheck[] }>();
let budget = { minute: 0, count: 0 };
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return respond({ error: 'method' }, 405);
  try {
    if (Number(request.headers.get('content-length') || 0) > 8192) return respond({ error: 'too-large' }, 413);
    if (!request.body) return respond({ error: 'invalid' }, 400);
    const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
    try { for (;;) { const r = await reader.read(); if (r.done) break; size += r.value.byteLength; if (size > 8192) return respond({ error: 'too-large' }, 413); chunks.push(r.value); } }
    finally { await reader.cancel(); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof data.url !== 'string' || data.url.length > 4096) return respond({ error: 'invalid' }, 400);
    const url = new URL(data.url); if (!['http:', 'https:'].includes(url.protocol)) return respond({ error: 'scheme' }, 400);
    if (inspectUrlPrivacy(url.href).sensitive) return respond({ checks: [{ name: 'Fuentes de amenazas', status: 'skipped' }] });
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(url.href)))].map(b => b.toString(16).padStart(2, '0')).join('');
    const hit = cache.get(hash); if (hit && hit.until > Date.now()) return respond({ checks: hit.checks });
    // Bound upstream usage in each warm instance. Production also needs gateway/account budgets.
    const minute = Math.floor(Date.now() / 60000); if (budget.minute !== minute) budget = { minute, count: 0 };
    if (++budget.count > 120) return respond({ error: 'rate-limit' }, 429);
    const checks = await checkProviders(url.href, { webRiskKey: Deno.env.get('WEB_RISK_API_KEY'), safeBrowsingKey: Deno.env.get('SAFE_BROWSING_API_KEY'), nonCommercial: Deno.env.get('SAFE_BROWSING_NONCOMMERCIAL') === 'true', urlhausKey: Deno.env.get('URLHAUS_AUTH_KEY'), phishTankKey: Deno.env.get('PHISHTANK_APP_KEY') });
    const expiry = checks.filter(c => c.status === 'clear' || c.status === 'match').map(c => Date.parse(c.expiresAt ?? ''));
    if (expiry.length && !checks.some(c => c.status === 'unavailable')) { cache.set(hash, { until: Math.min(...expiry), checks }); while (cache.size > 500) cache.delete(cache.keys().next().value!); }
    return respond({ checks });
  } catch { return respond({ error: 'invalid-or-unavailable' }, 400); }
});
