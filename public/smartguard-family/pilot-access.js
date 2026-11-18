import {
  doc, getDocFromServer, runTransaction, serverTimestamp, writeBatch,
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

const DAY_MS = 86400000;
const accessRef = (db, uid) => doc(db, 'sg_pilot_access', uid);
const trialRef = (db, uid) => doc(db, 'sg_pilot_trials', uid);
const accountRef = (db, uid) => doc(db, 'sg_pilot_accounts', uid);
const endOf = (data, days) => (data?.startsAt?.toMillis() ?? -Infinity) + days * DAY_MS;

export async function registerPilotAccount(db, user) {
  if (!user.isAnonymous) {
    await runTransaction(db, async tx => {
      const ref = accountRef(db, user.uid);
      if (!(await tx.get(ref)).exists()) tx.set(ref, {startsAt:serverTimestamp()});
    });
  }
  return {uid:user.uid, publicId:user.uid};
}

export async function getPilotAccess(db, user) {
  const uid = user.uid;
  const [account, access, trial] = user.isAnonymous ? [] : await Promise.all([
    getDocFromServer(accountRef(db, uid)),
    getDocFromServer(accessRef(db, uid)),
    getDocFromServer(trialRef(db, uid)),
  ]);
  const paidEnd = endOf(access?.data(), 30);
  const trialEnd = endOf(trial?.data(), 15);
  const paid = paidEnd > Date.now() && ['individual','family'].includes(access?.data()?.plan);
  const trialActive = !paid && trialEnd > Date.now();
  const plan = paid ? access.data().plan : trialActive ? 'trial' : 'free';
  const endsAt = paid || trialActive ? new Date(paid ? paidEnd : trialEnd).toISOString() : null;
  const family = plan === 'family' || plan === 'trial';
  return {
    uid, publicId:uid, registered:account?.exists() ?? false, trialUsed:trial?.exists() ?? false,
    plan, ownPlan:plan, paid, trial:trialActive, endsAt, personalEndsAt:endsAt,
    features:{automatic:paid || trialActive, history:paid || trialActive, familyGroup:family, familySeats:family ? 10 : 0},
  };
}

async function verifyEmail(user) {
  if (user.isAnonymous) throw new Error('Inicia sesión con tu correo para activar tu acceso.');
  await user.reload();
  if (!user.emailVerified) throw new Error('Verifica tu correo antes de activar tu acceso.');
  await user.getIdToken(true);
}

export async function startPilotTrial(db, user) {
  await verifyEmail(user);
  const ref = trialRef(db, user.uid);
  await runTransaction(db, async tx => {
    const [trial, paid] = await Promise.all([tx.get(ref), tx.get(accessRef(db, user.uid))]);
    if (endOf(paid.data(), 30) > Date.now()) throw new Error('Ya tienes Premium vigente.');
    if (!trial.exists()) tx.set(ref, {startsAt:serverTimestamp()});
  });
  const trial = await getDocFromServer(ref);
  return {plan:'trial', endsAt:new Date(endOf(trial.data(), 15)).toISOString()};
}

export async function redeemPilotCode(db, user, value) {
  const code = String(value).trim().toUpperCase();
  if (!/^SGP-[A-F0-9]{24}$/.test(code)) throw new Error('Código SmartGuard inválido.');
  await verifyEmail(user);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('smartguard-redeem-v1:' + code));
  const codeHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,'0')).join('');
  const ref = accessRef(db, user.uid);
  const codeRef = doc(db, 'sg_pilot_codes', codeHash);
  try {
    await runTransaction(db, async tx => {
      const access = await tx.get(ref);
      if (endOf(access.data(), 30) > Date.now()) {
        if (access.data().codeHash === codeHash) return; // Retry after a lost response.
        throw new Error('Ya tienes Premium activo. Guarda este código para cuando termine.');
      }
      const codeDoc = await tx.get(codeRef);
      if (!codeDoc.exists() || !['individual','family'].includes(codeDoc.data().plan)) {
        throw new Error('El código no existe o ya se utilizó.');
      }
      tx.update(codeRef, {usedBy:user.uid, redeemedAt:serverTimestamp()});
      tx.set(ref, {codeHash, plan:codeDoc.data().plan, startsAt:serverTimestamp()});
    });
  } catch (error) {
    if (error?.code === 'permission-denied') throw new Error('El código no está disponible. Comprueba que sea correcto y que no se haya usado.');
    throw error;
  }
  const access = await getDocFromServer(ref);
  return {plan:access.data().plan, endsAt:new Date(endOf(access.data(), 30)).toISOString()};
}


export async function canResetPilotCode(db, user) {
  if (user.isAnonymous) return false;
  const tester = await getDocFromServer(doc(db, 'sg_pilot_testers', user.uid));
  return tester.data()?.enabled === true;
}

export async function resetPilotCode(db, user) {
  await verifyEmail(user);
  const ref = accessRef(db, user.uid);
  const access = await getDocFromServer(ref);
  if (!access.exists()) return;
  const batch = writeBatch(db);
  batch.update(doc(db, 'sg_pilot_codes', access.data().codeHash), {usedBy:null, redeemedAt:null});
  batch.delete(ref);
  await batch.commit();
}
