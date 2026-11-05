#!/usr/bin/env node
/**
 * Check that the public Vercel website and /familia serve the SmartGuard SPA.
 * HTTP availability is NOT proof of Firebase connectivity or Android behavior.
 */
import { mkdir, writeFile } from 'node:fs/promises';

const target = process.env.SMARTGUARD_PUBLIC_URL || process.argv[2];
const output = process.env.QUALITY_OUTPUT_DIR || 'reports/web-quality';
const results = [];
const now = new Date().toISOString();
try {
  if (!target) throw Error('Falta SMARTGUARD_PUBLIC_URL.');
  const base = new URL(target);
  if (base.protocol !== 'https:' || base.username || base.password || base.port || base.search || base.hash ||
    base.hostname === 'localhost' || base.hostname.endsWith('.local')) throw Error('La URL pública debe ser HTTPS sin parámetros ni credenciales.');
  for (const pathname of ['/', '/familia']) {
    const url = new URL(pathname, base.origin);
    const response = await fetch(url, { signal: AbortSignal.timeout(25000), redirect: 'follow' });
    const html = await response.text();
    const looksLikeSmartGuard = /SmartGuard/i.test(html) && /id=["']root["']/.test(html);
    const protectedDeployment = /Vercel Authentication|Authentication Required|deployment protection|Login with Vercel/i.test(html);
    const okay = response.ok && looksLikeSmartGuard && !protectedDeployment && response.url.startsWith(base.origin);
    results.push({ path: pathname, statusCode: response.status, resolvedUrl: response.url, looksLikeSmartGuard, protectedDeployment, passed: okay });
    console.log(`${okay ? 'PASS' : 'FAIL'} ${url.href}: HTTP ${response.status}, SmartGuard=${looksLikeSmartGuard}, protected=${protectedDeployment}`);
  }
} catch (error) {
  results.push({ passed: false, error: String(error?.message || error) });
  console.error('No se pudo comprobar la web publica:', error?.message || error);
}
await mkdir(output, { recursive: true });
await writeFile(`${output}/public-site.json`, JSON.stringify({ checkedAt: now, target: target || null, results }, null, 2) + '\n');
if (!results.length || results.some(row => !row.passed)) process.exitCode = 1;
