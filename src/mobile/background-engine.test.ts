import { describe, expect, it } from 'vitest';
import { analyze } from './background-engine';

describe('Android shared analysis contract', () => {
  it('includes the new exported official catalog offline', () => {
    expect(analyze('https://bancolombia.com').verdict.officialMatch?.brandName).toBeTruthy();
  });
  it('does not classify every two official brands as the same redirect', () => {
    const r = analyze('https://google.com', { checked: true, reachable: true, differentHost: true, finalHost: 'paypal.com', finalUrl: 'https://paypal.com' });
    expect(r.verdict.signals.some(s => s.id === 'otra-web-oculta')).toBe(true);
  });
  it('checks the final URL even when the written URL looks ordinary', () => {
    const r = analyze('https://example.com', { checked: true, reachable: true, differentHost: true, finalHost: '127.0.0.1', finalUrl: 'http://127.0.0.1/login' });
    expect(r.verdict.signals.some(s => s.id === 'direccion-numerica')).toBe(true);
    expect(r.verdict.signals.map(s => s.id).length).toBe(new Set(r.verdict.signals.map(s => s.id)).size);
  });
  it('preserves new-domain observations and specific evidence', () => {
    const r = analyze('https://example.com', { checked: true, reachable: true, domainAgeDays: 3 });
    expect(r.verdict.signals.find(s => s.id === 'dominio-nuevo')?.params?.evidence).toContain('3 días');
  });
  it('keeps pending analysis distinct from remote observations', () => {
    expect(analyze('https://example.com').destination).toBeNull();
  });
});
