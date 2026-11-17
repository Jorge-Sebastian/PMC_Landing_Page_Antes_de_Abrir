'use strict';
/**
 * SmartGuard commercial authority. These are REAL server operations, not UI flags.
 * Deploy ONLY after installing dependencies, running tests and reviewing Firestore rules.
 * Uses the existing smartguard-piloto-20261029 project; never stores payment screenshots.
 */
const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {initializeApp} = require('firebase-admin/app');
const {getAuth} = require('firebase-admin/auth');
const {getFirestore, Timestamp, FieldValue} = require('firebase-admin/firestore');
const {
  DAY_MS, TRIAL_DAYS, PAID_DAYS, PLAN_COP, PAID_PLANS, publicCustomerId,
  effectiveAccess, nextPaidExpiry, activationCode, codeHash, paymentFingerprint, operationId,
} = require('./lib/commercial');

initializeApp();
const db = getFirestore();
const auth = getAuth();
const opts = {region:'us-central1',maxInstances:8,memory:'256MiB'};
const nowStamp = () => Timestamp.now();
const accountRef = uid => db.doc('sg_accounts/' + uid);
const entitlementRef = uid => db.doc('sg_entitlements/' + uid);
const trialRef = uid => db.doc('sg_trials/' + uid);
const asIso = value => value && typeof value.toDate === 'function' ? value.toDate().toISOString() : null;

function authenticated(request) {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated','Inicia sesion en SmartGuard.');
  return uid;
}
async function requireVerifiedUser(uid) {
  const user = await auth.getUser(uid);
  if (user.disabled) throw new HttpsError('permission-denied','Cuenta deshabilitada.');
  if (!user.emailVerified) throw new HttpsError('failed-precondition','Vincula y verifica tu correo para utilizar una suscripcion recuperable.');
  return user;
}
async function requireAdmin(request) {
  const uid = authenticated(request);
  const record = await auth.getUser(uid);
  if (!record.emailVerified || record.disabled) throw new HttpsError('permission-denied','Administrador no verificado.');
  const snap = await db.doc('admins/' + uid).get();
  if (!snap.exists || snap.data().enabled !== true) throw new HttpsError('permission-denied','Sin permiso de administrador.');
  return uid;
}
function safeInput(value, pattern, label) {
  if (typeof value !== 'string' || !pattern.test(value)) throw new HttpsError('invalid-argument',label + ' no valido.');
  return value;
}
function validatePlan(value) {
  if (!PAID_PLANS.includes(value)) throw new HttpsError('invalid-argument','Plan de pago no valido.');
  return value;
}
function validateOp(value) {
  try { return operationId(value); } catch { throw new HttpsError('invalid-argument','Se requiere un identificador unico de operacion (20 a 72 caracteres).'); }
}
function toAccess(doc) {
  const result = effectiveAccess(doc);
  return {plan:result.plan,paid:result.paid,trial:result.trial,endsAt:result.endsAt,features:{
    history:result.plan!=='free',automatic:result.plan!=='free',
    familyGroup:result.plan==='trial'||result.plan==='family',
    familySeats:result.plan==='trial'||result.plan==='family'?10:0,
  }};
}
function validateTransfer(value, plan, amount) {
  const reference = String(value || '').trim();
  let fingerprint;
  try { fingerprint = paymentFingerprint(reference); }
  catch { throw new HttpsError('invalid-argument','Referencia bancaria obligatoria (6 a 100 caracteres).'); }
  if (amount !== PLAN_COP[plan]) throw new HttpsError('invalid-argument','El importe no coincide con el plan.');
  return {fingerprint,reference};
}
function normalizedCustomerId(uid) {
  return publicCustomerId(uid);
}

