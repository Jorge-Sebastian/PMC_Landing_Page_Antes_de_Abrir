import { inspectUrlPrivacy } from '../../../src/lib/link-analysis/url-privacy.ts';

/** Provider adapters only. Secrets stay in the Edge Function, never in the APK. */
export type SourceCheck = { name: string; status: 'clear' | 'match' | 'unavailable' | 'not-configured' | 'skipped'; checkedAt?: string; expiresAt?: string; threat?: string };
export type ProviderConfig = { webRiskKey?: string; safeBrowsingKey?: string; nonCommercial?: boolean; urlhausKey?: string; phishTankKey?: string };
type Fetcher = typeof fetch;
type Json = Record<string, unknown>;
function object(value: unknown): value is Json { return !!value && typeof value === 'object' && !Array.isArray(value); }
async function read(response: Response): Promise<Json> {
  if (!response.ok || !response.body) throw new Error('Provider unavailable');
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try { for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > 262144) throw new Error('Response exceeds limit'); chunks.push(value); } }
  finally { await reader.cancel(); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes)); if (!object(parsed)) throw new Error('Invalid provider response'); return parsed;
}
async function query(name: string, enabled: boolean, request: () => Promise<{ matched: boolean; ttl?: number; threat?: string }>): Promise<SourceCheck> {
  if (!enabled) return { name, status: 'not-configured' };
  const checkedAt = new Date().toISOString();
  try {
    const value = await request();
    const ttl = Math.max(0, Math.min(300, value.ttl ?? (value.matched ? 300 : 60)));
    return { name, status: value.matched ? 'match' : 'clear', checkedAt, expiresAt: new Date(Date.now() + ttl * 1000).toISOString(), ...(value.threat ? { threat: value.threat } : {}) };
  } catch { return { name, status: 'unavailable', checkedAt }; }
}
export async function checkProviders(url: string, config: ProviderConfig, fetcher: Fetcher = fetch): Promise<SourceCheck[]> {
  if (inspectUrlPrivacy(url).sensitive) return ['Google Web Risk','Google Safe Browsing','URLhaus','PhishTank'].map(name => ({ name, status: 'skipped' as const }));
  const call = (endpoint: string, init: RequestInit = {}) => fetcher(endpoint, { ...init, redirect: 'error', signal: AbortSignal.timeout(3500) }).then(read);
  return Promise.all([
    query('Google Web Risk', !!config.webRiskKey, async () => {
      const params = new URLSearchParams({ uri: url }); for (const type of ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE']) params.append('threatTypes', type);
      const r = await call(`https://webrisk.googleapis.com/v1/uris:search?${params}`, { headers: { 'X-Goog-Api-Key': config.webRiskKey! } });
      if (!('threat' in r)) { if (Object.keys(r).length) throw new Error('Unexpected response'); return { matched: false }; }
      if (!object(r.threat) || !Array.isArray(r.threat.threatTypes) || !r.threat.threatTypes.length) throw new Error('Invalid threat');
      return { matched: true, ttl: typeof r.threat.expireTime === 'string' ? (Date.parse(r.threat.expireTime) - Date.now()) / 1000 : 60, threat: 'phishing, malware o software no deseado' };
    }),
    query('Google Safe Browsing', !!config.safeBrowsingKey && config.nonCommercial === true, async () => {
      const r = await call(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(config.safeBrowsingKey!)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client: { clientId: 'smartguard-academic-pilot', clientVersion: '0.4.0' }, threatInfo: { threatTypes: ['MALWARE','SOCIAL_ENGINEERING','UNWANTED_SOFTWARE'], platformTypes: ['ANY_PLATFORM'], threatEntryTypes: ['URL'], threatEntries: [{ url }] } }) });
      if (!('matches' in r)) { if (Object.keys(r).length) throw new Error('Unexpected response'); return { matched: false }; }
      if (!Array.isArray(r.matches) || r.matches.some(v => !object(v))) throw new Error('Invalid matches');
      const durations = r.matches.map(v => object(v) && typeof v.cacheDuration === 'string' ? Number.parseFloat(v.cacheDuration) : 60).filter(Number.isFinite);
      return { matched: r.matches.length > 0, ttl: durations.length ? Math.min(...durations) : 60, threat: r.matches.length ? 'phishing, malware o software no deseado' : undefined };
    }),
    query('URLhaus', !!config.urlhausKey, async () => {
      const r = await call('https://urlhaus-api.abuse.ch/v1/url/', { method: 'POST', headers: { 'Auth-Key': config.urlhausKey!, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ url }).toString() });
      if (r.query_status === 'no_results') return { matched: false };
      if (r.query_status !== 'ok' || r.url_status !== 'online') throw new Error('No current online verdict');
      return { matched: true, threat: 'distribución de malware' };
    }),
    query('PhishTank', !!config.phishTankKey, async () => {
      const r = await call('https://checkurl.phishtank.com/checkurl/', { method: 'POST', headers: { 'User-Agent': 'phishtank/smartguard-pilot', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ url, format: 'json', app_key: config.phishTankKey! }).toString() });
      if (!object(r.results) || typeof r.results.in_database !== 'boolean') throw new Error('Invalid result');
      if (r.results.in_database === false) return { matched: false };
      if (r.results.verified !== true || r.results.valid !== true) throw new Error('Unconfirmed report');
      return { matched: true, threat: 'phishing confirmado en su base' };
    }),
  ]);
}
