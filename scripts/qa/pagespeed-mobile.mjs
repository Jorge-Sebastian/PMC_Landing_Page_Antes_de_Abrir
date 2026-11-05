#!/usr/bin/env node
/**
 * One-off/automated Google PageSpeed Insights mobile audit.
 * Requires only a public HTTPS URL. Never reports guessed scores.
 */
import { mkdir, writeFile } from 'node:fs/promises';

const TARGET = process.env.SMARTGUARD_PUBLIC_URL || process.argv[2];
const OUTPUT = process.env.QUALITY_OUTPUT_DIR || 'reports/web-quality';
const THRESHOLDS = { performance: 70, accessibility: 80 };
const NOW = new Date().toISOString();

function validateUrl(value) {
  if (!value) throw Error('Configure SMARTGUARD_PUBLIC_URL con la URL publica HTTPS de SmartGuard.');
  let url;
  try { url = new URL(value); } catch { throw Error('La URL de SmartGuard no es valida.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash ||
      url.hostname === 'localhost' || url.hostname.endsWith('.local') || /^(?:127\.|10\.|192\.168\.)/.test(url.hostname)) {
    throw Error('La auditoria requiere una URL publica HTTPS, sin contrasenas, tokens, puerto ni parametros.');
  }
  return url.origin + (url.pathname === '/' ? '/' : url.pathname);
}

async function save(report) {
  await mkdir(OUTPUT, { recursive: true });
  await writeFile(`${OUTPUT}/pagespeed-mobile.json`, JSON.stringify(report, null, 2) + '\n');
}

try {
  const url = validateUrl(TARGET);
  const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  endpoint.searchParams.set('url', url);
  endpoint.searchParams.set('strategy', 'mobile');
  endpoint.searchParams.set('locale', 'es');
  endpoint.searchParams.append('category', 'performance');
  endpoint.searchParams.append('category', 'accessibility');
  // Optional secret for higher request quotas. Do not serialize it into reports.
  if (process.env.PAGESPEED_API_KEY) endpoint.searchParams.set('key', process.env.PAGESPEED_API_KEY);
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(180000), headers: { accept: 'application/json' } });
  if (!response.ok) throw Error(`PageSpeed API respondió HTTP ${response.status}: no hay puntuaciones verificadas.`);
  const payload = await response.json();
  const data = payload.lighthouseResult;
  if (!data || !data.categories) throw Error('PageSpeed no devolvio categorias Lighthouse.');
  const scores = Object.fromEntries(Object.keys(THRESHOLDS).map(key => [key, Math.round(100 * data.categories[key]?.score)]));
  if (Object.values(scores).some(score => !Number.isFinite(score))) throw Error('PageSpeed devolvio puntuaciones incompletas.');
  const audits = Object.values(data.audits || {})
    .filter(a => a && a.details?.type === 'opportunity' && typeof a.details?.overallSavingsMs === 'number')
    .sort((a, b) => b.details.overallSavingsMs - a.details.overallSavingsMs)
    .slice(0, 8)
    .map(a => ({ title: a.title, potentialSavingsMs: Math.round(a.details.overallSavingsMs), description: a.description || '' }));
  const passed = Object.keys(THRESHOLDS).every(key => scores[key] >= THRESHOLDS[key]);
  const report = {
    checkedAt: NOW,
    testedUrl: url,
    resolvedUrl: data.finalDisplayedUrl || data.finalUrl || url,
    strategy: 'mobile',
    scores,
    thresholds: THRESHOLDS,
    passed,
    lighthouseVersion: data.lighthouseVersion,
    audits,
    note: 'Puntuaciones obtenidas de la API oficial de PageSpeed. No certifica la APK.'
  };
  await save(report);
  console.log(`SmartGuard PageSpeed móvil: Rendimiento ${scores.performance}/100 (mínimo 70), Accesibilidad ${scores.accessibility}/100 (mínimo 80).`);
  console.log(`Informe JSON: ${OUTPUT}/pagespeed-mobile.json`);
  if (!passed) process.exitCode = 1;
} catch (error) {
  const report = { checkedAt: NOW, testedUrl: TARGET || null, strategy: 'mobile', status: 'NO_VERIFICADO', error: String(error?.message || error), scores: null };
  await save(report);
  console.error('NO VERIFICADO:', report.error);
  process.exitCode = 1;
}
