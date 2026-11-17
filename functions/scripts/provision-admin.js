'use strict';
/**
 * Protected one-time provisioner. Only run with an authorized service-account
 * credential in a trusted environment (not inside the APK or Vercel).
 * NEVER accept an admin UID from a client app.
 *
 * Usage:
 * SG_ADMIN_PROVISION_EMAIL=<verified-email> GOOGLE_APPLICATION_CREDENTIALS=<temporary-path>
 * node functions/scripts/provision-admin.js
 */
const {initializeApp} = require('firebase-admin/app');
const {getAuth} = require('firebase-admin/auth');
const {getFirestore,FieldValue} = require('firebase-admin/firestore');
async function main(){
  const email=String(process.env.SG_ADMIN_PROVISION_EMAIL||'').trim().toLowerCase();
  const project=String(process.env.GOOGLE_CLOUD_PROJECT||process.env.GCLOUD_PROJECT||'');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Missing validated admin email in protected environment.');
  if(project!=='smartguard-piloto-20261029')throw new Error('Refusing to provision another Firebase project.');
  initializeApp({projectId:project});
  const user=await getAuth().getUserByEmail(email);
  if(user.disabled||user.emailVerified!==true||user.isAnonymous)
    throw new Error('Administrator must have an enabled Firebase Auth account with a verified email.');
  const db=getFirestore();
  const ref=db.doc('admins/'+user.uid);
  const current=await ref.get();
  if(current.exists && current.data().enabled===true){
    process.stdout.write('Admin already provisioned; no changes made. UID '+user.uid+'\n');
    return;
  }
  const now=FieldValue.serverTimestamp();
  const auditRef=db.collection('sg_audit').doc();
  const batch=db.batch();
  batch.set(ref,{enabled:true,provisionedAt:now,source:'protected-operator-provisioning'},{merge:true});
  batch.set(auditRef,{uid:user.uid,actor:'protected-operator-provisioning',kind:'admin-provision',createdAt:now});
  await batch.commit();
  process.stdout.write('Verified administrator provisioned. UID '+user.uid+'\n');
}
main().catch(e=>{process.stderr.write((e instanceof Error?e.message:String(e))+'\n');process.exitCode=1;});
