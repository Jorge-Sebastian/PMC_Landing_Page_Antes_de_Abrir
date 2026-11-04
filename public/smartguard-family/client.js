/** SmartGuard Family — Firestore Spark-compatible implementation (no Cloud Functions). */
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {
  getAuth, setPersistence, browserLocalPersistence, signInAnonymously,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, runTransaction, serverTimestamp,
  collection, query, limit, orderBy, where, getDocs, writeBatch, onSnapshot,
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

const config = await (await fetch(new URL('./config.json', import.meta.url))).json();
const app = getApps().find(a => a.name === 'smartguard') ?? initializeApp(config, 'smartguard');
const auth = getAuth(app);
const db = getFirestore(app);
const ready = setPersistence(auth, browserLocalPersistence).then(() => auth.authStateReady());
const ROOMS = 'family_rooms';
const ROOM_KEY = 'sg:family-room-code:v1';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 symbols, excludes I, O, 0, 1.
const CODE_REGEX = /^SG-[A-HJ-NP-Z2-9]{16}$/;
export const MAX_MEMBERS = 20;

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
  const url = new URL('/familia', window.location.origin);
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
export async function ensureUser() {
  await ready;
  if (!auth.currentUser) await signInAnonymously(auth);
  if (!auth.currentUser) throw new Error('No se pudo crear la sesión de invitado.');
  return { uid: auth.currentUser.uid, anonymous: auth.currentUser.isAnonymous };
}
export async function useHostAccount(email, password, create = false) {
  await ready;
  if (!email?.includes('@') || !password || password.length < 8) throw new Error('Ingresa correo válido y una contraseña de al menos 8 caracteres.');
  const result = create
    ? await createUserWithEmailAndPassword(auth, email.trim(), password)
    : await signInWithEmailAndPassword(auth, email.trim(), password);
  return { uid: result.user.uid, anonymous: false };
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
    if (!room.open) throw new Error('La sala está cerrada a nuevos integrantes.');
    if (Object.keys(room.members || {}).length >= MAX_MEMBERS) throw new Error('La sala alcanzó el máximo de 20 integrantes.');
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
  return purgeMemberRisks(code, user.uid);
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
