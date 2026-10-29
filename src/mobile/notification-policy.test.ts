import { describe, expect, it, vi } from 'vitest';
import { inspectUrlPrivacy } from '@/lib/link-analysis/url-privacy';
import { analyzeMessage } from '@/lib/link-analysis/message-analysis';
import { decideNotification } from '@/lib/link-analysis/notification-decision';
import { analyze } from './background-engine';
import { checkProviders } from '../../supabase/functions/check-threats/providers';

const clean = { level: 'sin-senales' as const, score: 0, signals: [] };
const complete = { checked: true, reachable: true, status: 200 };
describe('three-color decisions', () => {
  it('reserves green for completed checks without other evidence', () => {
    expect(decideNotification(clean, undefined, [], { sensitive: false }).color).toBe('orange');
    expect(decideNotification(clean, complete, [], { sensitive: false }).color).toBe('green');
  });
  it('never turns a blocked, unreadable or failed destination green', () => {
    for (const destination of [{ ...complete, status: 403 }, { ...complete, reachable: false }, { ...complete, looksLikeJsShell: true }])
      expect(decideNotification(clean, destination, [], { sensitive: false }).color).toBe('orange');
  });
  it('lets a confirmed external threat override an official-looking result', () => {
    const d = decideNotification({ ...clean, officialMatch: { brandId: 'test', brandName: 'Test', officialDomains: ['example.com'] } }, complete, [], { sensitive: false }, { reputation: { checks: [{ name: 'Test provider', status: 'match', threat: 'phishing' }] } });
    expect(d.color).toBe('red'); expect(d.summary).toContain('Test provider');
  });
  it('distinguishes missing page, missing domain and lack of coverage', () => {
    expect(decideNotification(clean, { ...complete, status: 404 }, [], { sensitive: false }).summary).toContain('no encontró');
    expect(decideNotification(clean, complete, [], { sensitive: false }, { dns: 'not-found' }).summary).toContain('DNS');
    expect(decideNotification(clean, complete, [], { sensitive: false }).coverage).toContain('Sin consulta confirmada');
  });
  it('treats provider failure as incomplete coverage, never a clean response', () => {
    expect(decideNotification(clean, complete, [], { sensitive: false }, { reputation: { checks: [{ name: 'Provider', status: 'unavailable' }] } }).color).toBe('orange');
  });
});
describe('local message signals', () => {
  it('combines pressure and requested secrets without declaring proof of fraud', () => {
    const findings = analyzeMessage('URGENTE: ingresa tu clave y codigo de seguridad para evitar el bloqueo', 'https://example.com');
    expect(findings.some(f => f.id === 'message-secrets')).toBe(true);
    expect(decideNotification(clean, complete, findings, { sensitive: false }).color).toBe('orange');
  });
  it('does not mistake routine reminders or safety advice for a credential demand', () => {
    expect(analyzeMessage('Tu cita es mañana a las 10. Consulta los detalles.', 'https://example.com')).toEqual([]);
    expect(analyzeMessage('Nunca compartas tu clave ni tus codigos.', 'https://example.com').some(f => f.id === 'message-secrets')).toBe(false);
  });
  it('detects an account claim that names a brand but uses another domain', () => {
    expect(analyzeMessage('Bancolombia: verifica tu cuenta ahora', 'https://example.com').some(f => f.id === 'message-brand')).toBe(true);
    expect(analyzeMessage('Artículo sobre Bancolombia', 'https://example.com').some(f => f.id === 'message-brand')).toBe(false);
  });
  it('never returns raw text in the analysis result', () => {
    const r = analyze('https://example.com', complete, 'Mi secreto personal 987654. Mensaje de prueba.');
    expect(JSON.stringify(r)).not.toContain('Mi secreto personal');
  });
});
describe('URL privacy gate', () => {
  for (const url of ['https://example.com/?token=secret', 'https://example.com/?otp=123456', 'https://example.com/?email=person%40example.com', 'https://user:password@example.com', 'https://example.com/reset/123456789ABC', 'https://example.com/#access_token=secret', 'http://192.168.1.1/admin', 'http://localhost/', 'https://example.com/?key=secret']) {
    it(`keeps sensitive input local: ${url}`, () => expect(inspectUrlPrivacy(url).sensitive).toBe(true));
  }
  it('allows an ordinary public link', () => expect(inspectUrlPrivacy('https://example.com/news?category=science').sensitive).toBe(false));
});
describe('reputation adapters', () => {
  it('does not call providers that are not configured', async () => {
    const fetcher = vi.fn();const checks = await checkProviders('https://example.com', {}, fetcher);
    expect(fetcher).not.toHaveBeenCalled();expect(checks.every(c => c.status === 'not-configured')).toBe(true);
  });
  it('never sends a private URL even when credentials are configured', async () => {
    const fetcher = vi.fn();const checks = await checkProviders('https://example.com/?token=secret', { webRiskKey: 'test' }, fetcher);
    expect(fetcher).not.toHaveBeenCalled();expect(checks.every(c => c.status === 'skipped')).toBe(true);
  });
  it('parses a Web Risk threat and keeps source attribution', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ threat: { threatTypes: ['SOCIAL_ENGINEERING'], expireTime: new Date(Date.now()+10000).toISOString() } }), { status: 200 }));
    const checks = await checkProviders('https://example.com', { webRiskKey: 'test' }, fetcher);
    expect(checks[0].status).toBe('match');expect(Date.parse(checks[0].expiresAt!)).toBeLessThanOrEqual(Date.now()+11000);
  });
  it('never converts provider errors into a clean result', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{"error":"quota"}', { status: 429 }));
    const checks = await checkProviders('https://example.com', { webRiskKey: 'test', urlhausKey: 'test' }, fetcher);
    expect(checks[0].status).toBe('unavailable');expect(checks[2].status).toBe('unavailable');
  });
  it('requires confirmed PhishTank reports', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: { in_database: true, verified: false, valid: true } })));
    expect((await checkProviders('https://example.com', { phishTankKey: 'test' }, fetcher))[3].status).toBe('unavailable');
  });
  it('does not use Safe Browsing without explicit non-commercial configuration', async () => {
    const fetcher = vi.fn();await checkProviders('https://example.com', { safeBrowsingKey: 'test' }, fetcher);expect(fetcher).not.toHaveBeenCalled();
  });
});
