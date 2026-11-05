import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = path => fs.readFileSync(path, 'utf8');
const code = read('android/app/src/main/java/co/antesdeabrir/piloto/NativePerformance.java');
const gradle = read('android/app/build.gradle');
const manifest = read('android/app/src/main/AndroidManifest.xml');
const plugin = read('android/app/src/main/java/co/antesdeabrir/piloto/ProtectionPlugin.java');
const native = read('src/mobile/native.ts');
assert.match(code, /firebaseReady\(Context context\)/);
assert.match(code, /google_app_id/);
assert.match(code, /:android:/);
assert.match(code, /MAX_RECENT = 64/);
assert.match(code, /"sharing", false/);
assert.match(code, /sg_.*kind/);
for (const kind of ['app_ready', 'manual_analysis', 'notification_analysis', 'family_join', 'family_create', 'family_upload']) assert.ok(code.includes(kind));
for (const name of ['performanceStatus','performanceSharing','performanceStart','performanceStop','performanceUiReady']) {
 assert.ok(plugin.includes(name), `Missing Android bridge ${name}`);
 assert.ok(native.includes(name), `Missing TypeScript bridge ${name}`);
}
assert.match(gradle,/firebase-perf/);
assert.match(manifest,/firebase_performance_collection_enabled/);
assert.ok(fs.readFileSync('.gitignore','utf8').includes('android/app/google-services.json'), 'Android Firebase config must be gitignored');
console.log('SmartGuard Android Performance source/privacy checks PASS');
