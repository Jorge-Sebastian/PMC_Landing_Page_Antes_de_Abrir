/** Admin-only quality reader. All authorization is enforced by Firestore Security Rules.
 * Uses existing Firebase project and SDK via ESM CDN. Never bundles service account keys.
 */
import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {getAuth,signInWithEmailAndPassword,signOut,browserLocalPersistence,setPersistence} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {getFirestore,collection,doc,query,where,orderBy,limit,getDoc,getDocs} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
const config=await (await fetch('/smartguard-family/config.json')).json();
if(config.projectId!=='smartguard-piloto-20261029')throw new Error('Proyecto Firebase incorrecto');
const app=getApps().find(a=>a.name==='smartguard-quality') ?? initializeApp(config,'smartguard-quality');
const auth=getAuth(app),db=getFirestore(app);await setPersistence(auth,browserLocalPersistence);
export async function signInQuality(email,password){
  const credentials=await signInWithEmailAndPassword(auth,email,password);
  await credentials.user.reload();
  await credentials.user.getIdToken(true);
  if(!credentials.user.emailVerified)throw new Error('La cuenta del administrador debe tener el correo verificado.');
  const adm=await getDoc(doc(db,'admins',credentials.user.uid));
  if(!adm.exists() || adm.data().enabled!==true)throw new Error('La cuenta no tiene autorización administrativa Firebase.');
  return {uid:credentials.user.uid};
}
export async function signOutQuality(){await signOut(auth)}
export async function qualityCurrentUser(){await auth.authStateReady();return auth.currentUser?.emailVerified?auth.currentUser.email:null}
export async function fetchQuality(days=7){
  await auth.authStateReady();const user=auth.currentUser;
  if(!user||!user.emailVerified)throw new Error('Inicia sesión con una cuenta administradora verificada.');
  const adm=await getDoc(doc(db,'admins',user.uid));
  if(!adm.exists()||adm.data().enabled!==true)throw new Error('Acceso administrativo denegado.');
  const today=new Date();const since=new Date(today.getTime() - days*86400000).toISOString().slice(0,10);
  // Security Rules do NOT filter results; restrict device query to consented/admin-shared rows.
  const devices=await getDocs(query(collection(db,'devices'),where('consent','==',true),where('shareWithAdmin','==',true),limit(100)));
  const results=[];
  for(const dev of devices.docs){
    const rows=await getDocs(query(collection(db,'devices',dev.id,'daily_metrics'),orderBy('day','desc'),limit(35)));
    const daily=rows.docs.map(x=>x.data()).filter(d=>typeof d.day==='string' && d.day>=since);
    results.push({id:dev.id.slice(0,8)+'…',apkVersion:dev.data().apkVersion||'Sin versión',lastSeenAt:dev.data().lastSeenAt?.toDate?.()?.toISOString?.()||null,daily});
  }
  return {provenance:'PRODUCCION_FIREBASE',project:'smartguard-piloto-20261029',queriedAt:new Date().toISOString(),days,devices:results};
}
