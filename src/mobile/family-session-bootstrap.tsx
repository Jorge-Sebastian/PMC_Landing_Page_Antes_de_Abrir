import { useEffect } from 'react';
import { Protection } from './native';
import { COMMERCIAL_ENABLED, fetchCommercialAccess } from './commercial-client';
import { confirmedFamily } from './commercial-policy';

/**
 * Restore authorized Family notification matching only after the room and
 * its backend-verified commercial entitlement have been checked.
 *
 * Older pilots remain unchanged while the commercial rollout flag is OFF.
 * When ON, an offline/expired/revoked user cannot restore uploads by keeping
 * a saved room code or previously issued Firebase refresh token.
 */
export function FamilySessionBootstrap() {
  useEffect(() => {
    let live = true;
    const run = async () => {
      try {
        const stored = localStorage.getItem('sg:family-room-code:v1');
        if (!stored || !/^SG-[A-HJ-NP-Z2-9]{16}$/.test(stored)) {
          if (COMMERCIAL_ENABLED) await Protection.firebaseFamilyStop();
          return;
        }
        if (COMMERCIAL_ENABLED) {
          // Fail closed for Family on network errors. Retaining old credentials
          // could allow risk uploads even after the holder was downgraded.
          const entitlement = await fetchCommercialAccess();
          if (!confirmedFamily(entitlement) || !live) {
            if (live) await Protection.firebaseFamilyStop();
            return;
          }
        }
        const clientUrl = new URL('/smartguard-family/client.js', window.location.origin).href;
        const client = await import(/* @vite-ignore */ clientUrl) as {
          ensureUser(): Promise<{uid:string}>;
          inspectRoom(code:string): Promise<{members?:Record<string,{shareRisks:boolean}>}>;
          getNativeFamilySession(): Promise<{uid:string;refreshToken:string}>;
        };
        const user = await client.ensureUser();
        const room = await client.inspectRoom(stored);
        if (!live) return;
        const member = room.members?.[user.uid];
        if (!member) { await Protection.firebaseFamilyStop(); return; }
        const session = await client.getNativeFamilySession();
        if (!live) return;
        await Protection.firebaseFamilySession({
          uid:session.uid, refreshToken:session.refreshToken,
          code:stored, share:member.shareRisks===true,
        });
      } catch {
        if (live && COMMERCIAL_ENABLED) await Protection.firebaseFamilyStop().catch(()=>{});
        // On legacy pilot, offline room credentials are left untouched.
      }
    };
    void run();
    const focus=()=>{if (!document.hidden)void run();};
    window.addEventListener('focus',focus);
    window.addEventListener('smartguard:commercial-updated',focus);
    return () => {
      live=false;
      window.removeEventListener('focus',focus);
      window.removeEventListener('smartguard:commercial-updated',focus);
    };
  }, []);
  return null;
}
