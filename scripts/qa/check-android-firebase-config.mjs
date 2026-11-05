import fs from 'node:fs';
import assert from 'node:assert/strict';
const path=process.argv[2] || 'android/app/google-services.json';
let config;
try { config=JSON.parse(fs.readFileSync(path,'utf8')); }
catch { console.error('Invalid Android google-services.json'); process.exit(1); }
const project=config.project_info?.project_id;
const android=config.client?.some(client=>client.client_info?.android_client_info?.package_name==='co.antesdeabrir.piloto'
  && /:android:/.test(client.client_info?.mobilesdk_app_id||''));
assert.equal(project,'smartguard-piloto-20261029','Firebase project mismatch');
assert.ok(android,'Missing registered SmartGuard Android package');
console.log('Android Firebase project + package registration verified; credentials not printed.');
