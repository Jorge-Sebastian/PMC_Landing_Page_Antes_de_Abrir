import { useEffect } from 'react';
import { Protection } from './native';

/**
 * Reconnect an existing, consented Family room when SmartGuard is started from
 * an Android notification. It does not force login or open the Family page.
 * A member who opted out of sharing remains read-only; no risks are uploaded.
 */
export function FamilySessionBootstrap() {
  useEffect(() => {
    let live = true;
    try {
      const stored = localStorage.getItem('sg:family-room-code:v1');
      if (!stored || !/^SG-[A-HJ-NP-Z2-9]{16}$/.test(stored)) return;
      void (async () => {
        try {
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
        } catch { /* Offline: retain existing native credentials for guarded lookups. */ }
      })();
    } catch { /* Storage access unavailable: no new Family identity is created. */ }
    return () => { live = false; };
  }, []);
  return null;
}
