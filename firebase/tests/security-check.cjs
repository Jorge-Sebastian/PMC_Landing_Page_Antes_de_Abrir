// Run ONLY with the local Firestore emulator, using demo project and synthetic UIDs.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, collection, getDoc, getDocs, query, limit, setDoc, updateDoc, serverTimestamp } = require('firebase/firestore');
const projectId = 'demo-smartguard-family';
const root = path.resolve(__dirname,'..');
const rules = fs.readFileSync(path.join(root,'firestore.rules'),'utf8');
const code = 'SG-ABCDEFGHJKLMNPQR';
const profile = (nickname,role='member',sharing=true) => ({nickname,role,shareRisks:sharing,joinedAt:serverTimestamp()});
const event = (uid,color='red') => ({memberUid:uid,domain:'netf1ix-acceso.com',color,source:'manual',engineVersion:'0.5.9',createdAt:serverTimestamp()});
(async()=>{
 const testEnv = await initializeTestEnvironment({projectId,firestore:{rules,host:'127.0.0.1',port:8080}});
 try {
  const host = testEnv.authenticatedContext('host-01').firestore();
  const outsider = testEnv.authenticatedContext('outsider-01').firestore();
  const guest = testEnv.authenticatedContext('guest-01').firestore();
  const roomRef = db=>doc(db,'family_rooms',code);
  await assertSucceeds(setDoc(roomRef(host),{
    name:'Familia de prueba',hostUid:'host-01',open:true,createdAt:serverTimestamp(),members:{'host-01':profile('Anfitrión','host')}
  }));
  console.log('PASS room host creation');
  await assertSucceeds(getDoc(roomRef(outsider))); // Knowing secret code reveals room metadata, not events.
  await assertFails(getDocs(collection(outsider,'family_rooms')));
  await assertFails(getDocs(query(collection(outsider,'family_rooms',code,'risk_events'),limit(20))));
  console.log('PASS code-only metadata; no room/event enumeration');
  const old = (await getDoc(roomRef(guest))).data();
  await assertSucceeds(updateDoc(roomRef(guest),{members:{...old.members,'guest-01':profile('Tía Andrea')}}));
  console.log('PASS joining authenticated guest');
  await assertSucceeds(setDoc(doc(host,'family_rooms',code,'risk_events','aaaaaaaaaaaa1111'),event('host-01')));
  await assertSucceeds(getDocs(query(collection(guest,'family_rooms',code,'risk_events'),limit(50))));
  await assertFails(setDoc(doc(outsider,'family_rooms',code,'risk_events','bbbbbbbbbbbb1111'),event('outsider-01')));
  await assertFails(setDoc(doc(guest,'family_rooms',code,'risk_events','bbbbbbbbbbbb2222'),event('guest-01','orange')));
  await assertFails(setDoc(doc(guest,'family_rooms',code,'risk_events','bbbbbbbbbbbb3333'),{...event('guest-01'),url:'https://secret.example/path?token=x'}));
  console.log('PASS red-only consent and private events');
  const groom = (await getDoc(roomRef(guest))).data();
  await assertFails(updateDoc(roomRef(guest),{members:{...groom.members,'host-01':{...groom.members['host-01'],nickname:'Spoofed'}}}));
  console.log('PASS no impersonation/profile takeover');
  // Seed 19 existing members (host+18) as admin, then permit person #20 and reject #21.
  const full = {'host-01':{nickname:'Anfitrión',role:'host',shareRisks:true,joinedAt:new Date()}};
  for(let i=1;i<19;i++)full['member-'+i]={nickname:'Miembro '+i,role:'member',shareRisks:true,joinedAt:new Date()};
  await testEnv.withSecurityRulesDisabled(async admin=>{
    await admin.firestore().doc('family_rooms/'+code).update({members:full});
  });
  const twentieth = testEnv.authenticatedContext('new-member-20').firestore();
  const before = (await getDoc(roomRef(twentieth))).data();
  await assertSucceeds(updateDoc(roomRef(twentieth),{members:{...before.members,'new-member-20':profile('Persona número 20')}}));
  const twentyfirst = testEnv.authenticatedContext('new-member-21').firestore();
  const after = (await getDoc(roomRef(twentyfirst))).data();
  await assertFails(updateDoc(roomRef(twentyfirst),{members:{...after.members,'new-member-21':profile('Persona número 21')}}));
  console.log('PASS hard 20-seat Firestore quota');
  await assertFails(getDoc(doc(outsider,'devices','host-01'))); // Existing device isolation preserved.
  // Verify the quality collection without granting access to other users.
  await testEnv.withSecurityRulesDisabled(async admin=>{
    await admin.firestore().doc('devices/host-01').set({
      consent:true,shareWithAdmin:true,consentVersion:1,apkVersion:'0.6.5',
      createdAt:new Date(),lastSeenAt:new Date()
    });
  });
  const quality = (revision=1) => ({
    day:'2026-11-04',apkVersion:'0.6.5',schemaVersion:1,revision,sdkLevel:31,
    serviceChecks:10,healthyChecks:9,eligibleNotifications:8,analysesOk:7,
    analysesFailed:1,alertsRequested:3,alertsPosted:2,
    eventsGenerated:8,eventsAcked:7,eventsPending:1,syncFailures:0,syncRetries:0,
    analysisDurationSumMs:2500,analysisDurationCount:8,alertDurationSumMs:920,alertDurationCount:3,
    analysisBins:[1,1,1,1,1,1,1,1],alertBins:[0,0,0,1,1,0,1,0],
    receivedAt:serverTimestamp()
  });
  const qpath=(db)=>doc(db,'devices','host-01','daily_metrics','2026-11-04');
  await assertSucceeds(setDoc(qpath(host),quality()));
  await assertSucceeds(getDoc(qpath(host)));
  await assertFails(getDoc(qpath(guest)));
  await assertFails(setDoc(qpath(guest),quality()));
  await assertFails(setDoc(doc(host,'devices','host-01','daily_metrics','2026-11-03'),quality()));
  await assertFails(updateDoc(qpath(host),{...quality(2),eventsAcked:100}));
  await assertFails(updateDoc(qpath(host),{...quality(2),message:'private content'}));
  await assertSucceeds(updateDoc(qpath(host),{...quality(2),analysesOk:8}));
  console.log('PASS quality isolation, strict fields, bound and monotonic revision');

  console.log('PASS all synthetic rules tests');
 } finally {await testEnv.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1;});
