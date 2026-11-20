/** SmartGuard Family — Firestore Spark-compatible implementation (no Cloud Functions). */
import { callCommercial } from './commercial-api.js';
import { canResetPilotCode, getPilotAccess, redeemPilotCode, registerPilotAccount, resetPilotCode, startPilotTrial } from './pilot-access.js';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {
  getAuth, setPersistence, browserLocalPersistence, signInAnonymously,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  EmailAuthProvider, linkWithCredential, sendEmailVerification, sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, runTransaction, serverTimestamp,
  collection, query, limit, orderBy, where, getDocs, writeBatch, onSnapshot, deleteDoc,
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

const config = await (await fetch(new URL('./config.json', import.meta.url))).json();
const app = getApps().find(a => a.name === 'smartguard') ?? initializeApp(config, 'smartguard');
const auth = getAuth(app);
const db = getFirestore(app);
const ready = setPersistence(auth, browserLocalPersistence).then(() => auth.authStateReady());
const PILOT_CODES = config.commercialTransport === 'firestore-pilot';
const ROOMS = 'family_rooms';
const ROOM_KEY = 'sg:family-room-code:v1';
const FAMILY_PUBLIC_ORIGIN = String(config.familyPublicOrigin || '').trim();
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 symbols, excludes I, O, 0, 1.
const CODE_REGEX = /^SG-[A-HJ-NP-Z2-9]{16}$/;
export const MAX_MEMBERS = 10;

export function generateCode() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return 'SG-' + [...bytes].map(b => CODE_ALPHABET[b & 31]).join(''); // 80 bits.
}
export function normalizeCode(value) {
  const text = String(value || '').trim().toUpperCase().replace(/[\s-]/g, '');
  const result = text.startsWith('SG') ? 'SG-' + text.slice(2) : 'SG-' + text;
  return CODE_REGEX.test(result) ? result : null;
}
export function getInvitationCodeFromUrl() {
  const match = new URLSearchParams(location.hash.replace(/^#/, '')).get('codigo');
  return normalizeCode(match);
}
export function invitationLink(code) {
  const normalized = normalizeCode(code);
  if (!normalized) throw new Error('Código de sala inválido.');
  const local = window.location.protocol === 'capacitor:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const origin = local ? FAMILY_PUBLIC_ORIGIN : window.location.origin;
  if (!/^https:\/\//.test(origin)) throw new Error('Falta una URL publica para compartir invitaciones.');
  const url = new URL('/familia', origin);
  url.hash = new URLSearchParams({ codigo: normalized }).toString();
  return url.href;
}
export function storedRoomCode() {
  try { return normalizeCode(localStorage.getItem(ROOM_KEY)); } catch { return null; }
}
function remember(code) { try { localStorage.setItem(ROOM_KEY, code); } catch {} }
export function forgetRoom() { try { localStorage.removeItem(ROOM_KEY); } catch {} }
function trimmedName(v) {
  const value = String(v || '').trim().replace(/[<>\u0000-\u001f\u007f]/g, '').slice(0, 48);
  if (!value) throw new Error('Escribe un nombre o apodo.');
  return value;
}
let guestSignIn;
export async function ensureUser() {
  await ready;
  if (!auth.currentUser) {
    guestSignIn ??= signInAnonymously(auth).finally(() => { guestSignIn = undefined; });
    await guestSignIn;
  }
  if (!auth.currentUser) throw new Error('No se pudo crear la sesión de invitado.');
  return { uid: auth.currentUser.uid, anonymous: auth.currentUser.isAnonymous };
}
export async function useHostAccount(email, password, create = false) {
  await ready;
  if (!email?.includes('@') || !password || password.length < 8) throw new Error('Ingresa correo válido y una contraseña de al menos 8 caracteres.');
  let result;
  if (create && auth.currentUser?.isAnonymous) {
    // Preserve Firebase UID, prior family membership and future trial eligibility.
    result = await linkWithCredential(auth.currentUser, EmailAuthProvider.credential(email.trim(), password));
    await sendEmailVerification(result.user);
  } else {
    result = create
      ? await createUserWithEmailAndPassword(auth, email.trim(), password)
      : await signInWithEmailAndPassword(auth, email.trim(), password);
    if (create) await sendEmailVerification(result.user);
  }
  if (PILOT_CODES) await registerPilotAccount(db, result.user);
  return { uid: result.user.uid, anonymous: result.user.isAnonymous };
}
export async function resetSmartGuardPassword(email) {
  await ready;
  const address=String(email||'').trim();
  if (!/^\S+@\S+\.\S+$/.test(address)) throw new Error('Ingresa un correo válido para recuperar la contraseña.');
  await sendPasswordResetEmail(auth,address);
  // Never expose whether an account exists via a separate lookup.
  return {sent:true};
}
export async function resendSmartGuardVerification() {
  await ready;
  if (!auth.currentUser || auth.currentUser.isAnonymous || !auth.currentUser.email)
    throw new Error('Vincula tu correo primero.');
  await auth.currentUser.reload();
  if (auth.currentUser.emailVerified) return {alreadyVerified:true};
  await sendEmailVerification(auth.currentUser);
  return {sent:true};
}
export async function exitHostAccount() {
  forgetRoom();
  await signOut(auth);
}
export async function createFamilyRoom(name, nickname, shareRisks = false) {
  const { uid } = await ensureUser();
  const familyName = trimmedName(name);
  const alias = trimmedName(nickname);
  for (let n = 0; n < 4; n++) {
    const code = generateCode();
    const roomRef = doc(db, ROOMS, code);
    try {
      await runTransaction(db, async tx => {
        if ((await tx.get(roomRef)).exists()) throw new Error('COLISION_CODIGO');
        tx.set(roomRef, {
          name: familyName, hostUid: uid, open: true, createdAt: serverTimestamp(),
          members: { [uid]: { nickname: alias, shareRisks: !!shareRisks, role: 'host', joinedAt: serverTimestamp() } },
        });
      });
      remember(code);
      return code;
    } catch (e) { if (e?.message !== 'COLISION_CODIGO') throw e; }
  }
  throw new Error('No se pudo generar un código único. Intenta nuevamente.');
}
export async function inspectRoom(code) {
  await ensureUser();
  const c = normalizeCode(code);
  if (!c) throw new Error('El código debe comenzar por SG- y contener 16 caracteres aleatorios.');
  const snapshot = await getDoc(doc(db, ROOMS, c));
  if (!snapshot.exists()) throw new Error('No encontramos esa sala. Revisa el código.');
  return { code: c, ...snapshot.data() };
}

/**
 * Recover a named existing member WITHOUT permitting nickname-only impersonation.
 * An authenticated host must approve the UID transfer in one Firestore transaction.
 */
export async function requestFamilyRecovery(code, oldUid) {
  const {uid} = await ensureUser();
  const c = normalizeCode(code);
  if (!c) throw new Error('Código de sala inválido.');
  const room = await inspectRoom(c);
  if (room.members?.[uid]) { remember(c); return {status:'approved'}; }
  if (oldUid === room.hostUid) throw new Error('El anfitrión debe recuperar su propia cuenta vinculada, no usar el perfil de invitado.');
  if (!oldUid || !room.members?.[oldUid]) throw new Error('Selecciona tu nombre entre los integrantes de la familia.');
  const reqRef = doc(db, ROOMS, c, 'recovery_requests', uid);
  const previous = await getDoc(reqRef);
  if (previous.exists()) {
    if (previous.data().status === 'pending') {
      if (previous.data().oldUid !== oldUid) throw new Error('Ya tienes otra solicitud pendiente. Pide al anfitrión revisarla.');
      remember(c); return {status:'pending'};
    }
    if (previous.data().status !== 'rejected') throw new Error('Esta identidad ya tiene una recuperación tramitada.');
    await deleteDoc(reqRef);
  }
  await setDoc(reqRef,{oldUid,newUid:uid,status:'pending',createdAt:serverTimestamp()});
  remember(c);
  return {status:'pending'};
}
export async function getFamilyRecovery(code) {
  const {uid} = await ensureUser();
  const c = normalizeCode(code);
  if (!c) throw new Error('Código de sala inválido.');
  const snap = await getDoc(doc(db,ROOMS,c,'recovery_requests',uid));
  return snap.exists() ? snap.data() : null;
}
export function watchFamilyRecoveryRequests(code, callback, onError) {
  const c = normalizeCode(code);
  if (!c) throw new Error('Código de sala inválido.');
  return onSnapshot(query(collection(db,ROOMS,c,'recovery_requests'),where('status','==','pending'),limit(30)),
    snapshot => callback(snapshot.docs.map(s=>({id:s.id,...s.data()}))),onError);
}
export async function approveFamilyRecovery(code, newUid) {
  const {uid:hostUid} = await ensureUser();
  const c = normalizeCode(code);
  if (!c || !/^[A-Za-z0-9_-]{8,128}$/.test(newUid)) throw new Error('Solicitud inválida.');
  await runTransaction(db,async tx=>{
    const roomRef = doc(db,ROOMS,c);
    const reqRef = doc(db,ROOMS,c,'recovery_requests',newUid);
    const request = await tx.get(reqRef);
    const snapshot = await tx.get(roomRef);
    if (!snapshot.exists() || !request.exists() || request.data().status !== 'pending')
      throw new Error('La solicitud ya no está pendiente.');
    const room = snapshot.data();
    if (room.hostUid !== hostUid) throw new Error('Solo el anfitrión puede aprobar el reingreso.');
    const oldUid = request.data().oldUid;
    const oldMember = room.members?.[oldUid];
    if (!oldMember || oldMember.role !== 'member' || oldUid === newUid || room.members?.[newUid])
      throw new Error('El perfil ya no está disponible para recuperar.');
    const history = [...(oldMember.previousUids || []),oldUid];
    if (history.length > 20) throw new Error('Este perfil superó el límite seguro de recuperaciones.');
    const members = {...room.members,[newUid]:{...oldMember,previousUids:history}};
    delete members[oldUid];
    tx.update(roomRef,{members,lastRecovery:{oldUid,newUid,approvedBy:hostUid,approvedAt:serverTimestamp()}});
    tx.update(reqRef,{status:'approved',reviewedBy:hostUid,reviewedAt:serverTimestamp()});
  });
}

export async function joinFamilyRoom(code, nickname, shareRisks) {
  const { uid } = await ensureUser();
  const c = normalizeCode(code);
  if (!c) throw new Error('Código de sala inválido.');
  const alias = trimmedName(nickname);
  await runTransaction(db, async tx => {
    const ref = doc(db, ROOMS, c);
    const current = await tx.get(ref);
    if (!current.exists()) throw new Error('La sala no existe.');
    const room = current.data();
    if (room.members?.[uid]) return;
    if (Object.values(room.members || {}).some(m => String(m.nickname).trim().toLowerCase() === alias.toLowerCase()))
      throw new Error('Ese nombre ya está en la familia. Selecciona «Ya soy integrante» para recuperar tu perfil sin duplicarlo.');
    if (!room.open) throw new Error('La sala está cerrada a nuevos integrantes.');
    if (Object.keys(room.members || {}).length >= MAX_MEMBERS) throw new Error('La sala alcanzó el máximo de 10 integrantes.');
    tx.update(ref, { members: {
      ...room.members,
      [uid]: { nickname: alias, role: 'member', shareRisks: !!shareRisks, joinedAt: serverTimestamp() },
    } });
  });
  remember(c);
  return c;
}
export async function updateMyProfile(code, nickname, shareRisks) {
  const { uid } = await ensureUser();
  const c = normalizeCode(code);
  if (!c) throw new Error('Código inválido');
  await runTransaction(db, async tx => {
    const ref = doc(db, ROOMS, c);
    const snapshot = await tx.get(ref);
    const data = snapshot.data();
    if (!data?.members?.[uid]) throw new Error('Ya no perteneces a la sala.');
    tx.update(ref, { members: {
      ...data.members,
      [uid]: { ...data.members[uid], nickname: trimmedName(nickname), shareRisks: !!shareRisks },
    } });
  });
}
export async function setRoomOpen(code, open) {
  const { uid } = await ensureUser();
  const c = normalizeCode(code);
  if (!c) throw new Error('Código inválido');
  const room = await inspectRoom(c);
  if (room.hostUid !== uid) throw new Error('Solo el anfitrión puede modificar la sala.');
  await updateDoc(doc(db, ROOMS, c), { open: !!open });
}
export async function purgeMemberRisks(code, memberUid) {
  const c = normalizeCode(code);
  if (!c) throw new Error('Código inválido');
  const ref = collection(db, ROOMS, c, 'risk_events');
  let count = 0;
  for (let i = 0; i < 100; i++) {
    const matches = await getDocs(query(ref, where('memberUid', '==', memberUid), limit(100)));
    if (matches.empty) return count;
    const batch = writeBatch(db);
    for (const document of matches.docs) { batch.delete(document.ref); count++; }
    await batch.commit();
  }
  throw new Error('Hay demasiados registros. Repite la limpieza antes de salir.');
}
export async function removeMember(code, memberUid) {
  const { uid } = await ensureUser();
  const c = normalizeCode(code);
  if (!c) throw new Error('Código inválido');
  const room = await inspectRoom(c);
  if (uid !== memberUid && uid !== room.hostUid) throw new Error('No tienes permiso para retirar a esa persona.');
  if (memberUid === room.hostUid) throw new Error('No se puede retirar al anfitrión.');
  // Remove membership first for host: blocks new reports, then purge previous ones.
  // For a self-exit, purge first because removal revokes delete permissions.
  if (uid === memberUid) await purgeMemberRisks(c, memberUid);
  await runTransaction(db, async tx => {
    const ref = doc(db, ROOMS, c);
    const snapshot = await tx.get(ref);
    const data = snapshot.data();
    if (!data?.members?.[memberUid]) return;
    if (uid !== data.hostUid && uid !== memberUid) throw new Error('No tienes permiso.');
    const next = { ...data.members };
    delete next[memberUid];
    tx.update(ref, { members: next });
  });
  if (uid !== memberUid) await purgeMemberRisks(c, memberUid);
  if (uid === memberUid) forgetRoom();
}
export async function deleteMySharedRisks(code) {
  const user = await ensureUser();
  const room = await inspectRoom(code);
  const member = room.members?.[user.uid];
  if (!member) throw new Error('No perteneces a esta sala.');
  let removed = 0;
  for (const uid of [user.uid, ...(member.previousUids || [])]) removed += await purgeMemberRisks(code, uid);
  return removed;
}
const DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
export async function publishRedRisk(code, event) {
  const { uid } = await ensureUser();
  const c = normalizeCode(code);
  if (!c) throw new Error('Código inválido');
  const domain = String(event?.registrableDomain ?? '').trim().toLowerCase();
  if (event?.level !== 'red' || !DOMAIN.test(domain) || domain.length > 253) throw new Error('Solo se admiten dominios de resultados rojos.');
  if (!['manual','notification'].includes(event?.source)) throw new Error('Origen inválido');
  const member = (await inspectRoom(c)).members?.[uid];
  if (!member?.shareRisks) throw new Error('Debes autorizar compartir enlaces de riesgo con tu familia.');
  const id = crypto.randomUUID().replace(/-/g,'');
  await setDoc(doc(db, ROOMS, c, 'risk_events', id), {
    memberUid: uid, domain, color: 'red', source: event.source,
    engineVersion: '0.5.9', createdAt: serverTimestamp(),
  });
  return id;
}
export function watchRoom(code, cb, onError) {
  const c = normalizeCode(code);
  if (!c) throw new Error('Código inválido');
  return onSnapshot(doc(db, ROOMS, c), snap => cb(snap.exists() ? { code: c, ...snap.data() } : null), onError);
}
export function watchRiskEvents(code, cb, onError) {
  const c = normalizeCode(code);
  if (!c) throw new Error('Código inválido');
  return onSnapshot(query(collection(db, ROOMS, c, 'risk_events'),orderBy('createdAt','desc'), limit(100)),
    snapshot => cb(snapshot.docs.map(s=>({id:s.id,...s.data(),createdAt:s.data().createdAt?.toDate?.()?.toISOString?.() || null}))), onError);
}

/** Android-only handoff after the user opted into Family sharing. */
export async function getNativeFamilySession() {
  const current=await ensureUser();
  const refreshToken=auth.currentUser?.refreshToken;
  if(!current.uid || !refreshToken) throw new Error('Sesion Firebase no disponible para Android.');
  return {uid:current.uid,refreshToken};
}
/** Separate administrator statistics opt-in, not a Family permission. */
export async function enableDeviceTelemetry(version='0.6.0') {
  const signed=await getNativeFamilySession();
  const ref=doc(db,'devices',signed.uid);
  const previous=await getDoc(ref);
  if(previous.exists()) {
    await updateDoc(ref,{consent:true,shareWithAdmin:true,consentVersion:1,apkVersion:version,lastSeenAt:serverTimestamp()});
  } else {
    await setDoc(ref,{consent:true,shareWithAdmin:true,consentVersion:1,apkVersion:version,createdAt:serverTimestamp(),lastSeenAt:serverTimestamp()});
  }
  return signed;
}
export async function revokeDeviceTelemetry() {
  const current=await ensureUser();
  const ref=doc(db,'devices',current.uid);
  if((await getDoc(ref)).exists()) await updateDoc(ref,{consent:false,shareWithAdmin:false,lastSeenAt:serverTimestamp()});
}


// Commercial operations always use the same Firebase identity as Family.
async function commercialCallable(name, input = {}) {
  await ensureUser();
  return callCommercial(config, app, auth.currentUser, name, input);
}
export async function registerSmartGuardCustomer(installationId, apkVersion, platform = 'android') {
  if (PILOT_CODES) {
    await ensureUser();
    return registerPilotAccount(db, auth.currentUser);
  }
  return commercialCallable('sgRegisterCustomer', {installationId, apkVersion, platform});
}
export async function getSmartGuardAccess() {
  // Guests inherit their household's current entitlement ONLY after becoming
  // an actual member. The server checks room membership and host expiry.
  if (PILOT_CODES) {
    await ensureUser();
    return getPilotAccess(db, auth.currentUser);
  }
  return commercialCallable('sgGetAccess', {roomCode:storedRoomCode()});
}
export async function startSmartGuardTrial() {
  if (PILOT_CODES) {
    await ensureUser();
    return startPilotTrial(db, auth.currentUser);
  }
  return commercialCallable('sgStartTrial');
}
export async function reportSmartGuardPaymentRequest(plan) {
  return commercialCallable('sgReportPaymentRequest', {plan});
}
export async function redeemSmartGuardCode(code) {
  if (PILOT_CODES) {
    await ensureUser();
    return redeemPilotCode(db, auth.currentUser, code);
  }
  return commercialCallable('sgRedeemCode', {code});
}
export async function currentVerifiedEmail() {
  await ready;
  if (!auth.currentUser) return null;
  await auth.currentUser.reload();
  return auth.currentUser.emailVerified ? auth.currentUser.email : null;
}

export async function canResetSmartGuardPilotCode() {
  await ready;
  return PILOT_CODES && !!auth.currentUser && canResetPilotCode(db, auth.currentUser);
}
export async function resetSmartGuardPilotCode() {
  await ready;
  if (!PILOT_CODES || !auth.currentUser) throw new Error('Inicia sesión con tu cuenta de pruebas.');
  await resetPilotCode(db, auth.currentUser);
}
