/**
 * Android commercial bridge. Firebase Auth is shared with the existing Family module.
 * No local variable is an entitlement. The server determines trial/paid access.
 */
import { isAndroidPilot, Protection } from './native';

export type CommercialPlan = 'free'|'trial'|'individual'|'family'|'familyMember';
export type CommercialAccess = {
  uid:string;publicId:string;registered:boolean;trialUsed:boolean;familySeat?:boolean;
  plan:CommercialPlan;paid:boolean;trial:boolean;endsAt:string|null;
  features:{history:boolean;automatic:boolean;familyGroup:boolean;familySeats:number};
};
export const COMMERCIAL_ENABLED = import.meta.env.VITE_SMARTGUARD_COMMERCIAL_ENABLED === 'true';
const INSTALLATION_KEY = 'sg:anonymous-installation:v1';

function installationId():string {
  // Uses the existing anonymous installation storage key so telemetry and accounts
  // can be correlated on-device, without sending personal URL/message data.
  const previous=window.localStorage.getItem(INSTALLATION_KEY);
  if (previous && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(previous)) return previous;
  const id=crypto.randomUUID();
  window.localStorage.setItem(INSTALLATION_KEY,id);
  return id;
}
type FamilyBridge = {
  registerSmartGuardCustomer(installationId:string,apkVersion:string,platform:string):Promise<{uid:string;publicId:string}>;
  getSmartGuardAccess():Promise<CommercialAccess>;
  startSmartGuardTrial():Promise<{plan:'trial';endsAt:string}>;
  redeemSmartGuardCode(code:string):Promise<{plan:CommercialPlan;endsAt:string}>;
};
async function bridge():Promise<FamilyBridge>{
  const url=new URL('/smartguard-family/client.js',window.location.origin).href;
  return (await import(/* @vite-ignore */ url)) as FamilyBridge;
}
async function syncNativeCommercialAccess(access:CommercialAccess):Promise<void> {
  if (!COMMERCIAL_ENABLED || !isAndroidPilot) return;
  const end=access?.endsAt?Date.parse(access.endsAt):NaN;
  const premium=access.registered && access.features?.automatic===true
    && (access.plan==='trial'||access.plan==='individual'||access.plan==='family'||access.plan==='familyMember')
    && Number.isFinite(end) && end>Date.now();
  // Android checks expiry per notification even if the WebView is asleep.
  await Protection.commercialEntitlement({expiresAtEpochMs:premium?end:0});
}
export async function fetchCommercialAccess():Promise<CommercialAccess> {
  if (!COMMERCIAL_ENABLED) throw new Error('El sistema comercial aun no esta activado en este despliegue.');
  const api=await bridge();
  const apkVersion=import.meta.env.VITE_SMARTGUARD_APP_VERSION || '0.6.0';
  await api.registerSmartGuardCustomer(installationId(),apkVersion,'android');
  const access=await api.getSmartGuardAccess();
  await syncNativeCommercialAccess(access);
  return access;
}
export async function beginCommercialTrial():Promise<CommercialAccess>{
  const api=await bridge();await api.startSmartGuardTrial();
  return fetchCommercialAccess();
}
export async function redeemCommercialCode(code:string):Promise<CommercialAccess>{
  const api=await bridge();await api.redeemSmartGuardCode(code);
  return fetchCommercialAccess();
}
