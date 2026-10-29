import { useEffect } from 'react';
import { Protection } from '@/mobile/native';
import { consentGiven, getInstallationId, telemetryClient } from './client';

/**
 * Source-level reporter for the future fully sourced Android APK.
 * Reporting only occurs after explicit consent and when the app is foregrounded.
 * Does NOT claim to observe background notifications while the app is closed.
 */
export const TelemetryReporter = () => {
  useEffect(() => {
    let active = true;
    let busy = false;
    const send = async () => {
      if (!active || busy || document.hidden || !consentGiven()) return;
      const client = telemetryClient();
      const id = getInstallationId();
      if (!client || !id) return;
      busy = true;
      try {
        const { data: sessionData } = await client.auth.getSession();
        let session = sessionData.session;
        if (!session) {
          const result = await client.auth.signInAnonymously();
          if (result.error) return;
          session = result.data.session;
        }
        if (!session || !active || !consentGiven()) return;
        const status = await Protection.status();
        const owner = session.user.id;
        const appVersion = '0.4.0-source'; // Release pipeline must set version on source parity.
        const { error } = await client.from('sg_devices').upsert({
          id, owner_subject: owner, nickname: 'Android · SmartGuard',
          app_version: appVersion, platform: 'android', processed_count: status.processed || 0,
          protection_enabled: !!(status.enabled && status.access && status.notifications),
          consented_at: new Date().toISOString(),
        }, { onConflict: 'id' });
        if (error) return;
        // Detailed events require explicit local history consent. We never
        // silently enable history or upload full URL, domain or message text.
        if (!status.historyEnabled || !Array.isArray(status.history)) return;
        for (const h of status.history.slice(-50)) {
          if (!['red','orange','green'].includes(h.color) || !Number.isFinite(h.date)) continue;
          const raw = new TextEncoder().encode(`${id}|${h.date}|${h.color}|${h.domain}`);
          const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', raw)).slice(0,16);
          digest[6] = (digest[6] & 0x0f) | 0x40;
          digest[8] = (digest[8] & 0x3f) | 0x80;
          const hex = Array.from(digest, b => b.toString(16).padStart(2,'0')).join('');
          const eventId = [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20,32)].join('-');
          if (!active || !consentGiven()) break;
          await client.from('sg_events').upsert({
            id: eventId, device_id: id, owner_subject: owner,
            kind: 'analysis', risk_level: h.color,
            created_at: new Date(h.date).toISOString(),
          }, { onConflict: 'id', ignoreDuplicates: true });
        }
      } catch { /* No interruption of local protection on telemetry failure. */ }
      finally { busy = false; }
    };
    const onFocus = () => void send();
    window.addEventListener('focus',onFocus);
    window.addEventListener('smartguard:telemetry-consent-changed',onFocus);
    void send();
    const timer = window.setInterval(()=>void send(),60_000);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus',onFocus); window.removeEventListener('smartguard:telemetry-consent-changed',onFocus); };
  }, []);
  return null;
};
