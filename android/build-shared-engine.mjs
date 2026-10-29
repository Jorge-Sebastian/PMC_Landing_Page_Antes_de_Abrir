import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const assets = 'android/app/src/main/assets';
await mkdir(assets, { recursive: true });
const result = await build({
  entryPoints: ['src/mobile/background-engine.ts'],
  bundle: true, format: 'iife', globalName: 'PMCEngine', write: false,
  target: 'es2019',
});
const javascript = result.outputFiles[0].text.replaceAll('</script', '<\/script');
await writeFile(`${assets}/shared-engine.html`, `<!doctype html><meta charset="utf-8"><script>${javascript}</script>`);

// Local dev may provide .env.mobile. GitHub Actions can provide variables.
let localConfig = {};
try {
  const lines = (await readFile('.env.mobile', 'utf8')).split(/\r?\n/);
  localConfig = Object.fromEntries(lines.filter(line => line.includes('=') && !line.trim().startsWith('#'))
    .map(line => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()]));
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}
const env = { ...localConfig, ...Object.fromEntries(Object.entries(process.env).filter(([,value]) => value !== undefined && value !== '')) };
const url = env.VITE_SUPABASE_URL || '';
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
if ((!url || !key) && process.env.REQUIRE_ANDROID_BACKEND === 'true') {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
}
if (!url || !key) {
  console.warn('Android build has no remote check-link backend: destination checks will be unavailable.');
}
await writeFile(`${assets}/backend.json`, JSON.stringify({ url, key, threatEnabled: Boolean(url && key && env.VITE_THREAT_CHECK_ENABLED === 'true') }));
console.log('Shared engine and public service configuration built.');
