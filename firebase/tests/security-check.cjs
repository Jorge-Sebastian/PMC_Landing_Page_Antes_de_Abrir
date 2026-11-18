// Run ONLY with the local Firestore emulator, using demo project and synthetic UIDs.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, collection, getDoc, getDocs, query, limit, setDoc, updateDoc, writeBatch, serverTimestamp } = require('firebase/firestore');
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
  // Seed 9 existing members (host+8) as admin, permit person #10 and reject #11.
  const full = {'host-01':{nickname:'Anfitrión',role:'host',shareRisks:true,joinedAt:new Date()}};
  for(let i=1;i<9;i++)full['member-'+i]={nickname:'Miembro '+i,role:'member',shareRisks:true,joinedAt:new Date()};
  await testEnv.withSecurityRulesDisabled(async admin=>{
    await admin.firestore().doc('family_rooms/'+code).update({members:full});
  });
  const tenth = testEnv.authenticatedContext('new-member-10').firestore();
  const before = (await getDoc(roomRef(tenth))).data();
  await assertSucceeds(updateDoc(roomRef(tenth),{members:{...before.members,'new-member-10':profile('Persona número 10')}}));
  const eleventh = testEnv.authenticatedContext('new-member-11').firestore();
  const after = (await getDoc(roomRef(eleventh))).data();
  await assertFails(updateDoc(roomRef(eleventh),{members:{...after.members,'new-member-11':profile('Persona número 11')}}));
  await assertFails(updateDoc(roomRef(host),{pilotAdmission:true}));
  const pilotCode = 'SG-ABCDEFGH234567AC';
  const pilotMembers = {...after.members};
  for (let i=11;i<=50;i++) {
    pilotMembers['pilot-member-'+i]={nickname:'Piloto '+i,role:'member',shareRisks:true,joinedAt:new Date()};
  }
  await testEnv.withSecurityRulesDisabled(async admin => {
    await setDoc(doc(admin.firestore(),'family_rooms',pilotCode),{
      ...after,members:pilotMembers,pilotAdmission:true,
    });
  });
  const pilotRoom = doc(eleventh,'family_rooms',pilotCode);
  await assertFails(updateDoc(pilotRoom,{pilotAdmission:false}));
  await assertSucceeds(updateDoc(pilotRoom,{
    members:{...pilotMembers,'new-member-11':profile('Integrante del piloto')},
  }));
  await assertFails(updateDoc(roomRef(eleventh),{members:{...after.members,'new-member-11':profile('Persona número 11')}}));
  console.log('PASS hard 10-seat Firestore quota');
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

  // Commercial migration: the flag must not be turned on until entitlements
  // have been assigned. Once enabled, an individual/expired/free host cannot
  // create or synchronize family rooms, including previously joined members.
  const otherCode = 'SG-ABCDEFGHJKLMNPQS';
  const future = new Date(Date.now()+7*86400000);
  const past = new Date(Date.now()-86400000);
  await testEnv.withSecurityRulesDisabled(async admin=>{
    await admin.firestore().doc('sg_config/commercial').set({enforced:true});
    await admin.firestore().doc('sg_entitlements/host-01').set({plan:'individual',endsAt:future,revoked:false});
  });
  await assertFails(getDocs(query(collection(tenth,'family_rooms',code,'risk_events'),limit(20))));
  await assertFails(setDoc(doc(host,'family_rooms',otherCode),{
    name:'Otra familia',hostUid:'host-01',open:true,createdAt:serverTimestamp(),
    members:{'host-01':profile('Anfitrión','host')}
  }));
  await assertFails(setDoc(doc(host,'sg_entitlements','host-01'),{plan:'family',endsAt:future,revoked:false}));
  console.log('PASS no commercial client entitlement writes, individual subscription has no Family');

  await testEnv.withSecurityRulesDisabled(async admin=>{
    await admin.firestore().doc('sg_entitlements/host-01').set({plan:'family',endsAt:future,revoked:false});
  });
  await assertSucceeds(getDocs(query(collection(tenth,'family_rooms',code,'risk_events'),limit(20))));
  await assertSucceeds(setDoc(doc(host,'family_rooms',otherCode),{
    name:'Otra familia',hostUid:'host-01',open:true,createdAt:serverTimestamp(),
    members:{'host-01':profile('Anfitrión','host')}
  }));
  console.log('PASS premium family can create room and existing members see risks');

  await testEnv.withSecurityRulesDisabled(async admin=>{
    await admin.firestore().doc('sg_entitlements/host-01').set({plan:'family',endsAt:past,revoked:false});
  });
  await assertFails(getDocs(query(collection(tenth,'family_rooms',code,'risk_events'),limit(20))));
  await testEnv.withSecurityRulesDisabled(async admin=>{
    await admin.firestore().doc('sg_config/commercial').set({enforced:false});
  });
  await assertSucceeds(getDocs(query(collection(tenth,'family_rooms',code,'risk_events'),limit(20))));
  console.log('PASS expiry blocks Family; pilot flag false restores legacy access');



  const tester = testEnv.authenticatedContext('pilot-tester', {email_verified:true, email:'tester@example.test'}).firestore();
  const customer = testEnv.authenticatedContext('pilot-customer', {email_verified:true, email:'customer@example.test'}).firestore();
  const testCodeHash = 'a'.repeat(64);
  const customerCodeHash = 'b'.repeat(64);
  const guestCodeHash = 'c'.repeat(64);
  await testEnv.withSecurityRulesDisabled(async context => {
    const trusted = context.firestore();
    await setDoc(doc(trusted,'sg_pilot_testers','pilot-tester'), {enabled:true});
    await setDoc(doc(trusted,'sg_pilot_codes',testCodeHash), {plan:'family',usedBy:null,redeemedAt:null});
    await setDoc(doc(trusted,'sg_pilot_codes',customerCodeHash), {plan:'individual',usedBy:null,redeemedAt:null});
    await setDoc(doc(trusted,'sg_pilot_codes',guestCodeHash), {plan:'individual',usedBy:null,redeemedAt:null});
  });
  const pilotRef = (db, uid) => doc(db,'sg_pilot_access',uid);
  const presetRef = (db, hash) => doc(db,'sg_pilot_codes',hash);
  const pilotRecord = (plan, codeHash) => ({plan,codeHash,startsAt:serverTimestamp()});
  const redeem = (db, uid, hash, plan) => {
    const batch = writeBatch(db);
    batch.update(presetRef(db,hash),{usedBy:uid,redeemedAt:serverTimestamp()});
    batch.set(pilotRef(db,uid),pilotRecord(plan,hash));
    return batch.commit();
  };
  const reset = (db, uid, hash) => {
    const batch = writeBatch(db);
    batch.update(presetRef(db,hash),{usedBy:null,redeemedAt:null});
    batch.delete(pilotRef(db,uid));
    return batch.commit();
  };
  await assertSucceeds(setDoc(doc(tester,'sg_pilot_accounts','pilot-tester'),{startsAt:serverTimestamp()}));
  await assertFails(getDoc(doc(customer,'sg_pilot_accounts','pilot-tester')));
  await assertFails(getDocs(collection(tester,'sg_pilot_codes')));
  await assertFails(setDoc(pilotRef(tester,'pilot-tester'),pilotRecord('family',testCodeHash)));
  await assertFails(updateDoc(presetRef(tester,testCodeHash),{usedBy:'pilot-tester',redeemedAt:serverTimestamp()}));
  const publicDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(redeem(publicDb,'guest-01',guestCodeHash,'individual'));
  await assertSucceeds(setDoc(doc(guest,'sg_pilot_accounts','guest-01'),{startsAt:serverTimestamp()}));
  await assertSucceeds(setDoc(doc(guest,'sg_pilot_trials','guest-01'),{startsAt:serverTimestamp()}));
  await assertFails(setDoc(doc(guest,'sg_pilot_trials','guest-01'),{startsAt:serverTimestamp()}));
  await assertSucceeds(redeem(guest,'guest-01',guestCodeHash,'individual'));
  await assertFails(reset(guest,'guest-01',guestCodeHash));
  await assertFails(redeem(tester,'pilot-tester',testCodeHash,'individual'));
  await assertSucceeds(redeem(tester,'pilot-tester',testCodeHash,'family'));
  await assertFails(redeem(customer,'pilot-customer',testCodeHash,'family'));
  await assertFails(reset(customer,'pilot-tester',testCodeHash));
  await assertFails(redeem(tester,'pilot-tester',customerCodeHash,'individual'));
  await assertSucceeds(reset(tester,'pilot-tester',testCodeHash));
  assert.equal((await getDoc(pilotRef(tester,'pilot-tester'))).exists(), false);
  assert.equal((await getDoc(doc(tester,'sg_pilot_accounts','pilot-tester'))).exists(), true);
  await assertSucceeds(redeem(tester,'pilot-tester',testCodeHash,'family'));
  await assertSucceeds(redeem(customer,'pilot-customer',customerCodeHash,'individual'));
  await assertFails(reset(customer,'pilot-customer',customerCodeHash));
  const trial = doc(tester,'sg_pilot_trials','pilot-tester');
  await assertSucceeds(setDoc(trial,{startsAt:serverTimestamp()}));
  await assertFails(setDoc(trial,{startsAt:serverTimestamp()}));
  console.log('PASS fixed codes, one-time redemption, and authorized tester reset');

  console.log('PASS all synthetic rules tests');
 } finally {await testEnv.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1;});
