#!/usr/bin/env node
// Source-level review only; cannot prove that a signed APK runs on any phone.
import fs from "node:fs";
import path from "node:path";
const read = p => fs.readFileSync(path.join(process.cwd(),p),"utf8");
const gradle=read("android/variables.gradle");
const build=read("android/app/build.gradle");
const manifest=read("android/app/src/main/AndroidManifest.xml");
const service=read("android/app/src/main/java/co/antesdeabrir/piloto/MessageListenerService.java");
const telemetry=read("android/app/src/main/java/co/antesdeabrir/piloto/FirebaseBackgroundTelemetry.java");
const landing=read("src/pages/home/android-app.tsx");
const readme=read("README.md");
const minSdk=Number(gradle.match(/minSdkVersion\s*=\s*(\d+)/)?.[1]||0);
const targetSdk=Number(gradle.match(/targetSdkVersion\s*=\s*(\d+)/)?.[1]||0);
const sourceCode=Number(build.match(/versionCode\s+(\d+)/)?.[1]||0);
const sourceVersion=build.match(/versionName\s+"([^"]+)"/)?.[1]||"unknown";
const publicVersion=landing.match(/SmartGuard-v(\d+\.\d+\.\d+)-piloto\.apk/)?.[1]||"unknown";
const checks=[
  ["Android app id",/applicationId\s+"co\.antesdeabrir\.piloto"/.test(build)],
  ["OS notification listener permission and component",manifest.includes("BIND_NOTIFICATION_LISTENER_SERVICE")&&manifest.includes("MessageListenerService")],
  ["Null/empty input guard",service.includes("if(text==null||text.length()>16384)return")&&service.includes("if(urls.isEmpty())")],
  ["Firebase background event hook",service.includes("FirebaseBackgroundTelemetry.record")],
  ["Native persistent queue and encryption",telemetry.includes("SQLiteOpenHelper")&&telemetry.includes("AndroidKeyStore")],
  ["Entrega 4 documentation linked from README",readme.includes("ENTREGA-4-SMARTGUARD-AUDITORIA.md")]
].map(([name,ok])=>({name,status:ok?"PASS":"FAIL"}));
const warnings=[
  "minSdk="+minSdk+" (Android 8+); Android 7 or earlier unsupported",
  "Android 10 and below low-RAM may not allow notification listener",
  "Source is "+sourceVersion+" code "+sourceCode+"; signed pilot v0.5.9 uses code 16",
  "Landing serves "+publicVersion+" rather than signed pilot 0.5.9",
  "Background retry is listener-dependent, not independent WorkManager",
  "Family PR #9 is not merged; Family group sharing is not verified on two phones"
];
const report={generatedAt:new Date().toISOString(),minSdk,targetSdk,sourceCode,sourceVersion,publicVersion,checks,warnings,scope:"Static source audit only; not a signed APK, device, uptime or user test"};
fs.writeFileSync("smartguard-e4-preflight.json",JSON.stringify(report,null,2)+"\n");
for(const check of checks)console.log("["+check.status+"] "+check.name);
for(const warning of warnings)console.log("[WARN] "+warning);
console.log("PRE-FLIGHT: "+checks.filter(c=>c.status==="PASS").length+"/"+checks.length+" checks passed; warnings are expected known gaps");
if(checks.some(x=>x.status==="FAIL"))process.exitCode=1;
