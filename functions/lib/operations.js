'use strict';
/**
 * SmartGuard commercial authority. These are REAL server operations, not UI flags.
 * Deploy ONLY after installing dependencies, running tests and reviewing Firestore rules.
 * Uses the existing smartguard-piloto-20261029 project; never stores payment screenshots.
 */
const {HttpsError} = require('firebase-functions/v2/https');
const {Timestamp, FieldValue} = require('firebase-admin/firestore');
const {
  DAY_MS, TRIAL_DAYS, PAID_DAYS, PLAN_COP, PAID_PLANS, publicCustomerId,
  effectiveAccess, inheritedFamilySeat, resolveHouseholdAccess, nextPaidExpiry, activationCode, codeHash, paymentFingerprint, operationId,
} = require('./commercial');

function createOperations(db, auth) {
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

  async function sgRegisterCustomer(request) {
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
  }
  async function sgGetAccess(request) {
    const uid = authenticated(request);
    const input = request.data || {};
    const roomCode = input.roomCode == null || input.roomCode === '' ? null
      : safeInput(input.roomCode, /^SG-[A-HJ-NP-Z2-9]{16}$/, 'Codigo de familia');
    const [account,entitlement,trial] = await Promise.all([
      accountRef(uid).get(),entitlementRef(uid).get(),trialRef(uid).get()
    ]);
    const ownAccess = toAccess(entitlement.exists?entitlement.data():null);
    let guest = null;
    if (roomCode) {
      const room = await db.doc('family_rooms/' + roomCode).get();
      if (room.exists && room.data().hostUid && room.data().members
          && Object.prototype.hasOwnProperty.call(room.data().members, uid)) {
        const hostEntitlement = await entitlementRef(room.data().hostUid).get();
        guest = inheritedFamilySeat(room.data(),uid,
          hostEntitlement.exists?hostEntitlement.data():null);
      }
    }
    const access = resolveHouseholdAccess(ownAccess,guest);
    return {uid,publicId:account.exists?account.data().publicId:normalizedCustomerId(uid),
      registered:account.exists,trialUsed:trial.exists,...access};
  }
  async function sgStartTrial(request) {
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
  }
  async function sgAdminListCustomers(request) {
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
  }
  async function sgAdminGetCustomer(request) {
    await requireAdmin(request);
    const uid = safeInput((request.data||{}).uid,/^[A-Za-z0-9_-]{8,128}$/,'UID');
    const [a,e,t,devices,user] = await Promise.all([
      accountRef(uid).get(),entitlementRef(uid).get(),trialRef(uid).get(),
      accountRef(uid).collection('installations').orderBy('lastSeenAt','desc').limit(20).get(),
      auth.getUser(uid)
    ]);
    if (!a.exists) throw new HttpsError('not-found','Cuenta no registrada.');
    // Cross-device quality data is privileged AND requires the user's separate
    // telemetry consent. Commercial identity does not silently opt in to reports.
    let quality = null;
    const privacy = await db.doc('devices/' + uid).get();
    if (privacy.exists && privacy.data().consent === true && privacy.data().shareWithAdmin === true) {
      const [daily, recent] = await Promise.all([
        db.collection('devices/' + uid + '/daily_metrics').orderBy('day','desc').limit(7).get(),
        db.collection('devices/' + uid + '/analyses').orderBy('receivedAt','desc').limit(100).get()
      ]);
      const summary = {green:0,orange:0,red:0};
      recent.docs.forEach(doc=>{
        const color = doc.data().color;
        if (Object.prototype.hasOwnProperty.call(summary,color)) summary[color]++;
      });
      const totals = {serviceChecks:0,healthyChecks:0,analysesOk:0,analysesFailed:0,
        alertsRequested:0,alertsPosted:0,eventsGenerated:0,eventsAcked:0};
      const rows = daily.docs.map(doc=>{
        const row=doc.data();
        Object.keys(totals).forEach(k=>{totals[k]+=Math.max(0,Number(row[k]||0));});
        return {day:row.day,apkVersion:row.apkVersion,
          analysesOk:row.analysesOk||0,analysesFailed:row.analysesFailed||0,
          alertsRequested:row.alertsRequested||0,alertsPosted:row.alertsPosted||0};
      });
      quality = {source:'FIREBASE_CONSENTED',lastSeenAt:asIso(privacy.data().lastSeenAt),
        sevenRecordedDays:rows.length,totals,rows,recentSample:{count:recent.size,...summary},
        note:'Colores de los 100 registros mas recientes; no representan necesariamente todos los analisis de 7 dias.'};
    }
    return {uid,publicId:a.data().publicId,createdAt:asIso(a.data().createdAt),
      lastSeenAt:asIso(a.data().lastSeenAt),email:user.emailVerified?user.email:null,
      emailVerified:user.emailVerified,trialUsed:t.exists,quality,...toAccess(e.exists?e.data():null),
      devices:devices.docs.map(d=>({id:d.id,...d.data(),createdAt:asIso(d.data().createdAt),lastSeenAt:asIso(d.data().lastSeenAt)}))
        .map(d=>({id:d.id,platform:d.platform,apkVersion:d.apkVersion,createdAt:d.createdAt,lastSeenAt:d.lastSeenAt}))};
  }
  async function grantWithAudit({actor,uid,plan,reason,opId,source,transfer}) {
    const operation = db.doc('sg_admin_operations/'+opId);
    const entitlement = entitlementRef(uid);
    const audit = db.doc('sg_audit/'+opId);
    const payment = transfer?db.doc('sg_payment_references/'+transfer.fingerprint):null;
    const requestRef = db.doc('sg_payment_requests/'+uid);
    return db.runTransaction(async tx=>{
      const [old,done,usedPayment,paymentRequest] = await Promise.all([
        tx.get(entitlement),tx.get(operation),payment?tx.get(payment):Promise.resolve(null),tx.get(requestRef)
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
      if (payment && paymentRequest.exists && paymentRequest.data().status==='pending' && paymentRequest.data().plan===plan)
        tx.update(requestRef,{status:'approved',approvedBy:actor,approvedAt:time,fulfilledByOperation:opId});
      return {duplicate:false,endsAt:expiry.toDate().toISOString()};
    });
  }
  async function sgAdminGrantPlan(request) {
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
  }
  async function sgAdminRevokePlan(request) {
    const actor=await requireAdmin(request),d=request.data||{};
    const uid=safeInput(d.uid,/^[A-Za-z0-9_-]{8,128}$/,'UID');
    const opId=validateOp(d.operationId),reason=safeInput(String(d.reason||'').trim(),/^.{8,300}$/,'Motivo');
    const entitlement=entitlementRef(uid),audit=db.doc('sg_audit/'+opId),operation=db.doc('sg_admin_operations/'+opId);
    const customer=accountRef(uid);
    return db.runTransaction(async tx=>{
      const [old,done,account]=await Promise.all([tx.get(entitlement),tx.get(operation),tx.get(customer)]);
      if(!account.exists)throw new HttpsError('not-found','La cuenta comercial no esta registrada.');
      if(done.exists)throw new HttpsError('already-exists','La operacion ya fue realizada.');
      const time=nowStamp();
      tx.set(entitlement,{plan:'free',startsAt:time,endsAt:time,source:'admin',revoked:true,updatedAt:time});
      // Invalidate all unredeemed activation codes issued before this revocation
      // without exposing or querying their hashed plaintext identifiers.
      const previous=Number(account.data().codeGeneration||0);
      tx.update(customer,{codeGeneration:previous+1,updatedAt:time});
      const record={uid,actor,plan:'free',kind:'revoke',previousPlan:old.exists?old.data().plan:'free',reason,createdAt:time};
      tx.create(audit,record);tx.create(operation,record);
      return {uid,plan:'free',revoked:true};
    });
  }
  async function sgAdminIssueCode(request) {
    const actor=await requireAdmin(request),d=request.data||{};
    const uid=safeInput(d.uid,/^[A-Za-z0-9_-]{8,128}$/,'UID'),plan=validatePlan(d.plan);
    const opId=validateOp(d.operationId),reason=safeInput(String(d.reason||'').trim(),/^.{8,300}$/,'Motivo');
    if(d.bankVerified!==true)throw new HttpsError('failed-precondition','Verifica el pago en tu banco antes de emitir el codigo.');
    const transfer=validateTransfer(d.paymentReference,plan,d.amountCOP);
    await requireVerifiedUser(uid);
    const code=activationCode(),hash=codeHash(code),time=nowStamp();
    const payment=db.doc('sg_payment_references/'+transfer.fingerprint);
    const issued=db.doc('sg_activation_codes/'+hash),operation=db.doc('sg_admin_operations/'+opId);
    const requestRef=db.doc('sg_payment_requests/'+uid),customer=accountRef(uid);
    await db.runTransaction(async tx=>{
      const [oldPay,oldCode,oldOp,paymentRequest,account]=await Promise.all([
        tx.get(payment),tx.get(issued),tx.get(operation),tx.get(requestRef),tx.get(customer)]);
      if(!account.exists)throw new HttpsError('not-found','Cuenta comercial no registrada.');
      if(oldPay.exists || oldCode.exists || oldOp.exists)throw new HttpsError('already-exists','Codigo, comprobante u operacion ya registrados.');
      tx.create(payment,{uid,plan,amountCOP:PLAN_COP[plan],reference:transfer.reference,
        verifiedBy:actor,verifiedAt:time,fulfillment:'code',operationId:opId});
      tx.create(issued,{uid,plan,status:'issued',issuedBy:actor,issuedAt:time,
        expiresAt:Timestamp.fromMillis(time.toMillis()+14*DAY_MS),reason,
        codeGeneration:Number(account.data().codeGeneration||0),
        paymentOperationId:opId});
      tx.create(operation,{uid,actor,plan,kind:'issue-code',reason,createdAt:time});
      tx.create(db.doc('sg_audit/'+opId),{uid,actor,plan,kind:'issue-code',reason,createdAt:time});
      if(paymentRequest.exists&&paymentRequest.data().status==='pending'&&paymentRequest.data().plan===plan)
        tx.update(requestRef,{status:'approved-code',approvedBy:actor,approvedAt:time,fulfilledByOperation:opId});
    });
    // Plaintext secret exists only in this response; never log or persist it.
    return {uid,plan,code,redeemBefore:new Date(time.toMillis()+14*DAY_MS).toISOString()};
  }
  async function sgRedeemCode(request) {
    const uid=authenticated(request);await requireVerifiedUser(uid);
    let hash;
    try {hash=codeHash((request.data||{}).code);}
    catch {throw new HttpsError('invalid-argument','Formato de codigo invalido.');}
    const codeRef=db.doc('sg_activation_codes/'+hash),entitlement=entitlementRef(uid),customer=accountRef(uid);
    return db.runTransaction(async tx=>{
      const [c,e,account]=await Promise.all([tx.get(codeRef),tx.get(entitlement),tx.get(customer)]);
      if(!c.exists)throw new HttpsError('not-found','Codigo no encontrado.');
      const data=c.data(),now=nowStamp();
      if(data.uid!==uid)throw new HttpsError('permission-denied','El codigo pertenece a otra cuenta.');
      if(!account.exists || Number(data.codeGeneration||0)!==Number(account.data().codeGeneration||0))
        throw new HttpsError('permission-denied','Este codigo fue invalidado al revocar el plan.');
      if(data.status!=='issued')throw new HttpsError('already-exists','Codigo previamente redimido.');
      if(!data.expiresAt||data.expiresAt.toMillis()<=now.toMillis())throw new HttpsError('failed-precondition','El codigo ya vencio.');
      const ends=Timestamp.fromMillis(nextPaidExpiry(e.exists?e.data():null,now.toMillis()));
      tx.update(codeRef,{status:'redeemed',redeemedAt:now});
      tx.set(entitlement,{plan:data.plan,startsAt:now,endsAt:ends,source:'code',revoked:false,updatedAt:now});
      tx.create(db.collection('sg_audit').doc(),{uid,actor:uid,plan:data.plan,kind:'redeem-code',createdAt:now});
      return {plan:data.plan,endsAt:ends.toDate().toISOString()};
    });
  }


  /**
   * A customer can state that they sent a receipt. This NEVER verifies payment,
   * grants an entitlement or proves that an email actually left the device.
   * One open claim per account prevents unbounded duplicate submissions.
   */
  async function sgReportPaymentRequest(request) {
    const uid = authenticated(request);
    const user = await requireVerifiedUser(uid);
    const plan = validatePlan((request.data||{}).plan);
    const ref = db.doc('sg_payment_requests/' + uid);
    const account = await accountRef(uid).get();
    if (!account.exists) throw new HttpsError('failed-precondition','Registra tu identidad SmartGuard primero.');
    const result = await db.runTransaction(async tx => {
      const current = await tx.get(ref);
      if (current.exists && current.data().status === 'pending') {
        if (current.data().plan !== plan)
          throw new HttpsError('already-exists','Ya existe una solicitud pendiente para otro plan. Contacta al administrador.');
        return {alreadyOpen:true,createdAt:asIso(current.data().createdAt)};
      }
      const time = nowStamp();
      tx.set(ref,{uid,publicId:account.data().publicId,email:user.email,
        plan,amountCOP:PLAN_COP[plan],status:'pending',
        claimedSentAt:time,createdAt:time,
        notice:'Customer assertion only; not a payment or email confirmation.'});
      return {alreadyOpen:false,createdAt:time.toDate().toISOString()};
    });
    return {requestId:uid,plan,status:'pending',bankVerified:false,...result};
  }
  async function sgAdminListPaymentRequests(request) {
    await requireAdmin(request);
    const data=await db.collection('sg_payment_requests')
      .where('status','==','pending').limit(100).get();
    return {requests:data.docs.map(d=>{
      const x=d.data();
      return {uid:d.id,publicId:x.publicId,plan:x.plan,amountCOP:x.amountCOP,
        email:x.email,createdAt:asIso(x.createdAt),status:x.status};
    }),maxRows:100};
  }


  /** Resolve a mistaken, unconfirmed or unmatched receipt claim without charging. */
  async function sgAdminRejectPaymentRequest(request) {
    const actor=await requireAdmin(request),d=request.data||{};
    const uid=safeInput(d.uid,/^[A-Za-z0-9_-]{8,128}$/,'UID');
    const reason=safeInput(String(d.reason||'').trim(),/^.{8,300}$/,'Motivo');
    const opId=validateOp(d.operationId);
    const ref=db.doc('sg_payment_requests/'+uid);
    const op=db.doc('sg_admin_operations/'+opId);
    return db.runTransaction(async tx=>{
      const [current,exists]=await Promise.all([tx.get(ref),tx.get(op)]);
      if(exists.exists)throw new HttpsError('already-exists','Operacion duplicada.');
      if(!current.exists || current.data().status!=='pending')
        throw new HttpsError('failed-precondition','El comprador no tiene una solicitud pendiente.');
      const now=nowStamp();
      tx.update(ref,{status:'rejected',reviewedBy:actor,reviewedAt:now,rejectionReason:reason});
      tx.create(op,{uid,actor,kind:'reject-payment',reason,createdAt:now});
      tx.create(db.doc('sg_audit/'+opId),{uid,actor,kind:'reject-payment',reason,createdAt:now});
      return {uid,requestId:uid,status:'rejected'};
    });
  }

  return Object.freeze({
    sgRegisterCustomer,
    sgGetAccess,
    sgStartTrial,
    sgAdminListCustomers,
    sgAdminGetCustomer,
    sgAdminGrantPlan,
    sgAdminRevokePlan,
    sgAdminIssueCode,
    sgRedeemCode,
    sgReportPaymentRequest,
    sgAdminListPaymentRequests,
    sgAdminRejectPaymentRequest,
  });
}

module.exports = {createOperations};