exports.sgRegisterCustomer = onCall(opts, async request => {
  const uid = authenticated(request);
  const input = request.data || {};
  const installationId = safeInput(input.installationId,/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,'Instalacion');
  const apkVersion = safeInput(input.apkVersion || '0.6.0',/^[0-9][A-Za-z0-9.+_-]{0,31}$/,'Version APK');
  const platform = input.platform === 'android' ? 'android' : 'web';
  const ref = accountRef(uid);
  const device = ref.collection('installations').doc(installationId);
  const alias = normalizedCustomerId(uid);
  await db.runTransaction(async tx => {
    const [current,existingDevice] = await Promise.all([tx.get(ref),tx.get(device)]);
    if (!current.exists) tx.create(ref,{publicId:alias,createdAt:nowStamp(),lastSeenAt:nowStamp(),schemaVersion:1});
    else tx.update(ref,{lastSeenAt:nowStamp()});
    if (!existingDevice.exists) tx.create(device,{createdAt:nowStamp(),lastSeenAt:nowStamp(),platform,apkVersion});
    else tx.update(device,{lastSeenAt:nowStamp(),apkVersion,platform});
  });
  return {uid,publicId:alias,registered:true};
});
exports.sgGetAccess = onCall(opts, async request => {
  const uid = authenticated(request);
  const [account,entitlement,trial] = await Promise.all([
    accountRef(uid).get(),entitlementRef(uid).get(),trialRef(uid).get()
  ]);
  return {uid,publicId:account.exists?account.data().publicId:normalizedCustomerId(uid),
    registered:account.exists,trialUsed:trial.exists,...toAccess(entitlement.exists?entitlement.data():null)};
});
exports.sgStartTrial = onCall(opts, async request => {
  const uid = authenticated(request);
  await requireVerifiedUser(uid);
  const tRef = trialRef(uid), eRef = entitlementRef(uid);
  const result = await db.runTransaction(async tx => {
    const [used,current] = await Promise.all([tx.get(tRef),tx.get(eRef)]);
    if (used.exists) throw new HttpsError('already-exists','La prueba de esta cuenta ya fue utilizada.');
    const existing = effectiveAccess(current.exists?current.data():null);
    if (existing.paid) throw new HttpsError('failed-precondition','Ya existe una suscripcion pagada activa.');
    const started = nowStamp(), ends = Timestamp.fromMillis(started.toMillis()+TRIAL_DAYS*DAY_MS);
    tx.create(tRef,{startedAt:started,endsAt:ends});
    tx.set(eRef,{plan:'trial',startsAt:started,endsAt:ends,source:'trial',revoked:false,updatedAt:started});
    return {plan:'trial',endsAt:ends.toDate().toISOString()};
  });
  return result;
});
exports.sgAdminListCustomers = onCall(opts, async request => {
  await requireAdmin(request);
  const raw = Number((request.data||{}).limit||50);
  const limit = Number.isInteger(raw)?Math.max(1,Math.min(100,raw)):50;
  const searchId = String((request.data||{}).publicId||'').trim().toUpperCase();
  const query = searchId
    ? db.collection('sg_accounts').where('publicId','==',searchId).limit(1)
    : db.collection('sg_accounts').orderBy('createdAt','desc').limit(limit);
  const customers = await query.get();
  const refs = customers.docs.map(d=>entitlementRef(d.id));
  const entries = refs.length?await db.getAll(...refs):[];
  return {customers:customers.docs.map((doc,i)=>{
    const a=doc.data(),access=toAccess(entries[i].exists?entries[i].data():null);
    return {uid:doc.id,publicId:a.publicId,createdAt:asIso(a.createdAt),lastSeenAt:asIso(a.lastSeenAt),...access};
  }),hasMore:!searchId&&customers.size===limit};
});
exports.sgAdminGetCustomer = onCall(opts, async request => {
  await requireAdmin(request);
  const uid = safeInput((request.data||{}).uid,/^[A-Za-z0-9_-]{8,128}$/,'UID');
  const [a,e,t,devices,user] = await Promise.all([
    accountRef(uid).get(),entitlementRef(uid).get(),trialRef(uid).get(),
    accountRef(uid).collection('installations').orderBy('lastSeenAt','desc').limit(20).get(),
    auth.getUser(uid)
  ]);
  if (!a.exists) throw new HttpsError('not-found','Cuenta no registrada.');
  return {uid,publicId:a.data().publicId,createdAt:asIso(a.data().createdAt),
    lastSeenAt:asIso(a.data().lastSeenAt),email:user.emailVerified?user.email:null,
    emailVerified:user.emailVerified,trialUsed:t.exists,...toAccess(e.exists?e.data():null),
    devices:devices.docs.map(d=>({id:d.id,...d.data(),createdAt:asIso(d.data().createdAt),lastSeenAt:asIso(d.data().lastSeenAt)}))
      .map(d=>({id:d.id,platform:d.platform,apkVersion:d.apkVersion,createdAt:d.createdAt,lastSeenAt:d.lastSeenAt}))};
});
async function grantWithAudit({actor,uid,plan,reason,opId,source,transfer}) {
  const operation = db.doc('sg_admin_operations/'+opId);
  const entitlement = entitlementRef(uid);
  const audit = db.doc('sg_audit/'+opId);
  const payment = transfer?db.doc('sg_payment_references/'+transfer.fingerprint):null;
  return db.runTransaction(async tx=>{
    const [old,done,usedPayment] = await Promise.all([
      tx.get(entitlement),tx.get(operation),payment?tx.get(payment):Promise.resolve(null)
    ]);
    if (done.exists) {
      const previous=done.data();
      if (previous.uid!==uid || previous.actor!==actor || previous.plan!==plan)
        throw new HttpsError('already-exists','Identificador de operacion reutilizado.');
      return {duplicate:true,endsAt:asIso(previous.endsAt)};
    }
    if (usedPayment&&usedPayment.exists) throw new HttpsError('already-exists','Referencia de transferencia ya utilizada.');
    const time = nowStamp(), expiry = Timestamp.fromMillis(nextPaidExpiry(old.exists?old.data():null,time.toMillis()));
    tx.set(entitlement,{plan,startsAt:time,endsAt:expiry,source,revoked:false,updatedAt:time});
    const record = {uid,actor,plan,source,reason,endsAt:expiry,createdAt:time};
    tx.create(operation,record);
    tx.create(audit,{...record,kind:'grant',previousPlan:old.exists?old.data().plan:'free'});
    if(payment)tx.create(payment,{uid,plan,amountCOP:PLAN_COP[plan],
      reference:transfer.reference,verifiedBy:actor,verifiedAt:time,fulfillment:'direct',operationId:opId});
    return {duplicate:false,endsAt:expiry.toDate().toISOString()};
  });
}
exports.sgAdminGrantPlan = onCall(opts,async request=>{
  const actor = await requireAdmin(request);
  const d=request.data||{};
  const uid=safeInput(d.uid,/^[A-Za-z0-9_-]{8,128}$/,'UID');
  const plan=validatePlan(d.plan);
  const opId=validateOp(d.operationId);
  const reason=safeInput(String(d.reason||'').trim(),/^.{8,300}$/,'Motivo');
  await requireVerifiedUser(uid);
  const source=d.source==='payment'?'payment':'admin';
  const transfer=source==='payment'?(d.bankVerified===true?validateTransfer(d.paymentReference,plan,d.amountCOP):null):null;
  if(source==='payment'&&!transfer)throw new HttpsError('failed-precondition','Confirma haber verificado realmente la transferencia bancaria.');
  return {uid,plan,...await grantWithAudit({actor,uid,plan,reason,opId,source,transfer})};
});
exports.sgAdminRevokePlan = onCall(opts,async request=>{
  const actor=await requireAdmin(request),d=request.data||{};
  const uid=safeInput(d.uid,/^[A-Za-z0-9_-]{8,128}$/,'UID');
  const opId=validateOp(d.operationId),reason=safeInput(String(d.reason||'').trim(),/^.{8,300}$/,'Motivo');
  const entitlement=entitlementRef(uid),audit=db.doc('sg_audit/'+opId),operation=db.doc('sg_admin_operations/'+opId);
  return db.runTransaction(async tx=>{
    const [old,done]=await Promise.all([tx.get(entitlement),tx.get(operation)]);
    if(done.exists)throw new HttpsError('already-exists','La operacion ya fue realizada.');
    const time=nowStamp();
    tx.set(entitlement,{plan:'free',startsAt:time,endsAt:time,source:'admin',revoked:true,updatedAt:time});
    const record={uid,actor,plan:'free',kind:'revoke',previousPlan:old.exists?old.data().plan:'free',reason,createdAt:time};
    tx.create(audit,record);tx.create(operation,record);
    return {uid,plan:'free',revoked:true};
  });
});
exports.sgAdminIssueCode = onCall(opts,async request=>{
  const actor=await requireAdmin(request),d=request.data||{};
  const uid=safeInput(d.uid,/^[A-Za-z0-9_-]{8,128}$/,'UID'),plan=validatePlan(d.plan);
  const opId=validateOp(d.operationId),reason=safeInput(String(d.reason||'').trim(),/^.{8,300}$/,'Motivo');
  if(d.bankVerified!==true)throw new HttpsError('failed-precondition','Verifica el pago en tu banco antes de emitir el codigo.');
  const transfer=validateTransfer(d.paymentReference,plan,d.amountCOP);
  await requireVerifiedUser(uid);
  const code=activationCode(),hash=codeHash(code),time=nowStamp();
  const payment=db.doc('sg_payment_references/'+transfer.fingerprint);
  const issued=db.doc('sg_activation_codes/'+hash),operation=db.doc('sg_admin_operations/'+opId);
  await db.runTransaction(async tx=>{
    const [oldPay,oldCode,oldOp]=await Promise.all([tx.get(payment),tx.get(issued),tx.get(operation)]);
    if(oldPay.exists || oldCode.exists || oldOp.exists)throw new HttpsError('already-exists','Codigo, comprobante u operacion ya registrados.');
    tx.create(payment,{uid,plan,amountCOP:PLAN_COP[plan],reference:transfer.reference,
      verifiedBy:actor,verifiedAt:time,fulfillment:'code',operationId:opId});
    tx.create(issued,{uid,plan,status:'issued',issuedBy:actor,issuedAt:time,
      expiresAt:Timestamp.fromMillis(time.toMillis()+14*DAY_MS),reason,paymentOperationId:opId});
    tx.create(operation,{uid,actor,plan,kind:'issue-code',reason,createdAt:time});
    tx.create(db.doc('sg_audit/'+opId),{uid,actor,plan,kind:'issue-code',reason,createdAt:time});
  });
  // Plaintext secret exists only in this response; never log or persist it.
  return {uid,plan,code,redeemBefore:new Date(time.toMillis()+14*DAY_MS).toISOString()};
});
exports.sgRedeemCode = onCall(opts,async request=>{
  const uid=authenticated(request);await requireVerifiedUser(uid);
  let hash;
  try {hash=codeHash((request.data||{}).code);}
  catch {throw new HttpsError('invalid-argument','Formato de codigo invalido.');}
  const codeRef=db.doc('sg_activation_codes/'+hash),entitlement=entitlementRef(uid);
  return db.runTransaction(async tx=>{
    const [c,e]=await Promise.all([tx.get(codeRef),tx.get(entitlement)]);
    if(!c.exists)throw new HttpsError('not-found','Codigo no encontrado.');
    const data=c.data(),now=nowStamp();
    if(data.uid!==uid)throw new HttpsError('permission-denied','El codigo pertenece a otra cuenta.');
    if(data.status!=='issued')throw new HttpsError('already-exists','Codigo previamente redimido.');
    if(!data.expiresAt||data.expiresAt.toMillis()<=now.toMillis())throw new HttpsError('failed-precondition','El codigo ya vencio.');
    const ends=Timestamp.fromMillis(nextPaidExpiry(e.exists?e.data():null,now.toMillis()));
    tx.update(codeRef,{status:'redeemed',redeemedAt:now});
    tx.set(entitlement,{plan:data.plan,startsAt:now,endsAt:ends,source:'code',revoked:false,updatedAt:now});
    tx.create(db.collection('sg_audit').doc(),{uid,actor:uid,plan:data.plan,kind:'redeem-code',createdAt:now});
    return {plan:data.plan,endsAt:ends.toDate().toISOString()};
  });
});
