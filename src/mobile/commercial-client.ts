/**
 * Android commercial bridge. Firebase Auth is shared with the existing Family module.
 * No local variable is an entitlement. The server determines trial/paid access.
 */
export type CommercialPlan = 'free'|'trial'|'individual'|'family';
export type CommercialAccess = {
  uid:string;publicId:string;registered:boolean;trialUsed:boolean;
  plan:CommercialPlan;paid:boolean;trial:boolean;endsAt:string|null;
  features:{history:boolean;automatic:boolean;familyGroup:boolean;familySeats:number};
};
export const COMMERCIAL_ENABLED = import.meta.env.VITE_SMARTGUARD_COMMERCIAL_ENABLED === 'true';
const INSTALLATION_KEY = 'sg:anonymous-installation:v1';

function installationId():string {
  // Uses the existing anonymous installation storage key so telemetry and accounts
  // can be correlated on-device, without sending personal URL/message data.
  const previous=window.localStorage.getItem(INSTALLATION_KEY);
  if (previous && /^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){4}[0-9a-fA-F]{8}$/.test(previous)) return previous;
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
export async function fetchCommercialAccess():Promise<CommercialAccess> {
  if (!COMMERCIAL_ENABLED) throw new Error('El sistema comercial aun no esta activado en este despliegue.');
  const api=await bridge();
  const apkVersion=import.meta.env.VITE_SMARTGUARD_APP_VERSION || '0.6.0';
  await api.registerSmartGuardCustomer(installationId(),apkVersion,'android');
  return api.getSmartGuardAccess();
}
export async function beginCommercialTrial():Promise<CommercialAccess>{
  const api=await bridge();await api.startSmartGuardTrial();return api.getSmartGuardAccess();
}
export async function redeemCommercialCode(code:string):Promise<CommercialAccess>{
  const api=await bridge();await api.redeemSmartGuardCode(code);return api.getSmartGuardAccess();
}
